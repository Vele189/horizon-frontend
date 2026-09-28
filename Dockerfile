# Build the static app, then serve it with nginx.
#
#     docker build -t horizon-frontend .
#     docker run --rm -p 8080:8080 -e API_URL=http://localhost:8000 horizon-frontend

FROM node:22-alpine AS build
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
# The official image runs envsubst over /etc/nginx/templates/*.template at
# start-up, so the listen port comes from Railway's $PORT.
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
# ...and runs every script in /docker-entrypoint.d before nginx starts.
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh \
 && chown -R nginx /usr/share/nginx/html

ENV PORT=8080 \
    API_URL=http://localhost:8000 \
    DASHBOARD_URL=
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
