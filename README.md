# Horizon frontend

The React app for the Climate Volatility & Risk Engine. It reads the
read-only API in [`horizon-backend`](https://github.com/Vele189/horizon-backend)
and draws the four views the Streamlit dashboard draws today. Until all four
are ported, views that are not yet here link to the dashboard.

| View | Status |
|---|---|
| Anomaly Map | Not yet ported |
| Climate Matrix | Ported |
| Storm Dynamics | Not yet ported |
| Risk Horizon | Not yet ported |

Vite, React 19, TypeScript, React Router, TanStack Query, Plotly.js.

## Development

Node 22 (see `.nvmrc`). The API must be running and must list
`http://localhost:5173` in its `API_CORS_ORIGINS`.

```bash
npm ci
npm run dev            # http://localhost:5173, API at http://localhost:8000
npm test               # vitest
npm run lint && npm run typecheck
```

The API URL in development comes from `public/config.js`.

## API types

`src/api/schema.d.ts` is generated from the API's OpenAPI schema. When the
API changes:

```bash
# in horizon-backend
python -m api.openapi > ../horizon-frontend/openapi.json
# here
npm run api:types
```

Commit both `openapi.json` and `src/api/schema.d.ts`, so a review shows what
the contract change was.

## Container

```bash
docker build -t horizon-frontend .
docker run --rm -p 8080:8080 -e API_URL=http://localhost:8000 horizon-frontend
```

nginx serves the built files. At start-up the container writes `/config.js`
from `API_URL` and `DASHBOARD_URL` (see `.env.example`), so the same image runs
in every environment; nothing environment-specific is baked into the build.
`/healthz` answers without touching the API.

## Deployment

Railway builds the `Dockerfile` on every push to `master` (`railway.toml`),
after CI passes. Set `API_URL` (and `DASHBOARD_URL` until parity) on the
service. `PORT` is injected by Railway.

When the API changes, deploy the backend first. The API only adds fields
within `/v1`, so an older frontend keeps working against a newer API.
