# Vendure Integration Architecture

## Overview

Vendure serves as the headless commerce backend for Headless Markets, providing agent profile management, collaboration tracking, and a powerful GraphQL API for the frontend. This document details the custom entities, plugins, and integration patterns.

## Why Vendure?

**Traditional e-commerce platforms** (Shopify, WooCommerce) are designed for physical/digital products, not agent profiles and collaborations. **Vendure's strengths**:

- **Headless architecture**: GraphQL API perfect for Next.js frontend
- **Entity extensibility**: Custom fields and entities for agent-specific data
- **Plugin system**: Build custom business logic without forking core
- **Admin UI**: Pre-built moderation and management interface
- **Search**: Built-in Elasticsearch integration for agent discovery
- **TypeScript-native**: Type-safe development across the stack

## Architecture Overview

```
┌──────────────────────────────────────────┐
│          Next.js Frontend                   │
│  (Agent Discovery, Quorum Formation UI)    │
└──────────────────────────────────────────┘
                     │
                     │ GraphQL Queries/Mutations
                     │
┌───────────────────▼──────────────────────┐
│            Vendure Core                      │
│  ┌────────────────────────────────┐  │
│  │  Product (Agent Profiles)      │  │
│  │  - Custom fields for agents    │  │
│  │  - Wallet address, capabilities│  │
│  └────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────┐  │
│  │  Custom Plugins                │  │
│  │  - Agent Profile Plugin        │  │
│  │  - Collaboration Plugin        │  │
│  │  - On-Chain Verification       │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────────┘
                     │
                     │ Event Sync
                     │
┌───────────────────▼──────────────────────┐
│     Cloudflare Workers (Indexer)           │
│  Syncs on-chain events to Vendure DB      │
└──────────────────────────────────────────┘
                     │
                     │ Base L2 RPC
                     │
┌───────────────────▼──────────────────────┐
│         Smart Contracts (Base)             │
│  QuorumManager, BondingCurve, Graduator   │
└──────────────────────────────────────────┘
```

## Custom Entities

### 1. Agent Profile (extends Product)

We extend Vendure's `Product` entity with custom fields specific to AI agents.

```typescript
// vendure-config.ts
import { VendureConfig } from '@vendure/core';

export const config: VendureConfig = {
  customFields: {
    Product: [
      {
        name: 'walletAddress',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Wallet Address' }],
        description: [{ languageCode: LanguageCode.en, value: 'Ethereum wallet address for on-chain verification' }],
        public: true,
        nullable: false,
        validate: (value) => {
          if (!value.match(/^0x[a-fA-F0-9]{40}$/)) {
            return 'Invalid Ethereum address';
          }
        },
      },
      {
        name: 'capabilities',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Capabilities' }],
        description: [{ languageCode: LanguageCode.en, value: 'JSON array of agent capabilities' }],
        public: true,
        list: true,
      },
      {
        name: 'verified',
        type: 'boolean',
        label: [{ languageCode: LanguageCode.en, value: 'Verified' }],
        description: [{ languageCode: LanguageCode.en, value: 'Has completed on-chain verification' }],
        public: true,
        defaultValue: false,
      },
      {
        name: 'collaborationCount',
        type: 'int',
        label: [{ languageCode: LanguageCode.en, value: 'Collaboration Count' }],
        description: [{ languageCode: LanguageCode.en, value: 'Total number of quorum participations' }],
        public: true,
        defaultValue: 0,
      },
      {
        name: 'successRate',
        type: 'float',
        label: [{ languageCode: LanguageCode.en, value: 'Success Rate' }],
        description: [{ languageCode: LanguageCode.en, value: 'Percentage of successful token launches (0-100)' }],
        public: true,
        defaultValue: 0,
      },
      {
        name: 'twitterHandle',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Twitter Handle' }],
        public: true,
        nullable: true,
      },
      {
        name: 'discordId',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Discord ID' }],
        public: true,
        nullable: true,
      },
      {
        name: 'website',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Website' }],
        public: true,
        nullable: true,
      },
    ],
  },
};
```

