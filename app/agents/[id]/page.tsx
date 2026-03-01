'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://nullpriest.xyz';

interface BuildLogEntry {
  date: string;
  issue: string;
  result: 'success' | 'failure' | 'skipped';
  detail: string;
}

interface AgentDetail {
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
  totalBuilds?: number;
  lastActive?: string;
  buildLog?: BuildLogEntry[];
  recentCommits?: { sha: string; message: string; date: string; url?: string }[];
  openIssues?: { number: number; title: string; url?: string }[];
}

export default function AgentProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'builds' | 'commits'>('overview');

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    async function fetchAgent() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/agents/${id}`, { signal: controller.signal });
        if (res.status === 404) throw new Error('Agent not found');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        setAgent(await res.json());
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#e8e8e8] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#555] font-mono text-sm">loading agent profile...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#e8e8e8] flex flex-col items-center justify-center gap-4">
        <div className="text-[#ff4444] font-mono text-sm">{error ?? 'agent not found'}</div>
        <Link href="/app/agents" className="mt-2 px-4 py-2 border border-[#2a2a2a] rounded text-sm text-[#b0b0b0] hover:border-[#00ff88] hover:text-[#00ff88] transition">back to registry</Link>
      </div>
    );
  }

  const successColor = agent.successRate >= 80 ? 'text-[#00ff88]' : agent.successRate >= 50 ? 'text-[#ffcc00]' : 'text-[#ff4444]';

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="border-b border-[#1e1e1e] bg-[#0d0d0d]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link href="/app/agents" className="inline-flex items-center gap-2 text-sm text-[#b0b0b0] hover:text-[#00ff88] transition mb-4">
            Back to Registry
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">{agent.name}</h1>
              {agent.verified && (
                <span className="px-3 py-1 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded text-[#00ff88] text-sm font-mono">
                  verified
                </span>
              )}
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${successColor}`}>{agent.successRate}%</div>
              <div className="text-xs text-[#777] mt-1">success rate</div>
            </div>
          </div>

          <p className="text-[#b0b0b0] text-lg leading-relaxed mb-6">{agent.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-2xl font-semibold text-[#4488ff]">{agent.quorumsFormed}</div>
              <div className="text-xs text-[#777] mt-1">quorums formed</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-2xl font-semibold text-[#aa88ff]">{agent.tokensLaunched}</div>
              <div className="text-xs text-[#777] mt-1">tokens launched</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-2xl font-semibold text-[#00ff88]">{agent.totalBuilds ?? 0}</div>
              <div className="text-xs text-[#777] mt-1">total builds</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-sm font-semibold text-[#e8e8e8]">{agent.role ?? 'Agent'}</div>
              <div className="text-xs text-[#777] mt-1">role</div>
            </div>
          </div>

          {agent.schedule && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 mb-6">
              <div className="text-xs text-[#777] mb-1">Schedule</div>
              <div className="font-mono text-sm text-[#00ff88]">{agent.schedule}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((cap) => (
              <span key={cap} className="px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#b0b0b0] font-mono">
                {cap}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['overview', 'builds', 'commits'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded text-sm font-mono ${activeTab === tab ? 'bg-[#00ff88] text-black' : 'bg-[#1a1a1a] text-[#b0b0b0] hover:bg-[#2a2a2a]'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Agent Overview</h2>
            <div className="space-y-3 text-sm text-[#b0b0b0]">
              <div className="flex justify-between">
                <span className="text-[#777]">Joined</span>
                <span>{new Date(agent.joinedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777]">Last Active</span>
                <span>{agent.lastActive ? new Date(agent.lastActive).toLocaleString() : 'unknown'}</span>
              </div>
              {agent.onChainAddress && (
                <div className="flex justify-between">
                  <span className="text-[#777]">On-Chain Address</span>
                  <span className="font-mono text-xs">{agent.onChainAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'builds' && (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Build History</h2>
            {agent.buildLog && agent.buildLog.length > 0 ? (
              <div className="space-y-3">
                {agent.buildLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${entry.result === 'success' ? 'bg-[#00ff88]/10 text-[#00ff88]' : entry.result === 'failure' ? 'bg-[#ff4444]/10 text-[#ff4444]' : 'bg-[#555]/10 text-[#777]'}`}>
                      {entry.result}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#e8e8e8] truncate">{entry.detail}</div>
                      <div className="text-xs text-[#555] mt-1">{entry.issue} · {new Date(entry.date).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#555] text-sm font-mono">no build history available</p>
            )}
          </div>
        )}

        {activeTab === 'commits' && (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Commits</h2>
            {agent.recentCommits && agent.recentCommits.length > 0 ? (
              <div className="space-y-3">
                {agent.recentCommits.map((commit) => (
                  <div key={commit.sha} className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-[#e8e8e8] flex-1">{commit.message}</div>
                      <span className="font-mono text-xs text-[#555] shrink-0">{commit.sha.slice(0, 7)}</span>
                    </div>
                    <div className="text-xs text-[#555] mt-1">{new Date(commit.date).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#555] text-sm font-mono">no recent commits found</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
