import type { NextApiRequest, NextApiResponse } from 'next';

const TEST_SCENARIOS = {
    AVAILABLE_BOTH: { hour: 11, minute: 17 },      // Beschikbaar bij beide
    AVAILABLE_RETAILER: { hour: 11, minute: 18 },  // Alleen Proshop
    AVAILABLE_NVIDIA: { hour: 11, minute: 19 },   // Direct URL beschikbaar
    AVAILABLE_MARKETPLACE: { hour: 11, minute: 20 }, // Alleen Marketplace
    UNAVAILABLE: { hour: 11, minute: 21 },         // Nergens beschikbaar
    ERROR_500: { hour: 11, minute: 23 },           // Server error
    ERROR_TIMEOUT: { hour: 11, minute: 25 },       // Timeout error
} as const;

// Vervang TEST_TIMES met:
const TEST_TIMES = Object.values(TEST_SCENARIOS);

// Type definitie voor lastCheck
interface LastCheckData {
    available: boolean;
    url: string | null;
    fromCache?: boolean;
    timeout?: boolean;
}

interface CacheData {
    version: number;
    timestamp: number;
    data: LastCheckData;
    attempts: number;
    lastError?: string;
}

let cache: CacheData | null = null;

// Minimum tijd tussen API calls (in milliseconds)
const MIN_INTERVAL = 15000; // 15 seconden

const NVIDIA_URLS = {
    BASE: 'https://store.nvidia.com/nl-nl/geforce/store/',
    API_PARTNER: 'https://api.store.nvidia.com/partner/v1/feinventory?skus=NVGFT590&locale=nl-nl',
    API_DIRECT: 'https://api.store.nvidia.com/partner/v1/feinventory?status=1&skus=PROGFTNV590&locale=NL'
} as const;

const ERROR_MESSAGES = {
    TIMEOUT: 'Request timed out',
    API_UNREACHABLE: 'API niet bereikbaar',
    UNKNOWN: 'Er ging iets mis bij het checken van beschikbaarheid'
} as const;

type AvailabilityResponse = {
    isAvailable: boolean;
    retailers?: {
        name: string;
        url: string;
    }[];
    message?: string;
}

interface PartnerApiResponse {
    products: Array<{
        inventoryStatus: {
            status: string;
        };
    }>;
}

interface DirectApiResponse {
    listMap: Array<{
        is_active: string;
        product_url: string;
    }>;
}

