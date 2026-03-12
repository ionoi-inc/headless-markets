import GraduationTracker from '@/components/GraduationTracker';
import type { GraduationData } from '@/app/api/graduation/route';

async function getGraduationData(): Promise<GraduationData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/graduation`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.error('Failed to fetch graduation data:', res.status);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching graduation data:', error);
    return null;
  }
}

export default async function GraduationPage() {
  const data = await getGraduationData();

  if (!data || data.agents.length === 0) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#e8e8e8] font-mono">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#080808]/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
            <a href="/" className="text-sm font-semibold hover:opacity-80 transition-opacity">
              headless.markets
            </a>
            <div className="flex items-center gap-6 text-xs">
              <a href="/graduation" className="text-[#00ff88] hover:opacity-80 transition-opacity">
                graduation
              </a>
              <a href="/agents" className="text-white/60 hover:text-white/90 transition-colors">
                agents
              </a>
              <a href="/launch" className="text-white/60 hover:text-white/90 transition-colors">
                launch
              </a>
            </div>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-8 pt-24 pb-16">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Graduation Tracker</h1>
            <p className="text-white/40 text-sm">No graduation data available. Check back soon.</p>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#080808]/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-8 py-4">
            <p className="text-xs text-white/40 text-center">
              Built during The Synthesis Hackathon (March 13-22, 2026)
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8] font-mono">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#080808]/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
          <a href="/" className="text-sm font-semibold hover:opacity-80 transition-opacity">
            headless.markets
          </a>
          <div className="flex items-center gap-6 text-xs">
            <a href="/graduation" className="text-[#00ff88] hover:opacity-80 transition-opacity">
              graduation
            </a>
            <a href="/agents" className="text-white/60 hover:text-white/90 transition-colors">
              agents
            </a>
            <a href="/launch" className="text-white/60 hover:text-white/90 transition-colors">
              launch
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-8 pt-24 pb-32">
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Graduation Tracker</h1>
          <p className="text-white/40 text-sm">bonding curve progress — live on Base</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-12 p-4 bg-[#0f0f0f] border border-white/10 rounded">
          <div>
            <div className="text-xs text-white/40 mb-1">Total Agents</div>
            <div className="text-2xl font-bold" style={{ color: '#00ff88' }}>
              {data.totalAgents}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Graduated</div>
            <div className="text-2xl font-bold" style={{ color: '#0088ff' }}>
              {data.graduatedCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Bonding</div>
            <div className="text-2xl font-bold text-white/60">
              {data.bondingCount}
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4 text-white/90">Active Markets</h2>
          <div className="space-y-4">
            {data.agents.map((agent) => (
              <GraduationTracker key={agent.curveAddress} agent={agent} />
            ))}
          </div>
        </section>

        {data.recentlyGraduated.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-4 text-white/90">Recently Graduated</h2>
            <div className="bg-[#0f0f0f] border border-white/10 rounded p-4">
              <div className="space-y-3">
                {data.recentlyGraduated.map((agent) => (
                  <div
                    key={agent.curveAddress}
                    className="flex items-center justify-between text-xs pb-3 border-b border-white/10 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white/60">
                        {agent.agentId.slice(0, 6)}...{agent.agentId.slice(-4)}
                      </span>
                      <span style={{ color: '#00ff88' }} className="font-semibold">
                        {parseFloat(agent.totalEthRaised).toFixed(4)} ETH
                      </span>
                    </div>
                    {agent.uniswapPool && (
                      <a
                        href={`https://basescan.org/address/${agent.uniswapPool}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{ color: '#0088ff' }}
                      >
                        <span>Pool: {agent.uniswapPool.slice(0, 6)}...{agent.uniswapPool.slice(-4)}</span>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="text-xs text-white/30 text-center">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#080808]/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-8 py-4">
          <p className="text-xs text-white/40 text-center">
            Built during The Synthesis Hackathon (March 13-22, 2026)
          </p>
        </div>
      </footer>
    </div>
  );
}
