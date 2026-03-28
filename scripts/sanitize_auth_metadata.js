const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

function createAdminClient() {
  return createClient(
    process.env.SUPABASE_IDENTITY_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_IDENTITY_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function readOptionalString(value) {
  return typeof value === 'string' ? value : null;
}

function sanitizeUserMetadata(metadata) {
  if (!metadata) {
    return {
      avatar_url: null,
      cv_url: null,
      cv_name: null,
    };
  }
  const { avatar_url: _avatarUrl, cv_url: _cvUrl, cv_name: _cvName, ...rest } = metadata;
  return {
    ...rest,
    avatar_url: null,
    cv_url: null,
    cv_name: null,
  };
}

async function listAllUsers(adminClient) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    users.push(...(data.users || []));
    if ((data.users || []).length < 100) break;
    page += 1;
  }

  return users;
}

async function ensureProfileAssets(adminClient, user) {
  const avatarUrl = readOptionalString(user.user_metadata?.avatar_url);
  const cvUrl = readOptionalString(user.user_metadata?.cv_url);
  const cvName = readOptionalString(user.user_metadata?.cv_name);

  if (!avatarUrl && !cvUrl && !cvName) return false;

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id,email,full_name,avatar_url,cv_url,cv_name,role,plan,status,subscription_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile) {
    const patch = {};
    if (avatarUrl && !profile.avatar_url) patch.avatar_url = avatarUrl;
    if (cvUrl && !profile.cv_url) patch.cv_url = cvUrl;
    if (cvName && !profile.cv_name) patch.cv_name = cvName;

    if (Object.keys(patch).length > 0) {
      const { error } = await adminClient.from('profiles').update(patch).eq('id', user.id);
      if (error) throw error;
    }
  } else {
    const payload = {
      id: user.id,
      email: user.email || null,
      full_name: String(user.user_metadata?.full_name || user.email || 'Chef Aura'),
      avatar_url: avatarUrl,
      cv_url: cvUrl,
      cv_name: cvName,
      role: String(user.app_metadata?.role || 'USER').toUpperCase(),
      plan: String(user.app_metadata?.plan || 'FREE').toUpperCase(),
      status: String(user.app_metadata?.status || 'ACTIVE').toUpperCase(),
      subscription_status: String(user.app_metadata?.subscription_status || 'inactive'),
    };

    const { error } = await adminClient.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  }

  return true;
}

async function run() {
  const adminClient = createAdminClient();
  const users = await listAllUsers(adminClient);
  let updatedUsers = 0;

  for (const user of users) {
    const sanitizedMetadata = sanitizeUserMetadata(user.user_metadata || {});
    const hadLegacyAssets = await ensureProfileAssets(adminClient, user);
    const originalMetadata = user.user_metadata || {};

    if (
      hadLegacyAssets ||
      Object.keys(sanitizedMetadata).length !== Object.keys(originalMetadata).length
    ) {
      const { error } = await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: sanitizedMetadata,
      });
      if (error) throw error;
      updatedUsers += 1;
      console.log(`Sanitized auth metadata for ${user.email || user.id}`);
    }
  }

  console.log(`Metadata cleanup finished. Updated users: ${updatedUsers}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
