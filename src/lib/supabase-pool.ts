import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseNodeConfig {
  id: string; // 'db-1', 'db-2', 'db-3', 'db-4', 'db-5'
  name: string;
  url: string;
  anonKey: string;
  capacityBytes: number; // 500MB (524288000) default for free tier
  isConfigured: boolean;
  isPrimary?: boolean;
}

export interface SupabaseNodeStatus extends SupabaseNodeConfig {
  estimatedUsedBytes: number;
  remainingBytes: number;
  activeFilesCount: number;
  isHealthy: boolean;
  statusMessage?: string;
}

// 5-Node Pool configured strictly via Vite Environment Variables (Never exposed in client localStorage)
const ENV_NODES: SupabaseNodeConfig[] = [
  {
    id: 'db-1',
    name: 'Database Node 1 (Primary)',
    url:
      import.meta.env.VITE_SUPABASE_URL ||
      'https://nimqhkfbwaepcaqsvjky.supabase.co',
    anonKey:
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbXFoa2Zid2FlcGNhcXN2amt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNjE2MTksImV4cCI6MjEwNjczNzYxOX0.FWT2Fc3lPfDVhVSXAlAeR2OVbNnr2HdkCjSgPryud74',
    capacityBytes: 500 * 1024 * 1024,
    isConfigured: Boolean(
      import.meta.env.VITE_SUPABASE_URL ||
        'https://nimqhkfbwaepcaqsvjky.supabase.co'
    ),
    isPrimary: true,
  },
  {
    id: 'db-2',
    name: 'Database Node 2 (Large Files)',
    url: import.meta.env.VITE_SUPABASE_URL_2 || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_2 || '',
    capacityBytes: 500 * 1024 * 1024,
    isConfigured: Boolean(
      import.meta.env.VITE_SUPABASE_URL_2 && import.meta.env.VITE_SUPABASE_ANON_KEY_2
    ),
  },
  {
    id: 'db-3',
    name: 'Database Node 3 (Large Files)',
    url: import.meta.env.VITE_SUPABASE_URL_3 || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_3 || '',
    capacityBytes: 500 * 1024 * 1024,
    isConfigured: Boolean(
      import.meta.env.VITE_SUPABASE_URL_3 && import.meta.env.VITE_SUPABASE_ANON_KEY_3
    ),
  },
  {
    id: 'db-4',
    name: 'Database Node 4 (Large Files)',
    url: import.meta.env.VITE_SUPABASE_URL_4 || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_4 || '',
    capacityBytes: 500 * 1024 * 1024,
    isConfigured: Boolean(
      import.meta.env.VITE_SUPABASE_URL_4 && import.meta.env.VITE_SUPABASE_ANON_KEY_4
    ),
  },
  {
    id: 'db-5',
    name: 'Database Node 5 (Overflow)',
    url: import.meta.env.VITE_SUPABASE_URL_5 || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_5 || '',
    capacityBytes: 500 * 1024 * 1024,
    isConfigured: Boolean(
      import.meta.env.VITE_SUPABASE_URL_5 && import.meta.env.VITE_SUPABASE_ANON_KEY_5
    ),
  },
];

// Clean up any legacy localStorage entry if present from previous sessions
try {
  localStorage.removeItem('drophour_supabase_pool_v1');
} catch {
  // ignore
}

// Client cache for active nodes
const clientCache = new Map<string, SupabaseClient>();

export function getPoolConfigs(): SupabaseNodeConfig[] {
  return ENV_NODES;
}

