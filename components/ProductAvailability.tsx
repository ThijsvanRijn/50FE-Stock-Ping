import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ReloadIcon, BellIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { playSound } from './Beeper';
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { sendTelegramNotification } from "@/lib/notifications";

interface Retailer {
    name: string;
    url: string;
}

interface AvailabilityStatus {
    isAvailable: boolean;
    retailers?: Retailer[];
    message?: string;
    fromCache?: boolean;
    partnerApiStatus?: boolean;
    directApiStatus?: boolean;
}

interface MarketplaceStatus {
    isAvailable: boolean;
    retailers?: Retailer[];
    message?: string;
    fromCache?: boolean;
    partnerApiStatus?: boolean;
    directApiStatus?: boolean;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API request failed');
    return res.json();
};

const REFRESH_INTERVAL = 15000; // 15 seconds in milliseconds

export function ProductAvailability() {
    const { 
        data: availabilityData, 
        error: availabilityError, 
        isLoading: availabilityLoading,
        mutate: mutateAvailability 
    } = useSWR<AvailabilityStatus>(
        '/api/check-availability',
        fetcher,
        { 
            refreshInterval: 20000,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 20000,
            errorRetryCount: Infinity,
            refreshWhenHidden: true,
            refreshWhenOffline: true,
            onSuccess: (data) => {
                console.log('Availability check success:', data);
            },
            onError: (err) => {
                console.error('Error fetching availability:', err);
                setTimeout(() => mutateAvailability(), 20000);
            }
        }
    );

    const { 
        data: marketplaceData, 
        error: marketplaceError, 
        isLoading: marketplaceLoading,
        mutate: mutateMarketplace 
    } = useSWR<MarketplaceStatus>(
        '/api/check-marketplace',
        fetcher,
        { /* ... bestaande SWR config ... */ }
    );

    const [lastCheckTime, setLastCheckTime] = useState<string>('');
    const [notifications, setNotifications] = useState(true);
    const [status, setStatus] = useState<AvailabilityStatus | null>(null);

    // Nieuwe API status check
    const apiStatus = {
        partner: availabilityData?.partnerApiStatus ?? false,
        direct: availabilityData?.directApiStatus ?? false
    };

    // Update tijd bij elke data fetch (succesvol of niet)
    useEffect(() => {
        const updateLastCheckTime = () => {
            const now = new Date();
            setLastCheckTime(now.toLocaleTimeString('nl-NL', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
            }));
        };

        // Update tijd direct bij component mount
        updateLastCheckTime();

        // Update tijd elke 15 seconden
        const interval = setInterval(updateLastCheckTime, 15000);

        return () => clearInterval(interval);
    }, []);

    // Rest van de effecten voor beschikbaarheid checks
    useEffect(() => {
        if (availabilityData) {
            setStatus(availabilityData);
            if (availabilityData.isAvailable) {
                playSound();
            }
        }
    }, [availabilityData]);

    useEffect(() => {
        if (availabilityData?.isAvailable && availabilityData?.retailers && availabilityData.retailers.length > 0) {
            const retailerNames = availabilityData.retailers.map(r => r.name).join(', ');
            
            fetch('/api/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `RTX 5090 FE beschikbaar bij: ${retailerNames}`,
                    url: availabilityData.retailers[0].url,
                    type: 'availability'
                })
            }).catch(err => console.error('Error sending notification:', err));
        }
    }, [availabilityData?.isAvailable, availabilityData?.retailers]);

    // Extra recovery mechanisme
    useEffect(() => {
        if (availabilityLoading) {
            const timeout = setTimeout(() => {
                console.log('Manual timeout recovery...');
                mutateAvailability();
            }, 35000); // Backup timeout
            return () => clearTimeout(timeout);
        }
    }, [availabilityLoading, mutateAvailability]);

    // Forceer periodieke updates
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Forcing checks...');
            mutateAvailability();
        }, 20000);

        return () => clearInterval(interval);
    }, [mutateAvailability]);

    // Vraag meteen om toestemming bij het laden
    useEffect(() => {
        if (typeof window !== 'undefined') {
            requestNotifications();
        }
    }, []);

    const requestNotifications = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotifications(true);
            } else {
                setNotifications(false);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            setNotifications(false);
        }
    };

    // Bepaal de algemene status van de checks
    const getCheckStatus = () => {
        // Als er een error is of de checks zijn gestopt
        if (availabilityError || marketplaceError) {
            return "error"; // rood
        }

        // Als we wachten op een response
        if (availabilityLoading || marketplaceLoading) {
            return "waiting"; // oranje
        }

        // Als alles actief is en draait
        return "active"; // groen
    };

    const checkStatus = getCheckStatus();

    useEffect(() => {
        if (availabilityError || marketplaceError) {
            // Stuur error notificatie
            fetch('/api/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `API Error: ${availabilityError ? 'Partner API' : 'Direct API'} is niet bereikbaar`,
                    type: 'error'
                })
            }).catch(err => console.error('Error sending error notification:', err));
        }
    }, [availabilityError, marketplaceError]);

    useEffect(() => {
        // Heartbeat check elke 30 minuten
        const heartbeatInterval = setInterval(() => {
            if (!availabilityError && !marketplaceError) {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: 'Alles draait nog steeds. Alle API\'s zijn bereikbaar.',
                        type: 'status'
                    })
                }).catch(err => console.error('Error sending heartbeat notification:', err));
            }
        }, 30 * 60 * 1000); // 30 minuten in milliseconden

        // Cleanup interval bij unmount
        return () => clearInterval(heartbeatInterval);
    }, [availabilityError, marketplaceError]); // Re-setup interval als error status verandert

    useEffect(() => {
        if (availabilityData?.isAvailable && availabilityData?.retailers) {
            // Speel geluid af
            playSound();
            
            // Open alle retailer URLs in nieuwe tabbladen
            availabilityData.retailers.forEach(retailer => {
                if (retailer.url) {
                    window.open(retailer.url, '_blank');
                }
            });
        }
    }, [availabilityData?.isAvailable, availabilityData?.retailers]);

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>5090 FE Checker</span>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {(availabilityLoading || marketplaceLoading) && 
                            <ReloadIcon className="h-4 w-4 animate-spin" />
                        }
                    </div>
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div 
                            className={cn(
                                "w-2 h-2 rounded-full",
                                apiStatus.partner ? "bg-green-500" : "bg-red-500"
                            )} 
                        />
                        <span className="text-sm">Partner API</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div 
                            className={cn(
                                "w-2 h-2 rounded-full",
                                apiStatus.direct ? "bg-green-500" : "bg-red-500"
                            )} 
                        />
                        <span className="text-sm">Direct API</span>
                    </div>
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {availabilityError && (
                    <Alert variant="destructive">
                        <AlertDescription className="flex items-center justify-between">
                            <span>
                                API tijdelijk niet beschikbaar
                                {availabilityData?.fromCache && " (gebruik makend van cached data)"}
                            </span>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => mutateAvailability()}
                                className="ml-2"
                            >
                                <ReloadIcon className="mr-2 h-4 w-4" />
                                Opnieuw proberen
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {availabilityData?.retailers && availabilityData.retailers.map((retailer, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium">{retailer.name}</h4>
                            <Badge variant="success">Beschikbaar</Badge>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(retailer.url, '_blank')}
                        >
                            <ExternalLinkIcon className="mr-2 h-4 w-4" />
                            Bekijk Product
                        </Button>
                    </div>
                ))}

                {!availabilityData?.isAvailable && (
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium">Voorraad</h4>
                            <Badge variant="secondary">Niet beschikbaar</Badge>
                        </div>
                    </div>
                )}

                <Separator />

                {lastCheckTime && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                            <BellIcon className="mr-2 h-4 w-4" />
                            Laatste check was: {lastCheckTime}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 