# This script builds the Docker image for the voice assistant frontend and pushes it to the Docker registry.
set -e

npm ci
npm run lint
if node -e "process.exit(require('./package.json').scripts?.test ? 0 : 1)"; then
    npm test
else
    echo "No frontend test script found; continuing after lint."
fi
npm run build

podman build -f Dockerfile -t azizzakiryarov/voice-assistant-frontend:latest . 

# Check if the build was successful
if [ $? -ne 0 ]; then
    echo "Docker build failed. Exiting."
    exit 1
fi
# Push the image to the Docker registry    
podman push azizzakiryarov/voice-assistant-frontend:latest            
