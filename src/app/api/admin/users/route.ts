import { NextResponse } from 'next/server';

import { identityServiceDb } from '@/lib/supabase';
import { chatSvc } from '@/lib/supabase-service';
import { requireAdmin } from '@/lib/server-auth';

type AccountType = 'PERSONAL' | 'BUSINESS' | 'FREELANCER';

const PROFILE_SELECT =
  'id, full_name, email, role, plan, status, subscription_status, subscription_ends_at, created_at';

function readOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRole(value: unknown) {
  const role = String(value || 'USER').toUpperCase();
  return role === 'ADMIN' || role === 'CHEF' ? role : 'USER';
}

function normalizePlan(value: unknown) {
  const plan = String(value || 'FREE').toUpperCase();
  return plan === 'PRO' || plan === 'PREMIUM' || plan === 'ENTERPRISE' ? plan : 'FREE';
}

function normalizeAccountType(value: unknown): AccountType {
  const accountType = String(value || 'PERSONAL').toUpperCase();
  if (accountType === 'BUSINESS' || accountType === 'FREELANCER') return accountType;
  return 'PERSONAL';
}

function normalizeStatus(value: unknown) {
  const status = String(value || 'ACTIVE').toUpperCase();
  return status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE';
}

function resolveSubscriptionStatus(plan: string, preferred?: unknown) {
  const normalizedPreferred = readOptionalString(preferred)?.toLowerCase();
  if (normalizedPreferred) return normalizedPreferred;
  return plan === 'FREE' ? 'inactive' : 'active';
}

function buildFutureIso(days: number) {
  const safeDays = Number.isFinite(days) ? Math.max(0, days) : 0;
  if (safeDays <= 0) return null;
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();
}

function buildUserMetadata(
  body: Record<string, unknown>,
  existingMetadata: Record<string, unknown> = {},
  fallbackEmail?: string | null,
) {
  const accountType = normalizeAccountType(body.accountType ?? existingMetadata.account_type);
  const emailLocalPart = String(fallbackEmail || '').split('@')[0] || 'Aura Member';
  const fullName = readOptionalString(body.fullName) || readOptionalString(existingMetadata.full_name) || emailLocalPart;

  return {
    ...existingMetadata,
    full_name: fullName,
    account_type: accountType,
    business_name: accountType === 'PERSONAL' ? null : readOptionalString(body.businessName),
    legal_name: readOptionalString(body.legalName),
    tax_id: readOptionalString(body.taxId),
    billing_email: readOptionalString(body.billingEmail),
    phone: readOptionalString(body.phone),
    country: readOptionalString(body.country),
    address: readOptionalString(body.address),
    city: readOptionalString(body.city),
    postal_code: readOptionalString(body.postalCode),
    website: readOptionalString(body.website),
  };
}

async function listAllAuthUsers() {
  const users: any[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await identityServiceDb().auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < 100) break;
    page += 1;
  }

  return users;
}

