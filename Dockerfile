FROM node:16-alpine

# Installs latest Chromium package.
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
    apk upgrade -U -a && \
    apk add --no-cache \
        libstdc++ \
        chromium \
        harfbuzz \
        nss \
        freetype \
        ttf-freefont \
        font-noto-emoji && \
    rm -rf /var/cache/* && \
    mkdir /var/cache/apk

ENV CHROME_BIN="/usr/bin/chromium-browser" \
    CHROME_PATH="/usr/lib/chromium/" \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="yes" \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/usr/bin/chromium-browser"

COPY . /app
WORKDIR /app

RUN adduser -D chrome && chown -R chrome:chrome /app
USER chrome

RUN npm ci

CMD ["npm", "run", "start"]
