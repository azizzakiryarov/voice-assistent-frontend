# Steg 1: Bygg React-appen
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Steg 2: Servera med nginx
FROM nginx:stable-alpine

# Ta bort default nginx statisk sida
RUN rm -rf /usr/share/nginx/html/*

# Kopiera byggda filer från builder-steget
COPY --from=builder /app/dist /usr/share/nginx/html


# Kopiera custom nginx config om du har en (valfritt)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]

# Bygg och kör containern

#podman build -f Dockerfile -t azizzakiryarov/voice-assistant-frontend:latest .

#podman push azizzakiryarov/voice-assistant-frontend:latest