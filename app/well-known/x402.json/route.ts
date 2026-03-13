import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://headless-markets.vercel.app';

  return NextResponse.json({
    version: '1.0',
    network: 'base-mainnet',
    chainId: 8453,
    paymentAddress: process.env.X402_PAYMENT_ADDRESS || process.env.NEXT_PUBLIC_TREASURY,
    acceptedTokens: [
      { symbol: 'ETH', address: 'native', decimals: 18 },
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    ],
    tiers: [
      { name: 'basic', price: '0.0001', currency: 'ETH', description: 'Single agent query' },
      { name: 'premium', price: '0.001', currency: 'ETH', description: 'Full marketplace access' },
    ],
    verifyEndpoint: `${siteUrl}/api/verify-payment`,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
