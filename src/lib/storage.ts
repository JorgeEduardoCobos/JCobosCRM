import type { FinanceResult } from '@/lib/finance';

export type Vehicle = {
  id: string;
  samadiId?: string;
  brand: string;
  model: string;
  year?: number;
  type?: string;
  engine?: string;
  maxSpeed?: string;
  tank?: string;
  lights?: string;
  valves?: string;
  dashboard?: string;
  brakes?: string;
  tires?: string;
  suspension?: string;
  notes?: string;
  officialPrice?: number;
  officialPriceText?: string;
  priceCondition?: string;
  priceSource?: string;
  priceUpdatedAt?: string;
  salePrice?: number;
  priceManualAdjust?: boolean;
  commercialNotes?: string;
  price?: number;
  priceText?: string;
  availability: 'Disponible' | 'Pendiente' | 'No disponible';
  raw?: Record<string, string>;
  photoId?: string;
};

export const vehiclePrice = (vehicle: Vehicle): number | undefined => vehicle.salePrice ?? vehicle.officialPrice ?? vehicle.price;
export const vehiclePriceLabel = (vehicle: Vehicle): string => {
  const price = vehiclePrice(vehicle);
  const base = price === undefined ? 'No disponible' : new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  if (vehicle.priceManualAdjust) return `${base} (ajuste manual)`;
  if (vehicle.priceCondition) return `${base} (${vehicle.priceCondition})`;
  return base;
};

export type OpportunityStatus = 'Nuevo prospecto' | 'Contactado' | 'Interesado' | 'Cotización enviada' | 'Seguimiento pendiente' | 'Negociación' | 'Venta cerrada' | 'No concretado';
export type SaleStatus = 'Sin venta' | 'Vendido' | 'No concretado';
export type ContactChannel = 'Llamada' | 'WhatsApp' | 'Visita' | 'Correo' | 'Otro';
export type ContactRecord = { id: string; contactedAt: string; channel: ContactChannel; result: string; note: string };
export type Client = { id: string; name: string; phone: string; city: string; status: string; notes: string; createdAt: string; opportunityStatus?: OpportunityStatus; vehicleInterest?: string; lastContactAt?: string; nextFollowUpAt?: string; contactHistory?: ContactRecord[]; saleStatus?: SaleStatus };
export type Quote = { id: string; vehicleId: string; vehicleName: string; price: number; mode: 'Contado' | 'Financiado'; clientName: string; total: number; createdAt: string; finance?: FinanceConfig; entryAmount?: number; discountPercent?: number; discountAmount?: number; calculation?: FinanceResult };
export type FinanceConfig = { annualRate: number; ratePeriod: 'Anual' | 'Mensual'; entryPercent: number; term: number; insuranceMode: 'Porcentaje' | 'Valor fijo'; insuranceValue: number; insuranceApplication: 'Capitalizado' | 'Por cuota' | 'Único'; taxMode: 'Porcentaje' | 'Valor fijo'; taxValue: number; taxBase: 'Precio' | 'Monto financiado'; taxApplication: 'Inicial' | 'Capitalizado' | 'Por cuota'; enabledTerms: number[]; notes: string };
export type CompanyInfo = { name: string; advisorName: string };
export const defaultCompany: CompanyInfo = { name: 'SAMADI Ecuador', advisorName: 'Jorge' };
export type AppData = { vehicles: Vehicle[]; clients: Client[]; quotes: Quote[]; finance: FinanceConfig; company: CompanyInfo };

const DB_NAME = 'jc-crm-local';
const DB_VERSION = 2;
const STORE = 'app-data';
const PHOTO_STORE = 'photos';
const KEY = 'current';

export const defaultFinance: FinanceConfig = { annualRate: 15.6, ratePeriod: 'Anual', entryPercent: 25, term: 24, insuranceMode: 'Porcentaje', insuranceValue: 0, insuranceApplication: 'Por cuota', taxMode: 'Porcentaje', taxValue: 0, taxBase: 'Monto financiado', taxApplication: 'Inicial', enabledTerms: [6, 12, 18, 24, 36], notes: 'Tasa de referencia editable. Verificar condiciones reales de la entidad financiera.' };

const emptyData = (): AppData => ({ vehicles: [], clients: [], quotes: [], finance: defaultFinance, company: defaultCompany });

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadData(): Promise<AppData> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(KEY);
    request.onsuccess = () => { const stored = request.result; if (!stored) return resolve(emptyData()); resolve({ ...emptyData(), ...stored, company: { ...defaultCompany, ...(stored.company ?? {}) } }); };
    request.onerror = () => reject(request.error);
  });
}

export async function saveData(data: AppData): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export type QuoteDraft = { vehicleId?: string; mode: 'Contado' | 'Financiado'; clientName: string; discount: number; entryMode?: 'pct' | 'usd'; entryPercent?: number; entryAmount?: number; term?: number };
const DRAFT_KEY = 'quoteDraft';

export async function saveQuoteDraft(draft: QuoteDraft): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(draft, DRAFT_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadQuoteDraft(): Promise<QuoteDraft | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(DRAFT_KEY);
    request.onsuccess = () => resolve(request.result as QuoteDraft | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE, 'readwrite').objectStore(PHOTO_STORE).put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadPhoto(id: string): Promise<Blob | undefined> {
  if (!id) return undefined;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  if (!id) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE, 'readwrite').objectStore(PHOTO_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllPhotos(): Promise<Map<string, Blob>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const store = db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE);
    const result = new Map<string, Blob>();
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => { const cursor = cursorReq.result; if (cursor) { result.set(String(cursor.key), cursor.value as Blob); cursor.continue(); } else resolve(result); };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

export function makeId(prefix: string): string { return `${prefix}-${crypto.randomUUID()}`; }
