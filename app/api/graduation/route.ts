import { NextResponse } from 'next/server';
import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { base } from 'viem/chains';

export interface AgentGraduationStatus {
  agentId: string;
  curveAddress: string;
  totalEthRaised: string;
  progressPct: number;
  status: 'BONDING' | 'GRADUATING' | 'GRADUATED';
  graduated: boolean;
  uniswapPool: string | null;
}

export interface GraduationData {
  agents: AgentGraduationStatus[];
  recentlyGraduated: AgentGraduationStatus[];
  totalAgents: number;
  graduatedCount: number;
  bondingCount: number;
  lastUpdated: string;
}

const BONDING_CURVE_ABI = [
  {
    inputs: [],
    name: 'totalEthRaised',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'graduated',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'uniswapPool',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'agentId',
    outputs: [{ type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'pool', type: 'address' },
      { indexed: false, name: 'ethRaised', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'Graduated',
    type: 'event',
  },
] as const;

const FACTORY_ABI = [
  {
    inputs: [],
    name: 'getCurves',
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const FACTORY_ADDRESS = process.env.BONDING_CURVE_FACTORY_ADDRESS as string | undefined;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const GRADUATION_THRESHOLD = parseEther('24');

const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

async function fetchCurveStatus(curveAddress: string): Promise<AgentGraduationStatus> {
  try {
    const [totalEthRaised, graduated, uniswapPool, agentId] = await Promise.all([
      publicClient.readContract({
        address: curveAddress as string,
        abi: BONDING_CURVE_ABI,
        functionName: 'totalEthRaised',
      }),
      publicClient.readContract({
        address: curveAddress as string,
        abi: BONDING_CURVE_ABI,
        functionName: 'graduated',
      }),
      publicClient.readContract({
        address: curveAddress as string,
        abi: BONDING_CURVE_ABI,
        functionName: 'uniswapPool',
      }),
      publicClient.readContract({
        address: curveAddress as string,
        abi: BONDING_CURVE_ABI,
        functionName: 'agentId',
      }),
    ]);

    const ethRaisedBigInt = totalEthRaised as bigint;
    const graduatedBool = graduated as boolean;
    const poolAddress = uniswapPool as string;
    const agentIdHex = agentId as string;

    const progressPct = Number((ethRaisedBigInt * BigInt(10000)) / GRADUATION_THRESHOLD) / 100;

    let status: 'BONDING' | 'GRADUATING' | 'GRADUATED';
    if (graduatedBool) {
      status = 'GRADUATED';
    } else if (progressPct >= 90) {
      status = 'GRADUATING';
    } else {
      status = 'BONDING';
    }

    return {
      agentId: agentIdHex,
      curveAddress,
      totalEthRaised: formatEther(ethRaisedBigInt),
      progressPct: Math.min(progressPct, 100),
      status,
      graduated: graduatedBool,
      uniswapPool: graduatedBool ? poolAddress : null,
    };
  } catch (error) {
    console.error('Error fetching curve status for', curveAddress, error);
    throw error;
  }
}

function getMockData(): GraduationData {
  const mockAgents: AgentGraduationStatus[] = [
    {
      agentId: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      curveAddress: '0x1111111111111111111111111111111111111111',
      totalEthRaised: '18.4200',
      progressPct: 76.75,
      status: 'BONDING',
      graduated: false,
      uniswapPool: null,
    },
    {
      agentId: '0x9f8e7d6c5b4a3928170f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3',
      curveAddress: '0x2222222222222222222222222222222222222222',
      totalEthRaised: '22.9104',
      progressPct: 95.46,
      status: 'GRADUATING',
      graduated: false,
      uniswapPool: null,
    },
    {
      agentId: '0x7f6e5d4c3b2a1908f7e6d5c4b3a29180f7e6d5c4b3a29180f7e6d5c4b3a2918',
      curveAddress: '0x3333333333333333333333333333333333333333',
      totalEthRaised: '24.0000',
      progressPct: 100,
      status: 'GRADUATED',
      graduated: true,
      uniswapPool: '0xDb32c33fC9E2B6a0684CA59dd7Bc78E5c87e1f18',
    },
  ];

  return {
    agents: mockAgents,
    recentlyGraduated: [mockAgents[2]],
    totalAgents: 3,
    graduatedCount: 1,
    bondingCount: 2,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (!FACTORY_ADDRESS) {
      console.log('BONDING_CURVE_FACTORY_ADDRESS not set, returning mock data');
      return NextResponse.json(getMockData(), {
        headers: {
          'Cache-Control': 'public, max-age=30',
        },
      });
    }

    const curveAddresses = await publicClient.readContract({
      address: FACTORY_ADDRESS as string,
      abi: FACTORY_ABI,
      functionName: 'getCurves',
    }) as string[];

    const agentStatuses = await Promise.all(
      curveAddresses.map((address) => fetchCurveStatus(address))
    );

    const sortedAgents = agentStatuses.sort((a, b) => b.progressPct - a.progressPct);
    const recentlyGraduated = sortedAgents.filter((a) => a.graduated).slice(0, 5);
    const graduatedCount = sortedAgents.filter((a) => a.graduated).length;
    const bondingCount = sortedAgents.length - graduatedCount;

    const data: GraduationData = {
      agents: sortedAgents,
      recentlyGraduated,
      totalAgents: sortedAgents.length,
      graduatedCount,
      bondingCount,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    console.error('Error in graduation API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graduation data' },
      { status: 500 }
    );
  }
}
