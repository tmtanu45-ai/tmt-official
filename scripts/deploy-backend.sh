#!/bin/bash
# Deploy backend to Serv00

set -euo pipefail

# Configuration
REMOTE_USER="your-username"
REMOTE_HOST="your-serv00-server"
REMOTE_PATH="/home/your-username/tmt-esports-backend"
SSH_KEY="~/.ssh/id_ed25519"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting backend deployment...${NC}"

# Build locally first
echo -e "${YELLOW}Building backend...${NC}"
cd "$(dirname "$0")/../backend"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
tar -czf /tmp/backend-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=*.log \
    --exclude=.env \
    --exclude=dist \
    --exclude=*.tar.gz \
    -C "$(dirname "$0")/.." \
    backend/dist \
    backend/node_modules \
    backend/package.json \
    backend/.env.example

# Copy to server
echo -e "${YELLOW}Copying to server...${NC}"
scp -i "$SSH_KEY" /tmp/backend-deploy.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

# Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
set -euo pipefail

cd /home/your-username/tmt-esports-backend

# Backup current version
if [ -d "dist" ]; then
    mv dist dist.backup.$(date +%Y%m%d_%H%M%S)
fi

# Extract new version
tar -xzf /tmp/backend-deploy.tar.gz -C /home/your-username

# Install production dependencies
cd /home/your-username/tmt-esports-backend
npm ci --production

# Run migrations
npm run db:migrate

# Restart PM2
pm2 reload tmt-esports-api --update-env

# Cleanup
rm /tmp/backend-deploy.tar.gz

echo "Deployment complete!"
ENDSSH

# Cleanup local
rm /tmp/backend-deploy.tar.gz

echo -e "${GREEN}Backend deployment complete!${NC}"