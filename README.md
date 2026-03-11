# FiscalColumn Frontend

Frontend application for FiscalColumn — a finance news, gold/silver rates, and calculators platform.

## Setup

Install dependencies:
```bash
npm install
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

The server starts on `http://localhost:3000`.

## Requirements

- Strapi backend running on `http://localhost:1337` (or set `STRAPI_URL` env var)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `STRAPI_URL` | `http://localhost:1337` | Strapi backend URL |
| `STRAPI_API_PATH` | `/api` | Strapi API path |
| `SITE_URL` | `http://localhost:3000` | Public site URL (for sitemap, OG tags) |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin (comma-separated for multiple) |

## Pages

| Route | Page |
|---|---|
| `/` | Homepage |
| `/:category` | Category listing |
| `/:category/:article` | Article detail |
| `/tag/:slug` | Tag listing |
| `/calculators/:slug` | Calculator |
| `/gold-rates/:page` | Gold rate page |
| `/silver-rates/:page` | Silver rate page |
| `/about-us`, `/privacy-policy`, etc. | Static pages |
| `/sitemap.xml` | Auto-generated sitemap |
