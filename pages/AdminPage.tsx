/**
 * Admin – Panel: Nur per direkter URL /admin erreichbar, mit Passwortschutz.
 * Kein Link in der App; Passwort über VITE_ADMIN_PASSWORD in .env.local.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, ExternalLink, Loader2, Lock, LogOut, Copy, Check, Package, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getConfigsList } from '../lib/configApi';
import { getOrdersList, createOrder, updateOrderStatus, getOrderStatusOptions } from '../lib/ordersApi';
import { SHOPIFY_ADMIN_ORDERS_URL } from '../constants';
import { isAdminAuthenticated, checkAdminPassword, adminLogout, getAdminPassword, isLockedOut, getLockoutRemainingMinutes } from '../lib/adminAuth';
import type { ConfigRow } from '../lib/configApi';
import type { OrderRow } from '../lib/ordersApi';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export const AdminPage: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [list, setList] = useState<ConfigRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderForm, setOrderForm] = useState({ order_number: '', short_id: '', status: 'pending' });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const statusOptions = getOrderStatusOptions();

  useEffect(() => {
    setAuthenticated(isAdminAuthenticated());
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!authenticated || !supabase) return;
    setLoading(true);
    setError(null);
    getConfigsList()
      .then((rows) => {
        setList(rows);
      })
      .catch((e) => {
        setError(e?.message ?? 'Fehler beim Laden.');
      })
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (checkAdminPassword(password)) {
      setAuthenticated(true);
      setPassword('');
    } else {
      setPasswordError('Falsches Passwort.');
    }
  };

  const handleLogout = () => {
    adminLogout();
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

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="animate-spin text-petrol" size={28} />
      </div>
    );
  }

  if (!authenticated) {
    const hasPassword = !!getAdminPassword();
    const lockedOut = isLockedOut();
    const lockoutMins = getLockoutRemainingMinutes();

    if (!hasPassword) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center">
                <Lock size={24} className="text-amber-700" />
              </div>
            </div>
            <h1 className="text-center font-headline font-extrabold text-lg uppercase tracking-tight text-navy mb-1">
              Admin nicht freigeschaltet
            </h1>
            <p className="text-center text-sm text-zinc-600 mb-4">
              <strong>VITE_ADMIN_PASSWORD</strong> ist nicht gesetzt. Ohne Passwort ist der Admin-Zugang deaktiviert.
            </p>
            <p className="text-center text-xs text-zinc-500">
              In Vercel/Netlify: Umgebungsvariablen → <code className="bg-zinc-100 px-1 rounded">VITE_ADMIN_PASSWORD</code> setzen und neu deployen. Lokal: <code className="bg-zinc-100 px-1 rounded">.env.local</code> anlegen.
            </p>
          </div>
          <a href="/" className="mt-6 text-sm font-medium text-zinc-500 hover:text-navy">Zur Startseite</a>
        </div>
      );
    }

    if (lockedOut) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center">
                <Lock size={24} className="text-red-700" />
              </div>
            </div>
            <h1 className="text-center font-headline font-extrabold text-lg uppercase tracking-tight text-navy mb-1">
              Zugang vorübergehend gesperrt
            </h1>
            <p className="text-center text-sm text-zinc-600 mb-4">
              Zu viele Fehlversuche. Bitte in <strong>{lockoutMins} Minuten</strong> erneut versuchen.
            </p>
          </div>
          <a href="/" className="mt-6 text-sm font-medium text-zinc-500 hover:text-navy">Zur Startseite</a>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-navy/10 flex items-center justify-center">
              <Lock size={24} className="text-navy" />
            </div>
          </div>
          <h1 className="text-center font-headline font-extrabold text-lg uppercase tracking-tight text-navy mb-1">
            Admin-Zugang
          </h1>
          <p className="text-center text-sm text-zinc-500 mb-6">
            Nur mit Berechtigung. Kein Link in der App. Sitzung läuft nach 8 Stunden ab.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
              placeholder="Admin-Passwort"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-navy placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-petrol/30 focus:border-transparent"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-red-600 font-medium">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors"
            >
              Anmelden
            </button>
          </form>
        </div>
        <a href="/" className="mt-6 text-sm font-medium text-zinc-500 hover:text-navy">Zur Startseite</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream text-navy">
      <header className="app-bar shrink-0 h-12 md:h-14 flex items-center justify-between px-4 md:px-6">
        <a href="/" className="btn-ghost text-sm font-medium">
          Zurück
        </a>
        <span className="font-headline font-extrabold text-sm md:text-base uppercase tracking-tight text-white">
          Bestellübersicht
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="btn-ghost flex items-center gap-2 text-sm font-medium"
        >
          <LogOut size={16} />
          Abmelden
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200">
            <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2">
              <ShoppingCart size={18} />
              Konfigurationen / Bestellungen
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Microsite- und Kunden-Panel-Links zum Kopieren.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm font-medium">Lade…</span>
            </div>
          )}

          {error && (
            <div className="px-5 py-4">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Short-ID</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Profil</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Erstellt</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">STL</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr className="border-b border-zinc-100">
                      <td colSpan={5} className="px-4 py-12 text-center text-zinc-500 text-sm">
                        Noch keine Konfigurationen.
                      </td>
                    </tr>
                  ) : (
                    list.map((row) => {
                      const micrositeUrl = `${baseUrl}/?id=${encodeURIComponent(row.short_id)}`;
                      const ccpUrl = `${baseUrl}/ccp?id=${encodeURIComponent(row.short_id)}`;
                      return (
                        <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                          <td className="px-4 py-3 font-mono text-xs text-navy">{row.short_id}</td>
                          <td className="px-4 py-3 font-medium text-navy truncate max-w-[200px]">{row.profile_title}</td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(row.created_at)}</td>
                          <td className="px-4 py-3">
                            {row.stl_url ? (
                              <a
                                href={row.stl_url}
                                download={`${row.short_id}.stl`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                <Download size={12} />
                                STL
                              </a>
                            ) : (
                              <span className="text-zinc-400 text-xs">—</span>
                            )}
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
                                <ExternalLink size={12} />
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

        <section className="card overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-zinc-200">
            <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2">
              <Package size={18} />
              Bestellungen (Short-ID ↔ Bestellung ↔ Status)
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Manuell verknüpfen oder später per Shopify-Sync. Link zu Bestellung: Shopify Admin → Bestellungen.
            </p>
          </div>

          <form onSubmit={handleAddOrder} className="px-5 py-4 border-b border-zinc-100 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Bestellnummer</label>
              <input
                type="text"
                value={orderForm.order_number}
                onChange={(e) => setOrderForm((f) => ({ ...f, order_number: e.target.value }))}
                placeholder="z. B. 1001"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Short-ID *</label>
              <input
                type="text"
                value={orderForm.short_id}
                onChange={(e) => setOrderForm((f) => ({ ...f, short_id: e.target.value }))}
                placeholder="z. B. ABC12XYZ"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                required
              />
            </div>
            <div className="w-36">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Status</label>
              <select
                value={orderForm.status}
                onChange={(e) => setOrderForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={orderSubmitting} className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50">
              {orderSubmitting ? '…' : 'Verknüpfen'}
            </button>
          </form>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Lade Bestellungen…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Bestellnr.</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Short-ID</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Status</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-tight text-zinc-500 text-[10px]">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-sm">Noch keine Bestellungen verknüpft.</td></tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-medium text-navy">
                          {o.order_number || o.shopify_order_id || '—'}
                          {o.shopify_order_id && (
                            <a href={`${SHOPIFY_ADMIN_ORDERS_URL}/${o.shopify_order_id}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-petrol hover:underline inline-flex items-center">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-navy">{o.short_id}</td>
                        <td className="px-4 py-3">
                          <select
                            value={o.status}
                            onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                            className="px-2 py-1 rounded border border-zinc-200 text-xs font-medium"
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <a href={`${baseUrl}/?id=${encodeURIComponent(o.short_id)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-petrol hover:underline">Microsite</a>
                        </td>
                      </tr>
                    ))
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
