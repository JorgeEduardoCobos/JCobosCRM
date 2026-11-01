import { ChevronRight } from 'lucide-react';
import { formatDate, money } from '@/QuoteHistory';
import type { Quote } from '@/lib/storage';

export function ClientQuoteList({ clientId, quotes, onOpen }: { clientId: string; quotes: Quote[]; onOpen: (quoteId: string) => void }) {
  const linked = quotes.filter((quote) => quote.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="rounded-2xl border border-[#dce7e2] bg-white p-6 lg:col-span-2">
      <h3 className="mb-4 text-lg font-bold">Historial de cotizaciones</h3>
      {linked.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#b8cbc7] p-6 text-center text-sm text-[#668078]">Este cliente todavía no tiene cotizaciones</p>
      ) : (
        <ul className="space-y-3">
          {linked.map((quote) => (
            <li key={quote.id}>
              <button onClick={() => onOpen(quote.id)} className="flex w-full items-center gap-4 rounded-xl border border-[#dce7e2] p-4 text-left transition hover:border-[#89a89d] hover:shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#668078]">
                    <span>{formatDate(quote.createdAt)}</span>
                    <span className="rounded-full bg-[#fff1d8] px-2 py-0.5 font-bold text-[#9b6d22]">{quote.mode}</span>
                    <span className="rounded-full bg-[#e6f1ee] px-2 py-0.5 font-bold text-[#173c3a]">Vinculada a este cliente</span>
                  </div>
                  <div className="mt-1 truncate font-bold">{quote.vehicleName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#668078]">Total cotizado</div>
                  <div className="font-bold">{money(quote.total)}</div>
                </div>
                <ChevronRight className="shrink-0 text-[#668078]" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
