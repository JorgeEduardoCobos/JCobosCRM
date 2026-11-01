import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { findDuplicateClient, type DuplicateMatch } from '@/lib/clientDuplicates';
import { makeId, type AppData, type Client, type Quote } from '@/lib/storage';

type SectionProps = {
  quote: Quote;
  data: AppData;
  updateData: (next: AppData, message?: string) => void;
  openClient: (clientId: string) => void;
};

const reasonLabel = { phone: 'El mismo número de celular', name: 'El mismo nombre' } as const;

export function QuoteClientSection(props: SectionProps) {
  const [converting, setConverting] = useState(false);
  const { quote, data, openClient } = props;

  if (quote.clientId) {
    const linked = data.clients.find((client) => client.id === quote.clientId);
    return (
      <section className="mt-5 rounded-2xl border border-[#dce7e2] bg-white p-6">
        <h3 className="text-lg font-bold">Cliente vinculado</h3>
        {linked ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-bold">{linked.name}</div>
              <div className="text-sm text-[#668078]">{linked.phone || 'Sin celular registrado'}</div>
            </div>
            <button onClick={() => openClient(linked.id)} className="rounded-xl border border-[#dce7e2] px-4 py-2 text-sm font-bold hover:border-[#89a89d]">Abrir ficha del cliente</button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#a44335]">El cliente vinculado ya no existe en el registro de clientes.</p>
        )}
      </section>
    );
  }

  if (!converting) {
    return (
      <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce7e2] bg-white p-6">
        <div>
          <h3 className="text-lg font-bold">Cliente</h3>
          <p className="mt-1 text-sm text-[#668078]">Esta cotización todavía no está vinculada a un cliente.</p>
        </div>
        <button onClick={() => setConverting(true)} className="flex items-center gap-2 rounded-xl bg-[#173c3a] px-4 py-2 text-sm font-bold text-white hover:bg-[#21524f]">
          <UserPlus size={16} />Convertir en cliente
        </button>
      </section>
    );
  }

  return <ConvertQuoteForm {...props} onCancel={() => setConverting(false)} />;
}

function ConvertQuoteForm({ quote, data, updateData, openClient, onCancel }: SectionProps & { onCancel: () => void }) {
  const [name, setName] = useState(quote.clientName);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [match, setMatch] = useState<DuplicateMatch | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const linkQuote = (clients: Client[], clientId: string, message: string) => {
    updateData({ ...data, clients, quotes: data.quotes.map((item) => (item.id === quote.id ? { ...item, clientId } : item)) }, message);
  };

  const createClient = () => {
    const client: Client = {
      id: makeId('CLI'),
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      status: 'Calificación',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      vehicleInterest: quote.vehicleName,
      vehicleInterestId: quote.vehicleId,
    };
    linkQuote([client, ...data.clients], client.id, 'Cliente creado y cotización vinculada.');
  };

  const linkExisting = (client: Client, adoptVehicle: boolean) => {
    const clients = adoptVehicle
      ? data.clients.map((item) => (item.id === client.id ? { ...item, vehicleInterest: quote.vehicleName, vehicleInterestId: quote.vehicleId } : item))
      : data.clients;
    linkQuote(clients, client.id, 'Cotización vinculada al cliente.');
  };

  const save = () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    const found = findDuplicateClient(data.clients, name, phone);
    if (found) {
      setError('');
      setMatch(found);
      setReviewing(false);
      return;
    }
    createClient();
  };

  if (match) {
    const existing = match.client;
    return (
      <section className="mt-5 rounded-2xl border border-[#e8c98b] bg-[#fffaf0] p-6">
        <h3 className="text-lg font-bold text-[#7a5518]">Posible cliente ya registrado</h3>
        <p className="mt-1 text-sm text-[#7a5518]">{reasonLabel[match.reason]}. Revisa antes de crear otro registro.</p>
        <div className="mt-4 rounded-xl border border-[#e8c98b] bg-white p-4">
          <div className="font-bold">{existing.name}</div>
          <div className="text-sm text-[#668078]">{existing.phone || 'Sin celular registrado'}</div>
          {existing.city && <div className="text-sm text-[#668078]">{existing.city}</div>}
        </div>

        {reviewing ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[#173c3a]">Vincular la cotización a este cliente. Sus datos no se modifican.</p>
            <button onClick={() => linkExisting(existing, false)} className="w-full rounded-xl bg-[#173c3a] px-4 py-3 text-sm font-bold text-white hover:bg-[#21524f]">Vincular sin cambiar su vehículo de interés</button>
            <button onClick={() => linkExisting(existing, true)} className="w-full rounded-xl border border-[#173c3a] px-4 py-3 text-sm font-bold text-[#173c3a] hover:bg-[#f4f7f6]">Vincular y poner {quote.vehicleName} como vehículo de interés</button>
            <button onClick={() => openClient(existing.id)} className="w-full rounded-xl border border-[#dce7e2] bg-white px-4 py-3 text-sm font-bold hover:border-[#89a89d]">Abrir ficha completa</button>
            <button onClick={() => setReviewing(false)} className="w-full text-sm font-bold text-[#668078] hover:text-[#173c3a]">Volver</button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <button onClick={() => setReviewing(true)} className="w-full rounded-xl bg-[#173c3a] px-4 py-3 text-sm font-bold text-white hover:bg-[#21524f]">Revisar la ficha existente</button>
            <button onClick={createClient} className="w-full rounded-xl border border-[#dce7e2] bg-white px-4 py-3 text-sm font-bold hover:border-[#89a89d]">Es otra persona, crear registro nuevo</button>
            <button onClick={onCancel} className="w-full text-sm font-bold text-[#668078] hover:text-[#173c3a]">Cancelar y no convertir</button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-[#dce7e2] bg-white p-6">
      <h3 className="text-lg font-bold">Convertir en cliente</h3>
      <p className="mt-1 text-sm text-[#668078]">El vehículo de la cotización ({quote.vehicleName}) se guardará como vehículo de interés del nuevo cliente.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold">Nombre</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7e2] px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Teléfono</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className="mt-1 w-full rounded-xl border border-[#dce7e2] px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Ciudad</span>
          <input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7e2] px-3 py-3" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold">Observaciones (opcional)</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-[#dce7e2] px-3 py-3" />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-[#a44335]">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button onClick={onCancel} className="rounded-xl border border-[#dce7e2] bg-white px-4 py-3 text-sm font-bold hover:border-[#89a89d]">Cancelar</button>
        <button onClick={save} className="rounded-xl bg-[#173c3a] px-4 py-3 text-sm font-bold text-white hover:bg-[#21524f]">Guardar y vincular</button>
      </div>
    </section>
  );
}
