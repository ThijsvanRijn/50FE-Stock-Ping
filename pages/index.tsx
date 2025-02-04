import Head from 'next/head';
import { ProductAvailability } from '@/components/ProductAvailability';
import { MarketplaceChecker } from '@/components/MarketplaceChecker';
import { TelegramCard } from '@/components/TelegramCard';
import { useEffect } from 'react';

export default function Home() {
    useEffect(() => {
        // Stuur startup notificatie
        fetch('/api/send-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: '🟢 NVIDIA Checker is gestart en actief',
                url: null
            })
        }).catch(err => console.error('Error sending startup notification:', err));
    }, []); // Leeg dependency array -> runt alleen bij mount

    return (
        <>
            <Head>
                <title>NVIDIA RTX 5090 FE Checker</title>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Check 5090 FE voorraad bij NVIDIA en retailers" />
                <meta name="theme-color" content="#000000" />
            </Head>
            <main className="min-h-screen flex flex-col items-center justify-center p-4">
                <ProductAvailability />
                <MarketplaceChecker />
                <TelegramCard />
            </main>
        </>
    );
} 