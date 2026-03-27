import { NextResponse } from 'next/server';

// ── Visual Bot Worker (IG & TikTok) ──────────────────────────────────────────
// This worker processes Instagram and TikTok tasks. 
// Note: Direct posting usually requires Graph API for Business accounts.

export async function GET(req: Request) {
  return NextResponse.json({ 
    status: 'paused', 
    message: 'Social Bot Engine is currently disabled by administrator.' 
  });
}
