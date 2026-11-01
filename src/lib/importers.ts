import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Vehicle } from '@/lib/storage';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const normalize = (value: unknown): string => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[/_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const aliases: Record<string, string[]> = { brand: ['marca'], model: ['modelo', 'nombre modelo'], year: ['ano', 'anio', 'año'], type: ['tipo'], maxSpeed: ['velocidad maxima', 'velocidad máxima'], engine: ['motor', 'cilindraje', 'cilindrada'], tank: ['capacidad tanque', 'capacidad del tanque'], lights: ['luces'], valves: ['valvulas', 'válvulas'], dashboard: ['tablero'], brakes: ['frenos'], tires: ['llantas'], suspension: ['suspenciones', 'suspensiones'], notes: ['observaciones', 'observacion'] };
const findHeader = (headers: string[], field: string): string | undefined => headers.find((header) => aliases[field].includes(normalize(header)));

export type ExcelPreview = { sheet: string; headerRow: number; headers: string[]; recognized: string[]; records: Vehicle[]; unknownColumns: string[]; errors: string[] };

export async function parseExcel(file: File): Promise<ExcelPreview> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  let best = { sheet: workbook.SheetNames[0], row: 0, score: 0, rows: [] as unknown[][] };
  for (const sheet of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheet], { header: 1, defval: '' });
    rows.slice(0, 20).forEach((row, index) => { const score = row.filter((cell) => aliases.brand.includes(normalize(cell)) || aliases.model.includes(normalize(cell))).length; if (score > best.score) best = { sheet, row: index, score, rows }; });
  }
  const headers = (best.rows[best.row] ?? []).map((value) => String(value));
  const mapping = Object.fromEntries(Object.keys(aliases).map((field) => [field, findHeader(headers, field)]));
  const recognized = Object.entries(mapping).filter(([, value]) => Boolean(value)).map(([key]) => key);
  const errors: string[] = [];
  if (!mapping.brand) errors.push('No se reconoció la columna MARCA.');
  if (!mapping.model) errors.push('No se reconoció la columna MODELO.');
  const records = best.rows.slice(best.row + 1).map((row) => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? '').trim()]));
    const brand = mapping.brand ? String(row[headers.indexOf(mapping.brand)] ?? '').trim() : '';
    const model = mapping.model ? String(row[headers.indexOf(mapping.model)] ?? '').trim() : '';
    const yearText = mapping.year ? String(row[headers.indexOf(mapping.year)] ?? '').trim() : '';
    return { id: '', brand, model, year: yearText ? Number(yearText) || undefined : undefined, type: mapping.type ? String(row[headers.indexOf(mapping.type)] ?? '').trim() : undefined, maxSpeed: mapping.maxSpeed ? String(row[headers.indexOf(mapping.maxSpeed)] ?? '').trim() : undefined, engine: mapping.engine ? String(row[headers.indexOf(mapping.engine)] ?? '').trim() : undefined, tank: mapping.tank ? String(row[headers.indexOf(mapping.tank)] ?? '').trim() : undefined, lights: mapping.lights ? String(row[headers.indexOf(mapping.lights)] ?? '').trim() : undefined, valves: mapping.valves ? String(row[headers.indexOf(mapping.valves)] ?? '').trim() : undefined, dashboard: mapping.dashboard ? String(row[headers.indexOf(mapping.dashboard)] ?? '').trim() : undefined, brakes: mapping.brakes ? String(row[headers.indexOf(mapping.brakes)] ?? '').trim() : undefined, tires: mapping.tires ? String(row[headers.indexOf(mapping.tires)] ?? '').trim() : undefined, suspension: mapping.suspension ? String(row[headers.indexOf(mapping.suspension)] ?? '').trim() : undefined, notes: mapping.notes ? String(row[headers.indexOf(mapping.notes)] ?? '').trim() : undefined, availability: 'Pendiente' as const, raw };
  }).filter((record) => record.brand || record.model);
  const unknownColumns = headers.filter((header) => !recognized.some((field) => mapping[field] === header));
  return { sheet: best.sheet, headerRow: best.row + 1, headers, recognized, records, unknownColumns, errors };
}

