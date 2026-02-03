# CloverCLI

A command-line interface for the Clover POS API. Manage merchants, inventory, and orders from your terminal.

## Installation

```bash
npm install -g clovercli
```

Or clone and link locally:

```bash
git clone https://github.com/Versatly/clovercli.git
cd clovercli
npm install
npm run build
npm link
```

## Quick Start

### 1. Authenticate

```bash
clovercli auth login --client-id YOUR_APP_ID --client-secret YOUR_APP_SECRET
```

This opens a browser for OAuth2 authentication. After authorizing, your credentials are stored securely.

### 2. View Merchant Info

```bash
clovercli merchant get
```

### 3. Manage Inventory

```bash
# List items
clovercli inventory items list

# Create an item
clovercli inventory items create --name "Coffee" --price 350 --sku "COF001"

# Update an item
clovercli inventory items update ITEM_ID --price 400
```

### 4. Manage Orders

```bash
# List orders
clovercli orders list

# Create an order
clovercli orders create --note "Table 5"

# Add item to order
clovercli orders add-item ORDER_ID --item-id ITEM_ID --quantity 2
```

## Global Options

| Option | Description |
|--------|-------------|
| `-o, --output <format>` | Output format: `json`, `table`, `quiet` (default: table) |
| `--merchant <id>` | Specify merchant ID (uses default if not provided) |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Environment Variables

Instead of using `auth login`, you can set:

```bash
export CLOVER_MERCHANT_ID=your_merchant_id
export CLOVER_ACCESS_TOKEN=your_access_token
export CLOVER_REGION=us  # us, eu, la, or sandbox
```

## Regions

- `us` - United States (default)
- `eu` - Europe
- `la` - Latin America
- `sandbox` - Development/testing

## Commands

### Auth
- `auth login` - Authenticate via OAuth2
- `auth status` - Show authentication status
- `auth refresh` - Refresh access token
- `auth logout` - Remove stored credentials
- `auth default <merchant-id>` - Set default merchant

### Merchant
- `merchant get` - Get merchant details

### Inventory
- `inventory items list` - List items
- `inventory items get <id>` - Get item details
- `inventory items create` - Create item
- `inventory items update <id>` - Update item
- `inventory items delete <id>` - Delete item
- `inventory categories list` - List categories
- `inventory categories create` - Create category
- `inventory stock get <item-id>` - Get stock level
- `inventory stock update <item-id>` - Update stock level

### Orders
- `orders list` - List orders
- `orders get <id>` - Get order details
- `orders create` - Create order
- `orders update <id>` - Update order
- `orders delete <id>` - Delete order
- `orders add-item <order-id>` - Add line item to order

## License

MIT
