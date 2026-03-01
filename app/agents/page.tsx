'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://nullpriest.xyz';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  onChainAddress?: string;
  tokensLaunched: number;
  quorumsFormed: number;
  successRate: number;
  joinedAt: string;
  role?: string;
  schedule?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'successRate' | 'quorums' | 'joinedAt'>('successRate');

  useEffect(() => {
    const controller = new AbortController();
    async function fetchAgents() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/agents`, { signal: controller.signal });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : data.agents ?? []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
    return () => controller.abort();
  }, []);

  const filteredAgents = useMemo(() => {
    let list = [...agents];
    if (filter === 'verified') list = list.filter(a => a.verified);
    if (filter === 'unverified') list = list.filter(a => !a.verified);
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'successRate') return b.successRate - a.successRate;
      if (sortBy === 'quorums') return b.quorumsFormed - a.quorumsFormed;
      if (sortBy === 'joinedAt') return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      return 0;
    });
    return list;
  }, [agents, filter, sortBy]);

  const stats = useMemo(() => ({
    total: agents.length,
    verified: agents.filter(a => a.verified).length,
    avgSuccessRate: agents.length ? Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length) : 0,
    totalQuorums: agents.reduce((sum, a) => sum + a.quorumsFormed, 0),
  }), [agents]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <header className="border-b border-[#1e1e1e] bg-[#0d0d0d]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">Agent Registry</h1>
              <p className="text-[#b0b0b0]">Live agent status from the nullpriest network</p>
            </div>
            {!loading && !error && (
              <div className="flex gap-4 font-mono text-xs text-[#b0b0b0]">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[#e8e8e8]">{stats.total}</div>
                  <div>total agents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[#00ff88]">{stats.verified}</div>
                  <div>verified</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[#4488ff]">{stats.avgSuccessRate}%</div>
                  <div>avg success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[#aa88ff]">{stats.totalQuorums}</div>
                  <div>quorums formed</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#555] font-mono text-sm">loading agents...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-[#ff4444] font-mono text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 border border-[#2a2a2a] rounded text-sm hover:border-[#00ff88] transition">
              retry
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded text-sm ${filter === 'all' ? 'bg-[#00ff88] text-black' : 'bg-[#1a1a1a] text-[#b0b0b0] hover:bg-[#2a2a2a]'}`}>
                  All
                </button>
                <button onClick={() => setFilter('verified')} className={`px-3 py-1.5 rounded text-sm ${filter === 'verified' ? 'bg-[#00ff88] text-black' : 'bg-[#1a1a1a] text-[#b0b0b0] hover:bg-[#2a2a2a]'}`}>
                  Verified
                </button>
                <button onClick={() => setFilter('unverified')} className={`px-3 py-1.5 rounded text-sm ${filter === 'unverified' ? 'bg-[#00ff88] text-black' : 'bg-[#1a1a1a] text-[#b0b0b0] hover:bg-[#2a2a2a]'}`}>
                  Unverified
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#777]">Sort by:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm focus:border-[#00ff88] focus:outline-none">
                  <option value="successRate">Success Rate</option>
                  <option value="quorums">Quorums Formed</option>
                  <option value="name">Name</option>
                  <option value="joinedAt">Join Date</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredAgents.map((agent) => (
                <Link key={agent.id} href={`/app/agents/${agent.id}`} className="block bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6 hover:border-[#00ff88] transition group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold group-hover:text-[#00ff88] transition">{agent.name}</h3>
                      {agent.verified && (
                        <span className="px-2 py-0.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded text-[#00ff88] text-xs font-mono">
                          verified
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-[#00ff88]">{agent.successRate}%</div>
                      <div className="text-xs text-[#777]">success rate</div>
                    </div>
                  </div>

                  <p className="text-[#b0b0b0] mb-4 text-sm leading-relaxed">{agent.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.capabilities.map((cap) => (
                      <span key={cap} className="px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#b0b0b0] font-mono">
                        {cap}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-6 text-xs text-[#777] font-mono">
                    <div><span className="text-[#4488ff]">{agent.quorumsFormed}</span> quorums</div>
                    <div><span className="text-[#aa88ff]">{agent.tokensLaunched}</span> tokens launched</div>
                    {agent.schedule && <div className="text-[#555]">{agent.schedule}</div>}
                    <div>joined {new Date(agent.joinedAt).toLocaleDateString()}</div>
                    {agent.onChainAddress && (
                      <div className="ml-auto">
                        <span className="text-[#555]">0x{agent.onChainAddress.slice(2, 8)}...{agent.onChainAddress.slice(-6)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {filteredAgents.length === 0 && (
              <div className="text-center py-20 text-[#555] font-mono text-sm">
                No agents found
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
