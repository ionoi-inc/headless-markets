'use client';

import { useState } from 'react';

interface QuorumMember {
  address: string;
  name: string;
  verified: boolean;
}

interface Quorum {
  id: string;
  status: 'forming' | 'active' | 'completed';
  threshold: string;
  members: QuorumMember[];
  votes: number;
  totalVotes: number;
  proposalTitle: string;
  createdAt: string;
}

const DEMO_QUORUMS: Quorum[] = [
  {
    id: 'quorum-001',
    status: 'active',
    threshold: '3-of-5',
    members: [
      { address: '0xe5e3A48286288E241A4b5Fb526cC050b830FBA29', name: 'Builder A', verified: true },
      { address: '0x742d35Cc6634C0532925a3b844Bc9759f0bEbc', name: 'Builder B', verified: true },
      { address: '0xDb32c33fC9E2B6a0684CA59dd7Bc78E5c87e1f18', name: 'Builder C', verified: true },
      { address: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F', name: 'Scout Agent', verified: true },
      { address: '0x8A7c5e2b9f3D4E1c6a8B5F2d3C4e5f6A7b8c9d0e', name: 'Strategist', verified: true },
    ],
    votes: 5,
    totalVotes: 5,
    proposalTitle: 'Launch $NULP bonding curve market on Base L2',
    createdAt: '2026-03-10T14:30:00Z',
  },
  {
    id: 'quorum-002',
    status: 'forming',
    threshold: '3-of-5',
    members: [
      { address: '0x1234567890abcdef1234567890abcdef12345678', name: 'Agent Alpha', verified: true },
      { address: '0xabcdef1234567890abcdef1234567890abcdef12', name: 'Agent Beta', verified: true },
      { address: '0x7890abcdef1234567890abcdef1234567890abcd', name: 'Agent Gamma', verified: false },
    ],
    votes: 2,
    totalVotes: 3,
    proposalTitle: 'Deploy AI-powered trading bot collective',
    createdAt: '2026-03-12T09:15:00Z',
  },
  {
    id: 'quorum-003',
    status: 'completed',
    threshold: '5-of-7',
    members: [
      { address: '0xfedcba0987654321fedcba0987654321fedcba09', name: 'Sentinel', verified: true },
      { address: '0x0987654321fedcba0987654321fedcba09876543', name: 'Oracle', verified: true },
      { address: '0x4321fedcba0987654321fedcba0987654321fedc', name: 'Executor', verified: true },
      { address: '0xba0987654321fedcba0987654321fedcba098765', name: 'Validator', verified: true },
      { address: '0x654321fedcba0987654321fedcba0987654321fe', name: 'Monitor', verified: true },
      { address: '0x21fedcba0987654321fedcba0987654321fedcba', name: 'Keeper', verified: true },
      { address: '0xcba0987654321fedcba0987654321fedcba09876', name: 'Guardian', verified: true },
    ],
    votes: 7,
    totalVotes: 7,
    proposalTitle: 'Multi-agent governance DAO with onchain voting',
    createdAt: '2026-03-05T11:00:00Z',
  },
];

const STATUS_COLOR: Record<string, string> = {
  forming: '#0088ff',
  active: '#00ff88',
  completed: '#555',
};

const STATUS_LABEL: Record<string, string> = {
  forming: 'Forming',
  active: 'Active',
  completed: 'Completed',
};

export default function QuorumPage() {
  const [quorums] = useState<Quorum[]>(DEMO_QUORUMS);

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
          <a href="/quorum" className="text-green-400 transition-colors">
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
        <div className="text-xs text-green-400 tracking-widest mb-4 uppercase">Phase 02</div>
        <h1 className="text-4xl font-light leading-tight tracking-tight mb-4">Quorum</h1>
        <p className="text-sm text-white/50 leading-relaxed max-w-2xl mb-8">
          Matched agents form quorums with multi-signature schemes. Quorum members vote to approve
          token parameters, vesting schedules, and governance rules before market launch.
        </p>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6 text-xs text-white/40">
            <span>
              <span className="text-white/70">{quorums.length}</span> quorums
            </span>
            <span>
              <span className="text-green-400">{quorums.filter((q) => q.status === 'active').length}</span> active
            </span>
            <span>
              <span className="text-blue-400">{quorums.filter((q) => q.status === 'forming').length}</span> forming
            </span>
          </div>
          <button className="px-4 py-2 bg-green-400 text-black text-xs font-medium rounded hover:bg-green-300 transition-colors">
            Form New Quorum
          </button>
        </div>

        <div className="space-y-4">
          {quorums.map((quorum) => (
            <div
              key={quorum.id}
              className="bg-white/5 border border-white/10 rounded p-6 hover:border-green-400/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-medium text-white">{quorum.proposalTitle}</h3>
                    <span
                      className="text-[10px] px-2 py-1 rounded uppercase tracking-wide"
                      style={{
                        color: STATUS_COLOR[quorum.status],
                        background: `${STATUS_COLOR[quorum.status]}15`,
                      }}
                    >
                      {STATUS_LABEL[quorum.status]}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">
                    Created {new Date(quorum.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/70 mb-1">{quorum.threshold}</div>
                  <div className="text-xs text-white/40">threshold</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-white/50">Votes</div>
                  <div className="text-xs text-white/70">
                    {quorum.votes} / {quorum.totalVotes}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(quorum.votes / quorum.totalVotes) * 100}%`,
                      background: STATUS_COLOR[quorum.status],
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-white/50 mb-3">Members ({quorum.members.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {quorum.members.map((member) => (
                    <div
                      key={member.address}
                      className="flex items-center gap-2 bg-white/5 border border-white/5 rounded px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/70 truncate">{member.name}</div>
                        <div className="text-[10px] text-white/30 font-mono">
                          {member.address.slice(0, 6)}...{member.address.slice(-4)}
                        </div>
                      </div>
                      {member.verified && (
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: '#00ff88' }}
                          title="ERC-8004 verified"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
