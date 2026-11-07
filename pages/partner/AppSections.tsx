/**
 * Partner-App: Auth, Onboarding, Dashboard, Leads, Settings …
 */
import React, { useEffect, useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import {
  DemoBanner,
  EmptyState,
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  StatusBadge,
  TextInput,
  TextTextarea,
} from '../../components/partner/shared';
import { formatEuro, centsToEuro } from '../../lib/partner/calculator';
import { DEFAULT_LEARNING_LEVELS, resolveLevel, SCRIPT_EXAMPLES } from '../../lib/partner/defaults';
import {
  completeModule,
  createLead,
  createSetupCall,
  getCompletedModuleIds,
  getDashboardStats,
  listMaterials,
  listModules,
  listMyLeads,
  loginPartner,
  registerPartner,
  updatePartnerProfile,
} from '../../lib/partner/api';
import { queuePartnerEmail } from '../../lib/partner/email';
import { buildPartnerReferralUrl } from '../../lib/partner/partnerCode';
import { navigatePartner } from '../../lib/partner/routing';
import {
  validateLeadInput,
  validatePartnerRegistration,
  validateSetupCall,
} from '../../lib/partner/validation';
import type {
  DownloadMaterial,
  LearningModule,
  PartnerLead,
  PartnerProfile,
  PartnerProgramConfig,
} from '../../lib/partner/types';
import { openLegalLink } from '../../lib/legalCompany';

type AuthProps = {
  mode: 'register' | 'login';
  onAuthed: (p: PartnerProfile) => void;
};

export function PartnerAuth({ mode, onAuthed }: AuthProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [ageAck, setAgeAck] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [marketing, setMarketing] = useState(false); // never preselected
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      if (mode === 'register') {
        const fieldErrors = validatePartnerRegistration({
          name,
          email,
          password,
          termsAccepted: terms,
          privacyAccepted: privacy,
          ageAcknowledged: ageAck,
          marketingOptIn: marketing,
        });
        if (isMinor && !guardian) {
          fieldErrors.push({
            field: 'guardian',
            message: 'Zustimmung der Erziehungsberechtigten fehlt.',
          });
        }
        if (fieldErrors.length) {
          setErrors(fieldErrors.map((f) => f.message));
          return;
        }
        const res = await registerPartner({
          name,
          email,
          password,
          marketingOptIn: marketing,
          isMinor,
          guardianConsent: guardian,
        });
        if (res.error || !res.partner) {
          setErrors([res.error || 'Registrierung fehlgeschlagen.']);
          return;
        }
        await queuePartnerEmail({
          templateKey: 'welcome',
          toEmail: email,
          partnerId: res.partner.id,
          marketingConsentGranted: marketing,
        });
        onAuthed(res.partner);
        navigatePartner('onboarding');
      } else {
        const res = await loginPartner(email, password);
        if (res.error || !res.partner) {
          setErrors([res.error || 'Anmeldung fehlgeschlagen.']);
          return;
        }
        onAuthed(res.partner);
        navigatePartner('dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <div className="w-14 h-14 rounded-xl bg-navy/10 flex items-center justify-center mx-auto">
          <span className="font-headline font-extrabold text-xl text-navy">N</span>
        </div>
        <h1 className="font-headline font-extrabold text-lg uppercase tracking-tight">
          {mode === 'register' ? 'Als Partner registrieren' : 'Partner anmelden'}
        </h1>
        <p className="text-sm text-zinc-500">
          {mode === 'register'
            ? 'Nur notwendige Angaben. Marketing-Mails sind optional und nicht vorausgewählt.'
            : 'Mit E-Mail und Passwort anmelden.'}
        </p>
      </header>

      <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-sm">
        {mode === 'register' && (
          <div>
            <FieldLabel htmlFor="reg-name">Name</FieldLabel>
            <TextInput
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
        )}
        <div>
          <FieldLabel htmlFor="reg-email">E-Mail</FieldLabel>
          <TextInput
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="reg-password">Passwort</FieldLabel>
          <TextInput
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            minLength={8}
          />
        </div>

        {mode === 'register' && (
          <div className="space-y-3 text-sm">
            <label className="flex gap-2 items-start">
              <input
                type="checkbox"
                checked={ageAck}
                onChange={(e) => setAgeAck(e.target.checked)}
                className="mt-1"
              />
              <span>
                Ich habe den Hinweis gelesen: Minderjährige nur nach Prüfung und mit Zustimmung der
                Erziehungsberechtigten.
              </span>
            </label>
            <label className="flex gap-2 items-start">
              <input
                type="checkbox"
                checked={isMinor}
                onChange={(e) => setIsMinor(e.target.checked)}
                className="mt-1"
              />
              <span>Ich bin unter 18 Jahre alt.</span>
            </label>
            {isMinor && (
              <label className="flex gap-2 items-start">
                <input
                  type="checkbox"
                  checked={guardian}
                  onChange={(e) => setGuardian(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Die erforderliche Zustimmung der Erziehungsberechtigten liegt vor bzw. wird
                  eingeholt, bevor ich aktiv vermittle.
                </span>
              </label>
            )}
            <label className="flex gap-2 items-start">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-1"
              />
              <span>
                Ich habe die{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => navigatePartner('bedingungen')}
                >
                  Partnerbedingungen
                </button>{' '}
                gelesen.
              </span>
            </label>
            <label className="flex gap-2 items-start">
              <input
                type="checkbox"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
                className="mt-1"
              />
              <span>
                Ich habe die{' '}
                <button type="button" className="underline" onClick={() => openLegalLink('datenschutz')}>
                  Datenschutzhinweise
                </button>{' '}
                gelesen.
              </span>
            </label>
            <label className="flex gap-2 items-start">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1"
              />
              <span>
                Optional: Ich möchte Marketing-E-Mails zum Partnerprogramm erhalten (jederzeit
                widerrufbar). Ablehnung verhindert den Zugang nicht.
              </span>
            </label>
          </div>
        )}

        {errors.length > 0 && (
          <ul className="text-sm text-red-600 space-y-1" role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <PrimaryButton type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Bitte warten…
            </>
          ) : mode === 'register' ? (
            'Konto erstellen'
          ) : (
            'Anmelden'
          )}
        </PrimaryButton>
      </form>

      <p className="text-center text-sm text-zinc-500">
        {mode === 'register' ? (
          <>
            Schon Konto?{' '}
            <button type="button" className="underline font-semibold" onClick={() => navigatePartner('anmelden')}>
              Anmelden
            </button>
          </>
        ) : (
          <>
            Neu hier?{' '}
            <button
              type="button"
              className="underline font-semibold"
              onClick={() => navigatePartner('registrierung')}
            >
              Registrieren
            </button>
          </>
        )}
      </p>
    </div>
  );
}

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Willkommen', moduleId: null as string | null },
  { id: 'demo', title: 'Produktdemo', moduleId: 'mod-demo' },
  { id: 'script', title: 'Gesprächsleitfaden', moduleId: 'mod-scripts' },
  { id: 'materials', title: 'Materialien', moduleId: 'mod-materials' },
  { id: 'safety', title: 'Sicher & fair', moduleId: 'mod-safety' },
  { id: 'call', title: 'Setup-Call', moduleId: 'mod-setup-call' },
  { id: 'lead', title: 'Ersten Lead', moduleId: 'mod-first-lead' },
];

export function PartnerOnboarding({
  partner,
  onPartnerUpdate,
}: {
  partner: PartnerProfile;
  onPartnerUpdate: (p: PartnerProfile) => void;
}) {
  const step = partner.onboardingStep;
  const current = ONBOARDING_STEPS[Math.min(step, ONBOARDING_STEPS.length - 1)]!;

  const advance = async () => {
    if (current.moduleId) {
      const updated = await completeModule(partner.id, current.moduleId);
      if (updated) onPartnerUpdate(updated);
    }
    const nextStep = Math.min(step + 1, ONBOARDING_STEPS.length);
    const updated = await updatePartnerProfile(partner.id, { onboardingStep: nextStep });
    if (updated) onPartnerUpdate(updated);
    if (nextStep >= ONBOARDING_STEPS.length) navigatePartner('dashboard');
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">Onboarding</p>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          Hallo {partner.displayName}
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          In Ruhe durchgehen – ohne Druck. Fortschritt: {Math.min(step + 1, ONBOARDING_STEPS.length)} /{' '}
          {ONBOARDING_STEPS.length}
        </p>
      </header>

      <div className="flex gap-1">
        {ONBOARDING_STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-petrol' : 'bg-zinc-200'}`}
            aria-hidden
          />
        ))}
      </div>

      <SectionCard title={current.title}>
        {current.id === 'welcome' && (
          <p className="text-sm text-zinc-600">
            Du vermittelst NFC-Anhänger an passende Unternehmen. Als Nächstes: Demo, Leitfaden,
            Sicherheitsregeln, optional Setup-Call, dann erster Lead.
          </p>
        )}
        {current.id === 'demo' && (
          <p className="text-sm text-zinc-600">
            Sieh dir die Demo auf der Produktseite an (Antippen → Beispielseite).{' '}
            <button type="button" className="underline" onClick={() => navigatePartner('produkt')}>
              Zur Demo
            </button>
          </p>
        )}
        {current.id === 'script' && (
          <blockquote className="text-sm border-l-2 border-petrol/40 pl-3 text-zinc-700">
            „{SCRIPT_EXAMPLES.pizza.opener}“
          </blockquote>
        )}
        {current.id === 'materials' && (
          <p className="text-sm text-zinc-600">
            Im Materialbereich findest du Platzhalter und verfügbare Dateien.{' '}
            <button type="button" className="underline" onClick={() => navigatePartner('material')}>
              Materialien öffnen
            </button>
          </p>
        )}
        {current.id === 'safety' && (
          <p className="text-sm text-zinc-600">
            Bitte die Regeln unter „Sicher und fair verkaufen“ lesen.{' '}
            <button type="button" className="underline" onClick={() => navigatePartner('sicher')}>
              Regeln öffnen
            </button>
          </p>
        )}
        {current.id === 'call' && (
          <p className="text-sm text-zinc-600">
            Optional: Terminwunsch für einen Setup-Call stellen (noch nicht gebucht, bis bestätigt).{' '}
            <button type="button" className="underline" onClick={() => navigatePartner('setup-call')}>
              Terminwunsch
            </button>
          </p>
        )}
        {current.id === 'lead' && (
          <p className="text-sm text-zinc-600">
            Wenn du einen Kontakt rechtmäßig erfasst hast, trage ihn unter Leads ein.{' '}
            <button type="button" className="underline" onClick={() => navigatePartner('leads')}>
              Zu den Leads
            </button>
          </p>
        )}
        <PrimaryButton onClick={advance} className="mt-2">
          {step >= ONBOARDING_STEPS.length - 1 ? 'Zum Dashboard' : 'Weiter'}
        </PrimaryButton>
      </SectionCard>
    </div>
  );
}

export function PartnerDashboard({
  partner,
  demo,
}: {
  partner: PartnerProfile;
  demo: boolean;
}) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = buildPartnerReferralUrl(origin, partner.partnerCode);

  useEffect(() => {
    getDashboardStats(partner.id).then(setStats);
  }, [partner.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const level = resolveLevel(partner.points, DEFAULT_LEARNING_LEVELS);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">Dashboard</p>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          Übersicht
        </h1>
      </header>
      {(demo || stats?.demo) && <DemoBanner />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Leads', value: stats?.leadsTotal ?? '—' },
          { label: 'Angebote angefragt', value: stats?.offersRequested ?? '—' },
          { label: 'Bezahlte Aufträge', value: stats?.paidOrders ?? '—' },
          {
            label: 'Bestätigte Provision',
            value: formatEuro(centsToEuro(stats?.confirmedCommissionCents ?? 0)),
          },
          {
            label: 'Noch nicht bestätigt',
            value: formatEuro(centsToEuro(stats?.pendingCommissionCents ?? 0)),
          },
          { label: `Punkte · ${level.title}`, value: String(partner.points) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {card.label}
            </p>
            <p className="font-headline font-extrabold text-xl text-navy mt-1">{card.value}</p>
            <p className="text-[11px] text-zinc-400 mt-1">Aus gespeicherten Partnerdaten</p>
          </div>
        ))}
      </div>

      <SectionCard title="Dein Partnercode">
        <p className="text-sm text-zinc-600">
          Ein Kontakt gilt als vermittelt, wenn du den Lead selbst mit Einwilligungsgrundlage
          einträgst oder der Kunde diesen Code angibt. Doppelte Zuordnungen prüft der Betreiber.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="px-3 py-2 rounded-xl bg-cream border border-zinc-200 text-sm font-semibold">
            {partner.partnerCode}
          </code>
          <SecondaryButton onClick={copy}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Kopiert' : 'Link kopieren'}
          </SecondaryButton>
        </div>
        <p className="text-xs text-zinc-500 break-all">{link}</p>
      </SectionCard>
    </div>
  );
}

