#!/usr/bin/env node
/**
 * DropHour - Supabase Keep-Alive Anti-Pause Heartbeat Script
 * -------------------------------------------------------------
 * Supabase free-tier databases automatically pause after 7 days
 * of inactivity (no queries/traffic).
 * 
 * This script pings every configured Supabase instance in .env,
 * performing a fast 1-row probe query to register incoming HTTP
 * and PostgreSQL activity so none of your projects pause!
 * 
 * Run manually or via cron:
 *   npm run keep-alive
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env
let envContent = '';
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].trim() : process.env[key] || '';
};

const nodes = [
  { id: 'db-1', name: 'Node 1 (Primary - Free Tier)', urlKey: 'VITE_SUPABASE_URL', keyKey: 'VITE_SUPABASE_ANON_KEY' },
  { id: 'db-2', name: 'Node 2 (Secondary - Free Overflow)', urlKey: 'VITE_SUPABASE_URL_2', keyKey: 'VITE_SUPABASE_ANON_KEY_2' },
  { id: 'db-3', name: 'Node 3 (Node 3 - Paid Tier)', urlKey: 'VITE_SUPABASE_URL_3', keyKey: 'VITE_SUPABASE_ANON_KEY_3' },
  { id: 'db-4', name: 'Node 4 (Node 4 - Paid Tier)', urlKey: 'VITE_SUPABASE_URL_4', keyKey: 'VITE_SUPABASE_ANON_KEY_4' },
  { id: 'db-5', name: 'Node 5 (Node 5 - Paid Tier)', urlKey: 'VITE_SUPABASE_URL_5', keyKey: 'VITE_SUPABASE_ANON_KEY_5' },
];

async function main() {
  console.log('==============================================================');
  console.log('       DropHour Supabase Keep-Alive Heartbeat Probe           ');
  console.log('   Preventing 7-Day Inactivity Pauses on Free-Tier Nodes      ');
  console.log('==============================================================');
  console.log(`Execution Time: ${new Date().toISOString()}\n`);

  let activeCount = 0;
  let successCount = 0;

  for (const node of nodes) {
    const url = getEnv(node.urlKey);
    const key = getEnv(node.keyKey);

    if (!url || !key) {
      console.log(`⚪ [${node.id}] ${node.name}: Not configured in .env (Skipped)`);
      continue;
    }

    activeCount++;
    const client = createClient(url, key);
    const start = Date.now();

    try {
      // Fast probe to register active traffic
      const { error } = await client.from('file_shares').select('id').limit(1);
      const latency = Date.now() - start;

      if (error) {
        console.error(`❌ [${node.id}] ${node.name} (${url}): Query Error -> ${error.message} (${latency}ms)`);
      } else {
        successCount++;
        console.log(`✅ [${node.id}] ${node.name} (${url}): ACTIVE & ALIVE -> ${latency}ms latency`);
      }
    } catch (err) {
      console.error(`❌ [${node.id}] ${node.name} (${url}): Connection Exception -> ${err.message}`);
    }
  }

  console.log('\n--------------------------------------------------------------');
  console.log(`Summary: ${successCount}/${activeCount} configured nodes kept alive successfully.`);
  console.log('==============================================================\n');
}

main().catch((err) => {
  console.error('Keep-alive failed:', err);
  process.exit(1);
});
