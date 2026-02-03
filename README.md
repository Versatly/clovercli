# CloverCLI

Clover POS CLI for merchants and developers.

## Install
```bash
npm install -g clovercli
```

## Quick Start
```bash
clovercli auth login --client-id YOUR_ID --client-secret YOUR_SECRET
clovercli merchant get
clovercli inventory items list
clovercli orders list
```

## Commands
- `auth` - login, status, refresh, logout
- `merchant` - get
- `inventory` - items (list/get/create/update/delete), categories (list/create)
- `orders` - list, get, create, add-item, delete
- `payments` - list, get, refund
- `customers` - list, get, create, delete
- `employees` - list, get, me
- `reports` - sales, export
- `api` - raw API access

## Output
```bash
clovercli orders list --output json
clovercli orders list --quiet  # IDs only
```

## Regions
us (default), eu, la, sandbox
