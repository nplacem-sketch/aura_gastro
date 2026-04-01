import { NextResponse } from 'next/server';
import { getServiceShard } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'SUPERADMIN' && profile.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { targetDb, targetTable, targetId, targetField, newValue } = await req.json();

    if (!targetDb || !targetTable || !targetId || !targetField) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = getServiceShard(targetDb as any);

    let updatePayload: any = {};
    if (targetField.includes('.')) {
      const [parentField, childField] = targetField.split('.');
      const { data: existing } = await db.from(targetTable).select(parentField).eq('id', targetId).single();
      const obj: any = existing?.[parentField] || {};
      obj[childField] = newValue;
      updatePayload[parentField] = obj;
    } else {
      updatePayload[targetField] = newValue;
    }

    const { error } = await db.from(targetTable).update(updatePayload).eq('id', targetId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