const RETAILER_URLS = {
    PROSHOP: 'https://www.proshop.nl/Grafische-kaart/NVIDIA-GeForce-RTX-5090-Founders-Edition/2911237',
    NVIDIA_BASE: 'https://store.nvidia.com/nl-nl/geforce/store/',
    NVIDIA_DIRECT: 'https://store.nvidia.com/nl-nl/geforce/store/gpu/?page=1&limit=9&locale=nl-nl&category=GPU&gpu=RTX%204090'
} as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
        const now = new Date();
        const currentTime = {
            hour: now.getHours(),
            minute: now.getMinutes()
        };

        const matchingTime = TEST_TIMES.find(
            time => time.hour === currentTime.hour && time.minute === currentTime.minute
        );

        if (matchingTime) {
            // Direct URL beschikbaar (19:23)
            if (matchingTime === TEST_SCENARIOS.AVAILABLE_NVIDIA) {
                return res.status(200).json({
                    isAvailable: true,
                    retailers: [{
                        name: "Nvidia Direct",
                        url: "https://store.nvidia.com/nl-nl/geforce/store/gpu/?page=1&limit=9&locale=nl-nl&category=GPU&gpu=RTX%204090"
                    }]
                });
            }

            if (matchingTime === TEST_SCENARIOS.AVAILABLE_BOTH) {
                return res.status(200).json({
                    isAvailable: true,
                    retailers: [
                        {
                            name: "NVIDIA Partner - Proshop",
                            url: process.env.NEXT_PUBLIC_TEST_MODE === 'true' 
                                ? RETAILER_URLS.PROSHOP  // Test mode: gebruik Proshop URL
                                : NVIDIA_URLS.BASE      // Productie: gebruik Partner API URL
                        },
                        {
                            name: "NVIDIA Direct",
                            url: RETAILER_URLS.NVIDIA_DIRECT
                        }
                    ],
                    partnerApiStatus: true,
                    directApiStatus: true
                });
            }

            if (matchingTime === TEST_SCENARIOS.AVAILABLE_RETAILER) {
                return res.status(200).json({
                    isAvailable: true,
                    retailers: [{
                        name: "NVIDIA Partner - Proshop",
                        url: RETAILER_URLS.PROSHOP
                    }],
                    partnerApiStatus: true,
                    directApiStatus: true
                });
            }

            if (matchingTime === TEST_SCENARIOS.AVAILABLE_MARKETPLACE) {
                return res.status(200).json({
                    isAvailable: true,
                    retailers: [{
                        name: "NVIDIA Marketplace",
                        url: "https://marketplace.nvidia.com/"
                    }],
                    partnerApiStatus: true,
                    directApiStatus: true
                });
            }

            if (matchingTime === TEST_SCENARIOS.UNAVAILABLE) {
                return res.status(200).json({
                    isAvailable: false,
                    retailers: [],
                    partnerApiStatus: true,
                    directApiStatus: true
                });
            }

            if (matchingTime === TEST_SCENARIOS.ERROR_500) {
                return res.status(500).json({
                    isAvailable: false,
                    partnerApiStatus: false,
                    directApiStatus: false,
                    error: 'Server error'
                });
            }

            if (matchingTime === TEST_SCENARIOS.ERROR_TIMEOUT) {
                return res.status(408).json({
                    isAvailable: false,
                    partnerApiStatus: false,
                    directApiStatus: false,
                    error: 'Timeout error'
                });
            }
        }

        // Default test response als geen scenario matched
        return res.status(200).json({
            isAvailable: false,
            message: "Product niet beschikbaar"
        });
    }

    try {
        const [partnerResponse, directResponse] = await Promise.all([
            fetch(NVIDIA_URLS.API_PARTNER),
            fetch(NVIDIA_URLS.API_DIRECT)
        ]);

        // Check voor geldige responses
        const partnerApiStatus = partnerResponse.ok;
        const directApiStatus = directResponse.ok;

        let partnerData = null;
        let directData = null;

        try {
            if (partnerResponse.ok) {
                partnerData = await partnerResponse.json();
            } else {
                console.warn('Partner API response not OK:', partnerResponse.status);
            }
        } catch (e) {
            console.error('Error parsing partner response:', e);
        }

        try {
            if (directResponse.ok) {
                directData = await directResponse.json();
            } else {
                console.warn('Direct API response not OK:', directResponse.status);
            }
        } catch (e) {
            console.error('Error parsing direct response:', e);
        }
        // Verwerk de data alleen als we geldige responses hebben
        const retailers: {name: string, url: string}[] = [];
        let isAvailable = false;

        if (partnerData?.products?.[0]?.inventoryStatus?.status === 'IN_STOCK') {
            retailers.push({
                name: "NVIDIA",
                url: NVIDIA_URLS.BASE
            });
            isAvailable = true;
        }

        if (directData?.listMap?.[0]?.product_url) {
            retailers.push({
                name: "NVIDIA",
                url: directData.listMap[0].product_url
            });
            isAvailable = true;
        }

        return res.status(200).json({
            isAvailable,
            retailers,
            partnerApiStatus,
            directApiStatus
        });

    } catch (error) {
        console.error('Error checking availability:', error);
        return res.status(500).json({
            isAvailable: false,
            partnerApiStatus: false,
            directApiStatus: false,
            error: 'Er ging iets mis bij het checken van de voorraad'
        });
    }
} 