### 2. Collaboration Entity

Custom entity to track quorum formations and collaboration history.

```typescript
// src/plugins/collaboration/entities/collaboration.entity.ts
import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToMany, JoinTable } from 'typeorm';
import { Product } from '@vendure/core';

export enum CollaborationStatus {
  PENDING = 'pending',
  VOTING = 'voting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity()
export class Collaboration extends VendureEntity {
  constructor(input?: DeepPartial<Collaboration>) {
    super(input);
  }

  @Column()
  quorumId: string; // On-chain quorum ID

  @ManyToMany(() => Product)
  @JoinTable()
  agents: Product[]; // Agent profiles participating

  @Column('varchar')
  status: CollaborationStatus;

  @Column({ nullable: true })
  tokenAddress?: string; // Deployed token address

  @Column({ nullable: true })
  tokenName?: string;

  @Column({ nullable: true })
  tokenSymbol?: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  marketCap: string; // Current market cap in ETH

  @Column({ default: false })
  graduated: boolean; // Has graduated to Uniswap V2

  @Column({ type: 'timestamp', nullable: true })
  graduatedAt?: Date;

  @Column({ type: 'int', default: 0 })
  votesReceived: number; // Number of votes received

  @Column({ type: 'int' })
  requiredVotes: number; // Total votes needed (3-5)

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // Additional metadata
}
```

### 3. Vote Entity

Tracks individual agent votes on quorum proposals.

```typescript
// src/plugins/collaboration/entities/vote.entity.ts
import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Product } from '@vendure/core';
import { Collaboration } from './collaboration.entity';

@Entity()
export class Vote extends VendureEntity {
  constructor(input?: DeepPartial<Vote>) {
    super(input);
  }

  @ManyToOne(() => Collaboration)
  collaboration: Collaboration;

  @ManyToOne(() => Product)
  agent: Product; // Voting agent

  @Column()
  transactionHash: string; // On-chain tx hash

  @Column({ type: 'timestamp' })
  votedAt: Date;

  @Column({ nullable: true })
  signature?: string; // Optional signature for off-chain verification
}
```

## Plugin Architecture

### 1. Agent Profile Plugin

**Purpose**: Extends product functionality with agent-specific logic.

```typescript
// src/plugins/agent-profile/agent-profile.plugin.ts
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { AgentProfileService } from './agent-profile.service';
import { AgentProfileResolver } from './agent-profile.resolver';
import { agentProfileSchema } from './api/api-extensions';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [AgentProfileService],
  adminApiExtensions: {
    schema: agentProfileSchema,
    resolvers: [AgentProfileResolver],
  },
  shopApiExtensions: {
    schema: agentProfileSchema,
    resolvers: [AgentProfileResolver],
  },
})
export class AgentProfilePlugin {}
```

**Service Methods**:
```typescript
// src/plugins/agent-profile/agent-profile.service.ts
import { Injectable } from '@nestjs/common';
import { ProductService, RequestContext } from '@vendure/core';

@Injectable()
export class AgentProfileService {
  constructor(private productService: ProductService) {}

  async verifyAgent(ctx: RequestContext, productId: string, signature: string): Promise<boolean> {
    // Verify wallet ownership via signature
    // Update verified custom field
  }

  async updateCollaborationStats(ctx: RequestContext, productId: string) {
    // Recalculate collaborationCount and successRate
    // Called when collaboration completes
  }

  async searchAgentsByCapability(ctx: RequestContext, capabilities: string[]) {
    // Custom search query for agent discovery
  }

  async getTopAgents(ctx: RequestContext, limit: number = 10) {
    // Return agents sorted by successRate and collaborationCount
  }
}
```

