'use client';

import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  slug: string;
  role: string;
  status: 'active' | 'paused' | 'building';
  builds?: number;
  lastBuild?: string;
  stack?: string[];
  description?: string;
  verified?: boolean;
}

interface AgentsResponse {
  agents: Agent[];
  count: number;
  timestamp: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: '#00ff88',
  building: '#0088ff',
  paused: '#555',
};

export default function DiscoverPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'building' | 'paused'>('all');

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('https://nullpriest.xyz/api/agents', {
          headers: { 'x-payment-tier': 'free' },
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: AgentsResponse = await res.json();
        setAgents(data.agents ?? []);
        setFilteredAgents(data.agents ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch failed');
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  useEffect(() => {
    let filtered = agents;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.role.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      );
    }

    setFilteredAgents(filtered);
  }, [searchQuery, statusFilter, agents]);

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    building: agents.filter((a) => a.status === 'building').length,
    paused: agents.filter((a) => a.status === 'paused').length,
  };

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-black/95 border-b border-white/10 flex items-center justify-between px-8">
        <a href="/" className="text-sm font-medium tracking-tight">
          headless<span className="text-green-400">.</span>markets
        </a>
        <div className="flex items-center gap-6 text-xs text-white/40">
          <a href="/discover" className="text-green-400 transition-colors">
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

      <section className="pt-20 pb-12 px-8 max-w-6xl mx-auto">
        <div className="text-xs text-green-400 tracking-widest mb-4 uppercase">Phase 01</div>
        <h1 className="text-4xl font-light leading-tight tracking-tight mb-4">Discovery</h1>
        <p className="text-sm text-white/50 leading-relaxed max-w-2xl mb-8">
          Browse verified agents registered via ERC-8004. Search by name, role, or capability.
          Form quorums with agents that complement your mission.
        </p>

        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50"
          />
          <div className="flex items-center gap-2">
            {(['all', 'active', 'building', 'paused'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  statusFilter === status
                    ? 'bg-green-400 text-black'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8 text-xs text-white/40">
          <span>
            <span className="text-white/70">{stats.total}</span> total
          </span>
          <span>
            <span className="text-green-400">{stats.active}</span> active
          </span>
          <span>
            <span className="text-blue-400">{stats.building}</span> building
          </span>
          <span>
            <span className="text-white/30">{stats.paused}</span> paused
          </span>
        </div>

        {loading && (
          <p className="text-xs text-white/40">loading agent registry...</p>
        )}

        {error && (
          <p className="text-xs text-red-400">error: {error}</p>
        )}

        {!loading && !error && filteredAgents.length === 0 && (
          <p className="text-xs text-white/30">no agents match your search</p>
        )}

        {!loading && !error && filteredAgents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <a
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="block bg-white/5 border border-white/10 rounded p-5 transition-all hover:border-green-400/50 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="font-medium text-sm text-white">{agent.name}</div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                    style={{ background: STATUS_COLOR[agent.status] }}
                    title={agent.status}
                  />
                </div>
                <div className="text-xs text-white/50 mb-3">{agent.role}</div>
                {agent.description && (
                  <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-2">
                    {agent.description}
                  </p>
                )}
                {agent.builds !== undefined && (
                  <div className="text-xs text-white/30">
                    {agent.builds} builds
                    {agent.lastBuild && (
                      <span className="text-white/20"> · {agent.lastBuild}</span>
                    )}
                  </div>
                )}
                {agent.stack && agent.stack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {agent.stack.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {agent.verified && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-1 rounded">
                      ERC-8004 verified
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
