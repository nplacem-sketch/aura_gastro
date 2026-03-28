'use client';

import { useCallback, useEffect, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

type AccountType = 'PERSONAL' | 'BUSINESS' | 'FREELANCER';
type FilterMode = 'ALL' | 'PERSONAL' | 'BUSINESS' | 'BLOCKED';
type ActionType = 'BLOCK_MEMBER' | 'UNBLOCK_MEMBER' | 'SUSPEND_PLAN' | 'DELETE_MEMBER';

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  plan: string;
  status: string;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  account_type: AccountType;
  business_name: string | null;
  legal_name: string | null;
  tax_id: string | null;
  billing_email: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
  verification_status: string | null;
};

type MembersResponse = {
  members: Member[];
  summary: { total: number; personal: number; business: number; blocked: number };
  error?: string;
};

type FormState = {
  fullName: string;
  email: string;
  password: string;
  role: string;
  plan: string;
  membershipDays: string;
  accountType: AccountType;
  businessName: string;
  legalName: string;
  taxId: string;
  billingEmail: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  postalCode: string;
  website: string;
  verificationStatus: string;
};

const EMPTY_SUMMARY = { total: 0, personal: 0, business: 0, blocked: 0 };

function emptyForm(): FormState {
  return {
    fullName: '', email: '', password: '', role: 'USER', plan: 'FREE', membershipDays: '30',
    accountType: 'PERSONAL', businessName: '', legalName: '', taxId: '', billingEmail: '',
    phone: '', country: '', address: '', city: '', postalCode: '', website: '', verificationStatus: 'verified',
  };
}

function daysUntil(value: string | null) {
  if (!value) return '';
  const diff = new Date(value).getTime() - Date.now();
  return String(diff > 0 ? Math.ceil(diff / 86400000) : 0);
}

function memberToForm(member: Member): FormState {
  return {
    fullName: member.full_name || '',
    email: member.email || '',
    password: '',
    role: member.role || 'USER',
    plan: member.plan || 'FREE',
    membershipDays: daysUntil(member.subscription_ends_at),
    accountType: member.account_type || 'PERSONAL',
    businessName: member.business_name || '',
    legalName: member.legal_name || '',
    taxId: member.tax_id || '',
    billingEmail: member.billing_email || '',
    phone: member.phone || '',
    country: member.country || '',
    address: member.address || '',
    city: member.city || '',
    postalCode: member.postal_code || '',
    website: member.website || '',
    verificationStatus: member.verification_status || 'verified',
  };
}

