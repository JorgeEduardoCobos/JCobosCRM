import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { normalizeName } from '@/lib/clientDuplicates';
import type { Vehicle } from '@/lib/storage';

export type VehicleInterest = { id: string; label: string };

export const vehicleLabel = (vehicle: Vehicle): string => [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ');

export function VehicleInterestPicker({ vehicles, selectedLabel, onChange }: { vehicles: Vehicle[]; selectedLabel?: string; onChange: (value: VehicleInterest | null) => void }) {
  const [search, setSearch] = useState('');
  const results = useMemo(() => {
    const term = normalizeName(search);
    if (!term) return [];
    return vehicles.filter((vehicle) => normalizeName(`${vehicle.brand} ${vehicle.model}`).includes(term)).slice(0, 8);
  }, [vehicles, search]);

  return <div className="space-y-3">
    {selectedLabel ? <div className="flex items-center justify-between gap-3 rounded-xl bg-[#e8f2e9] p-3 text-sm"><span className="font-bold text-[#173c3a]">{selectedLabel}</span><button type="button" onClick={() => onChange(null)} className="rounded-lg px-2 py-1 text-xs font-bold text-[#a44335] hover:bg-white">Quitar</button></div> : <div className="text-sm text-[#668078]">Sin vehículo de interés</div>}
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#668078]" size={16} />
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por marca o modelo" className="field pl-10" />
    </label>
    {search.trim() !== '' && (results.length ? <ul className="max-h-52 overflow-auto rounded-xl border border-[#dce7e2] bg-white">{results.map((vehicle) => <li key={vehicle.id}><button type="button" onClick={() => { onChange({ id: vehicle.id, label: vehicleLabel(vehicle) }); setSearch(''); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#f4f7f6]"><span className="font-semibold">{vehicleLabel(vehicle)}</span><span className="shrink-0 text-xs text-[#668078]">{vehicle.type || 'Sin tipo'}</span></button></li>)}</ul> : <div className="text-sm text-[#668078]">{vehicles.length ? 'No hay vehículos que coincidan.' : 'El catálogo está vacío.'}</div>)}
  </div>;
}
