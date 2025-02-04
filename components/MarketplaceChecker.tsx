import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReloadIcon, ExternalLinkIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { playSound } from './Beeper';
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface MarketplaceStatus {
    isAvailable: boolean;
    url?: string;
    error?: string;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API request failed');
    return res.json();
};

export function MarketplaceChecker() {
    const { data, error, isLoading, mutate } = useSWR<MarketplaceStatus>(
        '/api/check-marketplace',
        fetcher,
        { 
            refreshInterval: 20000,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            errorRetryCount: Infinity,
            refreshWhenHidden: true,
            refreshWhenOffline: true,
            onSuccess: (data) => {
                console.log('Marketplace check success:', data);
            },
            onError: (err) => {
                console.error('Error fetching marketplace:', err);
                setTimeout(() => mutate(), 20000);
            }
        }
    );

    const [prevAvailability, setPrevAvailability] = useState<boolean>(false);

    useEffect(() => {
        if (data?.isAvailable && !prevAvailability) {
            // Speel geluid af bij verandering naar beschikbaar
            playSound();
            
            // Open de marketplace URL
            if (data.url) {
                window.open(data.url, '_blank');
            }
        }
        
        // Update vorige status
        setPrevAvailability(data?.isAvailable || false);
    }, [data?.isAvailable, data?.url, prevAvailability]);

    // Extra recovery mechanisme
    useEffect(() => {
        if (isLoading) {
            const timeout = setTimeout(() => {
                console.log('Manual marketplace timeout recovery...');
                mutate();
            }, 35000);
            return () => clearTimeout(timeout);
        }
    }, [isLoading, mutate]);

    // Forceer periodieke updates
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Forcing marketplace check...');
            mutate();
        }, 20000);

        return () => clearInterval(interval);
    }, [mutate]);

    // Bepaal de status van de marketplace check
    const getCheckStatus = () => {
        if (error) return "error";
        if (isLoading) return "waiting";
        return "active";
    };

    const status = getCheckStatus();

    useEffect(() => {
        if (error) {
            // Stuur error notificatie
            fetch('/api/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Marketplace API is niet bereikbaar',
                    type: 'error'
                })
            }).catch(err => console.error('Error sending error notification:', err));
        }
    }, [error]);

    return (
        <Card className="w-full max-w-lg mt-4">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Marketplace Checker</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Meer informatie"
                            >
                                <InfoCircledIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <p className="text-sm text-muted-foreground">
                                We controleren de Marketplace pagina op aanpassingen die kunnen duiden op beschikbaarheid van de 5090 FE.
                            </p>
                        </PopoverContent>
                    </Popover>
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div 
                            className={cn(
                                "w-2 h-2 rounded-full",
                                {
                                    "bg-green-500": status === "active",
                                    "bg-yellow-500": status === "waiting",
                                    "bg-red-500": status === "error"
                                }
                            )} 
                        />
                        <span className="text-sm">Marketplace API</span>
                    </div>
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium">Marketplace Status</h4>
                        <Badge variant={data?.isAvailable ? "success" : "secondary"}>
                            {data?.isAvailable ? 'Beschikbaar' : 'Niet beschikbaar'}
                        </Badge>
                    </div>
                    
                    {data?.isAvailable && data.url && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(data.url, '_blank')}
                        >
                            <ExternalLinkIcon className="mr-2 h-4 w-4" />
                            Bekijk in Marketplace
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 