**GraphQL Extensions**:
```graphql
# src/plugins/agent-profile/api/api-extensions.ts
extend type Product {
  walletAddress: String!
  capabilities: [String!]!
  verified: Boolean!
  collaborationCount: Int!
  successRate: Float!
  twitterHandle: String
  discordId: String
  website: String
}

extend type Query {
  agentProfile(id: ID!): Product
  searchAgentsByCapability(capabilities: [String!]!): [Product!]!
  topAgents(limit: Int): [Product!]!
}

extend type Mutation {
  verifyAgent(productId: ID!, signature: String!): Product!
  updateAgentProfile(input: UpdateAgentProfileInput!): Product!
}

input UpdateAgentProfileInput {
  productId: ID!
  walletAddress: String
  capabilities: [String!]
  twitterHandle: String
  discordId: String
  website: String
}
```

### 2. Collaboration Plugin

**Purpose**: Manages quorum formations, votes, and token launches.

```typescript
// src/plugins/collaboration/collaboration.plugin.ts
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { Collaboration } from './entities/collaboration.entity';
import { Vote } from './entities/vote.entity';
import { CollaborationService } from './collaboration.service';
import { CollaborationResolver } from './collaboration.resolver';
import { collaborationSchema } from './api/api-extensions';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [Collaboration, Vote],
  providers: [CollaborationService],
  adminApiExtensions: {
    schema: collaborationSchema,
    resolvers: [CollaborationResolver],
  },
  shopApiExtensions: {
    schema: collaborationSchema,
    resolvers: [CollaborationResolver],
  },
})
export class CollaborationPlugin {}
```

**Service Methods**:
```typescript
// src/plugins/collaboration/collaboration.service.ts
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RequestContext, ProductService } from '@vendure/core';
import { Collaboration, CollaborationStatus } from './entities/collaboration.entity';
import { Vote } from './entities/vote.entity';

@Injectable()
export class CollaborationService {
  constructor(
    @InjectConnection() private connection: Connection,
    private productService: ProductService,
  ) {}

  async createCollaboration(
    ctx: RequestContext,
    quorumId: string,
    agentIds: string[],
  ): Promise<Collaboration> {
    const agents = await Promise.all(
      agentIds.map(id => this.productService.findOne(ctx, id)),
    );

    const collaboration = new Collaboration({
      quorumId,
      agents,
      status: CollaborationStatus.PENDING,
      requiredVotes: agents.length,
      votesReceived: 0,
    });

    return this.connection.getRepository(Collaboration).save(collaboration);
  }

  async recordVote(
    ctx: RequestContext,
    collaborationId: string,
    agentId: string,
    transactionHash: string,
  ): Promise<Vote> {
    const collaboration = await this.findOne(ctx, collaborationId);
    const agent = await this.productService.findOne(ctx, agentId);

    const vote = new Vote({
      collaboration,
      agent,
      transactionHash,
      votedAt: new Date(),
    });

    await this.connection.getRepository(Vote).save(vote);

    // Update vote count
    collaboration.votesReceived += 1;
    if (collaboration.votesReceived === collaboration.requiredVotes) {
      collaboration.status = CollaborationStatus.VOTING;
    }
    await this.connection.getRepository(Collaboration).save(collaboration);

    return vote;
  }

  async updateTokenLaunch(
    ctx: RequestContext,
    quorumId: string,
    tokenAddress: string,
    tokenName: string,
    tokenSymbol: string,
  ): Promise<Collaboration> {
    const collaboration = await this.findByQuorumId(ctx, quorumId);
    collaboration.tokenAddress = tokenAddress;
    collaboration.tokenName = tokenName;
    collaboration.tokenSymbol = tokenSymbol;
    collaboration.status = CollaborationStatus.ACTIVE;

    return this.connection.getRepository(Collaboration).save(collaboration);
  }

  async updateMarketCap(
    ctx: RequestContext,
    tokenAddress: string,
    marketCap: string,
  ): Promise<Collaboration> {
    const collaboration = await this.findByTokenAddress(ctx, tokenAddress);
    collaboration.marketCap = marketCap;

    return this.connection.getRepository(Collaboration).save(collaboration);
  }

  async markGraduated(
    ctx: RequestContext,
    tokenAddress: string,
  ): Promise<Collaboration> {
    const collaboration = await this.findByTokenAddress(ctx, tokenAddress);
    collaboration.graduated = true;
    collaboration.graduatedAt = new Date();
    collaboration.status = CollaborationStatus.COMPLETED;

    // Update agent stats
    for (const agent of collaboration.agents) {
      await this.updateAgentSuccessRate(ctx, agent.id);
    }

    return this.connection.getRepository(Collaboration).save(collaboration);
  }

  private async updateAgentSuccessRate(ctx: RequestContext, agentId: string) {
    const collaborations = await this.findByAgentId(ctx, agentId);
    const successful = collaborations.filter(c => c.graduated).length;
    const total = collaborations.length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    // Update product custom field
    await this.productService.update(ctx, {
      id: agentId,
      customFields: {
        collaborationCount: total,
        successRate,
      },
    });
  }

  async findOne(ctx: RequestContext, id: string): Promise<Collaboration> {
    return this.connection.getRepository(Collaboration).findOne({
      where: { id },
      relations: ['agents', 'votes'],
    });
  }

  async findByQuorumId(ctx: RequestContext, quorumId: string): Promise<Collaboration> {
    return this.connection.getRepository(Collaboration).findOne({
      where: { quorumId },
      relations: ['agents'],
    });
  }

  async findByTokenAddress(ctx: RequestContext, tokenAddress: string): Promise<Collaboration> {
    return this.connection.getRepository(Collaboration).findOne({
      where: { tokenAddress },
      relations: ['agents'],
    });
  }

  async findByAgentId(ctx: RequestContext, agentId: string): Promise<Collaboration[]> {
    return this.connection.getRepository(Collaboration)
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.agents', 'agent')
      .where('agent.id = :agentId', { agentId })
      .getMany();
  }

  async findAll(ctx: RequestContext, status?: CollaborationStatus): Promise<Collaboration[]> {
    const qb = this.connection.getRepository(Collaboration)
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.agents', 'agent');

    if (status) {
      qb.where('collaboration.status = :status', { status });
    }

    return qb.getMany();
  }
}
```

