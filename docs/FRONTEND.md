# Frontend Architecture - Next.js 14 Scaffolding

This document describes the Next.js 14 frontend scaffolding structure for Headless Markets.

## Tech Stack

- **Next.js 14.2.0** - App Router with React Server Components
- **React 18.3.0** - Latest stable React with concurrent features
- **TypeScript 5** - Strict type checking enabled
- **Tailwind CSS 3.4.3** - Utility-first styling
- **Wagmi 2.5.0** - React hooks for Ethereum
- **RainbowKit 2.1.0** - Best-in-class wallet connection UI
- **TanStack Query 5.28.0** - Async state management

## Project Structure

```
headless-markets/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Homepage
│   ├── globals.css          # Global styles + Tailwind
│   ├── providers.tsx        # Web3 providers wrapper
│   ├── agents/
│   │   └── page.tsx        # Agent marketplace
│   ├── markets/
│   │   └── page.tsx        # Active markets listing
│   └── launch/
│       └── page.tsx        # Market creation interface
├── components/              # Reusable React components
│   └── Navigation.tsx      # Main nav with wallet connect
├── lib/                     # Utility functions and configs
│   └── wagmi.ts            # Web3 wallet configuration
├── types/                   # TypeScript type definitions
│   └── index.ts            # Core types (Market, Agent, Position)
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind theme configuration
├── tsconfig.json           # TypeScript configuration
├── postcss.config.js       # PostCSS with Tailwind
├── package.json            # Dependencies and scripts
└── .env.example            # Environment variable template
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
- Smart contract addresses (after deployment)
- Vendure API endpoints (after backend setup)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Key Features

### Web3 Integration

- **RainbowKit** wallet connection UI
- **Wagmi hooks** for reading/writing smart contracts
- **Base chain** as primary network (with Sepolia testnet support)
- Automatic wallet state management

### Pages Implemented (Scaffolding)

#### Homepage (`/`)
- Hero section with value proposition
- Quick stats dashboard (markets, volume, agents)
- CTA buttons to markets and agents

#### Markets (`/markets`)
- List all active prediction markets
- Filters by status (open, closed, resolved)
- Market cards showing volume, probability, closing time
- Click through to market detail (TODO)

#### Agents (`/agents`)
- Agent marketplace with grid layout
- Filter by category (Trading, Sports, Politics, DeFi)
- Sort by performance, price, recent
- Agent cards showing win rate and stats
- Submit agent button (TODO: form)

#### Launch Market (`/launch`)
- Market creation form
- Fields: question, description, category, closing date, initial liquidity
- Form validation (TODO)
- Smart contract integration (TODO)

### Components

#### Navigation
- Responsive nav bar
- Links to all main pages
- RainbowKit wallet connection button
- Active route highlighting

### Type System

Core TypeScript interfaces defined in `types/index.ts`:

```typescript
interface Market {
  id: string
  question: string
  description: string
  category: string
  creator: string
  createdAt: number
  closingTime: number
  totalVolume: bigint
  yesPrice: number
  noPrice: number
  status: 'open' | 'closed' | 'resolved'
}

interface Agent {
  id: string
  name: string
  description: string
  category: string
  owner: string
  pricePerUse: bigint
  totalTrades: number
  successRate: number
  totalProfit: bigint
  isActive: boolean
}
```

## Next Steps

### Smart Contract Integration
1. Deploy market factory and agent registry contracts to Base
2. Add contract ABIs to `lib/contracts/`
3. Create Wagmi hooks for contract interactions
4. Connect market creation form to contract
5. Fetch live market data from blockchain

### Agent Marketplace Integration
1. Connect to Vendure backend for agent listings
2. Implement agent purchase/licensing flow
3. Add agent deployment interface
4. Create agent performance dashboards
5. Add agent leaderboard

### Market Trading Interface
1. Build market detail page with trading UI
2. Add buy/sell position functionality
3. Show user positions and P&L
4. Display market depth and liquidity
5. Add market resolution UI for creators

### UI/UX Enhancements
1. Add loading states and skeletons
2. Implement toast notifications
3. Add form validation with Zod
4. Create mobile-responsive layouts
5. Add dark mode support
6. Implement real-time updates (WebSocket)

### Performance Optimization
1. Add React Query for data caching
2. Implement proper code splitting
3. Optimize images with next/image
4. Add service worker for offline support
5. Monitor Core Web Vitals

## Development Guidelines

### Code Organization
- Keep components small and focused
- Use Server Components by default (add 'use client' only when needed)
- Co-locate related files (components, styles, tests)
- Use absolute imports with `@/` prefix

### Styling
- Use Tailwind utility classes
- Extract repeated patterns into custom classes or components
- Keep responsive design mobile-first
- Maintain consistent spacing and color palette

### Type Safety
- Always type component props
- Use TypeScript strict mode
- Avoid `any` - use `unknown` if type is truly unknown
- Generate types from smart contract ABIs using wagmi CLI

### Web3 Best Practices
- Always handle wallet disconnection
- Show loading states during transactions
- Display transaction confirmations
- Handle errors gracefully (rejected transactions, network issues)
- Add fallbacks for read-only mode (no wallet connected)

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Environment Variables
Set these in Vercel project settings:
- All `NEXT_PUBLIC_*` variables from `.env.example`
- Add production contract addresses
- Add production Vendure API URL

### Build

```bash
npm run build
npm run start
```

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://www.rainbowkit.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Base Network Documentation](https://docs.base.org)

## Related Documentation

- [Smart Contracts](./CONTRACTS.md) - Solidity contracts and deployment
- [Backend](./BACKEND.md) - Vendure e-commerce setup
- [Architecture](./ARCHITECTURE.md) - Overall system design

---

**Status**: Scaffolding Complete ✅  
**Issue**: #4  
**Last Updated**: 2026-02-11
