import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import type { AppData, Quote } from '@/lib/storage';
import { QuoteClientSection } from '@/QuoteClientSection';

type ModeFilter = 'Todas' | 'Contado' | 'Financiado';

const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
export const money = (value: number | undefined): string => (value === undefined ? 'No disponible' : currency.format(value));
const percent = (value: number | undefined): string => (value === undefined ? 'No disponible' : `${value.toFixed(2)}%`);
export const formatDate = (iso: string): string => new Date(iso).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
const normalizeText = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const clientLabel = (quote: Quote): string => quote.clientName || 'Sin nombre de cliente';

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#eef3f1] py-3 last:border-0">
      <span className="text-sm text-[#668078]">{label}</span>
      <span className={`text-right ${strong ? 'font-bold text-[#173c3a]' : 'font-semibold'}`}>{value}</span>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#dce7e2] bg-white p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

type LinkProps = { data: AppData; updateData: (next: AppData, message?: string) => void; openClient: (clientId: string) => void };

export function QuoteDetail({ quote, onBack, onHome, clientSection }: { quote: Quote; onBack: () => void; onHome?: () => void; clientSection?: ReactNode }) {
  const calc = quote.calculation;
  const fin = quote.finance;
  const isFinanced = quote.mode === 'Financiado';
  const chargeValue = (mode: 'Porcentaje' | 'Valor fijo', value: number) => (mode === 'Porcentaje' ? `${value}%` : money(value));

  return (
    <div className="fade-in">
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2 text-sm font-bold hover:border-[#89a89d]">
          <ArrowLeft size={16} />Volver al listado
        </button>
        {onHome && <button onClick={onHome} className="rounded-xl border border-[#dce7e2] bg-white px-4 py-2 text-sm font-bold hover:border-[#89a89d]">Ir al inicio</button>}
      </div>

      <div className="mb-6">
        <p className="text-sm text-[#668078]">{formatDate(quote.createdAt)}</p>
        <h2 className="mt-1 text-3xl font-bold">{clientLabel(quote)}</h2>
      </div>

      {clientSection}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DetailCard title="Información general">
          <DetailRow label="Identificador" value={quote.id} />
          <DetailRow label="Fecha" value={formatDate(quote.createdAt)} />
          <DetailRow label="Cliente" value={clientLabel(quote)} />
          <DetailRow label="Vehículo" value={quote.vehicleName} />
          <DetailRow label="Modalidad" value={quote.mode} />
          <DetailRow label="Precio original" value={money(quote.price)} />
          <DetailRow label={isFinanced ? 'Total pagado' : 'Precio final'} value={money(quote.total)} strong />
        </DetailCard>

        {isFinanced ? (
          <DetailCard title="Financiamiento">
            <DetailRow label="Precio del vehículo" value={money(quote.price)} />
            <DetailRow label="Entrada en dólares" value={money(quote.entryAmount ?? calc?.entry)} />
            <DetailRow label="Porcentaje de entrada" value={percent(fin?.entryPercent)} />
            <DetailRow label="Monto financiado" value={money(calc?.principal)} />
            <DetailRow label="Tasa de interés" value={fin ? `${fin.annualRate}% ${fin.ratePeriod.toLowerCase()}` : 'No disponible'} />
            <DetailRow label="Plazo" value={fin ? `${fin.term} meses` : 'No disponible'} />
            <DetailRow label="Cuota mensual" value={money(calc?.payment)} strong />
            <DetailRow label="Intereses" value={money(calc?.totalInterest)} />
            <DetailRow label="Total pagado" value={money(quote.total)} strong />
          </DetailCard>
        ) : (
          <DetailCard title="Precio de contado">
            <DetailRow label="Precio original" value={money(quote.price)} />
            <DetailRow label="Descuento (%)" value={percent(quote.discountPercent)} />
            <DetailRow label="Descuento en dólares" value={money(quote.discountAmount)} />
            <DetailRow label="Precio final" value={money(quote.total)} strong />
          </DetailCard>
        )}

        {isFinanced && (
          <DetailCard title="Seguros y cargos">
            <DetailRow label="Seguro" value={fin ? `${chargeValue(fin.insuranceMode, fin.insuranceValue)} · ${fin.insuranceApplication}` : 'No disponible'} />
            <DetailRow label="Seguro inicial" value={money(calc?.insuranceInitial)} />
            <DetailRow label="Impuesto" value={fin ? `${chargeValue(fin.taxMode, fin.taxValue)} sobre ${fin.taxBase.toLowerCase()} · ${fin.taxApplication}` : 'No disponible'} />
            <DetailRow label="Impuesto inicial" value={money(calc?.taxInitial)} />
            <DetailRow label="Cargo periódico" value={money(calc?.periodicCharge)} />
            <DetailRow label="Cargos totales" value={money(calc?.totalCharges)} />
          </DetailCard>
        )}
      </div>

      {calc?.schedule && calc.schedule.length > 0 && (
        <details className="mt-5 rounded-2xl border border-[#dce7e2] bg-white p-6">
          <summary className="cursor-pointer text-lg font-bold">Calendario de pagos ({calc.schedule.length} cuotas)</summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="text-xs uppercase text-[#668078]">
                <tr>
                  <th className="p-2 text-center">Nº</th>
                  <th className="p-2">Saldo inicial</th>
                  <th className="p-2">Interés</th>
                  <th className="p-2">Capital</th>
                  <th className="p-2">Cargos</th>
                  <th className="p-2">Cuota</th>
                  <th className="p-2">Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {calc.schedule.map((row) => (
                  <tr key={row.number} className="border-t border-[#eef3f1]">
                    <td className="p-2 text-center">{row.number}</td>
                    <td className="p-2">{money(row.opening)}</td>
                    <td className="p-2">{money(row.interest)}</td>
                    <td className="p-2">{money(row.principal)}</td>
                    <td className="p-2">{money(row.charges)}</td>
                    <td className="p-2 font-semibold">{money(row.payment)}</td>
                    <td className="p-2">{money(row.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

export function QuoteHistory({ data, navigate, updateData, openClient }: { navigate: (page: 'Inicio') => void } & LinkProps) {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('Todas');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const quotes = useMemo(() => [...data.quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.quotes]);
  const visible = useMemo(() => {
    const term = normalizeText(search);
    return quotes.filter((quote) => (modeFilter === 'Todas' || quote.mode === modeFilter) && (!term || normalizeText(`${quote.clientName} ${quote.vehicleName}`).includes(term)));
  }, [quotes, search, modeFilter]);

  const selected = quotes.find((quote) => quote.id === selectedId);
  if (selected) return <QuoteDetail quote={selected} onBack={() => setSelectedId(null)} onHome={() => navigate('Inicio')} clientSection={<QuoteClientSection quote={selected} data={data} updateData={updateData} openClient={openClient} />} />;

  return (
    <div className="fade-in">
      <div className="mb-6">
        <p className="text-sm text-[#668078]">Cotizaciones guardadas en este dispositivo</p>
        <h2 className="mt-1 text-3xl font-bold">Historial de cotizaciones</h2>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#dce7e2] bg-white p-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#668078]" size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cliente o vehículo" className="w-full rounded-xl border border-[#dce7e2] py-3 pl-10 pr-3" />
        </label>
        <div className="flex gap-1 rounded-xl bg-[#f4f7f6] p-1">
          {(['Todas', 'Contado', 'Financiado'] as const).map((option) => (
            <button key={option} onClick={() => setModeFilter(option)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold md:flex-none ${modeFilter === option ? 'bg-white shadow-sm' : 'text-[#668078]'}`}>
              {option}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#b8cbc7] p-8 text-center text-sm text-[#668078]">
          {quotes.length === 0 ? 'Aún no hay cotizaciones guardadas.' : 'No hay cotizaciones que coincidan con la búsqueda.'}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((quote) => (
            <li key={quote.id}>
              <button onClick={() => setSelectedId(quote.id)} className="flex w-full items-center gap-4 rounded-2xl border border-[#dce7e2] bg-white p-4 text-left transition hover:border-[#89a89d] hover:shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#668078]">
                    <span>{formatDate(quote.createdAt)}</span>
                    <span className="rounded-full bg-[#fff1d8] px-2 py-0.5 font-bold text-[#9b6d22]">{quote.mode}</span>
                  </div>
                  <div className="mt-1 truncate font-bold">{clientLabel(quote)}</div>
                  <div className="truncate text-sm text-[#668078]">{quote.vehicleName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#668078]">{quote.mode === 'Contado' ? 'Precio final' : 'Total pagado'}</div>
                  <div className="font-bold">{money(quote.total)}</div>
                </div>
                <span className="hidden shrink-0 text-sm font-bold text-[#173c3a] sm:inline">Ver detalle</span>
                <ChevronRight className="shrink-0 text-[#668078]" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