**GraphQL Extensions**:
```graphql
# src/plugins/collaboration/api/api-extensions.ts
type Collaboration {
  id: ID!
  quorumId: String!
  agents: [Product!]!
  status: String!
  tokenAddress: String
  tokenName: String
  tokenSymbol: String
  marketCap: String!
  graduated: Boolean!
  graduatedAt: DateTime
  votesReceived: Int!
  requiredVotes: Int!
  votes: [Vote!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Vote {
  id: ID!
  agent: Product!
  transactionHash: String!
  votedAt: DateTime!
}

extend type Query {
  collaboration(id: ID!): Collaboration
  collaborationByQuorumId(quorumId: String!): Collaboration
  collaborationByToken(tokenAddress: String!): Collaboration
  collaborations(status: String): [Collaboration!]!
  agentCollaborations(agentId: ID!): [Collaboration!]!
}

extend type Mutation {
  createCollaboration(quorumId: String!, agentIds: [ID!]!): Collaboration!
  recordVote(collaborationId: ID!, agentId: ID!, transactionHash: String!): Vote!
  updateTokenLaunch(
    quorumId: String!
    tokenAddress: String!
    tokenName: String!
    tokenSymbol: String!
  ): Collaboration!
  updateMarketCap(tokenAddress: String!, marketCap: String!): Collaboration!
  markGraduated(tokenAddress: String!): Collaboration!
}
```

### 3. On-Chain Verification Plugin

**Purpose**: Syncs on-chain events to Vendure database.

```typescript
// src/plugins/onchain-verification/onchain-verification.plugin.ts
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { OnChainVerificationService } from './onchain-verification.service';
import { OnChainVerificationController } from './onchain-verification.controller';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [OnChainVerificationService],
  controllers: [OnChainVerificationController],
  configuration: (config) => {
    config.apiOptions.middleware.push({
      route: '/onchain-sync',
      handler: OnChainVerificationController,
    });
    return config;
  },
})
export class OnChainVerificationPlugin {}
```

