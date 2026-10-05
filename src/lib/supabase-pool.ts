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
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    capacityBytes: 500 * 1024 * 1024,
    isConfigured: Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
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
 * Smart Load Balancer & Tier Router:
 * Enforces the required storage pool distribution:
 * - Free sharing (<= 50MB):
 *     1. Primary: Use Node 1 (db-1).
 *     2. Overflow: Use Node 2 (db-2) only when Node 1 has reached its capacity limit or is unavailable.
 * - Paid sharing (> 50MB or paid transfers):
 *     1. Strictly use secondary nodes: Node 3 (db-3), Node 4 (db-4), Node 5 (db-5).
 *     2. Selects the healthiest node with highest remaining capacity among the paid pool.
 *     3. Safe rollover fallback if paid nodes are not yet configured or full.
 */
export async function selectOptimalSupabaseNode(
  fileSizeBytes: number,
  isPaid: boolean = false
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

  const safetyMargin = 5 * 1024 * 1024; // 5 MB safety headroom
  const hasSpace = (status: SupabaseNodeStatus) =>
    status.remainingBytes >= fileSizeBytes + safetyMargin;

  // -------------------------------------------------------------
  // TIER 1: PAID TRANSFERS (>50MB or paid checkout)
  // Routing Rule: Route to Node 3, Node 4, or Node 5
  // -------------------------------------------------------------
  if (isPaid || fileSizeBytes > 50 * 1024 * 1024) {
    const paidCandidates = healthyNodes.filter(
      (n) => ['db-3', 'db-4', 'db-5'].includes(n.id) && hasSpace(n)
    );

    if (paidCandidates.length > 0) {
      // Prioritize Node 3, then Node 4, then Node 5, or by most available space
      paidCandidates.sort((a, b) => b.remainingBytes - a.remainingBytes);
      const chosen = paidCandidates[0];
      return { client: getClientForNode(chosen), node: chosen };
    }

    // If 3, 4, 5 are not yet configured in environment or at capacity, fallback to Node 2 then Node 1
    const overflowCandidates = healthyNodes.filter(
      (n) => n.id === 'db-2' && hasSpace(n)
    );
    if (overflowCandidates.length > 0) {
      const chosen = overflowCandidates[0];
      return { client: getClientForNode(chosen), node: chosen };
    }

    // Fallback to any node with enough space
    const anyAvailable = healthyNodes.filter(hasSpace);
    if (anyAvailable.length > 0) {
      anyAvailable.sort((a, b) => b.remainingBytes - a.remainingBytes);
      const chosen = anyAvailable[0];
      return { client: getClientForNode(chosen), node: chosen };
    }
  }

  // -------------------------------------------------------------
  // TIER 2: FREE TRANSFERS (<= 50MB)
  // Routing Rule: Use only Node 1. Use Node 2 only when Node 1 reaches limit!
  // -------------------------------------------------------------
  const node1 = healthyNodes.find((n) => n.id === 'db-1');
  if (node1 && hasSpace(node1)) {
    // Node 1 is healthy and has not reached its limit: use Node 1!
    return { client: getClientForNode(node1), node: node1 };
  }

  // Node 1 reached its limit or is unhealthy: rollover to Node 2
  const node2 = healthyNodes.find((n) => n.id === 'db-2');
  if (node2 && hasSpace(node2)) {
    console.info('[DropHour Router] Node 1 at limit or offline, rolling over free transfer to Node 2');
    return { client: getClientForNode(node2), node: node2 };
  }

  // Both Node 1 and Node 2 reached limit: find any healthy candidate
  const candidateNodes = healthyNodes.filter(hasSpace);
  if (candidateNodes.length > 0) {
    candidateNodes.sort((a, b) => b.remainingBytes - a.remainingBytes);
    const chosen = candidateNodes[0];
    return { client: getClientForNode(chosen), node: chosen };
  }

  // Last-resort fallback: Pick node with lowest used bytes
  healthyNodes.sort((a, b) => a.estimatedUsedBytes - b.estimatedUsedBytes);
  const fallback = healthyNodes[0];
  return { client: getClientForNode(fallback), node: fallback };
}

/**
 * Anti-Pausing Keep-Alive Heartbeat:
 * Supabase free-tier projects automatically pause after 7 days of inactivity.
 * This function sends an active lightweight query to ALL configured Supabase
 * nodes (1, 2, 3, 4, 5) to register HTTP/REST and database activity so no node
 * ever pauses due to inactivity!
 */
export async function pingAllSupabaseNodes(): Promise<{
  id: string;
  name: string;
  success: boolean;
  latencyMs: number;
  message: string;
}[]> {
  const nodes = getPoolConfigs().filter((n) => n.isConfigured && n.url && n.anonKey);

  const results = await Promise.all(
    nodes.map(async (node) => {
      const client = getClientForNode(node);
      if (!client) {
        return {
          id: node.id,
          name: node.name,
          success: false,
          latencyMs: 0,
          message: 'Client not initialized',
        };
      }

      const start = Date.now();
      try {
        // Query 1 row from file_shares to trigger active database & API traffic in Supabase project
        const { error } = await client.from('file_shares').select('id').limit(1);
        const latencyMs = Date.now() - start;

        if (error) {
          return {
            id: node.id,
            name: node.name,
            success: false,
            latencyMs,
            message: error.message,
          };
        }

        return {
          id: node.id,
          name: node.name,
          success: true,
          latencyMs,
          message: 'Active traffic registered (prevents 7-day pause)',
        };
      } catch (err) {
        return {
          id: node.id,
          name: node.name,
          success: false,
          latencyMs: Date.now() - start,
          message: err instanceof Error ? err.message : 'Ping failed',
        };
      }
    })
  );

  return results;
}

