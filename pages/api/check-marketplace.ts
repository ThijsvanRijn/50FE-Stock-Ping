import type { NextApiRequest, NextApiResponse } from 'next';

const MARKETPLACE_URL = 'https://marketplace.nvidia.com/nl-nl/consumer/graphics-cards/';

const TEST_SCENARIOS = {
    AVAILABLE: { hour: 19, minute: 8 },     // Marketplace beschikbaar
    UNAVAILABLE: { hour: 19, minute: 9 },   // Marketplace niet beschikbaar
} as const;

const TEST_TIMES = Object.values(TEST_SCENARIOS);

const TEST_MODE = false; // Zet op true om test scenarios te activeren

interface MarketplaceResponse {
    isAvailable: boolean;
    url?: string;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<MarketplaceResponse>
) {
    // Test mode logica
    if (TEST_MODE) {
        const now = new Date();
        const currentTime = {
            hour: now.getHours(),
            minute: now.getMinutes()
        };

        const matchingTime = TEST_TIMES.find(
            time => time.hour === currentTime.hour && time.minute === currentTime.minute
        );

        if (matchingTime) {
            if (matchingTime === TEST_SCENARIOS.AVAILABLE) {
                return res.status(200).json({
                    isAvailable: true,
                    url: MARKETPLACE_URL
                });
            }

            if (matchingTime === TEST_SCENARIOS.UNAVAILABLE) {
                return res.status(200).json({
                    isAvailable: false
                });
            }
        }

        // Default test response
        return res.status(200).json({
            isAvailable: false
        });
    }

    // Productie logica (bestaande code)
    try {
        const response = await fetch(MARKETPLACE_URL);
        const html = await response.text();
        
        // Check voor de marketplace software beschikbaarheid
        // We zoeken naar tekst die aangeeft dat de marketplace software beschikbaar is
        const hasMarketplace = html.includes('Koop nu') || html.includes('Buy Now');
        const isAvailable = hasMarketplace && !html.includes('Niet op voorraad');
        
        return res.status(200).json({
            isAvailable,
            url: isAvailable ? MARKETPLACE_URL : undefined
        });
    } catch (error) {
        console.error('Error checking marketplace:', error);
        return res.status(500).json({
            isAvailable: false,
            error: 'Er ging iets mis bij het checken van de marketplace'
        });
    }
} 