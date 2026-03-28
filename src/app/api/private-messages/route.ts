import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/server-auth';
import { chatSvc, identitySvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

function canAccessPrivateMessaging(role: string) {
  return role === 'ADMIN';
}

function parseRoomTopic(topic: string | null | undefined) {
  const value = String(topic || '');
  if (value.startsWith('BUSINESS_DM:')) {
    const [, ownerId = '', businessId = ''] = value.split(':');
    return { kind: 'BUSINESS' as const, ownerId, businessId };
  }
  if (value.startsWith('USER_DM:')) {
    const [, firstUserId = '', secondUserId = ''] = value.split(':');
    return { kind: 'USER' as const, userIds: [firstUserId, secondUserId].filter(Boolean) };
  }
  return { kind: 'UNKNOWN' as const };
}

function buildUserRoomTopic(currentUserId: string, targetUserId: string) {
  return `USER_DM:${[currentUserId, targetUserId].sort().join(':')}`;
}

function buildBusinessRoomTopic(currentUserId: string, businessId: string) {
  return `BUSINESS_DM:${currentUserId}:${businessId}`;
}

async function ensureBusinessDirectory() {
  const client = identitySvc();
  const { data: businesses } = await client.from('businesses').select('id').limit(1);
  if ((businesses ?? []).length > 0) return;

  await client.from('businesses').insert([
    { name: 'Atelier Gastronomic Group', website: 'https://atelier-gastro.example', verification_status: 'verified' },
    { name: 'Origen Culinary Labs', website: 'https://origen-labs.example', verification_status: 'verified' },
    { name: 'Mar de Fondo Hospitality', website: 'https://mardefondo.example', verification_status: 'verified' },
  ]);
}

async function loadBusinessById(businessId: string) {
  const { data, error } = await identitySvc()
    .from('businesses')
    .select('id,owner_id,name,website,verification_status')
    .eq('id', businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function loadUserRooms(userId: string) {
  const participantsRes = await chatSvc().from('room_participants').select('room_id').eq('user_id', userId);

  if (participantsRes.error) throw new Error(participantsRes.error.message);

  const roomIds = Array.from(new Set((participantsRes.data ?? []).map((item: any) => item.room_id).filter(Boolean)));
  if (roomIds.length === 0) return [];

  const roomsRes = await chatSvc()
    .from('chat_rooms')
    .select('*')
    .in('id', roomIds)
    .order('created_at', { ascending: false });

  if (roomsRes.error) throw new Error(roomsRes.error.message);
  return roomsRes.data ?? [];
}

async function decorateRooms(userId: string, rooms: any[]) {
  const parsedRooms = rooms.map((room) => ({ room, meta: parseRoomTopic(room.topic) }));
  const userIds = Array.from(
    new Set(
      parsedRooms
        .flatMap(({ meta }) => (meta.kind === 'USER' ? meta.userIds : []))
        .filter((id) => id && id !== userId),
    ),
  );
  const businessIds = Array.from(
    new Set(
      parsedRooms
        .map(({ meta }) => (meta.kind === 'BUSINESS' ? meta.businessId : null))
        .filter(Boolean),
    ),
  );

  const [profilesRes, businessesRes] = await Promise.all([
    userIds.length > 0
      ? identitySvc().from('profiles').select('id,full_name,email,role,plan').in('id', userIds)
      : Promise.resolve({ data: [], error: null } as any),
    businessIds.length > 0
      ? identitySvc().from('businesses').select('id,owner_id,name,website,verification_status').in('id', businessIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (businessesRes.error) throw new Error(businessesRes.error.message);

  const profileMap = new Map<string, any>((profilesRes.data ?? []).map((profile: any) => [profile.id, profile]));
  const businessMap = new Map<string, any>((businessesRes.data ?? []).map((business: any) => [business.id, business]));

  return parsedRooms.map(({ room, meta }) => {
    if (meta.kind === 'BUSINESS') {
      const business = businessMap.get(meta.businessId);
      return {
        ...room,
        counterpart_type: 'BUSINESS',
        counterpart_id: meta.businessId,
        counterpart_name: business?.name || 'Empresa colaboradora',
        counterpart_subtitle: business?.website || 'Canal privado',
      };
    }

    if (meta.kind === 'USER') {
      const counterpartId = meta.userIds.find((id) => id !== userId) || null;
      const profile = counterpartId ? profileMap.get(counterpartId) : null;
      return {
        ...room,
        counterpart_type: 'USER',
        counterpart_id: counterpartId,
        counterpart_name: profile?.full_name || profile?.email || 'Usuario privado',
        counterpart_subtitle: profile?.role === 'ADMIN' ? 'Administracion Aura' : profile?.plan || 'Miembro',
      };
    }

    return {
      ...room,
      counterpart_type: 'USER',
      counterpart_id: null,
      counterpart_name: room.name || 'Conversacion privada',
      counterpart_subtitle: 'Canal privado',
    };
  });
}

async function createBusinessAutoReply(roomId: string, businessId: string, content: string) {
  const business = await loadBusinessById(businessId);
  const businessName = business?.name || 'Empresa colaboradora';
  const normalized = content.toLowerCase();
  let reply =
    'Gracias por tu mensaje. Nuestro equipo revisara tu propuesta y te respondera por este canal privado.';

  if (normalized.includes('cv') || normalized.includes('curriculum') || normalized.includes('curricul')) {
    reply =
      'Hemos recibido tu CV y tu presentacion profesional. El equipo de seleccion lo revisara y respondera en este mismo canal.';
  } else if (normalized.includes('curso') || normalized.includes('formacion')) {
    reply =
      'Gracias por compartir tu interes formativo. Revisaremos el encaje con nuestras necesidades y te daremos respuesta por aqui.';
  }

  await chatSvc().from('messages').insert({
    room_id: roomId,
    user_id: null,
    sender_name: businessName,
    content: reply,
    is_ai: false,
  });
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await ensureBusinessDirectory();

  const role = auth.profile?.role ?? 'USER';
  const messagingAllowed = canAccessPrivateMessaging(role);

  try {
    const [profilesRes, businessesRes, rooms] = await Promise.all([
      role === 'ADMIN'
        ? identitySvc()
            .from('profiles')
            .select('id,full_name,email,role,plan')
            .neq('id', auth.user.id)
            .order('created_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null } as any),
      role === 'ADMIN'
        ? identitySvc()
            .from('businesses')
            .select('id,owner_id,name,website,verification_status')
            .order('created_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null } as any),
      loadUserRooms(auth.user.id),
    ]);

    if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
    if (businessesRes.error) return NextResponse.json({ error: businessesRes.error.message }, { status: 500 });

    const decoratedRooms = await decorateRooms(auth.user.id, rooms);
    const roomIds = rooms.map((room: any) => room.id);
    const messagesRes =
      roomIds.length > 0
        ? await chatSvc().from('messages').select('*').in('room_id', roomIds).order('created_at')
        : { data: [], error: null };

    if (messagesRes.error) {
      return NextResponse.json({ error: messagesRes.error.message }, { status: 500 });
    }

    const businessOwnerIds = new Set<string>(
      (businessesRes.data ?? [])
        .map((business: any) => String(business.owner_id || ''))
        .filter(Boolean),
    );
    const directUserContacts = (profilesRes.data ?? []).filter((profile: any) => !businessOwnerIds.has(profile.id));

    return NextResponse.json({
      messagingAllowed,
      permissions: {
        canMessageUsers: role === 'ADMIN',
        canMessageBusinesses: role === 'ADMIN',
      },
      contacts: {
        users: directUserContacts,
        businesses: businessesRes.data ?? [],
      },
      roomDirectory: {
        users: directUserContacts,
        businesses: businessesRes.data ?? [],
      },
      rooms: decoratedRooms,
      messages: messagesRes.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const action = String(body.action || '');
  const role = auth.profile?.role ?? 'USER';

  if (action === 'START_ROOM') {
    const targetUserId = body.targetUserId ? String(body.targetUserId) : null;
    const businessId = body.businessId ? String(body.businessId) : null;

    if (businessId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo la administracion puede iniciar conversaciones con empresas.' }, { status: 403 });
    }

    if (targetUserId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo los administradores pueden iniciar chats privados entre usuarios.' }, { status: 403 });
    }

    const topic = businessId
      ? buildBusinessRoomTopic(auth.user.id, businessId)
      : buildUserRoomTopic(auth.user.id, String(targetUserId));

    const existing = await chatSvc().from('chat_rooms').select('*').eq('topic', topic).maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
    if (existing.data) {
      const decorated = await decorateRooms(auth.user.id, [existing.data]);
      return NextResponse.json({ room: decorated[0] });
    }

    const business = businessId ? await loadBusinessById(businessId) : null;
    const roomName = businessId ? 'Canal privado con empresa' : 'Canal privado entre usuarios';
    const { data, error } = await chatSvc()
      .from('chat_rooms')
      .insert({
        name: roomName,
        topic,
        is_private: true,
        is_premium: Boolean(businessId),
        owner_user_id: auth.user.id,
        peer_user_id: targetUserId,
        business_id: businessId,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const participantIds = businessId
      ? [auth.user.id, business?.owner_id].filter(Boolean)
      : [auth.user.id, targetUserId].filter(Boolean);
    const participantsPayload = participantIds.map((participantId) => ({
      room_id: data.id,
      user_id: participantId,
    }));
    if (participantsPayload.length > 0) {
      await chatSvc().from('room_participants').insert(participantsPayload);
    }

    if (businessId && !business?.owner_id) {
      await createBusinessAutoReply(data.id, businessId, 'Inicio de conversacion');
    }

    const decorated = await decorateRooms(auth.user.id, [data]);
    return NextResponse.json({ room: decorated[0] });
  }

  if (action === 'SEND_MESSAGE') {
    const roomId = String(body.roomId || '');
    const content = String(body.content || '').trim();

    if (!roomId || !content) {
      return NextResponse.json({ error: 'Faltan el identificador de sala o el contenido.' }, { status: 400 });
    }

    const participantRes = await chatSvc()
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (participantRes.error) {
      return NextResponse.json({ error: participantRes.error.message }, { status: 500 });
    }
    if (!participantRes.data && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { data: room, error: roomError } = await chatSvc().from('chat_rooms').select('*').eq('id', roomId).single();
    if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

    const { data, error } = await chatSvc()
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: auth.user.id,
        sender_name: auth.user.user_metadata?.full_name || auth.user.email || 'Usuario',
        content,
        is_ai: false,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const meta = parseRoomTopic(room.topic);
    if (meta.kind === 'BUSINESS' && meta.businessId) {
      const business = await loadBusinessById(meta.businessId);
      if (!business?.owner_id) {
        await createBusinessAutoReply(roomId, meta.businessId, content);
      }
    }

    return NextResponse.json({ message: data });
  }

  return NextResponse.json({ error: 'Accion no valida.' }, { status: 400 });
}
