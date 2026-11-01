FROM docker.io/library/node:26-slim

# Install the headless shell Chromium
RUN npm install -g playwright && \
    npx playwright install-deps chromium
RUN npx playwright install --only-shell chromium

WORKDIR /app

COPY src src
COPY package.json package.json
COPY package-lock.json package-lock.json

RUN adduser -D chrome && chown -R chrome:chrome /app
USER chrome

RUN npm ci

EXPOSE 8080

CMD ["npm", "run", "start"]
