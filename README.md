# CloverCLI

A powerful CLI tool for interacting with Clover POS merchant accounts.

## Installation

```bash
npm install -g clovercli
```

## Quick Start

1. **Authenticate with your Clover app:**
   ```bash
   clovercli auth login --client-id YOUR_APP_ID --client-secret YOUR_APP_SECRET
   ```

2. **Check your merchant info:**
   ```bash
   clovercli merchant get
   ```

3. **List inventory items:**
   ```bash
   clovercli inventory items list
   ```

## Commands

### Authentication
- `clovercli auth login` - OAuth login (opens browser)
- `clovercli auth status` - Check auth status
- `clovercli auth refresh` - Refresh access token
- `clovercli auth logout` - Clear stored credentials

### Merchant
- `clovercli merchant get` - Get merchant details

### Inventory
- `clovercli inventory items list` - List items
- `clovercli inventory items get <id>` - Get specific item
- `clovercli inventory items create --name "Widget" --price 1999` - Create item
- `clovercli inventory items update <id> --price 2499` - Update item
- `clovercli inventory items delete <id>` - Delete item
- `clovercli inventory categories list` - List categories
- `clovercli inventory categories create --name "Electronics"` - Create category

### Orders
- `clovercli orders list` - List orders
- `clovercli orders get <id>` - Get order details
- `clovercli orders create --total 4999` - Create order
- `clovercli orders add-item <order_id> --item-id <item_id>` - Add line item
- `clovercli orders update <id> --note "Rush delivery"` - Update order
- `clovercli orders delete <id>` - Delete order

### Raw API Access
- `clovercli api get /v3/merchants/{mId}/items` - Direct API call
- `clovercli api post /v3/merchants/{mId}/items --data '{"name":"Test","price":100}'`

## Output Formats

```bash
# Default: human-readable table
clovercli orders list

# JSON output
clovercli orders list --output json

# Quiet mode (just IDs)
clovercli orders list --quiet
```

## Environment Variables

```bash
CLOVER_CLIENT_ID=...
CLOVER_CLIENT_SECRET=...
CLOVER_MERCHANT_ID=...
CLOVER_ACCESS_TOKEN=...
CLOVER_REGION=us|eu|la|sandbox
```

## Regions

- `us` - North America (default)
- `eu` - Europe
- `la` - Latin America
- `sandbox` - Sandbox/Development

## License

MIT