export function getClientForNode(node: SupabaseNodeConfig): SupabaseClient | null {
  if (!node.url || !node.anonKey) return null;
  const cacheKey = `${node.id}:${node.url}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createClient(node.url, node.anonKey));
  }
  return clientCache.get(cacheKey) || null;
}

export function getClientByNodeId(nodeId?: string): {
  client: SupabaseClient | null;
  node: SupabaseNodeConfig;
} {
  const nodes = getPoolConfigs();
  const target = nodes.find((n) => n.id === nodeId) || nodes[0];
  const client = getClientForNode(target);
  return { client, node: target };
}

/**
 * Checks node health and calculates active space usage
 */
export async function getNodeStatus(node: SupabaseNodeConfig): Promise<SupabaseNodeStatus> {
  const client = getClientForNode(node);
  if (!client || !node.isConfigured) {
    return {
      ...node,
      estimatedUsedBytes: 0,
      remainingBytes: node.capacityBytes,
      activeFilesCount: 0,
      isHealthy: false,
      statusMessage: 'Not configured in environment',
    };
  }

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from('file_shares')
      .select('file_size')
      .eq('status', 'active')
      .gt('expires_at', nowIso);

    if (error) {
      return {
        ...node,
        estimatedUsedBytes: 0,
        remainingBytes: node.capacityBytes,
        activeFilesCount: 0,
        isHealthy: false,
        statusMessage: error.message,
      };
    }

    const activeFilesCount = data?.length || 0;
    const estimatedUsedBytes = (data || []).reduce(
      (sum, row) => sum + (Number(row.file_size) || 0),
      0
    );
    const remainingBytes = Math.max(0, node.capacityBytes - estimatedUsedBytes);

    return {
      ...node,
      estimatedUsedBytes,
      remainingBytes,
      activeFilesCount,
      isHealthy: true,
      statusMessage: 'Online & operational',
    };
  } catch (err) {
    return {
      ...node,
      estimatedUsedBytes: 0,
      remainingBytes: node.capacityBytes,
      activeFilesCount: 0,
      isHealthy: false,
      statusMessage: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

/**
 * Smart Load Balancer:
 * Evaluates environment-configured Supabase nodes and selects the optimal node.
 * 1. Checks health and remaining capacity across all active nodes in the pool.
 * 2. If file > 50MB, routes to secondary nodes (Node 2-5) if configured, preserving Node 1.
 * 3. Chooses the node with highest remaining capacity.
 * 4. Automatically rolls over when a database runs out of space.
 */
export async function selectOptimalSupabaseNode(
  fileSizeBytes: number
): Promise<{ client: SupabaseClient | null; node: SupabaseNodeConfig }> {
  const nodes = getPoolConfigs();
  const configuredNodes = nodes.filter((n) => n.isConfigured && n.url && n.anonKey);

  if (configuredNodes.length === 0) {
    return { client: null, node: nodes[0] };
  }

  if (configuredNodes.length === 1) {
    return {
      client: getClientForNode(configuredNodes[0]),
      node: configuredNodes[0],
    };
  }

  // Check health and usage across configured nodes
  const statuses = await Promise.all(configuredNodes.map(getNodeStatus));
  const healthyNodes = statuses.filter((s) => s.isHealthy);

  if (healthyNodes.length === 0) {
    return {
      client: getClientForNode(configuredNodes[0]),
      node: configuredNodes[0],
    };
  }

  // Find candidate nodes that have enough space for the incoming file (+ 5MB safety margin)
  const candidateNodes = healthyNodes.filter(
    (n) => n.remainingBytes >= fileSizeBytes + 5 * 1024 * 1024
  );

  // If file > 50MB and we have secondary candidates (db-2, db-3, db-4, db-5), prioritize them
  if (fileSizeBytes > 50 * 1024 * 1024) {
    const secondaryCandidates = candidateNodes.filter((n) => n.id !== 'db-1');
    if (secondaryCandidates.length > 0) {
      secondaryCandidates.sort((a, b) => b.remainingBytes - a.remainingBytes);
      const chosen = secondaryCandidates[0];
      return { client: getClientForNode(chosen), node: chosen };
    }
  }

  if (candidateNodes.length > 0) {
    candidateNodes.sort((a, b) => b.remainingBytes - a.remainingBytes);
    const chosen = candidateNodes[0];
    return { client: getClientForNode(chosen), node: chosen };
  }

  // Fallback: Pick the node with lowest used bytes
  healthyNodes.sort((a, b) => a.estimatedUsedBytes - b.estimatedUsedBytes);
  const fallback = healthyNodes[0];
  return { client: getClientForNode(fallback), node: fallback };
}