async function upsertOwnedBusiness(
  userId: string,
  metadata: Record<string, unknown>,
  verificationStatus = 'verified',
) {
  const name =
    readOptionalString(metadata.business_name) ||
    readOptionalString(metadata.full_name) ||
    readOptionalString(metadata.legal_name) ||
    'Cuenta profesional';
  const website = readOptionalString(metadata.website);

  const { data: existing, error: existingError } = await identityServiceDb()
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    owner_id: userId,
    name,
    website,
    verification_status: verificationStatus,
  };

  if (existing?.id) {
    const { error } = await identityServiceDb().from('businesses').update(payload).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await identityServiceDb().from('businesses').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

async function removeOwnedBusiness(userId: string) {
  const { error } = await identityServiceDb().from('businesses').delete().eq('owner_id', userId);
  if (error) throw error;
}

async function syncProfile(userId: string, payload: Record<string, unknown>) {
  const { error } = await identityServiceDb().from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
}

async function syncAuthAppMetadata(
  userId: string,
  currentAppMetadata: Record<string, unknown>,
  profilePatch: { role?: string; plan?: string; status?: string; subscription_status?: string | null },
) {
  const nextRole = normalizeRole(profilePatch.role ?? currentAppMetadata.role);
  const nextPlan = normalizePlan(profilePatch.plan ?? currentAppMetadata.plan);
  const nextStatus = normalizeStatus(profilePatch.status ?? currentAppMetadata.status);
  const nextSubscriptionStatus = resolveSubscriptionStatus(
    nextPlan,
    profilePatch.subscription_status ?? currentAppMetadata.subscription_status,
  );

  const { error } = await identityServiceDb().auth.admin.updateUserById(userId, {
    app_metadata: {
      ...currentAppMetadata,
      role: nextRole,
      plan: nextPlan,
      status: nextStatus,
      subscription_status: nextSubscriptionStatus,
    },
  });

  if (error) throw error;
}

async function loadCurrentMember(userId: string) {
  const { data: profile, error: profileError } = await identityServiceDb()
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;

  const { data: authData, error: authError } = await identityServiceDb().auth.admin.getUserById(userId);
  if (authError) throw authError;

  return {
    profile,
    authUser: authData.user,
  };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [profilesRes, businessesRes, authUsers] = await Promise.all([
      identityServiceDb().from('profiles').select(PROFILE_SELECT).order('created_at', { ascending: false }),
      identityServiceDb().from('businesses').select('id, owner_id, name, website, verification_status, created_at'),
      listAllAuthUsers(),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (businessesRes.error) throw businessesRes.error;

    const authMap = new Map<string, any>((authUsers ?? []).map((user) => [user.id, user]));
    const businessByOwner = new Map<string, any>(
      (businessesRes.data ?? [])
        .filter((business: any) => business.owner_id)
        .map((business: any) => [business.owner_id, business]),
    );

    const members = (profilesRes.data ?? []).map((profile: any) => {
      const authUser = authMap.get(profile.id);
      const metadata = (authUser?.user_metadata || {}) as Record<string, unknown>;
      const accountType = normalizeAccountType(metadata.account_type);
      const business = businessByOwner.get(profile.id);

      return {
        ...profile,
        account_type: accountType,
        business_id: business?.id ?? null,
        business_name: business?.name ?? readOptionalString(metadata.business_name),
        legal_name: readOptionalString(metadata.legal_name),
        tax_id: readOptionalString(metadata.tax_id),
        billing_email: readOptionalString(metadata.billing_email),
        phone: readOptionalString(metadata.phone),
        country: readOptionalString(metadata.country),
        address: readOptionalString(metadata.address),
        city: readOptionalString(metadata.city),
        postal_code: readOptionalString(metadata.postal_code),
        website: business?.website ?? readOptionalString(metadata.website),
        verification_status: business?.verification_status ?? null,
      };
    });

    return NextResponse.json({
      members,
      summary: {
        total: members.length,
        personal: members.filter((member: any) => member.account_type === 'PERSONAL').length,
        business: members.filter((member: any) => member.account_type !== 'PERSONAL').length,
        blocked: members.filter((member: any) => member.status === 'BLOCKED').length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action || '');
    const userId = readOptionalString(body.userId);

    if (action === 'CREATE_MEMBER') {
      const email = readOptionalString(body.email);
      const password = readOptionalString(body.password);
      if (!email || !password) {
        return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
      }

      const role = normalizeRole(body.role);
      const plan = normalizePlan(body.plan);
      const status = 'ACTIVE';
      const subscriptionStatus = resolveSubscriptionStatus(plan);
      const subscriptionEndsAt =
        plan === 'FREE' ? null : buildFutureIso(Number(body.membershipDays || 0));
      const userMetadata = buildUserMetadata(body, {}, email);

      const { data: created, error: createError } = await identityServiceDb().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: {
          role,
          plan,
          status,
          subscription_status: subscriptionStatus,
        },
      });

      if (createError) throw createError;

      const profilePayload = {
        id: created.user.id,
        email,
        full_name: String(userMetadata.full_name || email.split('@')[0] || 'Aura Member'),
        role,
        plan,
        status,
        subscription_status: subscriptionStatus,
        subscription_ends_at: subscriptionEndsAt,
      };

      const { error: profileError } = await identityServiceDb()
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });
      if (profileError) throw profileError;

      if (normalizeAccountType(userMetadata.account_type) !== 'PERSONAL') {
        await upsertOwnedBusiness(created.user.id, userMetadata);
      }

      return NextResponse.json({ success: true });
    }

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    if (userId === auth.user.id && (action === 'DELETE_MEMBER' || action === 'BLOCK_MEMBER')) {
      return NextResponse.json({ error: 'No puedes aplicar esta acción sobre tu propia cuenta.' }, { status: 400 });
    }

    if (action === 'UPDATE_MEMBER') {
      const { profile, authUser } = await loadCurrentMember(userId);
      const currentMetadata = (authUser.user_metadata || {}) as Record<string, unknown>;
      const currentAppMetadata = (authUser.app_metadata || {}) as Record<string, unknown>;
      const email = readOptionalString(body.email) || profile.email;
      const password = readOptionalString(body.password);
      const role = normalizeRole(body.role ?? profile.role);
      const plan = normalizePlan(body.plan ?? profile.plan);
      const status = normalizeStatus(body.status ?? profile.status);
      const subscriptionStatus = resolveSubscriptionStatus(plan, body.subscriptionStatus);
      const membershipDays = Number(body.membershipDays || 0);
      const subscriptionEndsAt =
        plan === 'FREE'
          ? null
          : membershipDays > 0
            ? buildFutureIso(membershipDays)
            : profile.subscription_ends_at;
      const userMetadata = buildUserMetadata(body, currentMetadata, email);
      const accountType = normalizeAccountType(userMetadata.account_type);

      const userUpdatePayload: Record<string, unknown> = {
        user_metadata: userMetadata,
        app_metadata: {
          ...currentAppMetadata,
          role,
          plan,
          status,
          subscription_status: subscriptionStatus,
        },
      };

      if (email && email !== authUser.email) {
        userUpdatePayload.email = email;
        userUpdatePayload.email_confirm = true;
      }
      if (password) {
        userUpdatePayload.password = password;
      }

      const { error: userUpdateError } = await identityServiceDb().auth.admin.updateUserById(userId, userUpdatePayload);
      if (userUpdateError) throw userUpdateError;

      await syncProfile(userId, {
        email,
        full_name: userMetadata.full_name,
        role,
        plan,
        status,
        subscription_status: subscriptionStatus,
        subscription_ends_at: subscriptionEndsAt,
      });

      if (accountType === 'PERSONAL') {
        await removeOwnedBusiness(userId);
      } else {
        await upsertOwnedBusiness(
          userId,
          userMetadata,
          readOptionalString(body.verificationStatus) || 'verified',
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'BLOCK_MEMBER') {
      const { profile, authUser } = await loadCurrentMember(userId).catch(async () => {
        const { data } = await identityServiceDb().auth.admin.getUserById(userId);
        return { profile: { role: 'USER', plan: 'FREE' }, authUser: data.user! };
      });
      await syncProfile(userId, {
        status: 'BLOCKED',
        subscription_status: 'inactive',
      }).catch(() => {});
      await syncAuthAppMetadata(userId, (authUser.app_metadata || {}) as Record<string, unknown>, {
        role: profile.role,
        plan: profile.plan,
        status: 'BLOCKED',
        subscription_status: 'inactive',
      }).catch(() => {});
      return NextResponse.json({ success: true });
    }

    if (action === 'UNBLOCK_MEMBER') {
      const { profile, authUser } = await loadCurrentMember(userId).catch(async () => {
        const { data } = await identityServiceDb().auth.admin.getUserById(userId);
        return { profile: { role: 'USER', plan: 'FREE', subscription_status: 'active' }, authUser: data.user! };
      });
      const nextSubscriptionStatus = resolveSubscriptionStatus(profile.plan, profile.subscription_status);
      await syncProfile(userId, {
        status: 'ACTIVE',
        subscription_status: nextSubscriptionStatus,
      }).catch(() => {});
      await syncAuthAppMetadata(userId, (authUser.app_metadata || {}) as Record<string, unknown>, {
        role: profile.role,
        plan: profile.plan,
        status: 'ACTIVE',
        subscription_status: nextSubscriptionStatus,
      }).catch(() => {});
      return NextResponse.json({ success: true });
    }

    if (action === 'SUSPEND_PLAN') {
      const { profile, authUser } = await loadCurrentMember(userId).catch(async () => {
        const { data } = await identityServiceDb().auth.admin.getUserById(userId);
        return { profile: { role: 'USER', plan: 'FREE', status: 'ACTIVE' }, authUser: data.user! };
      });
      await syncProfile(userId, {
        plan: 'FREE',
        subscription_status: 'inactive',
        subscription_ends_at: null,
      }).catch(() => {});
      await syncAuthAppMetadata(userId, (authUser.app_metadata || {}) as Record<string, unknown>, {
        role: profile.role,
        plan: 'FREE',
        status: profile.status,
        subscription_status: 'inactive',
      }).catch(() => {});
      return NextResponse.json({ success: true });
    }

    if (action === 'DELETE_MEMBER') {
      try {
        await chatSvc().from('room_participants').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Could not delete from chat tracking (might be missing service key). Skipping...');
      }

      try { await removeOwnedBusiness(userId); } catch(e) {}

      try { await identityServiceDb().from('profiles').delete().eq('id', userId); } catch(e) {}

      const { error: deleteError } = await identityServiceDb().auth.admin.deleteUser(userId);
      if (deleteError) {
        throw new Error(`Auth API Error: ${deleteError.message}`);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