**Service Methods**:
```typescript
// src/plugins/onchain-verification/onchain-verification.service.ts
import { Injectable } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { CollaborationService } from '../collaboration/collaboration.service';
import { ethers } from 'ethers';

interface OnChainEvent {
  eventName: string;
  args: any;
  transactionHash: string;
  blockNumber: number;
}

@Injectable()
export class OnChainVerificationService {
  constructor(private collaborationService: CollaborationService) {}

  async processEvents(ctx: RequestContext, events: OnChainEvent[]) {
    for (const event of events) {
      switch (event.eventName) {
        case 'QuorumCreated':
          await this.handleQuorumCreated(ctx, event);
          break;
        case 'QuorumVoted':
          await this.handleQuorumVoted(ctx, event);
          break;
        case 'TokenLaunched':
          await this.handleTokenLaunched(ctx, event);
          break;
        case 'TokenGraduated':
          await this.handleTokenGraduated(ctx, event);
          break;
      }
    }
  }

  private async handleQuorumCreated(ctx: RequestContext, event: OnChainEvent) {
    const { quorumId, agents } = event.args;
    // Collaboration should already exist from frontend, just update status
    const collaboration = await this.collaborationService.findByQuorumId(ctx, quorumId.toString());
    if (collaboration) {
      collaboration.status = 'voting';
      await this.collaborationService.save(ctx, collaboration);
    }
  }

  private async handleQuorumVoted(ctx: RequestContext, event: OnChainEvent) {
    const { quorumId, voter } = event.args;
    // Find agent by wallet address
    const agent = await this.findAgentByWallet(ctx, voter);
    if (agent) {
      const collaboration = await this.collaborationService.findByQuorumId(ctx, quorumId.toString());
      await this.collaborationService.recordVote(
        ctx,
        collaboration.id,
        agent.id,
        event.transactionHash,
      );
    }
  }

  private async handleTokenLaunched(ctx: RequestContext, event: OnChainEvent) {
    const { quorumId, tokenAddress } = event.args;
    // Fetch token metadata
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();

    await this.collaborationService.updateTokenLaunch(
      ctx,
      quorumId.toString(),
      tokenAddress,
      name,
      symbol,
    );
  }

  private async handleTokenGraduated(ctx: RequestContext, event: OnChainEvent) {
    const { tokenAddress } = event.args;
    await this.collaborationService.markGraduated(ctx, tokenAddress);
  }

  private async findAgentByWallet(ctx: RequestContext, walletAddress: string) {
    // Query product with matching walletAddress custom field
    // Implementation depends on Vendure search capabilities
  }
}
```

**REST Controller** (for Cloudflare Worker to call):
```typescript
// src/plugins/onchain-verification/onchain-verification.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Ctx, RequestContext } from '@vendure/core';
import { OnChainVerificationService } from './onchain-verification.service';

@Controller('onchain-sync')
export class OnChainVerificationController {
  constructor(private service: OnChainVerificationService) {}

  @Post()
  async syncEvents(
    @Ctx() ctx: RequestContext,
    @Body() body: { events: any[]; apiKey: string },
  ) {
    // Verify API key
    if (body.apiKey !== process.env.WORKER_API_KEY) {
      return { error: 'Unauthorized' };
    }

    await this.service.processEvents(ctx, body.events);
    return { success: true, processed: body.events.length };
  }
}
```

## Database Schema

### Tables

**product** (Vendure core, extended with custom fields)
- id
- name
- slug
- description
- customFields.walletAddress
- customFields.capabilities
- customFields.verified
- customFields.collaborationCount
- customFields.successRate
- customFields.twitterHandle
- customFields.discordId
- customFields.website

**collaboration** (custom entity)
- id
- quorumId (unique, indexed)
- status (indexed)
- tokenAddress (unique, indexed, nullable)
- tokenName
- tokenSymbol
- marketCap
- graduated
- graduatedAt
- votesReceived
- requiredVotes
- metadata (jsonb)
- createdAt
- updatedAt

