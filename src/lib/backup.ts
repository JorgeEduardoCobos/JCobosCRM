import JSZip from 'jszip';
import { defaultCompany, loadAllPhotos, savePhoto, type AppData } from '@/lib/storage';

export type BackupManifest = { format: 'JC_CRM_BACKUP'; version: 1; createdAt: string; appVersion: string; counts: { vehicles: number; clients: number; quotes: number; photos?: number }; photoTypes?: Record<string, string> };

const manifestFor = (data: AppData, photoCount = 0, photoTypes: Record<string, string> = {}): BackupManifest => ({ format: 'JC_CRM_BACKUP', version: 1, createdAt: new Date().toISOString(), appVersion: '0.1.0', counts: { vehicles: data.vehicles.length, clients: data.clients.length, quotes: data.quotes.length, photos: photoCount }, photoTypes });
const download = (blob: Blob, filename: string): void => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); };

export async function downloadBackup(data: AppData): Promise<void> {
  const photos = await loadAllPhotos();
  const photoTypes: Record<string, string> = {};
  const zip = new JSZip();
  photos.forEach((blob, id) => { zip.file(`photos/${id}.dat`, blob); photoTypes[id] = blob.type || 'image/jpeg'; });
  zip.file('manifest.json', JSON.stringify(manifestFor(data, photos.size, photoTypes), null, 2));
  zip.file('data.json', JSON.stringify(data, null, 2));
  zip.file('README.txt', 'Respaldo local de JC CRM. Incluye catálogo, clientes, cotizaciones, configuración financiera y fotografías de los vehículos.');
  download(await zip.generateAsync({ type: 'blob' }), `JC_CRM_respaldo_${new Date().toISOString().slice(0, 10)}.zip`);
}

export async function restorePhotos(file: File): Promise<number> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestFile = zip.file('manifest.json');
  const manifest = manifestFile ? (JSON.parse(await manifestFile.async('text')) as BackupManifest) : null;
  const types = manifest?.photoTypes ?? {};
  const paths = Object.keys(zip.files).filter((path) => path.startsWith('photos/') && path !== 'photos/' && !zip.files[path].dir);
  let count = 0;
  for (const path of paths) {
    const id = path.replace(/^photos\//, '').replace(/\.dat$/, '');
    const bytes = await zip.files[path].async('uint8array');
    const type = types[id] ?? 'image/jpeg';
    await savePhoto(id, new Blob([bytes], { type }));
    count += 1;
  }
  return count;
}

export async function inspectBackup(file: File): Promise<{ manifest: BackupManifest; data: AppData }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestFile = zip.file('manifest.json');
  const dataFile = zip.file('data.json');
  if (!manifestFile || !dataFile) throw new Error('El archivo no contiene el manifiesto y los datos requeridos.');
  const manifest = JSON.parse(await manifestFile.async('text')) as BackupManifest;
  const parsed = JSON.parse(await dataFile.async('text')) as Partial<AppData>;
  if (manifest.format !== 'JC_CRM_BACKUP' || manifest.version !== 1 || !Array.isArray(parsed.vehicles) || !Array.isArray(parsed.clients) || !Array.isArray(parsed.quotes) || !parsed.finance) throw new Error('El respaldo no pertenece a una versión compatible de JC CRM.');
  const data: AppData = { ...parsed, company: { ...defaultCompany, ...(parsed.company ?? {}) } } as AppData;
  return { manifest, data };
}

export function downloadCsv(data: AppData, type: 'vehicles' | 'clients' | 'quotes'): void {
  const rows = type === 'vehicles' ? [['Marca', 'Modelo', 'Año', 'Tipo', 'Precio', 'Disponibilidad'], ...data.vehicles.map((vehicle) => [vehicle.brand, vehicle.model, vehicle.year ?? '', vehicle.type ?? '', vehicle.price ?? '', vehicle.availability])] : type === 'clients' ? [['Nombre', 'Celular', 'Ciudad', 'Estado', 'Fecha'], ...data.clients.map((client) => [client.name, client.phone, client.city, client.status, client.createdAt])] : [['Identificador', 'Vehículo', 'Cliente', 'Modalidad', 'Total', 'Fecha'], ...data.quotes.map((quote) => [quote.id, quote.vehicleName, quote.clientName, quote.mode, quote.total, quote.createdAt])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
  download(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `JC_CRM_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
}
