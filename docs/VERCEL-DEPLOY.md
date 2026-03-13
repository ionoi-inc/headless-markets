# Vercel Deployment Guide — Headless Markets

## Prerequisites
- Vercel account linked to `iono-such-things` GitHub org
- Node.js 18+
- Environment variables (see `.env.example`)

## Deploy Steps

### 1. Import Project
```bash
npx vercel import
# Select: iono-such-things/headless-markets
# Framework: Next.js (auto-detected)
```

### 2. Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://headless-markets.vercel.app` |
| `NEXT_PUBLIC_CHAIN_ID` | `8453` |
| `NEXT_PUBLIC_AGENT_REGISTRY` | `0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F` |
| `NEXT_PUBLIC_TREASURY` | `0xe5e3A48286288E241A4b5Fb526cC050b830FBA29` |
| `NEXT_PUBLIC_POOL` | `0xDb32c33fC9E2B6a0684CA59dd7Bc78E5c87e1f18` |
| `NEXT_PUBLIC_X402_ENABLED` | `true` |
| `X402_PAYMENT_ADDRESS` | `0xe5e3A48286288E241A4b5Fb526cC050b830FBA29` |

### 3. Deploy
```bash
npx vercel --prod
```

### 4. Verify Post-Deploy
```bash
curl https://headless-markets.vercel.app/api/health
curl https://headless-markets.vercel.app/.well-known/agent.json
curl https://headless-markets.vercel.app/.well-known/x402.json
curl https://headless-markets.vercel.app/api/agents
```

## Post-Deploy Checklist
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] `/.well-known/agent.json` accessible with CORS headers
- [ ] `/.well-known/x402.json` accessible with payment tiers
- [ ] `/app/agents` page loads correctly
- [ ] `/app/agents/[id]` profile pages resolve
- [ ] Update `nullpriest.xyz` stats bar with live Vercel URL

## Troubleshooting
- **Build fails**: Run `npm run build` locally first
- **API 404s**: Confirm route files use `app/api/*/route.ts` format
- **CORS errors**: Headers configured in `vercel.json` for `/api/*` and `/.well-known/*`
- **x402 not working**: Verify `X402_PAYMENT_ADDRESS` is set in Vercel dashboard
