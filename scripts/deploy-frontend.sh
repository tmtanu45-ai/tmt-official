#!/bin/bash
# Deploy frontend to Cloudflare Pages

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting frontend deployment...${NC}"

cd "$(dirname "$0")/../frontend"

# Build
echo -e "${YELLOW}Building frontend...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Deploy to Cloudflare Pages
echo -e "${YELLOW}Deploying to Cloudflare Pages...${NC}"
npx wrangler pages deploy dist --project-name=tmt-esports-frontend

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Frontend deployment complete!${NC}"