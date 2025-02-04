# NVIDIA RTX 5090 FE Checker

Een geavanceerde real-time voorraad checker voor de NVIDIA RTX 5090 Founders Edition. Deze applicatie monitort continu verschillende officiële NVIDIA bronnen om de beschikbaarheid van de grafische kaart te controleren. Het systeem checkt zowel de NVIDIA Partner API, Direct Store, als de Marketplace en kan automatisch product pagina's openen zodra er voorraad beschikbaar is.

De checker is ontworpen om betrouwbaar en snel te zijn, met ingebouwde error handling, automatische recovery, en een cache systeem om API limieten te respecteren. Het biedt real-time status updates via de interface en kan configureerd worden om notificaties te sturen via browser meldingen en Telegram.

## Functies

- Real-time voorraad monitoring
- Automatische browser notificaties
- Telegram integratie voor meldingen
- Dark/Light mode ondersteuning
- Automatisch openen van product pagina's bij beschikbaarheid
- Status indicators voor API bereikbaarheid

## Installatie

1. Clone de repository:
bash
git clone https://github.com/jouw-username/nvidia-checker.git
cd nvidia-checker

2. Installeer dependencies:
bash
npm install

3. Start de development server:
bash
npm run dev

Of build voor productie:
bash
npm run build
npm start

## Test Mode

Voor het testen van de verschillende scenarios, ga naar `pages/api/check-availability.ts` en zet de `TEST_MODE` constante op `true`:

Test tijden:
- 11:17 - Beschikbaar bij beide (Partner + Direct)
- 11:18 - Alleen Partner beschikbaar
- 11:19 - Alleen Direct beschikbaar
- 11:20 - Alleen Marketplace beschikbaar
- 11:21 - Nergens beschikbaar
- 11:23 - Server error
- 11:25 - Timeout error

## Telegram Integratie

1. Maak een Telegram bot via @BotFather
2. Configureer de bot token en chat ID in de applicatie
3. Schakel notificaties in via de interface

De bot stuurt meldingen voor:
- Product beschikbaarheid
- API status veranderingen
- Heartbeat updates (elke 30 minuten)
- Error meldingen

## Technische Details

### API Endpoints

- `/api/check-availability` - Checkt NVIDIA Partner en Direct APIs
- `/api/check-marketplace` - Checkt NVIDIA Marketplace
- `/api/send-notification` - Verzendt Telegram notificaties

### Refresh Intervals

- API checks: elke 15-20 seconden
- Heartbeat: elke 30 minuten
- Error recovery: automatisch na 35 seconden timeout

### Browser Notificaties

De applicatie vraagt toestemming voor browser notificaties en speelt een geluid af wanneer:
- Een product beschikbaar komt
- De status verandert

## Technologieën

- Next.js 14
- TypeScript
- Tailwind CSS
- SWR voor data fetching
- Radix UI componenten
- Web Audio API voor notificaties

## Development

Voor lokale ontwikkeling:
```bash
npm run dev
```

De applicatie draait dan op `http://localhost:3000`

## Productie

Voor productie build:
```bash
npm run build
npm start
```

## Bijdragen

Pull requests zijn welkom. Voor grote wijzigingen, open eerst een issue om te bespreken wat je wilt veranderen.