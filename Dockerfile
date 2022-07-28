FROM ubuntu:focal

# Install node v16
RUN apt-get update && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Install Playwright
RUN npm install -g playwright && \
    npx playwright install-deps chromium && \
    npx playwright install chromium

COPY . /app

WORKDIR /app

RUN npm ci

CMD ["npm", "run", "start"]
