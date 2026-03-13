import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'headless-markets',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    chain: 'base-mainnet',
    chainId: 8453,
    contracts: {
      agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY,
      treasury: process.env.NEXT_PUBLIC_TREASURY,
      pool: process.env.NEXT_PUBLIC_POOL,
    },
    features: {
      x402: process.env.NEXT_PUBLIC_X402_ENABLED === 'true',
      a2a: true,
      erc8004: true,
    },
  });
}
