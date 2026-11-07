/**
 * Admin-Panel für das Partnerprogramm (nur bei is_admin Session).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  adminListLeads,
  adminListPartners,
  adminListSetupCalls,
  adminSetLeadStatus,
  adminUpdateSetupCall,
  getEmailLogsLocal,
  getProgramConfig,
  saveProgramConfig,
} from '../../lib/partner/api';
import { readPartnerStore } from '../../lib/partner/localStore';
import { PARTNER_EMAIL_TEMPLATES, isPartnerEmailServiceConfigured } from '../../lib/partner/email';
import { formatEuro, centsToEuro } from '../../lib/partner/calculator';
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '../../lib/partner/types';
import type {
  PartnerLead,
  PartnerProfile,
  PartnerProgramConfig,
  SetupCallRequest,
} from '../../lib/partner/types';
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput, TextTextarea } from './shared';

type Tab =
  | 'overview'
  | 'partners'
  | 'leads'
  | 'config'
  | 'calls'
  | 'email'
  | 'materials';

export function PartnerAdminPanel() {
  const [tab, setTab] = useState<Tab>('overview');
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [calls, setCalls] = useState<SetupCallRequest[]>([]);
  const [config, setConfig] = useState<PartnerProgramConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [p, l, c, cfg] = await Promise.all([
        adminListPartners(),
        adminListLeads(),
        adminListSetupCalls(),
        getProgramConfig(),
      ]);
      setPartners(p);
      setLeads(l);
      setCalls(c);
      setConfig({
        ...cfg,
        emailConfigured: cfg.emailConfigured || isPartnerEmailServiceConfigured(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filteredPartners = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return partners;
    return partners.filter(
      (p) =>
        p.email.toLowerCase().includes(s) ||
        p.displayName.toLowerCase().includes(s) ||
        p.partnerCode.toLowerCase().includes(s)
    );
  }, [partners, q]);

  const pagedPartners = filteredPartners.slice(page * pageSize, page * pageSize + pageSize);

  const pilotStats = useMemo(() => {
    const paid = leads.filter((l) => l.status === 'paid').length;
    const openCalls = calls.filter((c) => c.status === 'open').length;
    const deletions = partners.filter((p) => p.deletionRequestedAt).length;
    return {
      partners: partners.length,
      leads: leads.length,
      paid,
      openCalls,
      deletions,
    };
  }, [partners, leads, calls]);

  const saveConfig = async () => {
    if (!config) return;
    if (!window.confirm('Programm-Konfiguration speichern?')) return;
    setSaving(true);
    setMessage(null);
    try {
      const next = await saveProgramConfig(config);
      setConfig(next);
      setMessage('Konfiguration gespeichert.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-petrol" size={24} aria-label="Laden" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Pilot' },
    { id: 'partners', label: 'Partner' },
    { id: 'leads', label: 'Leads' },
    { id: 'config', label: 'Preise & Regeln' },
    { id: 'calls', label: 'Setup-Calls' },
    { id: 'email', label: 'E-Mail' },
    { id: 'materials', label: 'Material' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold ${
              tab === t.id ? 'bg-navy text-white' : 'bg-white border border-zinc-200 text-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {message}
        </p>
      )}

      {tab === 'overview' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Partner', value: pilotStats.partners },
            { label: 'Leads', value: pilotStats.leads },
            { label: 'Bezahlt', value: pilotStats.paid },
            { label: 'Offene Calls', value: pilotStats.openCalls },
            { label: 'Löschanfragen', value: pilotStats.deletions },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {c.label}
              </p>
              <p className="font-headline font-extrabold text-xl mt-1">{c.value}</p>
              <p className="text-[10px] text-zinc-400 mt-1">Nur gespeicherte Daten</p>
            </div>
          ))}
          <p className="sm:col-span-2 lg:col-span-5 text-xs text-zinc-500">{config.pilotNote}</p>
        </div>
      )}

      {tab === 'partners' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <TextInput
              className="pl-9"
              placeholder="Suche Name, E-Mail, Code…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              aria-label="Partner suchen"
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Alter / Einwilligung</th>
                  <th className="p-3">Punkte</th>
                  <th className="p-3">Marketing</th>
                </tr>
              </thead>
              <tbody>
                {pagedPartners.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-100">
                    <td className="p-3">
                      <div className="font-semibold">{p.displayName}</div>
                      <div className="text-xs text-zinc-500">{p.email}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">{p.partnerCode}</td>
                    <td className="p-3">{p.status}</td>
                    <td className="p-3 text-xs">
                      {p.isMinor ? 'Minderjährig' : 'Volljährig'}
                      {p.isMinor && (
                        <span className="block">
                          Erziehungsberechtigte: {p.guardianConsentConfirmed ? 'ja' : 'offen'}
                        </span>
                      )}
                      {p.deletionRequestedAt && (
                        <span className="block text-amber-800 font-semibold">Löschanfrage</span>
                      )}
                    </td>
                    <td className="p-3">
                      {p.points} · {p.levelId}
                    </td>
                    <td className="p-3">{p.marketingEmailOptIn ? 'ja' : 'nein'}</td>
                  </tr>
                ))}
                {pagedPartners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-zinc-500">
                      Keine Partner gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 items-center">
            <SecondaryButton disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Zurück
            </SecondaryButton>
            <span className="text-xs text-zinc-500">
              Seite {page + 1} / {Math.max(1, Math.ceil(filteredPartners.length / pageSize))}
            </span>
            <SecondaryButton
              disabled={(page + 1) * pageSize >= filteredPartners.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Weiter
            </SecondaryButton>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="space-y-3">
          {leads.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Leads.</p>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-wrap gap-3 justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-sm">{lead.companyName}</p>
                  <p className="text-xs text-zinc-500">
                    Partner {lead.partnerId.slice(0, 8)}… · {lead.source}
                  </p>
                </div>
                <label className="text-xs font-semibold text-zinc-500">
                  Status
                  <select
                    className="ml-2 rounded-lg border border-zinc-200 px-2 py-1 text-navy"
                    value={lead.status}
                    onChange={async (e) => {
                      const status = e.target.value as PartnerLead['status'];
                      if (!window.confirm(`Status auf „${LEAD_STATUS_LABELS[status]}“ setzen?`)) {
                        return;
                      }
                      const updated = await adminSetLeadStatus(lead.id, status);
                      if (updated) {
                        setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
                      }
                    }}
                  >
                    {LEAD_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {LEAD_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'config' && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="ex-cents">Beispielprovision je Stück (Cent)</FieldLabel>
              <TextInput
                id="ex-cents"
                type="number"
                value={config.exampleCommissionPerPieceCents}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    exampleCommissionPerPieceCents: Number(e.target.value),
                  })
                }
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Öffentlich als Beispielwert: {formatEuro(centsToEuro(config.exampleCommissionPerPieceCents))}
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="conf-cents">Bestätigter Satz (Cent, leer = keiner)</FieldLabel>
              <TextInput
                id="conf-cents"
                type="number"
                value={config.confirmedCommissionPerPieceCents ?? ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    confirmedCommissionPerPieceCents: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="conf-label">Label ohne bestätigten Satz</FieldLabel>
            <TextInput
              id="conf-label"
              value={config.confirmedCommissionLabel}
              onChange={(e) => setConfig({ ...config, confirmedCommissionLabel: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="price-tiers">Preis- / Mengenstaffeln (Text)</FieldLabel>
            <TextTextarea
              id="price-tiers"
              value={config.priceTiersText}
              onChange={(e) => setConfig({ ...config, priceTiersText: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="ship">Versandhinweis</FieldLabel>
            <TextInput
              id="ship"
              value={config.shippingNote}
              onChange={(e) => setConfig({ ...config, shippingNote: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="brand">Brandingkosten</FieldLabel>
            <TextInput
              id="brand"
              value={config.brandingCostNote}
              onChange={(e) => setConfig({ ...config, brandingCostNote: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="terms">Partnerbedingungen (Markdown/Text)</FieldLabel>
            <TextTextarea
              id="terms"
              className="min-h-[160px]"
              value={config.termsMarkdown}
              onChange={(e) => setConfig({ ...config, termsMarkdown: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="payout">Zuordnung / Auszahlung</FieldLabel>
            <TextTextarea
              id="payout"
              className="min-h-[120px]"
              value={config.payoutRulesMarkdown}
              onChange={(e) => setConfig({ ...config, payoutRulesMarkdown: e.target.value })}
            />
          </div>
          <PrimaryButton disabled={saving} onClick={saveConfig}>
            {saving ? 'Speichern…' : 'Konfiguration speichern'}
          </PrimaryButton>
        </div>
      )}

      {tab === 'calls' && (
        <div className="space-y-3">
          {calls.length === 0 ? (
            <p className="text-sm text-zinc-500">Keine Terminwünsche.</p>
          ) : (
            calls.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.email}</p>
                    <p className="text-sm mt-1">Wunsch: {c.preferredSlot}</p>
                    {c.isMinor && (
                      <p className="text-xs text-amber-800">
                        Minderjährig · Zustimmung: {c.guardianConsent ? 'ja' : 'nein'}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-petrol">
                    {c.status}
                  </span>
                </div>
                {c.status === 'open' && (
                  <div className="flex flex-wrap gap-2">
                    <PrimaryButton
                      onClick={async () => {
                        if (!window.confirm('Termin als bestätigt markieren?')) return;
                        await adminUpdateSetupCall(c.id, 'confirmed');
                        await reload();
                      }}
                    >
                      Bestätigen
                    </PrimaryButton>
                    <SecondaryButton
                      onClick={async () => {
                        if (!window.confirm('Terminwunsch ablehnen?')) return;
                        await adminUpdateSetupCall(c.id, 'declined');
                        await reload();
                      }}
                    >
                      Ablehnen
                    </SecondaryButton>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'email' && (
        <div className="space-y-4">
          {!config.emailConfigured ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Kein Maildienst konfiguriert. Edge Function <code>partner-email</code> deployen,
              Secrets <code>RESEND_API_KEY</code> / <code>FROM_EMAIL</code> setzen und{' '}
              <code>VITE_PARTNER_EMAIL_CONFIGURED=1</code> aktivieren. Bis dahin werden Mails als
              „skipped“ protokolliert.
            </div>
          ) : (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              Maildienst als konfiguriert gemeldet.
            </p>
          )}
          <ul className="space-y-2">
            {Object.entries(PARTNER_EMAIL_TEMPLATES).map(([key, meta]) => (
              <li key={key} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                <p className="font-semibold">{meta.title}</p>
                <p className="text-xs text-zinc-500">
                  {meta.kind} · {meta.description}
                </p>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="font-semibold text-sm mb-2">Demo-E-Mail-Protokoll</h3>
            <ul className="text-xs space-y-1 text-zinc-600">
              {getEmailLogsLocal().slice(0, 20).map((log) => (
                <li key={log.id}>
                  {log.createdAt.slice(0, 19)} · {log.templateKey} · {log.status} · {log.toEmail}
                </li>
              ))}
              {getEmailLogsLocal().length === 0 && <li>Keine Einträge.</li>}
            </ul>
          </div>
        </div>
      )}

      {tab === 'materials' && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-600">
            Materialien in der Demo-Tabelle bzw. in <code>partner_materials</code> pflegen. URLs
            setzen und <code>available=true</code>.
          </p>
          <ul className="space-y-2">
            {readPartnerStore().materials.map((m) => (
              <li key={m.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm flex justify-between gap-2">
                <span>
                  {m.title}
                  <span className="block text-xs text-zinc-500">{m.category}</span>
                </span>
                <span className="text-xs font-semibold">
                  {m.available ? 'verfügbar' : 'fehlt'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