function accountTypeLabel(value: AccountType) {
  if (value === 'BUSINESS') return 'Empresa';
  if (value === 'FREELANCER') return 'Autonomo';
  return 'Usuario';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function actionCopy(action: ActionType) {
  if (action === 'BLOCK_MEMBER') return ['Bloquear cuenta', 'La cuenta quedara bloqueada y la suscripcion pasara a inactiva.'];
  if (action === 'UNBLOCK_MEMBER') return ['Desbloquear cuenta', 'La cuenta volvera a estado activo con el plan que tenga asignado.'];
  if (action === 'SUSPEND_PLAN') return ['Suspender plan', 'La membresia se degradara a FREE y se cancelara la suscripcion activa.'];
  return ['Eliminar cuenta', 'Esta accion borrara el miembro y no se puede deshacer.'];
}

export default function AdminPage() {
  const { isAdmin, session, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: ActionType; member: Member } | null>(null);

  const loadMembers = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
    const data = await readJson<MembersResponse>(res);
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar la gestion de miembros.');
    setMembers(data.members || []);
    setSummary(data.summary || EMPTY_SUMMARY);
  }, [session?.access_token]);

  useEffect(() => {
    if (!isAdmin || !session?.access_token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await loadMembers();
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'No se pudo cargar la gestion de miembros.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, loadMembers, session?.access_token]);

  const visibleMembers = members.filter((member) => {
    const q = query.trim().toLowerCase();
    const matchQuery = !q || [member.full_name, member.email, member.business_name, member.legal_name].some((value) => String(value || '').toLowerCase().includes(q));
    if (!matchQuery) return false;
    if (filter === 'PERSONAL') return member.account_type === 'PERSONAL';
    if (filter === 'BUSINESS') return member.account_type !== 'PERSONAL';
    if (filter === 'BLOCKED') return member.status === 'BLOCKED';
    return true;
  });

  const baseFields = [
    ['fullName', 'Nombre completo'], ['email', 'Email'], ['phone', 'Telefono'], ['country', 'Pais'], ['address', 'Direccion'], ['city', 'Ciudad'], ['postalCode', 'Codigo postal'],
  ] as const;
  const businessFields = [
    ['businessName', 'Empresa o marca'], ['legalName', 'Razon social'], ['taxId', 'NIF / CIF'], ['billingEmail', 'Email de facturacion'], ['website', 'Web'],
  ] as const;

  function openCreate() {
    setEditingMember(null);
    setForm(emptyForm());
    setEditorOpen(true);
    setError('');
    setMessage('');
  }

  function openEdit(member: Member) {
    setEditingMember(member);
    setForm(memberToForm(member));
    setEditorOpen(true);
    setError('');
    setMessage('');
  }

  async function submitForm() {
    if (!session?.access_token) return;
    if (!form.email.trim()) return setError('El email es obligatorio.');
    if (!editingMember && !form.password.trim()) return setError('La contrasena es obligatoria para crear miembros.');
    if (form.accountType !== 'PERSONAL' && !form.businessName.trim()) return setError('Debes indicar nombre comercial para empresas o autonomos.');
    if (form.plan !== 'FREE' && Number(form.membershipDays || 0) <= 0) return setError('Indica dias de membresia para el plan seleccionado.');

    try {
      setSaving(true);
      setError('');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: editingMember ? 'UPDATE_MEMBER' : 'CREATE_MEMBER',
          userId: editingMember?.id,
          email: form.email,
          password: form.password || undefined,
          fullName: form.fullName,
          role: form.role,
          plan: form.plan,
          membershipDays: Number(form.membershipDays || 0),
          accountType: form.accountType,
          businessName: form.businessName,
          legalName: form.legalName,
          taxId: form.taxId,
          billingEmail: form.billingEmail,
          phone: form.phone,
          country: form.country,
          address: form.address,
          city: form.city,
          postalCode: form.postalCode,
          website: form.website,
          verificationStatus: form.verificationStatus,
        }),
      });
      const data = await readJson<{ success?: boolean; error?: string }>(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el miembro.');
      setEditorOpen(false);
      setEditingMember(null);
      setForm(emptyForm());
      await loadMembers();
      setMessage(editingMember ? 'Miembro actualizado correctamente.' : 'Miembro creado correctamente.');
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el miembro.');
    } finally {
      setSaving(false);
    }
  }

  async function runAction() {
    if (!pendingAction || !session?.access_token) return;
    try {
      setSaving(true);
      setError('');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: pendingAction.type, userId: pendingAction.member.id }),
      });
      const data = await readJson<{ success?: boolean; error?: string }>(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo ejecutar la accion.');
      setPendingAction(null);
      await loadMembers();
      setMessage('Accion aplicada correctamente.');
    } catch (err: any) {
      setError(err.message || 'No se pudo ejecutar la accion.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return <div className="glass-panel rounded-[32px] border border-error/20 p-10 text-center text-on-surface">Acceso restringido.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">Control maestro</p>
          <h1 className="text-5xl font-headline font-light text-on-surface">Gestion de <span className="italic text-secondary">miembros</span></h1>
          <p className="mt-4 max-w-3xl text-sm text-on-surface-variant">Crea usuarios, empresas y autonomos, asigna plan y tiempo de membresia, edita datos y confirma bloqueos, suspensiones o bajas.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-3 rounded-2xl bg-secondary px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-secondary"><AppIcon name="add_circle" size={16} />Crear miembro</button>
      </header>

      {(message || error) && <div className={`mb-8 rounded-[24px] border px-5 py-4 text-sm ${error ? 'border-error/30 bg-error/5 text-error' : 'border-secondary/20 bg-secondary/5 text-on-surface-variant'}`}>{error || message}</div>}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ['Total', summary.total],
          ['Usuarios', summary.personal],
          ['Empresas', summary.business],
          ['Bloqueados', summary.blocked],
        ].map(([label, value]) => (
          <div key={label} className="glass-panel rounded-[28px] border border-outline-variant/10 p-6"><p className="font-label text-[10px] uppercase tracking-[0.35em] text-secondary">{label}</p><p className="mt-4 text-4xl font-headline text-on-surface">{value}</p></div>
        ))}
      </div>

      <section className="glass-panel mb-8 rounded-[32px] border border-outline-variant/10 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Buscar</span>
            <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3"><AppIcon name="search" size={16} className="text-on-surface-variant" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, email o empresa" className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant" /></div>
          </label>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PERSONAL', 'BUSINESS', 'BLOCKED'] as FilterMode[]).map((mode) => <button key={mode} onClick={() => setFilter(mode)} className={`rounded-full px-4 py-2 font-label text-[10px] uppercase tracking-widest ${filter === mode ? 'bg-secondary text-on-secondary' : 'border border-outline-variant/15 text-on-surface-variant'}`}>{mode === 'ALL' ? 'Todos' : mode === 'PERSONAL' ? 'Usuarios' : mode === 'BUSINESS' ? 'Empresas y autonomos' : 'Bloqueados'}</button>)}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? <div className="glass-panel rounded-[32px] border border-outline-variant/10 p-10 text-center text-on-surface-variant">Sincronizando miembros...</div> : visibleMembers.length === 0 ? <div className="glass-panel rounded-[32px] border border-outline-variant/10 p-10 text-center text-on-surface-variant">No hay miembros que coincidan con el filtro actual.</div> : visibleMembers.map((member) => {
          const self = member.id === user?.id;
          const blocked = member.status === 'BLOCKED';
          return (
            <article key={member.id} className="glass-panel rounded-[32px] border border-outline-variant/10 p-6 md:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-4 flex flex-wrap gap-3">
                    <span className="rounded-full bg-secondary/10 px-3 py-1 font-label text-[9px] uppercase tracking-widest text-secondary">{accountTypeLabel(member.account_type)}</span>
                    <span className="rounded-full border border-outline-variant/15 px-3 py-1 font-label text-[9px] uppercase tracking-widest text-on-surface-variant">{member.role}</span>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-label text-[9px] uppercase tracking-widest text-primary">{member.plan}</span>
                    <span className={`rounded-full px-3 py-1 font-label text-[9px] uppercase tracking-widest ${blocked ? 'bg-error/10 text-error' : 'bg-emerald-500/10 text-emerald-300'}`}>{member.status}</span>
                  </div>
                  <h2 className="text-2xl font-headline text-on-surface">{member.business_name || member.full_name || member.email || 'Miembro Aura'}</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">{member.email || 'Sin email'}</p>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div><p className="font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Alta</p><p className="mt-2 text-sm text-on-surface">{formatDate(member.created_at)}</p></div>
                    <div><p className="font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Membresia</p><p className="mt-2 text-sm text-on-surface">{member.subscription_ends_at ? `Hasta ${formatDate(member.subscription_ends_at)}` : member.plan === 'FREE' ? 'Sin suscripcion activa' : 'Sin fecha'}</p></div>
                    <div><p className="font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Contacto</p><p className="mt-2 text-sm text-on-surface">{member.phone || member.billing_email || 'Sin dato'}</p></div>
                    <div><p className="font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Fiscal / web</p><p className="mt-2 text-sm text-on-surface">{member.tax_id || member.website || 'Sin dato'}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[420px] xl:grid-cols-2">
                  <button onClick={() => openEdit(member)} className="rounded-2xl border border-outline-variant/15 px-4 py-3 font-label text-[10px] uppercase tracking-widest text-on-surface">Editar</button>
                  <button disabled={self} onClick={() => setPendingAction({ type: blocked ? 'UNBLOCK_MEMBER' : 'BLOCK_MEMBER', member })} className="rounded-2xl border border-outline-variant/15 px-4 py-3 font-label text-[10px] uppercase tracking-widest text-on-surface disabled:opacity-40">{blocked ? 'Desbloquear' : 'Bloquear'}</button>
                  <button disabled={member.plan === 'FREE'} onClick={() => setPendingAction({ type: 'SUSPEND_PLAN', member })} className="rounded-2xl border border-outline-variant/15 px-4 py-3 font-label text-[10px] uppercase tracking-widest text-on-surface disabled:opacity-40">Suspender plan</button>
                  <button disabled={self} onClick={() => setPendingAction({ type: 'DELETE_MEMBER', member })} className="rounded-2xl border border-error/25 px-4 py-3 font-label text-[10px] uppercase tracking-widest text-error disabled:opacity-40">Borrar</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setEditorOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-outline-variant/10 bg-[#121413] p-6 sm:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-2 font-label text-[10px] uppercase tracking-[0.35em] text-secondary">{editingMember ? 'Actualizar miembro' : 'Alta de miembro'}</p><h2 className="text-3xl font-headline text-on-surface">{editingMember ? 'Editar usuario o empresa' : 'Crear usuario o empresa'}</h2></div><button onClick={() => setEditorOpen(false)} className="rounded-full border border-outline-variant/10 p-2 text-on-surface-variant"><AppIcon name="close" size={16} /></button></div>
            <div className="mb-8 flex flex-wrap gap-2">{(['PERSONAL', 'BUSINESS', 'FREELANCER'] as AccountType[]).map((item) => <button key={item} onClick={() => setForm((current) => ({ ...current, accountType: item }))} className={`rounded-full px-4 py-2 font-label text-[10px] uppercase tracking-widest ${form.accountType === item ? 'bg-secondary text-on-secondary' : 'border border-outline-variant/15 text-on-surface-variant'}`}>{accountTypeLabel(item)}</button>)}</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {baseFields.map(([key, label]) => <label key={key} className={`block ${key === 'address' ? 'md:col-span-2 xl:col-span-4' : key === 'fullName' || key === 'email' ? 'xl:col-span-2' : ''}`}><span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">{label}</span><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none" /></label>)}
              <label className="block"><span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">{editingMember ? 'Nueva contrasena' : 'Contrasena'}</span><input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={editingMember ? 'Dejar vacio para mantener' : ''} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none" /></label>
              <label className="block"><span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Rol</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none"><option value="USER">USER</option><option value="CHEF">CHEF</option><option value="ADMIN">ADMIN</option></select></label>
              <label className="block"><span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Plan</span><select value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value, membershipDays: event.target.value === 'FREE' ? '0' : current.membershipDays || '30' }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none"><option value="FREE">FREE</option><option value="PRO">PRO</option><option value="PREMIUM">PREMIUM</option><option value="ENTERPRISE">ENTERPRISE</option></select></label>
              <label className="block"><span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Dias de membresia</span><input type="number" min={0} value={form.membershipDays} onChange={(event) => setForm((current) => ({ ...current, membershipDays: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none" /></label>
              {form.accountType !== 'PERSONAL' && businessFields.map(([key, label]) => <label key={key} className={key === 'businessName' || key === 'legalName' ? 'block xl:col-span-2' : 'block'}><span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">{label}</span><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none" /></label>)}
              {form.accountType !== 'PERSONAL' && <label className="block"><span className="mb-2 block font-label text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Verificacion</span><select value={form.verificationStatus} onChange={(event) => setForm((current) => ({ ...current, verificationStatus: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none"><option value="verified">verified</option><option value="pending">pending</option></select></label>}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end"><button onClick={() => setEditorOpen(false)} className="rounded-2xl border border-outline-variant/15 px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Cancelar</button><button onClick={() => void submitForm()} disabled={saving} className="rounded-2xl bg-secondary px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-secondary disabled:opacity-50">{saving ? 'Guardando...' : editingMember ? 'Guardar cambios' : 'Crear miembro'}</button></div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setPendingAction(null)}>
          <div className="w-full max-w-xl rounded-[32px] border border-outline-variant/10 bg-[#121413] p-6 sm:p-8" onClick={(event) => event.stopPropagation()}>
            <p className="mb-3 font-label text-[10px] uppercase tracking-[0.35em] text-secondary">Confirmacion obligatoria</p>
            <h2 className="text-3xl font-headline text-on-surface">{actionCopy(pendingAction.type)[0]}</h2>
            <p className="mt-4 text-sm text-on-surface-variant">{actionCopy(pendingAction.type)[1]}</p>
            <div className="mt-5 rounded-2xl border border-outline-variant/10 bg-surface-container-high/10 px-4 py-4"><p className="text-sm text-on-surface">{pendingAction.member.business_name || pendingAction.member.full_name || pendingAction.member.email}</p><p className="mt-1 text-[12px] text-on-surface-variant">{pendingAction.member.email}</p></div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end"><button onClick={() => setPendingAction(null)} className="rounded-2xl border border-outline-variant/15 px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Cancelar</button><button onClick={() => void runAction()} disabled={saving} className={`rounded-2xl px-5 py-3 font-label text-[10px] uppercase tracking-widest disabled:opacity-50 ${pendingAction.type === 'DELETE_MEMBER' ? 'bg-error text-white' : 'bg-secondary text-on-secondary'}`}>{saving ? 'Aplicando...' : actionCopy(pendingAction.type)[0]}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
