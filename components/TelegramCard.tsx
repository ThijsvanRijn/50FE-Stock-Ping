"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InfoCircledIcon, Link2Icon, LinkNone2Icon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

interface FormEvent {
    target: {
        value: string;
    };
}

export function TelegramCard() {
    const [isConfigured, setIsConfigured] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)
    const [showConfig, setShowConfig] = useState(false)
    const [token, setToken] = useState("")
    const [chatId, setChatId] = useState("")

    // Laad opgeslagen configuratie
    useEffect(() => {
        const savedToken = localStorage.getItem("telegram_token")
        const savedChatId = localStorage.getItem("telegram_chat_id")
        const savedEnabled = localStorage.getItem("telegram_enabled") === "true"
        
        if (savedToken && savedChatId) {
            setToken(savedToken)
            setChatId(savedChatId)
            setIsConfigured(true)
            setIsEnabled(savedEnabled)
        } else {
            // Als er geen configuratie is, zet alles uit
            setIsConfigured(false)
            setIsEnabled(false)
            localStorage.removeItem("telegram_enabled")
        }
    }, [])

    const handleSave = async () => {
        if (token && chatId) {
            try {
                // Test de configuratie eerst
                const testResponse = await fetch(
                    `https://api.telegram.org/bot${token}/sendMessage`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: '🔄 NVIDIA Checker is verbonden'
                        })
                    }
                );

                if (!testResponse.ok) {
                    throw new Error('Invalid token or chat ID');
                }

                // Als de test slaagt, sla de configuratie op
                localStorage.setItem("telegram_token", token);
                localStorage.setItem("telegram_chat_id", chatId);
                localStorage.setItem("telegram_enabled", "true");
                
                // Zet cookies
                document.cookie = `telegram_token=${token}; path=/`;
                document.cookie = `telegram_chat_id=${chatId}; path=/`;
                document.cookie = `telegram_enabled=true; path=/`;
                
                setIsConfigured(true);
                setIsEnabled(true);
                setShowConfig(false);

                // Stuur bevestigingsbericht via de API
                await fetch('/api/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: 'Telegram notificaties zijn succesvol geconfigureerd',
                        type: 'startup'
                    })
                });
            } catch (error) {
                console.error('Error configuring Telegram:', error);
                alert('Ongeldige bot token of chat ID. Controleer de gegevens en probeer opnieuw.');
            }
        }
    }

    const handleReset = () => {
        localStorage.removeItem("telegram_token")
        localStorage.removeItem("telegram_chat_id")
        localStorage.removeItem("telegram_enabled")
        setToken("")
        setChatId("")
        setIsConfigured(false)
        setIsEnabled(false)
        setShowConfig(false)
    }

    const toggleEnabled = async () => {
        if (isConfigured) {
            const newState = !isEnabled;
            
            // Stuur eerst de notificatie (terwijl de oude status nog actief is)
            if (isEnabled) { // Als we gaan uitschakelen
                await fetch('/api/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: "NVIDIA Checker notificaties worden uitgeschakeld",
                        type: 'status'
                    })
                });
            }

            // Update dan pas de status
            setIsEnabled(newState);
            localStorage.setItem("telegram_enabled", String(newState));
            document.cookie = `telegram_enabled=${String(newState)}; path=/`;

            // Als we inschakelen, stuur dan de notificatie na de status update
            if (!isEnabled) { // Als we gaan inschakelen
                await fetch('/api/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: "NVIDIA Checker notificaties zijn ingeschakeld",
                        type: 'status'
                    })
                    
                });
            }
        }
    }

    const handleTokenChange = (e: FormEvent) => setToken(e.target.value);
    const handleChatIdChange = (e: FormEvent) => setChatId(e.target.value);

    return (
        <Card className="w-full max-w-lg mt-4">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Telegram Bot</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open("https://t.me/botfather", "_blank")}
                            title="Open BotFather instructies"
                        >
                            <InfoCircledIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div 
                            className={cn(
                                "w-2 h-2 rounded-full",
                                isConfigured && isEnabled ? "bg-green-500" : "bg-red-500"
                            )} 
                        />
                        <span className="text-sm">Bot Status</span>
                    </div>
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {!isConfigured && !showConfig && (
                    <Button 
                        variant="outline" 
                        onClick={() => setShowConfig(true)}
                    >
                        Configureer Telegram Bot
                    </Button>
                )}

                {showConfig && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bot Token</label>
                            <Input
                                type="password"
                                value={token}
                                onChange={handleTokenChange}
                                placeholder="Plak hier je bot token"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Chat ID</label>
                            <Input
                                type="text"
                                value={chatId}
                                onChange={handleChatIdChange}
                                placeholder="Plak hier je chat ID"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSave}>Opslaan</Button>
                            <Button 
                                variant="outline" 
                                onClick={() => setShowConfig(false)}
                            >
                                Annuleren
                            </Button>
                        </div>
                    </div>
                )}

                {isConfigured && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                            Telegram notificaties zijn {isEnabled ? 'ingeschakeld' : 'uitgeschakeld'}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={isEnabled ? "default" : "outline"}
                                size="sm"
                                onClick={toggleEnabled}
                                title={isEnabled ? "Schakel bot uit" : "Schakel bot in"}
                                className="px-2"
                                disabled={!isConfigured}
                            >
                                {isEnabled ? <Link2Icon className="h-4 w-4" /> : <LinkNone2Icon className="h-4 w-4" />}
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleReset}
                            >
                                Reset Configuratie
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 