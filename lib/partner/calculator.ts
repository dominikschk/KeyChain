/**
 * Beispielrechner für Partner-Provisionen.
 * Ergebnis ist immer eine Modellrechnung – keine Prognose.
 */
import type { CommissionCalculatorInput, CommissionCalculatorResult } from './types';

export const DEFAULT_CALCULATOR_INPUT: CommissionCalculatorInput = {
  workdaysPerMonth: 20,
  companiesPerDay: 1,
  /** ca. 1/3 der Angesprochenen → Angebot (Annahme im Beispiel) */
  offerRate: 1 / 3,
  /** im Demo-Beispiel: Angebote führen zu Bestellung (vereinfachte Annahme) */
  closeRate: 1,
  avgQuantity: 100,
  commissionPerPieceEuro: 0.3,
};

export function clampRate(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function clampNonNeg(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function calculateCommissionExample(
  input: CommissionCalculatorInput
): CommissionCalculatorResult {
  const workdays = clampNonNeg(input.workdaysPerMonth);
  const perDay = clampNonNeg(input.companiesPerDay);
  const offerRate = clampRate(input.offerRate);
  const closeRate = clampRate(input.closeRate);
  const avgQty = clampNonNeg(input.avgQuantity);
  const perPiece = clampNonNeg(input.commissionPerPieceEuro);

  const contacts = workdays * perDay;
  const offers = contacts * offerRate;
  const paidOrders = offers * closeRate;
  const pieces = paidOrders * avgQty;
  const exampleCommissionEuro = pieces * perPiece;

  return {
    contacts: round1(contacts),
    offers: round1(offers),
    paidOrders: round1(paidOrders),
    pieces: Math.round(pieces),
    exampleCommissionEuro: Math.round(exampleCommissionEuro * 100) / 100,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Formatierung EUR für DE-Anzeige. */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function centsToEuro(cents: number): number {
  return Math.round(cents) / 100;
}

export function euroToCents(euro: number): number {
  return Math.round(euro * 100);
}
