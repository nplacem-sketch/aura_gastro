/**
 * Local Ollama <-> Supabase connector via generation_queue.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const BOTFARM_URL = process.env.SUPABASE_BOTFARM_URL;
const BOTFARM_SVC = process.env.SUPABASE_BOTFARM_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BOTFARM_URL) {
  console.error('Missing SUPABASE_BOTFARM_URL');
  process.exit(1);
}
if (!BOTFARM_SVC) {
  console.error('Missing SUPABASE_BOTFARM_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const BASE_URL = process.env.WORKER_BASE_URL || 'http://localhost:3000';
const POLL_MS = Number(process.env.WORKER_POLL_MS || '2000');
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

const botfarm = createClient(BOTFARM_URL, BOTFARM_SVC, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function claimNextJob() {
  const { data, error } = await botfarm
    .from('generation_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;
  const job = data?.[0];
  if (!job) return null;

  const { error: claimErr } = await botfarm
    .from('generation_queue')
    .update({ status: 'processing' })
    .eq('id', job.id)
    .eq('status', 'pending');

  if (claimErr) throw claimErr;
  return job;
}

async function failJob(id, message) {
  await botfarm
    .from('generation_queue')
    .update({
      status: 'failed',
      error_message: message?.slice?.(0, 1000) ?? String(message).slice(0, 1000),
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function mainLoop() {
  console.log('[worker] Ollama queue worker running');
  console.log(`- BotFarm: ${BOTFARM_URL}`);
  console.log(`- Base URL: ${BASE_URL}`);
  console.log(`- Poll: ${POLL_MS}ms`);

  while (true) {
    let job = null;
    try {
      job = await claimNextJob();
      if (!job) {
        await sleep(POLL_MS);
        continue;
      }

      const payload = {
        type: job.type,
        topic: job.topic,
        tier: job.tier || 'PREMIUM',
        queue_id: job.id,
      };

      console.log(`[job] ${job.id} ${payload.type} "${payload.topic}" (${payload.tier})`);

      const res = await fetch(`${BASE_URL}/api/bots/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(INTERNAL_API_SECRET ? { 'x-internal-api-key': INTERNAL_API_SECRET } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`generate-content failed: ${res.status} ${text}`);
      }

      const out = await res.json().catch(() => ({}));
      if (!out?.success) {
        throw new Error(out?.error || 'generate-content returned success=false');
      }

      console.log(`[ok] ${job.id} -> inserted ${out.type} ${out.id}`);
    } catch (err) {
      const msg = err?.message || String(err);
      console.error(`[err] ${job?.id || 'n/a'} ${msg}`);
      if (job?.id) await failJob(job.id, msg);
      await sleep(Math.min(5000, Math.max(500, POLL_MS)));
    }
  }
}

mainLoop().catch((err) => {
  console.error('Fatal:', err?.message || err);
  process.exit(1);
});