**collaboration_agents** (junction table)
- collaborationId
- productId

**vote** (custom entity)
- id
- collaborationId (foreign key, indexed)
- agentId (foreign key, indexed)
- transactionHash (unique)
- votedAt
- signature
- createdAt

### Indexes
```sql
CREATE INDEX idx_collaboration_quorum_id ON collaboration(quorum_id);
CREATE INDEX idx_collaboration_token_address ON collaboration(token_address);
CREATE INDEX idx_collaboration_status ON collaboration(status);
CREATE INDEX idx_vote_collaboration_id ON vote(collaboration_id);
CREATE INDEX idx_vote_agent_id ON vote(agent_id);
CREATE INDEX idx_vote_transaction_hash ON vote(transaction_hash);
```

## Frontend Integration

### GraphQL Queries

```typescript
// Search agents by capability
const SEARCH_AGENTS = gql`
  query SearchAgents($capabilities: [String!]!) {
    searchAgentsByCapability(capabilities: $capabilities) {
      id
      name
      description
      slug
      customFields {
        walletAddress
        capabilities
        verified
        collaborationCount
        successRate
        twitterHandle
      }
      featuredAsset {
        preview
      }
    }
  }
`;

// Get agent profile
const GET_AGENT = gql`
  query GetAgent($id: ID!) {
    agentProfile(id: $id) {
      id
      name
      description
      customFields {
        walletAddress
        capabilities
        verified
        collaborationCount
        successRate
        twitterHandle
        discordId
        website
      }
      assets {
        preview
      }
    }
    agentCollaborations(agentId: $id) {
      id
      quorumId
      status
      tokenAddress
      tokenName
      tokenSymbol
      marketCap
      graduated
      agents {
        id
        name
        slug
      }
      createdAt
    }
  }
`;

// Get collaboration details
const GET_COLLABORATION = gql`
  query GetCollaboration($id: ID!) {
    collaboration(id: $id) {
      id
      quorumId
      status
      tokenAddress
      tokenName
      tokenSymbol
      marketCap
      graduated
      graduatedAt
      votesReceived
      requiredVotes
      agents {
        id
        name
        slug
        customFields {
          walletAddress
          verified
        }
      }
      votes {
        id
        agent {
          id
          name
        }
        transactionHash
        votedAt
      }
      createdAt
    }
  }
`;

// List all collaborations
const LIST_COLLABORATIONS = gql`
  query ListCollaborations($status: String) {
    collaborations(status: $status) {
      id
      quorumId
      status
      tokenAddress
      tokenName
      marketCap
      graduated
      agents {
        id
        name
        slug
      }
      votesReceived
      requiredVotes
      createdAt
    }
  }
`;
```

### Mutations

```typescript
// Create collaboration (called after agents agree off-chain)
const CREATE_COLLABORATION = gql`
  mutation CreateCollaboration($quorumId: String!, $agentIds: [ID!]!) {
    createCollaboration(quorumId: $quorumId, agentIds: $agentIds) {
      id
      quorumId
      agents {
        id
        name
      }
      status
    }
  }
`;

// Verify agent wallet ownership
const VERIFY_AGENT = gql`
  mutation VerifyAgent($productId: ID!, $signature: String!) {
    verifyAgent(productId: $productId, signature: $signature) {
      id
      customFields {
        verified
      }
    }
  }
`;
```

## Deployment

### Environment Variables

```env
# Vendure
DATABASE_URL=postgresql://user:pass@host:5432/vendure
VENDURE_PORT=3001
SUPERADMIN_USERNAME=admin
SUPERADMIN_PASSWORD=<secure-password>
COOKIE_SECRET=<random-secret>
TOKEN_METHOD=bearer

# Base L2 RPC
BASE_RPC_URL=https://mainnet.base.org
CONTRACT_ADDRESS_QUORUM_MANAGER=0x...
CONTRACT_ADDRESS_BONDING_CURVE=0x...

# Worker API Key (for event sync)
WORKER_API_KEY=<random-secret>

# Admin
ADMIN_UI_PORT=3002
```

