/**
 * Admin – Produktion: Queue, Print-QC, Filter, CSV-Export, STL/Print-Assets.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, ExternalLink, Loader2, Lock, LogOut, Copy, Check, Package, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getConfigsList, getPrintPngUrl } from '../lib/configApi';
import {
  getOrdersList,
  createOrder,
  updateOrderStatus,
  updateOrderPrintQc,
  getOrderStatusOptions,
} from '../lib/ordersApi';
import { SHOPIFY_ADMIN_ORDERS_URL } from '../constants';
import {
  checkIsAdmin,
  getAdminSession,
  signInAdmin,
  signOutAdmin,
  onAdminAuthStateChange,
} from '../lib/adminAuth';
import type { ConfigRow } from '../lib/configApi';
import type { OrderRow } from '../lib/ordersApi';
import {
  filterOrders,
  buildProductionCsv,
  downloadTextFile,
  getPrintQcStatus,
  isSlaOverdue,
  manufacturingSlaHours,
  type OrderFilter,
} from '../lib/adminOps';
import { getStoredLocale, setStoredLocale, t, toggleLocale, type Locale } from '../lib/i18n';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export const AdminPage: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [list, setList] = useState<ConfigRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderForm, setOrderForm] = useState({ order_number: '', short_id: '', status: 'pending' });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [locale, setLocale] = useState<Locale>(() =>
    typeof window !== 'undefined' ? getStoredLocale() : 'de'
  );
  const statusOptions = getOrderStatusOptions();

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!supabase) {
        if (!cancelled) {
          setAuthenticated(false);
          setChecked(true);
        }
        return;
      }
      const session = await getAdminSession();
      if (session) {
        const ok = await checkIsAdmin();
        if (!cancelled) setAuthenticated(ok);
      } else if (!cancelled) {
        setAuthenticated(false);
      }
      if (!cancelled) setChecked(true);
    }
    bootstrap();
    const unsub = onAdminAuthStateChange(async (session) => {
      if (!session) {
        setAuthenticated(false);
        return;
      }
      setAuthenticated(await checkIsAdmin());
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!authenticated || !supabase) return;
    setLoading(true);
    setError(null);
    getConfigsList()
      .then(setList)
      .catch((e) => setError(e?.message ?? 'Fehler beim Laden.'))
      .finally(() => setLoading(false));
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    setOrdersLoading(true);
    getOrdersList()
      .then(setOrders)
      .finally(() => setOrdersLoading(false));
  }, [authenticated]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const filteredOrders = useMemo(() => filterOrders(orders, orderFilter), [orders, orderFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setLoginLoading(true);
    try {
      const { error: loginError } = await signInAdmin(email, password);
      if (loginError) {
        setPasswordError(loginError);
        return;
      }
      setAuthenticated(true);
      setPassword('');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    setAuthenticated(false);
  };

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const shortId = orderForm.short_id.trim();
    if (!shortId) return;
    setOrderSubmitting(true);
    try {
      const created = await createOrder({
        short_id: shortId,
        order_number: orderForm.order_number.trim() || undefined,
        status: orderForm.status,
      });
      if (created) {
        setOrders((prev) => [created, ...prev]);
        setOrderForm({ order_number: '', short_id: '', status: 'pending' });
      }
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: string) => {
    const ok = await updateOrderStatus(orderId, status);
    if (ok) setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  };

  const handlePrintQc = async (order: OrderRow, approve: boolean) => {
    const updated = await updateOrderPrintQc(
      order.id,
      approve ? 'approved' : 'rejected',
      undefined,
      approve && order.status === 'paid'
    );
    if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    }
  };

  const handleExportCsv = () => {
    const csv = buildProductionCsv(filteredOrders, list, baseUrl);
    downloadTextFile(`nudaim-produktion-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const switchLang = () => {
    const next = toggleLocale(locale);
    setStoredLocale(next);
    setLocale(next);
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="animate-spin text-petrol" size={28} aria-label="Laden" />
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <h1 className="text-center font-headline font-extrabold text-lg uppercase tracking-tight text-navy mb-2">
            Admin nicht konfiguriert
          </h1>
          <p className="text-center text-sm text-zinc-600">
            VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY fehlen.
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-navy/10 flex items-center justify-center">
              <Lock size={24} className="text-navy" aria-hidden />
            </div>
          </div>
          <h1 className="text-center font-headline font-extrabold text-lg uppercase tracking-tight text-navy mb-1">
            Admin-Zugang
          </h1>
          <p className="text-center text-sm text-zinc-500 mb-6">
            Anmeldung mit Supabase Auth. Nur freigeschaltete Admin-Konten.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1" htmlFor="admin-email">
                E-Mail
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setPasswordError(null);
                }}
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-petrol/30"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1" htmlFor="admin-password">
                Passwort
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-petrol/30"
                required
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-600 font-medium" role="alert">
                {passwordError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 disabled:opacity-50"
            >
              {loginLoading ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        </div>
        <a href="/" className="mt-6 text-sm font-medium text-zinc-500 hover:text-navy">
          Zur Startseite
        </a>
      </div>
    );
  }

  const filters: { id: OrderFilter; label: string }[] = [
    { id: 'all', label: t('admin.filter.all', locale) },
    { id: 'paid', label: t('admin.filter.paid', locale) },
    { id: 'qc_pending', label: t('admin.filter.qc', locale) },
    { id: 'in_production', label: t('admin.filter.production', locale) },
    { id: 'shipped', label: 'Versandt' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-cream text-navy">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-lg">
        Zum Inhalt
      </a>
      <header className="app-bar shrink-0 h-12 md:h-14 flex items-center justify-between px-4 md:px-6">
        <a href="/" className="btn-ghost text-sm font-medium">
          Zurück
        </a>
        <span className="font-headline font-extrabold text-sm md:text-base uppercase tracking-tight text-white">
          {t('admin.title', locale)}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={switchLang} className="btn-ghost text-xs font-medium">
            {t('lang.switch', locale)}
          </button>
          <button type="button" onClick={handleLogout} className="btn-ghost flex items-center gap-2 text-sm font-medium">
            <LogOut size={16} aria-hidden />
            Abmelden
          </button>
        </div>
      </header>

      <main id="admin-main" className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2">
                <Package size={18} aria-hidden />
                Produktions-Queue
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Filter, Print-QC (48h-SLA), CSV für die Druckerei.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-semibold hover:bg-zinc-50"
            >
              <Download size={14} aria-hidden />
              {t('admin.export', locale)}
            </button>
          </div>

          <div className="px-5 py-3 border-b border-zinc-100 flex flex-wrap gap-2" role="tablist" aria-label="Bestellfilter">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={orderFilter === f.id}
                onClick={() => setOrderFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  orderFilter === f.id
                    ? 'bg-navy text-white border-navy'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddOrder} className="px-5 py-4 border-b border-zinc-100 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Bestellnummer
              </label>
              <input
                type="text"
                value={orderForm.order_number}
                onChange={(e) => setOrderForm((f) => ({ ...f, order_number: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Short-ID *
              </label>
              <input
                type="text"
                value={orderForm.short_id}
                onChange={(e) => setOrderForm((f) => ({ ...f, short_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                required
              />
            </div>
            <div className="w-36">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Status
              </label>
              <select
                value={orderForm.status}
                onChange={(e) => setOrderForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={orderSubmitting}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50"
            >
              {orderSubmitting ? '…' : 'Verknüpfen'}
            </button>
          </form>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-zinc-400">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              <span className="text-sm">Lade Bestellungen…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Bestellnr.
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Short-ID
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Status / QC
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      SLA
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 text-sm">
                        Keine Bestellungen in diesem Filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const qc = getPrintQcStatus(o);
                      const overdue = isSlaOverdue(o);
                      const slaH = manufacturingSlaHours(o);
                      return (
                        <tr key={o.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                          <td className="px-4 py-3 font-medium text-navy">
                            {o.order_number || o.shopify_order_id || '—'}
                            {o.shopify_order_id && (
                              <a
                                href={`${SHOPIFY_ADMIN_ORDERS_URL}/${o.shopify_order_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-petrol hover:underline inline-flex items-center"
                                aria-label="In Shopify öffnen"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy">{o.short_id}</td>
                          <td className="px-4 py-3 space-y-1">
                            <select
                              value={o.status}
                              onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                              className="px-2 py-1 rounded border border-zinc-200 text-xs font-medium"
                              aria-label={`Status ${o.short_id}`}
                            >
                              {statusOptions.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                              QC: {qc}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {slaH == null ? (
                              '—'
                            ) : (
                              <span className={overdue ? 'text-red-600 font-semibold' : 'text-zinc-600'}>
                                {slaH}h {overdue ? t('admin.sla.overdue', locale) : t('admin.sla.ok', locale)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {qc !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintQc(o, true)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide"
                                >
                                  {t('admin.qc.approve', locale)}
                                </button>
                              )}
                              {qc !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintQc(o, false)}
                                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-[10px] font-bold uppercase tracking-wide text-zinc-600"
                                >
                                  {t('admin.qc.reject', locale)}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200">
            <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2">
              <ShoppingCart size={18} aria-hidden />
              Konfigurationen / Druck-Assets
            </h2>
            <p className="text-sm text-zinc-500 mt-1">STL, Print-PNG und Links.</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
              <Loader2 size={22} className="animate-spin" aria-hidden />
              <span className="text-sm font-medium">Lade…</span>
            </div>
          )}
          {error && (
            <div className="px-5 py-4">
              <p className="text-sm text-red-600 font-medium" role="alert">
                {error}
              </p>
            </div>
          )}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Short-ID
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Profil
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Erstellt
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Druck
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-zinc-500 text-sm">
                        Noch keine Konfigurationen.
                      </td>
                    </tr>
                  ) : (
                    list.map((row) => {
                      const micrositeUrl = `${baseUrl}/?id=${encodeURIComponent(row.short_id)}`;
                      const ccpUrl = `${baseUrl}/ccp?id=${encodeURIComponent(row.short_id)}`;
                      const printPng = getPrintPngUrl(row);
                      return (
                        <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                          <td className="px-4 py-3 font-mono text-xs text-navy">{row.short_id}</td>
                          <td className="px-4 py-3 font-medium text-navy truncate max-w-[200px]">
                            {row.profile_title}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(row.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {row.stl_url ? (
                                <a
                                  href={row.stl_url}
                                  download={`${row.short_id}.stl`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  <Download size={12} aria-hidden />
                                  STL
                                </a>
                              ) : null}
                              {printPng ? (
                                <a
                                  href={printPng}
                                  download={`${row.short_id}-print.png`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  title="Druckversion (max. 3 Farben)"
                                >
                                  <img
                                    src={printPng}
                                    alt=""
                                    className="w-7 h-7 rounded object-contain bg-white border border-zinc-100"
                                  />
                                  Print-PNG
                                </a>
                              ) : null}
                              {!row.stl_url && !printPng ? (
                                <span className="text-zinc-400 text-xs">—</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(micrositeUrl, `micro-${row.id}`)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                {copiedId === `micro-${row.id}` ? <Check size={12} /> : <Copy size={12} />}
                                Microsite
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ccpUrl, `ccp-${row.id}`)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                {copiedId === `ccp-${row.id}` ? <Check size={12} /> : <Copy size={12} />}
                                Kunden-Panel
                              </button>
                              <a
                                href={micrositeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-navy text-white text-xs font-medium hover:bg-navy/90"
                              >
                                <ExternalLink size={12} aria-hidden />
                                Öffnen
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
