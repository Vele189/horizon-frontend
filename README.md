# Horizon frontend

The React app for the Climate Volatility & Risk Engine. It reads the
read-only API in [`horizon-backend`](https://github.com/Vele189/horizon-backend)
and draws the four views the Streamlit dashboard draws, redesigned for a
reader who does not think in standard deviations: every view leads with its
question in plain words and answers it in a sentence before the chart.

| View | Nav label | What it shows |
|---|---|---|
| Anomaly Map | Map | Full-screen dark world map in the style of weather maps: each city labelled with how far it sits from its normal (or its temperature), a day timeline with play, and jumps to documented extremes |
| Climate Matrix | Extremes over time | Extreme hot or cold days per year for one city with its trend line, and every city's change per decade |
| Storm Dynamics | Wind & pressure | Typical gusts by size of pressure swing, how strongly each city follows it, and every day of one city as a scatter |
| Risk Horizon | Week ahead | Each city's chance of an extreme day this week, a gauge and day-by-day chances for the chosen city |

Vite, React 19, TypeScript, React Router, TanStack Query, Leaflet, Google Charts.

### Third-party hosts

The browser loads three things from outside the app, so a Content Security
Policy, if one is added, must allow them:

- `www.gstatic.com`: Google Charts, which is only distributed from there and is
  loaded on first use (`src/charts/google.ts`).
- `*.basemaps.cartocdn.com`: the map's dark basemap tiles (CARTO, from
  OpenStreetMap data; attribution is shown on the map).
- `fonts.googleapis.com` and `fonts.gstatic.com`: the Inter typeface.

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
from `API_URL` (see `.env.example`), so the same image runs
in every environment; nothing environment-specific is baked into the build.
`/healthz` answers without touching the API.

## Deployment

Railway builds the `Dockerfile` on every push to `master` (`railway.toml`),
after CI passes. Set `API_URL` on the service. All four views are ported,
so `DASHBOARD_URL` is no longer read by any view. `PORT` is injected by Railway.

When the API changes, deploy the backend first. The API only adds fields
within `/v1`, so an older frontend keeps working against a newer API.
