import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/server-auth';
import { chatSvc, identitySvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

function truncate(text: string, max = 96) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
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

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.user.id;
  const plan = auth.profile?.plan ?? 'FREE';
  const role = auth.profile?.role ?? 'USER';

  try {
    const participantRes = await chatSvc().from('room_participants').select('room_id').eq('user_id', userId);
    if (participantRes.error) {
      return NextResponse.json({ error: participantRes.error.message }, { status: 500 });
    }

    const roomIds = Array.from(new Set((participantRes.data ?? []).map((item: any) => item.room_id).filter(Boolean)));
    const roomsRes =
      roomIds.length > 0
        ? await chatSvc().from('chat_rooms').select('id,topic,created_at').in('id', roomIds)
        : { data: [], error: null };
    if (roomsRes.error) {
      return NextResponse.json({ error: roomsRes.error.message }, { status: 500 });
    }

    const messagesRes =
      roomIds.length > 0
        ? await chatSvc()
            .from('messages')
            .select('id,room_id,user_id,sender_name,content,created_at')
            .in('room_id', roomIds)
            .order('created_at', { ascending: false })
        : { data: [], error: null };
    if (messagesRes.error) {
      return NextResponse.json({ error: messagesRes.error.message }, { status: 500 });
    }

    const rooms = roomsRes.data ?? [];
    const parsedRooms = rooms.map((room: any) => ({ room, meta: parseRoomTopic(room.topic) }));
    const otherUserIds = Array.from(
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

    const [profilesRes, businessesRes, profileRes, requestsRes] = await Promise.all([
      otherUserIds.length > 0
        ? identitySvc().from('profiles').select('id,full_name,email').in('id', otherUserIds)
        : Promise.resolve({ data: [], error: null } as any),
      businessIds.length > 0
        ? identitySvc().from('businesses').select('id,name').in('id', businessIds)
        : Promise.resolve({ data: [], error: null } as any),
      identitySvc().from('profiles').select('plan,cv_url').eq('id', userId).maybeSingle(),
      role === 'ADMIN'
        ? identitySvc().from('content_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING')
        : Promise.resolve({ count: 0, error: null } as any),
    ]);

    if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
    if (businessesRes.error) return NextResponse.json({ error: businessesRes.error.message }, { status: 500 });
    if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 });
    if (requestsRes.error) return NextResponse.json({ error: requestsRes.error.message }, { status: 500 });

    const profileMap = new Map<string, any>((profilesRes.data ?? []).map((profile: any) => [profile.id, profile]));
    const businessMap = new Map<string, any>((businessesRes.data ?? []).map((business: any) => [business.id, business]));

    const notifications = [];
    const seenRooms = new Set<string>();

    for (const message of messagesRes.data ?? []) {
      if (message.user_id === userId || seenRooms.has(message.room_id)) continue;

      const targetRoom = parsedRooms.find(({ room }: any) => room.id === message.room_id);
      if (!targetRoom) continue;
      seenRooms.add(message.room_id);

      let title = message.sender_name || 'Nuevo mensaje';
      if (targetRoom.meta.kind === 'BUSINESS') {
        title = businessMap.get(targetRoom.meta.businessId)?.name || title;
      }
      if (targetRoom.meta.kind === 'USER') {
        const counterpartId = targetRoom.meta.userIds.find((id: string) => id !== userId);
        const counterpart = counterpartId ? profileMap.get(counterpartId) : null;
        title = counterpart?.full_name || counterpart?.email || title;
      }

      notifications.push({
        id: `message-${message.id}`,
        type: 'MESSAGE',
        title,
        body: truncate(message.content || 'Tienes un nuevo mensaje privado.'),
        href: '/profile#mensajeria-privada',
        created_at: message.created_at,
      });
    }

    if ((profileRes.data?.plan === 'PREMIUM' || profileRes.data?.plan === 'ENTERPRISE' || role === 'ADMIN') && !profileRes.data?.cv_url) {
      notifications.push({
        id: 'cv-reminder',
        type: 'PROFILE',
        title: 'Completa tu perfil profesional',
        body: 'Sube tu CV para compartirlo con empresas desde la mensajería privada.',
        href: '/profile',
        created_at: new Date().toISOString(),
      });
    }

    if (role === 'ADMIN' && (requestsRes.count ?? 0) > 0) {
      notifications.push({
        id: 'pending-requests',
        type: 'ADMIN',
        title: 'Solicitudes editoriales pendientes',
        body: `Hay ${requestsRes.count} solicitudes de contenido pendientes de revisión.`,
        href: '/profile',
        created_at: new Date().toISOString(),
      });
    }

    notifications.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      unread_count: notifications.length,
      notifications: notifications.slice(0, 12),
      meta: {
        role,
        plan,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
