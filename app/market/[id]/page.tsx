'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface MarketData {
  id: string;
  title: string;
  ethRaised: number;
  graduationThreshold: number;
  currentPrice: number;
  graduated: boolean;
  circulatingSupply: number;
  totalSupply: number;
  quorumMembers?: string[];
}

interface PricePoint {
  timestamp: number;
  price: number;
}

const DEMO_PRICE_HISTORY: PricePoint[] = [
  { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, price: 0.00001 },
  { timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, price: 0.000015 },
  { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, price: 0.000022 },
  { timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, price: 0.000028 },
  { timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, price: 0.000035 },
  { timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, price: 0.000041 },
  { timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, price: 0.000048 },
  { timestamp: Date.now(), price: 0.000052 },
];

export default function MarketPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [priceHistory] = useState<PricePoint[]>(DEMO_PRICE_HISTORY);

  useEffect(() => {
    if (!id) return;
    async function fetchMarket() {
      try {
        const res = await fetch('/api/graduation');
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        
        setMarket({
          id: id,
          title: '$NULP Bonding Curve Market',
          ethRaised: data.ethRaised ?? 8.5,
          graduationThreshold: data.graduationThreshold ?? 24,
          currentPrice: data.currentPrice ?? 0.000052,
          graduated: data.graduated ?? false,
          circulatingSupply: data.circulatingSupply ?? 163461,
          totalSupply: data.totalSupply ?? 1000000,
          quorumMembers: data.quorumMembers ?? [
            '0xe5e3A48286288E241A4b5Fb526cC050b830FBA29',
            '0x742d35Cc6634C0532925a3b844Bc9759f0bEbc',
            '0xDb32c33fC9E2B6a0684CA59dd7Bc78E5c87e1f18',
          ],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch failed');
      } finally {
        setLoading(false);
      }
    }
    fetchMarket();
  }, [id]);

  const handleBuy = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Wallet not connected. Connect wallet to purchase tokens.');
  };

  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Wallet not connected. Connect wallet to sell tokens.');
  };

  const progressPercent = market ? (market.ethRaised / market.graduationThreshold) * 100 : 0;

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;
  const minPrice = Math.min(...priceHistory.map((p) => p.price));
  const maxPrice = Math.max(...priceHistory.map((p) => p.price));
  const minTime = Math.min(...priceHistory.map((p) => p.timestamp));
  const maxTime = Math.max(...priceHistory.map((p) => p.timestamp));

  const getX = (timestamp: number) => {
    return padding + ((timestamp - minTime) / (maxTime - minTime)) * (chartWidth - 2 * padding);
  };

  const getY = (price: number) => {
    return chartHeight - padding - ((price - minPrice) / (maxPrice - minPrice)) * (chartHeight - 2 * padding);
  };

  const pathData = priceHistory
    .map((point, i) => {
      const x = getX(point.timestamp);
      const y = getY(point.price);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white font-mono">
        <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-black/95 border-b border-white/10 flex items-center justify-between px-8">
          <a href="/" className="text-sm font-medium tracking-tight">
            headless<span className="text-green-400">.</span>markets
          </a>
        </nav>
        <div className="pt-32 px-8 text-xs text-white/40">loading market data...</div>
      </main>
    );
  }

  if (error || !market) {
    return (
      <main className="min-h-screen bg-black text-white font-mono">
        <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-black/95 border-b border-white/10 flex items-center justify-between px-8">
          <a href="/" className="text-sm font-medium tracking-tight">
            headless<span className="text-green-400">.</span>markets
          </a>
        </nav>
        <div className="pt-32 px-8">
          <a href="/discover" className="text-xs text-white/40 hover:text-white/60">
            ← back to discovery
          </a>
          <p className="text-sm text-red-400 mt-6">{error ?? 'market not found'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-black/95 border-b border-white/10 flex items-center justify-between px-8">
        <a href="/" className="text-sm font-medium tracking-tight">
          headless<span className="text-green-400">.</span>markets
        </a>
        <div className="flex items-center gap-6 text-xs text-white/40">
          <a href="/discover" className="hover:text-white transition-colors">
            discover
          </a>
          <a href="/quorum" className="hover:text-white transition-colors">
            quorum
          </a>
          <a href="/launch" className="hover:text-white transition-colors">
            launch
          </a>
          <a href="/graduation" className="hover:text-white transition-colors">
            graduation
          </a>
        </div>
      </nav>

      <section className="pt-20 pb-12 px-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <a href="/discover" className="text-xs text-white/40 hover:text-white/60">
            ← back to discovery
          </a>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-light tracking-tight">{market.title}</h1>
              {market.graduated && (
                <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-1 rounded uppercase tracking-wide">
                  Graduated
                </span>
              )}
            </div>
            <div className="text-xs text-white/50">Bonding Curve Market · Base L2</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-light text-green-400">{market.currentPrice.toFixed(6)} ETH</div>
            <div className="text-xs text-white/40">current price</div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-white/70">Graduation Progress</div>
            <div className="text-sm text-white/70">
              {market.ethRaised.toFixed(2)} / {market.graduationThreshold} ETH
            </div>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-blue-400 transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-white/40">
            {progressPercent.toFixed(1)}% to Uniswap V3 migration
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/5 border border-white/10 rounded p-6">
            <h3 className="text-sm font-medium text-white/70 mb-4">Buy Tokens</h3>
            <form onSubmit={handleBuy} className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2">Amount (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.1"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50"
                />
              </div>
              {buyAmount && (
                <div className="text-xs text-white/40">
                  ≈ {(parseFloat(buyAmount) / market.currentPrice).toFixed(0)} tokens
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2.5 bg-green-400 text-black text-sm font-medium rounded hover:bg-green-300 transition-colors"
              >
                Buy Tokens
              </button>
            </form>
          </div>

          <div className="bg-white/5 border border-white/10 rounded p-6">
            <h3 className="text-sm font-medium text-white/70 mb-4">Sell Tokens</h3>
            <form onSubmit={handleSell} className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2">Amount (Tokens)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="100"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
                />
              </div>
              {sellAmount && (
                <div className="text-xs text-white/40">
                  ≈ {(parseFloat(sellAmount) * market.currentPrice).toFixed(4)} ETH
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-400 text-black text-sm font-medium rounded hover:bg-blue-300 transition-colors"
              >
                Sell Tokens
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded p-6 mb-6">
          <h3 className="text-sm font-medium text-white/70 mb-4">Price History (7 days)</h3>
          <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full">
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00ff88" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d={`${pathData} L ${getX(priceHistory[priceHistory.length - 1].timestamp)} ${chartHeight - padding} L ${getX(priceHistory[0].timestamp)} ${chartHeight - padding} Z`}
              fill="url(#priceGradient)"
            />
            <path
              d={pathData}
              fill="none"
              stroke="#00ff88"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {priceHistory.map((point, i) => (
              <circle
                key={i}
                cx={getX(point.timestamp)}
                cy={getY(point.price)}
                r="3"
                fill="#00ff88"
              />
            ))}
          </svg>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded p-4">
            <div className="text-xs text-white/50 mb-1">Circulating Supply</div>
            <div className="text-lg font-light text-white">{market.circulatingSupply.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded p-4">
            <div className="text-xs text-white/50 mb-1">Total Supply</div>
            <div className="text-lg font-light text-white">{market.totalSupply.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded p-4">
            <div className="text-xs text-white/50 mb-1">Market Cap</div>
            <div className="text-lg font-light text-white">
              {(market.circulatingSupply * market.currentPrice).toFixed(2)} ETH
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded p-4">
            <div className="text-xs text-white/50 mb-1">Quorum Size</div>
            <div className="text-lg font-light text-white">{market.quorumMembers?.length ?? 0}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
