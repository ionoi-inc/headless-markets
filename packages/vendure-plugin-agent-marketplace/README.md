# Vendure Agent Marketplace Plugin

A custom Vendure plugin that powers the AI trading agent marketplace for Headless Markets.

## Features

- Agent listing and discovery with filtering/sorting
- E-commerce integration via Vendure Products
- Performance tracking (win rate, profit, volume)
- License management (perpetual, subscription, pay-per-use)
- Smart contract integration for on-chain agents
- Revenue sharing with platform commission
- Admin verification workflow
- Separate Admin and Shop GraphQL APIs

## Installation

```bash
npm install @headless-markets/vendure-plugin-agent-marketplace
```

## Usage

### 1. Add to Vendure Config

```typescript
import { AgentMarketplacePlugin } from '@headless-markets/vendure-plugin-agent-marketplace';

const config: VendureConfig = {
  // ... other config
  plugins: [
    // ... other plugins
    AgentMarketplacePlugin.init({
      // Plugin options
    }),
  ],
};
```

### 2. Run Database Migrations

The plugin adds a new `AgentEntity` table. Run migrations after adding the plugin:

```bash
npm run migration:generate
npm run migration:run
```

## GraphQL API

### Admin API

Full CRUD operations for managing agents:

```graphql
# Query all agents
query {
  agents(options: { category: "trading", sortBy: "successRate" }) {
    items {
      id
      name
      description
      category
      successRate
      totalProfit
      isVerified
    }
    totalItems
  }
}

# Create agent
mutation {
  createAgent(
    input: {
      name: "Alpha Trader Bot"
      description: "High-frequency trading agent"
      category: "trading"
      ownerAddress: "0x..."
      licenseTerms: { type: "subscription", price: 99, currency: "USD" }
    }
  ) {
    id
    name
    isVerified
  }
}

# Verify agent (admin only)
mutation {
  verifyAgent(id: "123") {
    id
    isVerified
  }
}

# Update performance metrics
mutation {
  updateAgentPerformance(
    id: "123"
    metrics: {
      totalTrades: 1000
      successRate: 67.5
      totalProfit: 12500
      totalVolume: 500000
    }
  ) {
    id
    successRate
    totalProfit
  }
}
```

### Shop API

Read-only queries for customers (only verified agents shown):

```graphql
# Query active agents
query {
  activeAgents(options: { sortBy: "successRate" }) {
    items {
      id
      name
      description
      category
      successRate
      totalProfit
      licenseTerms
    }
    totalItems
  }
}

# Get agents by category
query {
  agentsByCategory(category: "sports") {
    id
    name
    successRate
  }
}

# Get single agent
query {
  agent(id: "123") {
    id
    name
    description
    totalTrades
    successRate
  }
}
```

## Data Model

### Agent Entity

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  category: string; // 'trading' | 'sports' | 'politics' | 'defi'
  ownerAddress: string; // Ethereum address
  productId?: string; // Linked Vendure Product ID
  totalTrades: number;
  successRate: number; // 0-100
  totalProfit: number; // USD
  totalVolume: number; // USD
  licenseTerms?: {
    type: 'perpetual' | 'subscription' | 'pay-per-use';
    price: number;
    currency: string;
  };
  onChainAddress?: string; // Smart contract address
  strategyConfig?: any; // Agent-specific config
  isActive: boolean;
  isVerified: boolean;
  platformCommission: number; // 0-100
}
```

## Integration with Vendure Products

To enable purchases, link agents to Vendure Products:

1. Create a Product in Vendure for each agent
2. Store the `productId` on the Agent entity
3. Use Vendure's cart/checkout flow for purchases
4. Handle post-purchase licensing in order workflows

## Smart Contract Integration

### Storing On-Chain Address

```typescript
await agentService.update(ctx, agentId, {
  onChainAddress: '0x...', // Deployed agent contract
});
```

### Strategy Configuration

```typescript
await agentService.update(ctx, agentId, {
  strategyConfig: {
    riskLevel: 'medium',
    maxPositionSize: 1000,
    stopLossPercent: 5,
  },
});
```

## Performance Tracking

Update agent performance metrics from external systems:

```typescript
await agentService.updatePerformance(ctx, agentId, {
  totalTrades: 1500,
  successRate: 68.2,
  totalProfit: 15000,
  totalVolume: 750000,
});
```

## Revenue Sharing

Each agent has a `platformCommission` field (default 10%):

```typescript
const agentRevenue = purchasePrice * (1 - agent.platformCommission / 100);
const platformRevenue = purchasePrice * (agent.platformCommission / 100);
```

Implement revenue distribution in Vendure order workflows or external payment processing.

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Testing

```bash
npm test
```

## Next Steps

### TODO: Product Integration
- [ ] Auto-create Vendure Product when agent is verified
- [ ] Sync agent metadata to product custom fields
- [ ] Handle product variants for different license types

### TODO: Order Workflows
- [ ] Post-purchase license key generation
- [ ] Agent access provisioning
- [ ] Usage tracking for pay-per-use licenses
- [ ] Subscription renewal handling

### TODO: Advanced Features
- [ ] Agent performance leaderboard
- [ ] User reviews and ratings
- [ ] Agent categories taxonomy
- [ ] Featured agents
- [ ] Agent recommendations
- [ ] Analytics dashboard

### TODO: Smart Contract Integration
- [ ] Event listeners for on-chain agent activity
- [ ] Automatic performance metric updates from blockchain
- [ ] Agent deployment automation
- [ ] Revenue distribution via smart contracts

## Architecture

```
vendure-plugin-agent-marketplace/
├── src/
│   ├── plugin.ts              # Main plugin definition
│   ├── entities/
│   │   └── agent.entity.ts    # TypeORM entity
│   ├── services/
│   │   └── agent.service.ts   # Business logic
│   ├── api/
│   │   ├── api-extensions.ts  # GraphQL schema
│   │   ├── agent-admin.resolver.ts
│   │   └── agent-shop.resolver.ts
│   └── index.ts               # Exports
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Links

- [Vendure Documentation](https://docs.vendure.io)
- [Plugin Development Guide](https://docs.vendure.io/guides/developer-guide/plugins/)
- [Headless Markets GitHub](https://github.com/ionoi-inc/headless-markets)

---

**Status**: Scaffolding Complete
**Issue**: #5
**Last Updated**: 2026-02-11