export function PartnerLeads({
  partner,
  onPartnerUpdate,
}: {
  partner: PartnerProfile;
  onPartnerUpdate: (p: PartnerProfile) => void;
}) {
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [source, setSource] = useState('');
  const [estimatedQty, setEstimatedQty] = useState('');
  const [note, setNote] = useState('');
  const [consentBasis, setConsentBasis] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listMyLeads(partner.id).then(setLeads);
  }, [partner.id]);

  const reload = () => listMyLeads(partner.id).then(setLeads);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = estimatedQty.trim() ? Number(estimatedQty) : null;
    const fieldErrors = validateLeadInput({
      companyName,
      contactName,
      businessEmail,
      businessPhone,
      source,
      estimatedQty: qty,
      note,
      consentBasis,
    });
    if (fieldErrors.length) {
      setErrors(fieldErrors.map((f) => f.message));
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      await createLead(partner.id, {
        companyName,
        contactName,
        businessEmail,
        businessPhone,
        source,
        estimatedQty: qty,
        note,
        consentBasis,
      });
      await completeModule(partner.id, 'mod-first-lead');
      const refreshed = await updatePartnerProfile(partner.id, {});
      if (refreshed) onPartnerUpdate(refreshed);
      await queuePartnerEmail({
        templateKey: 'lead_submitted',
        toEmail: partner.email,
        partnerId: partner.id,
      });
      setCompanyName('');
      setContactName('');
      setBusinessEmail('');
      setBusinessPhone('');
      setSource('');
      setEstimatedQty('');
      setNote('');
      setConsentBasis('');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">Leads</h1>
        <p className="text-sm text-zinc-600">
          Nur geschäftliche Kontakte erfassen, die du rechtmäßig und für die Vermittlung nutzen
          darfst.
        </p>
      </header>

      <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="lead-company">Firma</FieldLabel>
            <TextInput id="lead-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div>
            <FieldLabel htmlFor="lead-contact">Ansprechperson (optional)</FieldLabel>
            <TextInput id="lead-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="lead-email">Geschäftliche E-Mail</FieldLabel>
            <TextInput id="lead-email" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="lead-phone">Geschäftliches Telefon</FieldLabel>
            <TextInput id="lead-phone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="lead-source">Kontaktquelle</FieldLabel>
            <TextInput id="lead-source" value={source} onChange={(e) => setSource(e.target.value)} required placeholder="z. B. E-Mail nach Terminvereinbarung" />
          </div>
          <div>
            <FieldLabel htmlFor="lead-qty">Geschätzte Stückzahl</FieldLabel>
            <TextInput id="lead-qty" type="number" min={0} value={estimatedQty} onChange={(e) => setEstimatedQty(e.target.value)} />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="lead-consent">Zustimmung / Grundlage der Erfassung</FieldLabel>
          <TextInput
            id="lead-consent"
            value={consentBasis}
            onChange={(e) => setConsentBasis(e.target.value)}
            required
            placeholder="z. B. mündliche Zustimmung zur Angebotsanfrage am …"
          />
        </div>
        <div>
          <FieldLabel htmlFor="lead-note">Notiz</FieldLabel>
          <TextTextarea id="lead-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {errors.length > 0 && (
          <ul className="text-sm text-red-600" role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Speichern…' : 'Lead einreichen'}
        </PrimaryButton>
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title="Noch keine Leads"
          text="Sobald du einen Kontakt rechtmäßig erfasst hast, erscheint er hier mit Status."
        />
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-navy">{lead.companyName}</h3>
                <StatusBadge status={lead.status} />
              </div>
              <p className="text-xs text-zinc-500">
                Quelle: {lead.source} · Aktivität:{' '}
                {new Date(lead.lastActivityAt).toLocaleDateString('de-DE')}
              </p>
              {lead.estimatedQty != null && (
                <p className="text-xs text-zinc-500">Ø Bedarf: {lead.estimatedQty} Stück</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PartnerOrders({ partner }: { partner: PartnerProfile }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  useEffect(() => {
    getDashboardStats(partner.id).then(setStats);
  }, [partner.id]);

  const empty = !stats || (stats.paidOrders === 0 && stats.confirmedCommissionCents === 0 && stats.pendingCommissionCents === 0);

  return (
    <div className="space-y-6">
      <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
        Bestellungen & Provision
      </h1>
      {stats?.demo && <DemoBanner />}
      {empty ? (
        <EmptyState
          title="Noch keine Bestellungen"
          text="Bezahlte Aufträge und bestätigte Provisionen erscheinen hier, sobald sie gespeichert und zugeordnet sind."
        />
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          <SectionCard title="Bezahlte Aufträge">
            <p className="text-2xl font-headline font-extrabold">{stats?.paidOrders}</p>
          </SectionCard>
          <SectionCard title="Bestätigt">
            <p className="text-2xl font-headline font-extrabold">
              {formatEuro(centsToEuro(stats?.confirmedCommissionCents ?? 0))}
            </p>
          </SectionCard>
          <SectionCard title="Offen">
            <p className="text-2xl font-headline font-extrabold">
              {formatEuro(centsToEuro(stats?.pendingCommissionCents ?? 0))}
            </p>
          </SectionCard>
        </div>
      )}
      <p className="text-sm text-zinc-600">
        Auszahlung, Rechnungsstellung und Storno-Regeln legt der Betreiber fest – siehe
        Partnerbedingungen.
      </p>
    </div>
  );
}

export function PartnerPoints({
  partner,
  onPartnerUpdate,
}: {
  partner: PartnerProfile;
  onPartnerUpdate: (p: PartnerProfile) => void;
}) {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    listModules().then(setModules);
    getCompletedModuleIds(partner.id).then(setDone);
  }, [partner.id]);

  const mark = async (moduleId: string) => {
    const updated = await completeModule(partner.id, moduleId);
    if (updated) onPartnerUpdate(updated);
    setDone(await getCompletedModuleIds(partner.id));
  };

  const level = resolveLevel(partner.points, DEFAULT_LEARNING_LEVELS);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
          Punkte & Lernfortschritt
        </h1>
        <p className="text-sm text-zinc-600">
          {partner.points} Punkte · Stufe {level.title}. Höhere Provision nur, wenn der Betreiber
          sie freigegeben hat
          {level.higherCommissionEnabled ? `: ${level.higherCommissionNote}` : ' (aktuell nicht der Fall).'}
        </p>
      </header>
      <SectionCard title="Was belohnt wird">
        <ul className="text-sm text-zinc-700 list-disc pl-5 space-y-1">
          <li>Produktschulung und Lernmodule</li>
          <li>Korrekt und zulässig eingereichte Leads</li>
          <li>Hilfreiche Rückmeldung zu Materialien</li>
          <li>Teilnahme an einem vereinbarten Beratungsgespräch</li>
        </ul>
        <p className="text-xs text-zinc-500 mt-2">
          Nicht belohnt: Spam, irreführende Aussagen, unangekündigte Besuche, doppelte/erfundene
          Leads, unnötige Personendaten, Druck.
        </p>
      </SectionCard>
      <ul className="space-y-3">
        {modules.map((m) => {
          const completed = done.includes(m.id);
          return (
            <li
              key={m.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-semibold text-sm">{m.title}</h3>
                <p className="text-xs text-zinc-500">{m.description} · {m.points} Punkte</p>
              </div>
              {completed ? (
                <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                  <Check size={14} /> Erledigt
                </span>
              ) : (
                <SecondaryButton onClick={() => mark(m.id)}>Als erledigt markieren</SecondaryButton>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PartnerMaterials({ partner }: { partner: PartnerProfile }) {
  const [items, setItems] = useState<DownloadMaterial[]>([]);
  useEffect(() => {
    listMaterials().then(setItems);
    completeModule(partner.id, 'mod-materials');
  }, [partner.id]);

  return (
    <div className="space-y-6">
      <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
        Downloadmaterialien
      </h1>
      <p className="text-sm text-zinc-600">
        Nicht verfügbare Dateien sind klar gekennzeichnet. Keine erfundenen PDFs oder Zertifikate.
      </p>
      <ul className="space-y-3">
        {items.map((m) => (
          <li key={m.id} className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">{m.category}</p>
              <h3 className="font-semibold text-sm">{m.title}</h3>
              <p className="text-xs text-zinc-500">{m.description}</p>
            </div>
            {m.available && m.url ? (
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center px-4 rounded-xl bg-navy text-white text-xs font-semibold"
              >
                Öffnen
              </a>
            ) : (
              <span className="text-xs font-semibold text-zinc-500 self-center">Noch nicht verfügbar</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PartnerSetupCall({ partner }: { partner: PartnerProfile | null }) {
  const [name, setName] = useState(partner?.displayName ?? '');
  const [email, setEmail] = useState(partner?.email ?? '');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [isMinor, setIsMinor] = useState(partner?.isMinor ?? false);
  const [guardian, setGuardian] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateSetupCall({
      name,
      email,
      preferredSlot: slot,
      isMinor,
      guardianConsent: guardian,
    });
    if (fieldErrors.length) {
      setErrors(fieldErrors.map((f) => f.message));
      return;
    }
    await createSetupCall({
      partnerId: partner?.id ?? null,
      name,
      email,
      preferredSlot: slot,
      note,
      isMinor,
      guardianConsent: guardian,
    });
    if (partner) await completeModule(partner.id, 'mod-setup-call');
    await queuePartnerEmail({
      templateKey: 'setup_call_reply',
      toEmail: email,
      partnerId: partner?.id,
    });
    setDone(true);
  };

  if (done) {
    return (
      <SectionCard title="Anfrage eingegangen">
        <p className="text-sm text-zinc-600">
          Dein Terminwunsch ist als <strong>offen</strong> gespeichert – noch nicht gebucht. Du
          erhältst eine Rückmeldung, sobald der Termin bestätigt oder abgelehnt wurde.
        </p>
        <SecondaryButton onClick={() => navigatePartner('dashboard')}>Zum Dashboard</SecondaryButton>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
        Setup-Call anfragen
      </h1>
      <p className="text-sm text-zinc-600">
        Ohne Kalenderintegration: Wunsch speichern, Empfang bestätigen, Freigabe im Admin. Ein
        Termin gilt erst nach Bestätigung als gebucht.
      </p>
      <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <div>
          <FieldLabel htmlFor="call-name">Name</FieldLabel>
          <TextInput id="call-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <FieldLabel htmlFor="call-email">E-Mail</FieldLabel>
          <TextInput id="call-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <FieldLabel htmlFor="call-slot">Terminwunsch</FieldLabel>
          <TextInput
            id="call-slot"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            required
            placeholder="z. B. Di 14–16 Uhr oder KW12 nachmittags"
          />
        </div>
        <div>
          <FieldLabel htmlFor="call-note">Notiz</FieldLabel>
          <TextTextarea id="call-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} />
          Ich bin minderjährig
        </label>
        {isMinor && (
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} />
            Zustimmung der Erziehungsberechtigten liegt vor
          </label>
        )}
        {errors.length > 0 && (
          <ul className="text-sm text-red-600" role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        <PrimaryButton type="submit">Terminwunsch senden</PrimaryButton>
      </form>
    </div>
  );
}

export function PartnerSettings({
  partner,
  onPartnerUpdate,
}: {
  partner: PartnerProfile;
  onPartnerUpdate: (p: PartnerProfile) => void;
}) {
  const [marketing, setMarketing] = useState(partner.marketingEmailOptIn);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const updated = await updatePartnerProfile(partner.id, { marketingEmailOptIn: marketing });
    if (updated) {
      onPartnerUpdate(updated);
      setSaved(true);
    }
  };

  const requestDeletion = async () => {
    if (!window.confirm('Kontolöschung anfragen? Der Admin bearbeitet die Anfrage.')) return;
    const updated = await updatePartnerProfile(partner.id, {
      deletionRequestedAt: new Date().toISOString(),
    });
    if (updated) onPartnerUpdate(updated);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
        Benachrichtigungen & Einwilligungen
      </h1>
      <SectionCard title="E-Mail">
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => {
              setMarketing(e.target.checked);
              setSaved(false);
            }}
          />
          Marketing-E-Mails zum Partnerprogramm (optional)
        </label>
        <p className="text-xs text-zinc-500">
          Transaktionale Nachrichten (z. B. Lead-Status) bleiben davon getrennt. Ablehnung sperrt
          den Zugang nicht.
        </p>
        <PrimaryButton onClick={save}>Speichern</PrimaryButton>
        {saved && <p className="text-xs text-emerald-700">Gespeichert.</p>}
      </SectionCard>
      <SectionCard title="Datenschutz & Kontolöschung">
        <p className="text-sm text-zinc-600">
          Du kannst die Löschung deines Partnerkontos anfragen. Wir speichern nur, was für die
          Vermittlung nötig ist.
        </p>
        {partner.deletionRequestedAt ? (
          <p className="text-sm font-semibold text-amber-900">
            Löschanfrage gestellt am{' '}
            {new Date(partner.deletionRequestedAt).toLocaleDateString('de-DE')}.
          </p>
        ) : (
          <SecondaryButton onClick={requestDeletion}>Kontolöschung anfragen</SecondaryButton>
        )}
        <button
          type="button"
          className="text-sm underline text-zinc-600"
          onClick={() => navigatePartner('datenschutz')}
        >
          Mehr zum Datenschutz
        </button>
      </SectionCard>
    </div>
  );
}

export function PartnerPrivacyPage({
  partner,
}: {
  partner: PartnerProfile | null;
  config: PartnerProgramConfig;
}) {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-headline font-extrabold text-2xl uppercase tracking-tight">
        Datenschutz & Kontolöschung
      </h1>
      <p className="text-sm text-zinc-600 leading-relaxed">
        Im Partnerbereich speichern wir Kontodaten, Einwilligungen, Leads (mit angegebenem Grund),
        Lernfortschritt, Terminwünsche und – falls vorhanden – Provisionsdaten. Keine unnötigen
        personenbezogenen Daten. Marketing nur mit Einwilligung und Abmeldemöglichkeit.
      </p>
      <p className="text-sm text-zinc-600">
        Allgemeine Shop-Datenschutzerklärung:{' '}
        <button type="button" className="underline" onClick={() => openLegalLink('datenschutz')}>
          Datenschutz öffnen
        </button>
      </p>
      {partner && (
        <SecondaryButton onClick={() => navigatePartner('einstellungen')}>
          Zu den Einstellungen
        </SecondaryButton>
      )}
    </div>
  );
}

export function PartnerConfirm({ message }: { message?: string }) {
  return (
    <SectionCard title="Bestätigt">
      <p className="text-sm text-zinc-600">
        {message || 'Deine Aktion wurde gespeichert.'}
      </p>
      <PrimaryButton onClick={() => navigatePartner('dashboard')}>Zum Dashboard</PrimaryButton>
    </SectionCard>
  );
}