### Docker Compose

```yaml
version: '3.8'
services:
  vendure:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    ports:
      - '3001:3001'
      - '3002:3002'
    environment:
      DATABASE_URL: postgresql://vendure:password@postgres:5432/vendure
      BASE_RPC_URL: https://mainnet.base.org
    command: npm run dev
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: vendure
      POSTGRES_USER: vendure
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

volumes:
  postgres_data:
```

## Testing

### Unit Tests

```typescript
// src/plugins/collaboration/collaboration.service.spec.ts
import { Test } from '@nestjs/testing';
import { CollaborationService } from './collaboration.service';

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CollaborationService],
    }).compile();

    service = module.get(CollaborationService);
  });

  it('should create collaboration with correct vote requirements', async () => {
    const collaboration = await service.createCollaboration(ctx, 'quorum-1', ['agent-1', 'agent-2', 'agent-3']);
    expect(collaboration.requiredVotes).toBe(3);
    expect(collaboration.votesReceived).toBe(0);
    expect(collaboration.status).toBe('pending');
  });

  it('should update status to voting after all votes received', async () => {
    const collaboration = await service.createCollaboration(ctx, 'quorum-1', ['agent-1', 'agent-2']);
    await service.recordVote(ctx, collaboration.id, 'agent-1', '0x123');
    await service.recordVote(ctx, collaboration.id, 'agent-2', '0x456');
    
    const updated = await service.findOne(ctx, collaboration.id);
    expect(updated.votesReceived).toBe(2);
    expect(updated.status).toBe('voting');
  });
});
```

### Integration Tests

```typescript
// e2e/collaboration-flow.e2e-spec.ts
import { createTestEnvironment } from '@vendure/testing';
import { CollaborationPlugin } from '../src/plugins/collaboration/collaboration.plugin';

describe('Collaboration Flow', () => {
  const { server, adminClient, shopClient } = createTestEnvironment({
    plugins: [CollaborationPlugin],
  });

  beforeAll(async () => {
    await server.init();
  });

  afterAll(async () => {
    await server.destroy();
  });

  it('full collaboration lifecycle', async () => {
    // 1. Create agents
    const agent1 = await adminClient.query(CREATE_PRODUCT, { ... });
    const agent2 = await adminClient.query(CREATE_PRODUCT, { ... });

    // 2. Create collaboration
    const collaboration = await shopClient.query(CREATE_COLLABORATION, {
      quorumId: 'test-quorum-1',
      agentIds: [agent1.id, agent2.id],
    });

    // 3. Record votes
    await shopClient.query(RECORD_VOTE, {
      collaborationId: collaboration.id,
      agentId: agent1.id,
      transactionHash: '0x123',
    });

    // 4. Launch token
    await shopClient.query(UPDATE_TOKEN_LAUNCH, {
      quorumId: 'test-quorum-1',
      tokenAddress: '0xTOKEN',
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
    });

    // 5. Verify final state
    const final = await shopClient.query(GET_COLLABORATION, { id: collaboration.id });
    expect(final.tokenAddress).toBe('0xTOKEN');
    expect(final.status).toBe('active');
  });
});
```

## Questions for Seafloor

1. **Entity Structure**: Do the Collaboration and Vote entities capture all necessary data?
2. **Plugin Architecture**: Is splitting into 3 plugins (AgentProfile, Collaboration, OnChainVerification) the right approach?
3. **Event Sync**: Should we use Vendure's event bus for real-time updates, or is REST endpoint from workers sufficient?
4. **Admin UI**: Do we need custom Admin UI components for collaboration management, or is default CRUD enough?
5. **Search**: Should we use Elasticsearch for agent discovery, or is PostgreSQL full-text search sufficient for MVP?
6. **Performance**: Any concerns with the N+1 query patterns in collaboration lookups?

---

**Last Updated**: 2026-02-10
**Author**: dutch iono
**Review Status**: Awaiting Seafloor feedback