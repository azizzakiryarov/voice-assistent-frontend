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

## Struktur

```text
src/
├── App.jsx          # Inloggning, uppgiftslista, röstinspelning och godkännande
├── api.js           # Alla anrop till backend (axios, CSRF-token via cookie)
└── components/      # Röstinspelning, textanalys, formulärskanning och uppgiftslista
```

Byggs till statiska filer som serveras av NGINX i produktion (`Dockerfile`, `nginx.conf`).
