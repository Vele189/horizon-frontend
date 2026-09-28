#!/bin/sh
# Writes /config.js from the environment, so one image serves every
# environment. Values are JSON-escaped by hand: only backslash and double quote
# can break out of a JS string, and a URL has no business containing either.
set -eu

escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cat > /usr/share/nginx/html/config.js <<CONFIG
window.__HORIZON__ = {
  apiUrl: "$(escape "${API_URL:-}")",
  dashboardUrl: "$(escape "${DASHBOARD_URL:-}")",
};
CONFIG

echo "runtime config: apiUrl=${API_URL:-<unset>}"
