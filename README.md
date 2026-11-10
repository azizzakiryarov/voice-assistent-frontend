# Röstassistent – frontend

[![CI](https://github.com/azizzakiryarov/voice-assistent-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/azizzakiryarov/voice-assistent-frontend/actions/workflows/ci.yml)

React-appen för [Röstassistent](https://github.com/azizzakiryarov/voice-assistant-backend), som gör om
röstkommandon, inklistrade mejl och fotade blanketter till uppgifter och möten i Google Tasks och
Google Calendar efter att användaren har godkänt dem.

Live: <https://voice-assistant.duckdns.org>

## Kör lokalt

Kräver Node.js 22 och en backend som körs på port 8081. Installation, konfiguration, arkitektur och
begränsningar beskrivs i [backendens README](https://github.com/azizzakiryarov/voice-assistant-backend#readme).

```bash
npm ci
npm run dev     # http://localhost:5173, API och OAuth proxas till localhost:8081
npm run lint
npm run build
```

## End-to-end-tester

Playwright kör appen som en användare: loggar in, skapar, klarmarkerar och raderar uppgifter, synkar,
spelar in ett röstkommando, analyserar ett mejl och skannar ett formulär. Frontend och backend är de
riktiga, men Google (inloggning, Tasks, Calendar), Ollama och Whisper är utbytta mot falska tjänster i
[`e2e/compose.yml`](e2e/compose.yml): mock-oauth2-server och WireMock. Testerna kontrollerar också att
inget skickas till Google förrän användaren har godkänt.

```bash
npm run e2e:services        # PostgreSQL, falsk Google-inloggning och WireMock (Docker eller Podman)
npm run e2e                 # startar backend med profilen e2e och Vite, kör testerna
npm run e2e:services:down
npm run e2e:smoke           # skrivskyddade kontroller mot produktion
```

Backend-repot förväntas ligga bredvid (`../voice-assistant-backend`), annars anges sökvägen med
`BACKEND_DIR`. Formulärtestet hoppas över om `tesseract` saknas. I CI körs sviten på varje PR och
röktestet varje morgon.

**Begränsning:** webbläsarens egen ljudinspelning testas inte. Testet byter ut mikrofonen mot en färdig
inspelning, eftersom en webbläsare utan skärm inte kan spela in ljud på ett pålitligt sätt.

## Struktur

```text
src/
├── App.jsx          # Inloggning, uppgiftslista, röstinspelning och godkännande
├── api.js           # Alla anrop till backend (axios, CSRF-token via cookie)
└── components/      # Röstinspelning, textanalys, formulärskanning och uppgiftslista
```

Byggs till statiska filer som serveras av NGINX i produktion (`Dockerfile`, `nginx.conf`).
