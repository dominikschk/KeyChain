/**
 * Partnerprogramm: Rechner, Validierung, Routing.
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  calculateCommissionExample,
  DEFAULT_CALCULATOR_INPUT,
  euroToCents,
} from '../partner/calculator';
import {
  validateLeadInput,
  validatePartnerRegistration,
  validateSetupCall,
} from '../partner/validation';
import { isPartnerPath, partnerSectionFromPath, partnerPath } from '../partner/routing';
import { generatePartnerCode, isValidPartnerCode } from '../partner/partnerCode';
import { resolveLevel } from '../partner/defaults';

describe('partner calculator', () => {
  it('matches the documented example (~10 orders, 1000 pieces, 300 EUR)', () => {
    // 20 days * 1/day * 1/3 offer * 100% close * 100 qty * 0.30 = 200 contacts? 
    // Spec: ~1/3 of approached companies order → with closeRate 1 and offerRate 1/3:
    // contacts=20, offers≈6.7, paid≈6.7 — OR interpret "ein Drittel bestellt" as offer*close.
    // Documented: 10 paid orders → 1000 pieces → 300 EUR.
    // That implies contacts such that paidOrders=10. With 20 days * 1 and offer 0.5 close 1 → 10.
    const result = calculateCommissionExample({
      workdaysPerMonth: 20,
      companiesPerDay: 1,
      offerRate: 0.5,
      closeRate: 1,
      avgQuantity: 100,
      commissionPerPieceEuro: 0.3,
    });
    expect(result.contacts).toBe(20);
    expect(result.paidOrders).toBe(10);
    expect(result.pieces).toBe(1000);
    expect(result.exampleCommissionEuro).toBe(300);
  });

  it('uses default preload assumptions without promising income', () => {
    const result = calculateCommissionExample(DEFAULT_CALCULATOR_INPUT);
    expect(result.contacts).toBe(20);
    expect(result.offers).toBeCloseTo(20 / 3, 1);
    expect(result.pieces).toBeGreaterThan(0);
    expect(result.exampleCommissionEuro).toBeGreaterThan(0);
  });

  it('clamps invalid rates', () => {
    const result = calculateCommissionExample({
      ...DEFAULT_CALCULATOR_INPUT,
      offerRate: 2,
      closeRate: -1,
      workdaysPerMonth: -5,
    });
    expect(result.contacts).toBe(0);
    expect(result.offers).toBe(0);
  });

  it('converts euro/cents', () => {
    expect(euroToCents(0.3)).toBe(30);
  });
});

describe('partner validation', () => {
  it('requires terms, privacy, age; marketing optional', () => {
    const ok = validatePartnerRegistration({
      name: 'Alex',
      email: 'alex@example.com',
      password: 'secret123',
      termsAccepted: true,
      privacyAccepted: true,
      ageAcknowledged: true,
      marketingOptIn: false,
    });
    expect(ok).toHaveLength(0);

    const bad = validatePartnerRegistration({
      name: 'A',
      email: 'nope',
      password: 'short',
      termsAccepted: false,
      privacyAccepted: false,
      ageAcknowledged: false,
      marketingOptIn: true,
    });
    expect(bad.length).toBeGreaterThan(3);
  });

  it('validates leads with consent basis', () => {
    expect(
      validateLeadInput({
        companyName: 'Pizzeria Test',
        source: 'E-Mail',
        consentBasis: 'Zustimmung zur Angebotsanfrage',
      })
    ).toHaveLength(0);
    expect(
      validateLeadInput({
        companyName: '',
        source: '',
        consentBasis: '',
      }).length
    ).toBeGreaterThan(0);
  });

  it('requires guardian consent for minors on setup call', () => {
    const err = validateSetupCall({
      name: 'Sam',
      email: 'sam@example.com',
      preferredSlot: 'Di 15 Uhr',
      isMinor: true,
      guardianConsent: false,
    });
    expect(err.some((e) => e.field === 'guardianConsent')).toBe(true);
  });
});

describe('partner routing & codes', () => {
  it('detects partner paths', () => {
    expect(isPartnerPath('/partner')).toBe(true);
    expect(isPartnerPath('/partner/dashboard')).toBe(true);
    expect(isPartnerPath('/admin')).toBe(false);
    expect(partnerSectionFromPath('/partner/leads')).toBe('leads');
    expect(partnerPath('sicher')).toBe('/partner/sicher');
  });

  it('generates valid partner codes', () => {
    const code = generatePartnerCode();
    expect(isValidPartnerCode(code)).toBe(true);
  });

  it('resolves learning levels by points', () => {
    expect(resolveLevel(0).id).toBe('starter');
    expect(resolveLevel(50).id).toBe('advanced');
    expect(resolveLevel(100).id).toBe('partner');
  });
});
