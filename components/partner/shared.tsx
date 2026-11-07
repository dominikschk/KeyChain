/**
 * Gemeinsame UI-Bausteine für den Partnerbereich (NUDAIM-Stil).
 */
import React from 'react';
import { LEAD_STATUS_LABELS, type LeadStatus } from '../../lib/partner/types';

export function AgeNotice({ className = '' }: { className?: string }) {
  return (
    <aside
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 leading-snug ${className}`}
      role="note"
    >
      <p className="font-semibold mb-1">Hinweis für Minderjährige</p>
      <p>
        Die Teilnahme von Minderjährigen ist erst nach Prüfung der gesetzlichen Anforderungen und
        mit der erforderlichen Zustimmung der Erziehungsberechtigten möglich. Bitte suche keine
        fremden Geschäfte allein und unangekündigt auf.
      </p>
    </aside>
  );
}

export function DemoBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-petrol/25 bg-petrol/5 px-3 py-2 text-xs text-navy leading-snug">
      <span className="font-semibold uppercase tracking-wider text-petrol mr-2">Demo</span>
      {children ??
        'Angezeigte Daten stammen aus dem lokalen Demomodus oder sind als Beispiel gekennzeichnet – keine Live-Kennzahlen.'}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-5 py-8 text-center">
      <h3 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy mb-2">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 max-w-md mx-auto mb-4">{text}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const tone =
    status === 'paid'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'rejected' || status === 'cancelled'
        ? 'bg-red-50 text-red-800 border-red-200'
        : status === 'draft'
          ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
          : 'bg-petrol/10 text-petrol border-petrol/20';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${tone}`}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { asLink?: boolean }
) {
  const { className = '', ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 ${className}`}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl border border-navy/15 bg-white text-navy text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50 ${className}`}
    />
  );
}

export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1"
    >
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-navy bg-white focus:outline-none focus:ring-2 focus:ring-petrol/30 ${className}`}
    />
  );
}

export function TextTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-navy bg-white focus:outline-none focus:ring-2 focus:ring-petrol/30 min-h-[96px] ${className}`}
    />
  );
}

export function SectionCard({
  title,
  children,
  eyebrow,
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm space-y-3">
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">{eyebrow}</p>
      )}
      {title && (
        <h2 className="font-headline font-extrabold text-base uppercase tracking-tight text-navy">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
