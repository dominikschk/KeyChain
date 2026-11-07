/**
 * Validierung für Partner-Formulare (Client + gleiche Regeln serverseitig in SQL/RPC).
 */

export type FieldError = { field: string; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length > 3 && v.length <= 320 && EMAIL_RE.test(v) && !/\s/.test(v);
}

export function validatePartnerRegistration(input: {
  name: string;
  email: string;
  password: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  ageAcknowledged: boolean;
  marketingOptIn: boolean;
}): FieldError[] {
  const errors: FieldError[] = [];
  const name = input.name.trim();
  if (name.length < 2) errors.push({ field: 'name', message: 'Bitte einen Namen angeben.' });
  if (name.length > 120) errors.push({ field: 'name', message: 'Name ist zu lang.' });
  if (!isValidEmail(input.email)) {
    errors.push({ field: 'email', message: 'Bitte eine gültige E-Mail-Adresse angeben.' });
  }
  if (input.password.length < 8) {
    errors.push({ field: 'password', message: 'Passwort mindestens 8 Zeichen.' });
  }
  if (input.password.length > 128) {
    errors.push({ field: 'password', message: 'Passwort ist zu lang.' });
  }
  if (!input.termsAccepted) {
    errors.push({ field: 'terms', message: 'Bitte die Partnerbedingungen bestätigen.' });
  }
  if (!input.privacyAccepted) {
    errors.push({ field: 'privacy', message: 'Bitte den Datenschutzhinweis bestätigen.' });
  }
  if (!input.ageAcknowledged) {
    errors.push({
      field: 'age',
      message: 'Bitte den Hinweis zu Alter und Zustimmung bestätigen.',
    });
  }
  // marketingOptIn darf false sein – kein Fehler
  void input.marketingOptIn;
  return errors;
}

export function validateLeadInput(input: {
  companyName: string;
  contactName?: string;
  businessEmail?: string;
  businessPhone?: string;
  source: string;
  estimatedQty?: number | null;
  note?: string;
  consentBasis: string;
}): FieldError[] {
  const errors: FieldError[] = [];
  const company = input.companyName.trim();
  if (company.length < 2) {
    errors.push({ field: 'companyName', message: 'Bitte den Firmennamen angeben.' });
  }
  if (company.length > 200) {
    errors.push({ field: 'companyName', message: 'Firmenname ist zu lang.' });
  }
  if (!input.source.trim()) {
    errors.push({ field: 'source', message: 'Bitte die Kontaktquelle angeben.' });
  }
  if (!input.consentBasis.trim()) {
    errors.push({
      field: 'consentBasis',
      message: 'Bitte angeben, auf welcher Grundlage die Daten erfasst werden.',
    });
  }
  if (input.businessEmail?.trim() && !isValidEmail(input.businessEmail)) {
    errors.push({ field: 'businessEmail', message: 'Geschäftliche E-Mail ungültig.' });
  }
  if (input.contactName && input.contactName.length > 120) {
    errors.push({ field: 'contactName', message: 'Name der Ansprechperson ist zu lang.' });
  }
  if (input.note && input.note.length > 2000) {
    errors.push({ field: 'note', message: 'Notiz ist zu lang.' });
  }
  if (
    input.estimatedQty != null &&
    (!Number.isFinite(input.estimatedQty) || input.estimatedQty < 0 || input.estimatedQty > 1000000)
  ) {
    errors.push({ field: 'estimatedQty', message: 'Stückzahl ungültig.' });
  }
  return errors;
}

export function validateSetupCall(input: {
  name: string;
  email: string;
  preferredSlot: string;
  isMinor: boolean;
  guardianConsent: boolean;
}): FieldError[] {
  const errors: FieldError[] = [];
  if (input.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Bitte einen Namen angeben.' });
  }
  if (!isValidEmail(input.email)) {
    errors.push({ field: 'email', message: 'Bitte eine gültige E-Mail angeben.' });
  }
  if (input.preferredSlot.trim().length < 3) {
    errors.push({ field: 'preferredSlot', message: 'Bitte einen Terminwunsch angeben.' });
  }
  if (input.isMinor && !input.guardianConsent) {
    errors.push({
      field: 'guardianConsent',
      message: 'Bei Minderjährigen ist die Zustimmung der Erziehungsberechtigten nötig.',
    });
  }
  return errors;
}
