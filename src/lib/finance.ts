import type { FinanceConfig } from '@/lib/storage';

export type FinanceResult = { entry: number; principal: number; periodicRate: number; basePayment: number; insuranceInitial: number; taxInitial: number; periodicCharge: number; payment: number; totalInterest: number; totalCharges: number; totalPayments: number; totalPaid: number; schedule: { number: number; opening: number; interest: number; principal: number; charges: number; payment: number; closing: number }[]; warnings: string[] };

export function calculateFinance(price: number, config: FinanceConfig, entryPercent = config.entryPercent, term = config.term): FinanceResult {
  const entry = Math.max(0, price * entryPercent / 100);
  const principal = Math.max(0, price - entry);
  const periodicRate = config.ratePeriod === 'Anual' ? Math.pow(1 + config.annualRate / 100, 1 / 12) - 1 : config.annualRate / 100;
  const insuranceBase = config.insuranceMode === 'Porcentaje' ? principal * config.insuranceValue / 100 : config.insuranceValue;
  const taxBase = config.taxBase === 'Precio' ? price : principal;
  const taxValue = config.taxMode === 'Porcentaje' ? taxBase * config.taxValue / 100 : config.taxValue;
  const insuranceInitial = config.insuranceApplication === 'Único' ? insuranceBase : 0;
  const taxInitial = config.taxApplication === 'Inicial' ? taxValue : config.taxApplication === 'Capitalizado' ? 0 : 0;
  const periodicCharge = (config.insuranceApplication === 'Por cuota' ? insuranceBase : 0) + (config.taxApplication === 'Por cuota' ? taxValue : 0);
  const capitalized = (config.insuranceApplication === 'Capitalizado' ? insuranceBase : 0) + (config.taxApplication === 'Capitalizado' ? taxValue : 0);
  const adjustedPrincipal = principal + capitalized;
  const adjustedPayment = adjustedPrincipal === 0 ? 0 : periodicRate > 0 ? adjustedPrincipal * periodicRate / (1 - Math.pow(1 + periodicRate, -term)) : adjustedPrincipal / term;
  let balance = adjustedPrincipal;
  const schedule = [];
  let totalInterest = 0;
  const totalCharges = insuranceInitial + taxInitial + periodicCharge * term;
  for (let i = 1; i <= term; i += 1) {
    const interest = balance * periodicRate;
    const principalPart = i === term ? balance : Math.min(balance, adjustedPayment - interest);
    const payment = principalPart + interest + periodicCharge;
    const closing = Math.max(0, balance - principalPart);
    totalInterest += interest;
    schedule.push({ number: i, opening: balance, interest, principal: principalPart, charges: periodicCharge, payment, closing });
    balance = closing;
  }
  const totalPayments = schedule.reduce((sum, row) => sum + row.payment, 0) + insuranceInitial + taxInitial;
  return { entry, principal, periodicRate, basePayment: adjustedPayment, insuranceInitial, taxInitial, periodicCharge, payment: adjustedPayment + periodicCharge, totalInterest, totalCharges, totalPayments, totalPaid: entry + totalPayments, schedule, warnings: ['Simulación referencial. Los valores finales dependen de la entidad financiera, cargos aplicables y aprobación del crédito.'] };
}
