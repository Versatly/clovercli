# CloverCLI

A powerful command-line interface for Clover POS API integration. Manage inventory, orders, payments, customers, employees, and get comprehensive business analytics.

## Installation

```bash
git clone https://github.com/Versatly/clovercli.git
cd clovercli
npm install
npm run build
```

## Quick Start

```bash
# Set your credentials
export CLOVER_ACCESS_TOKEN="your-access-token"
export CLOVER_MERCHANT_ID="your-merchant-id"

# Check connection
node dist/index.js merchant get

# Get business dashboard
node dist/index.js reports summary
```

## Commands

| Command | Description |
|---------|-------------|
| `auth` | OAuth login, token management |
| `merchant` | Get merchant information |
| `inventory` | Items, categories, stock management |
| `orders` | Create, list, update, delete orders |
| `payments` | List payments, process refunds |
| `customers` | Customer CRUD operations |
| `employees` | List and view employees |
| `reports` | Comprehensive analytics suite |
| `api` | Raw API access for custom queries |

## Reports & Analytics

```bash
# Quick dashboard
clovercli reports summary

# Sales by date range
clovercli reports sales --from 2026-01-01 --to 2026-01-31

# Daily breakdown
clovercli reports daily --from 2026-01-01 --to 2026-01-31

# Hourly sales with visual chart
clovercli reports hourly

# Best selling items
clovercli reports top-items --limit 20

# Payment method breakdown
clovercli reports payments

# Refund summary
clovercli reports refunds

# Tax collected
clovercli reports taxes

# Export data
clovercli reports export orders --output orders.csv --format csv
clovercli reports export items --output items.json
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOVER_ACCESS_TOKEN` | Yes | API access token |
| `CLOVER_MERCHANT_ID` | Yes | Merchant ID |
| `CLOVER_REGION` | No | `us` (default), `eu`, `la`, `sandbox` |

## Output Formats

All list commands support multiple output formats:

```bash
# Table view (default)
clovercli orders list

# JSON output
clovercli orders list --output json

# IDs only (quiet mode)
clovercli orders list --quiet
```

## Raw API Access

Access any Clover API endpoint directly:

```bash
clovercli api get '/v3/merchants/{mId}/tax_rates'
clovercli api get '/v3/merchants/{mId}/tenders'
clovercli api post '/v3/merchants/{mId}/orders' --data '{"total": 1000}'
```

The `{mId}` placeholder is automatically replaced with your merchant ID.

## Regions

| Region | API Endpoint |
|--------|--------------|
| `us` | api.clover.com |
| `eu` | api.eu.clover.com |
| `la` | api.la.clover.com |
| `sandbox` | apisandbox.dev.clover.com |

## Development

```bash
# Build
npm run build

# Run directly
node dist/index.js --help

# Watch mode (requires nodemon)
npm run dev
```

## License

MIT

## Author

Versatly Holdings
