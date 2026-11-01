import { useState, type ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { VehicleInterestPicker } from '@/VehicleInterestPicker';
import { ClientQuoteList } from '@/ClientQuoteList';
import { QuoteDetail } from '@/QuoteHistory';
import { findDuplicateClient } from '@/lib/clientDuplicates';
import type { Client, OpportunityStatus, Quote, SaleStatus, Vehicle } from '@/lib/storage';

const opportunityOptions: OpportunityStatus[] = ['Nuevo prospecto', 'Contactado', 'Interesado', 'Cotización enviada', 'Seguimiento pendiente', 'Negociación', 'Venta cerrada', 'No concretado'];
const saleOptions: SaleStatus[] = ['Sin venta', 'Vendido', 'No concretado'];

const formatDate = (iso?: string): string => (iso ? new Date(iso).toLocaleDateString('es-EC', { dateStyle: 'medium' }) : 'No disponible');
const orDefault = (value?: string): string => (value && value.trim() ? value : 'No disponible');

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[#edf1ef] pb-3"><div className="text-xs text-[#668078]">{label}</div><div className="mt-1 font-semibold">{value}</div></div>;
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold">{label}<div className="mt-2">{children}</div></label>;
}

export function ClientProfile({ client, clients, vehicles, quotes, onSave, onBack }: { client: Client; clients: Client[]; vehicles: Vehicle[]; quotes: Quote[]; onSave: (next: Client) => void; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Client>(client);
  const [error, setError] = useState('');
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);

  const startEdit = () => { setDraft(client); setError(''); setEditing(true); };
  const cancelEdit = () => { setDraft(client); setError(''); setEditing(false); };
  const save = () => {
    const name = draft.name.trim();
    if (!name) { setError('El nombre es obligatorio.'); return; }
    const conflict = findDuplicateClient(clients.filter((item) => item.id !== client.id), '', draft.phone);
    if (conflict) { setError(`Ese celular ya pertenece a ${conflict.client.name}. Revisa ese registro antes de guardar.`); return; }
    onSave({
      ...client,
      name,
      phone: draft.phone.trim(),
      city: draft.city.trim(),
      notes: draft.notes.trim(),
      vehicleInterest: draft.vehicleInterest || undefined,
      vehicleInterestId: draft.vehicleInterestId || undefined,
      opportunityStatus: draft.opportunityStatus || undefined,
      saleStatus: draft.saleStatus || undefined,
    });
    setEditing(false);
    setError('');
  };

  const openQuote = quotes.find((quote) => quote.id === openQuoteId && quote.clientId === client.id);
  if (openQuote) return <QuoteDetail quote={openQuote} onBack={() => setOpenQuoteId(null)} />;

  if (editing) {
    return <div className="fade-in">
      <div className="mb-6">
        <p className="text-sm text-[#668078]">Editar ficha del cliente</p>
        <h2 className="mt-1 text-3xl font-bold">{client.name}</h2>
      </div>
      <div className="space-y-6 rounded-2xl border border-[#dce7e2] bg-white p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Nombre completo"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="field" /></FormField>
          <FormField label="Celular"><input value={draft.phone} inputMode="tel" onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="field" /></FormField>
          <FormField label="Ciudad"><input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} className="field" /></FormField>
          <FormField label="Estado de oportunidad">
            <select value={draft.opportunityStatus ?? ''} onChange={(event) => setDraft({ ...draft, opportunityStatus: (event.target.value || undefined) as OpportunityStatus | undefined })} className="field">
              <option value="">Sin definir</option>
              {opportunityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FormField>
          <FormField label="Estado de venta">
            <select value={draft.saleStatus ?? ''} onChange={(event) => setDraft({ ...draft, saleStatus: (event.target.value || undefined) as SaleStatus | undefined })} className="field">
              <option value="">Sin definir</option>
              {saleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Vehículo de interés">
          <VehicleInterestPicker vehicles={vehicles} selectedLabel={draft.vehicleInterest} onChange={(value) => setDraft({ ...draft, vehicleInterestId: value?.id, vehicleInterest: value?.label })} />
        </FormField>
        <FormField label="Observaciones">
          <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="field min-h-24" placeholder="Notas sobre el cliente" />
        </FormField>
        {error && <div className="rounded-xl bg-[#fff0ee] p-3 text-sm font-semibold text-[#a44335]">{error}</div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button onClick={cancelEdit} className="rounded-xl border border-[#dce7e2] bg-white px-5 py-3 font-bold text-[#173c3a] hover:bg-[#f4f7f6]">Cancelar</button>
          <button onClick={save} className="rounded-xl bg-[#173c3a] px-5 py-3 font-bold text-white hover:bg-[#235552]">Guardar cambios</button>
        </div>
      </div>
    </div>;
  }

  return <div className="fade-in">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <button onClick={onBack} className="flex items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2 text-sm font-bold hover:border-[#89a89d]"><ArrowLeft size={16} />Volver al listado</button>
      <button onClick={startEdit} className="flex items-center gap-2 rounded-xl bg-[#173c3a] px-4 py-2 text-sm font-bold text-white hover:bg-[#235552]"><Pencil size={16} />Editar ficha</button>
    </div>
    <div className="mb-6">
      <p className="text-sm text-[#668078]">Ficha del cliente</p>
      <h2 className="mt-1 text-3xl font-bold">{client.name}</h2>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#dce7e2] bg-white p-6">
        <h3 className="mb-4 text-lg font-bold">Datos de contacto</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Celular" value={orDefault(client.phone)} />
          <InfoRow label="Ciudad" value={orDefault(client.city)} />
          <InfoRow label="Registrado" value={formatDate(client.createdAt)} />
          <InfoRow label="Último contacto" value={formatDate(client.lastContactAt)} />
        </div>
      </section>
      <section className="rounded-2xl border border-[#dce7e2] bg-white p-6">
        <h3 className="mb-4 text-lg font-bold">Oportunidad</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Estado de oportunidad" value={orDefault(client.opportunityStatus)} />
          <InfoRow label="Estado de venta" value={orDefault(client.saleStatus)} />
          <InfoRow label="Vehículo de interés" value={orDefault(client.vehicleInterest)} />
          <InfoRow label="Próximo seguimiento" value={formatDate(client.nextFollowUpAt)} />
        </div>
      </section>
      <section className="rounded-2xl border border-[#dce7e2] bg-white p-6 lg:col-span-2">
        <h3 className="mb-2 text-lg font-bold">Observaciones</h3>
        <p className="whitespace-pre-line text-sm leading-6 text-[#17202a]">{orDefault(client.notes)}</p>
      </section>
      <ClientQuoteList clientId={client.id} quotes={quotes} onOpen={setOpenQuoteId} />
    </div>
  </div>;
}
