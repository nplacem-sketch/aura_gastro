import { NextResponse } from 'next/server';

import { generateAndPersistContent, isAutoGenerationType } from '@/lib/content-generation';
import { requireAdmin } from '@/lib/server-auth';
import { identitySvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

const AUTO_PUBLISH_LIMIT = 3;

function normalizePlan(value: string | null | undefined) {
  const plan = String(value || '').trim().toUpperCase();
  if (plan === 'FREE' || plan === 'PRO' || plan === 'PREMIUM') return plan;
  if (plan === 'ENTERPRISE') return 'PREMIUM';
  return 'PREMIUM';
}

function resolveTierForIndex(targetPlans: string[], index: number) {
  if (targetPlans.length === 0) return 'PREMIUM';
  return normalizePlan(targetPlans[index % targetPlans.length]);
}

function buildBaseDetails(quantity: number, targetPlans: string[], details: string) {
  return [
    `Cantidad solicitada: ${quantity}`,
    `Planes objetivo: ${targetPlans.join(', ')}`,
    details ? `Detalle editorial: ${details}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildGeneratedSummary(items: Array<{ title: string; tier: string; type: string; id: string }>) {
  if (items.length === 0) return null;
  return `Contenido publicado: ${items
    .map((item) => `${item.type}:${item.title} [${item.tier}] (${item.id})`)
    .join(' | ')}`;
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await identitySvc()
    .from('content_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const type = String(body.type || '').trim().toUpperCase();
  const title = String(body.title || '').trim();
  const details = String(body.details || '').trim();
  const quantity = Number(body.quantity || 1);
  const targetPlans = Array.isArray(body.targetPlans)
    ? body.targetPlans.map((item: unknown) => String(item || '').trim().toUpperCase()).filter(Boolean)
    : [];

  if (!type || !title) {
    return NextResponse.json({ error: 'Missing type or title' }, { status: 400 });
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
  }

  if (targetPlans.length === 0) {
    return NextResponse.json({ error: 'Select at least one target plan' }, { status: 400 });
  }

  const autoPublishType = isAutoGenerationType(type);
  const shouldAutoPublish = autoPublishType && quantity <= AUTO_PUBLISH_LIMIT;
  const queuedReason = !autoPublishType
    ? 'Tipo dejado en cola editorial porque aun no tiene auto-publicacion.'
    : quantity > AUTO_PUBLISH_LIMIT
      ? `Auto-publicacion limitada a ${AUTO_PUBLISH_LIMIT} piezas por solicitud.`
      : null;

  const baseDetails = buildBaseDetails(quantity, targetPlans, details);
  const initialDetails = [baseDetails, queuedReason].filter(Boolean).join('\n');

  const { data: createdRequest, error: createError } = await identitySvc()
    .from('content_requests')
    .insert({
      requested_by: auth.user.id,
      type,
      title,
      details: initialDetails,
      status: shouldAutoPublish ? 'PROCESSING' : 'PENDING',
    })
    .select('*')
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  if (!shouldAutoPublish) {
    return NextResponse.json({
      request: createdRequest,
      generatedItems: [],
      autoPublished: false,
      message: queuedReason || 'Solicitud registrada en la cola editorial.',
    });
  }

  const generatedItems: Array<{ title: string; tier: string; type: string; id: string }> = [];
  const generationErrors: string[] = [];

  for (let index = 0; index < quantity; index += 1) {
    const tier = resolveTierForIndex(targetPlans, index);

    try {
      const result = await generateAndPersistContent({
        type,
        title,
        details,
        tier,
        itemIndex: index,
        itemCount: quantity,
      });

      generatedItems.push({
        id: result.id,
        tier: result.tier,
        type: result.persistedType.toUpperCase(),
        title: String(result.generated.title || result.generated.name || `${title} ${index + 1}`),
      });
    } catch (error: any) {
      generationErrors.push(error?.message || `Fallo en la pieza ${index + 1}.`);
    }
  }

  const finalStatus =
    generatedItems.length === quantity ? 'COMPLETED' : generatedItems.length > 0 ? 'PARTIAL' : 'FAILED';
  const finalDetails = [
    baseDetails,
    `Auto-publicacion ejecutada: ${generatedItems.length}/${quantity}`,
    buildGeneratedSummary(generatedItems),
    generationErrors.length > 0 ? `Errores: ${generationErrors.join(' | ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const { data: updatedRequest, error: updateError } = await identitySvc()
    .from('content_requests')
    .update({
      details: finalDetails,
      status: finalStatus,
    })
    .eq('id', createdRequest.id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const message =
    finalStatus === 'COMPLETED'
      ? `${generatedItems.length} pieza(s) publicadas automaticamente.`
      : finalStatus === 'PARTIAL'
        ? `${generatedItems.length} pieza(s) publicadas y ${generationErrors.length} con incidencia.`
        : 'La solicitud se registro, pero la auto-publicacion ha fallado.';

  return NextResponse.json({
    request: updatedRequest,
    generatedItems,
    autoPublished: true,
    message,
  });
}
