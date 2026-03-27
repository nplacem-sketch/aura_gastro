const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runIdentitySql(statements) {
  const connectionString = process.env.DATABASE_URL_CORE || process.env.DATABASE_URL_IDENTITY;
  if (!connectionString) return;

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
  } finally {
    await client.end();
  }
}

async function setupAdmin() {
  const adminClient = createClient(
    process.env.SUPABASE_IDENTITY_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_IDENTITY_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const publicClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const email = 'admin@auragastronomy.com';
  const password = 'V@llado212g';
  const fullName = 'Jesus Fernandez (ADMIN)';

  console.log('--- Configurando acceso total para la cuenta administradora ---');

  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) throw listError;

  let user = listData.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log('Creando usuario administrador...');
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role: 'ADMIN', plan: 'ENTERPRISE' },
    });
    if (error) throw error;
    user = data.user;
  } else {
    console.log('Actualizando usuario administrador existente...');
    const { data, error } = await adminClient.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), full_name: fullName },
      app_metadata: { ...(user.app_metadata || {}), role: 'ADMIN', plan: 'ENTERPRISE' },
    });
    if (error) throw error;
    user = data.user;
  }

  const profilePayload = {
    id: user.id,
    email,
    full_name: fullName,
    role: 'ADMIN',
    plan: 'ENTERPRISE',
  };

  const { error: profileError } = await adminClient.from('profiles').upsert(profilePayload, { onConflict: 'id' });
  if (profileError) throw profileError;

  const signInRes = await publicClient.auth.signInWithPassword({ email, password });
  if (signInRes.error) throw signInRes.error;

  const token = signInRes.data.session?.access_token;
  if (!token) throw new Error('No access token returned for admin login.');

  const { data: profileCheck, error: profileCheckError } = await adminClient
    .from('profiles')
    .select('id,email,role,plan')
    .eq('id', user.id)
    .single();

  if (profileCheckError) throw profileCheckError;

  console.log('Admin login OK.');
  console.log(profileCheck);
  console.log(`Bearer preview: ${token.slice(0, 24)}...`);
}

setupAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