export type PdfPrice = { brand: string; model: string; year?: number; priceText: string; price?: number; status: string; priceCondition?: string };
const priceCondition = (text: string): string | undefined => {
  const upper = text.toUpperCase();
  if (/MASIVA|MAS\s*IVA/.test(upper)) return 'más IVA';
  if (/MAS\s*IMP/.test(upper)) return 'más impuesto';
  if (/\+\s*IVA/.test(upper)) return 'más IVA';
  return undefined;
};
const parsePrice = (text: string): number | undefined => {
  const clean = text.replace(/[^0-9.,]/g, '');
  if (!clean) return undefined;
  const normalized = clean.includes('.') ? clean.replace(/\./g, '') : clean.replace(',', '.');
  const value = Number(normalized.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
};
const knownBrands = ['GOAT BIKES', 'LONCIN', 'VOGE', 'DAYTONA', 'MTI', 'BULTACO', 'SHINERAY', 'HONDA', 'DUKARE', 'YAMAHA', 'KTM', 'SUZUKI', 'RANGER', 'HAOJUE', 'MOTOR UNO', 'TUKO', 'IGM', 'BAJAJ', 'DRT'];
const normalizeBrand = (value: string): string => { const upper = value.trim().toUpperCase(); return knownBrands.find((brand) => upper === brand || upper.startsWith(brand)) ?? upper; };

type TextItem = { str: string; x: number; y: number };
type RowCells = { brand: string; model: string; year: string; price: string };

const columnKey = (header: string): 'brand' | 'model' | 'year' | 'price' | null => {
  const normalized = header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  if (normalized === 'MARCA') return 'brand';
  if (normalized === 'MODELO') return 'model';
  if (normalized === 'AÑO' || normalized === 'ANO' || normalized === 'ANIO') return 'year';
  if (normalized === 'PROMO' || normalized === 'PRECIO' || normalized === 'PRECIO ORIGINAL') return 'price';
  return null;
};

const detectColumns = (items: TextItem[]): { bounds: { brand: number; model: number; year: number; price: number } | null; headerY: number | null } => {
  const positions: Record<string, number> = {};
  let headerY: number | null = null;
  for (const item of items) { const key = columnKey(item.str); if (key && positions[key] === undefined) { positions[key] = item.x; headerY = item.y; } }
  if (positions.brand === undefined || positions.model === undefined) return { bounds: null, headerY };
  const sorted = ['brand', 'model', 'year', 'price'].filter((key) => positions[key] !== undefined).sort((a, b) => positions[a] - positions[b]);
  const bounds: Record<string, number> = { brand: 0, model: 0, year: 0, price: 0 };
  for (let i = 0; i < sorted.length - 1; i += 1) bounds[sorted[i + 1]] = (positions[sorted[i]] + positions[sorted[i + 1]]) / 2;
  bounds[sorted[0]] = 0;
  bounds.price = positions.price ?? (positions.year ?? positions.model) + 60;
  return { bounds: bounds as { brand: number; model: number; year: number; price: number }, headerY };
};

const assignCell = (x: number, bounds: { brand: number; model: number; year: number; price: number }): 'brand' | 'model' | 'year' | 'price' => {
  if (x < bounds.model) return 'brand';
  if (x < bounds.year) return 'model';
  if (x < bounds.price) return 'year';
  return 'price';
};

const buildRow = (items: TextItem[], bounds: { brand: number; model: number; year: number; price: number }): RowCells => {
  const cells: RowCells = { brand: '', model: '', year: '', price: '' };
  for (const item of items) { const key = assignCell(item.x, bounds); cells[key] = `${cells[key]}${item.str}`.trim(); }
  return cells;
};

const isVehicleRow = (cells: RowCells): boolean => {
  const year = Number(cells.year);
  const hasYear = Number.isInteger(year) && year >= 2000 && year <= 2099;
  const hasPrice = /[0-9]/.test(cells.price);
  return Boolean(cells.brand && cells.model && hasYear && hasPrice);
};

const conditionKeywords = /entrada|interes|interés|matricula|matrícula|bono|gps|tarjeta|seguro|credito|crédito|incluye|agotar|stock|plataforma|casco|rojo|efectivo|gracia|instalado/i;
const isConditionRow = (cells: RowCells): boolean => conditionKeywords.test(`${cells.brand} ${cells.model} ${cells.year} ${cells.price}`.trim());

export async function parsePdf(file: File): Promise<{ pages: number; rows: PdfPrice[]; conditions: string[]; scanned: boolean }> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const rows: PdfPrice[] = [];
  const conditions: string[] = [];
  let totalTextItems = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items.filter((item) => 'str' in item && Boolean((item as { str: string }).str?.trim())).map((item) => ({ str: (item as { str: string }).str, x: (item as { transform: number[] }).transform[4], y: (item as { transform: number[] }).transform[5] }));
    totalTextItems += items.length;
    if (!items.length) continue;
    const { bounds, headerY } = detectColumns(items);
    if (!bounds || headerY === null) continue;
    const byY = new Map<number, TextItem[]>();
    for (const item of items) { const y = Math.round(item.y); if (!byY.has(y)) byY.set(y, []); byY.get(y)!.push(item); }
    const ys = [...byY.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      if (y >= headerY) continue;
      const cells = buildRow(byY.get(y)!, bounds);
      if (isVehicleRow(cells)) { const priceText = cells.price.trim(); const condition = priceCondition(priceText); const price = parsePrice(priceText); const status = condition ? `Revisión: ${condition}` : 'Listo para revisión'; rows.push({ brand: normalizeBrand(cells.brand), model: cells.model.trim(), year: Number(cells.year), priceText, price, status, priceCondition: condition }); }
      else { const text = `${cells.brand} ${cells.model} ${cells.year} ${cells.price}`.replace(/\s+/g, ' ').trim(); if (text && isConditionRow(cells)) conditions.push(text); }
    }
  }
  if (totalTextItems === 0) return { pages: pdf.numPages, rows: [], conditions: [], scanned: true };
  return { pages: pdf.numPages, rows, conditions: [...new Set(conditions)], scanned: false };
}
