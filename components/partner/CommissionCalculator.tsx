/**
 * Interaktiver Beispielrechner – immer als Modellrechnung gekennzeichnet.
 */
import React, { useMemo, useState } from 'react';
import {
  calculateCommissionExample,
  DEFAULT_CALCULATOR_INPUT,
  formatEuro,
} from '../../lib/partner/calculator';
import type { PartnerProgramConfig } from '../../lib/partner/types';
import { FieldLabel, TextInput, SectionCard } from './shared';

type Props = {
  config: PartnerProgramConfig;
};

export function CommissionCalculator({ config }: Props) {
  const examplePerPiece =
    (config.exampleCommissionPerPieceCents ?? 30) / 100;

  const [workdays, setWorkdays] = useState(DEFAULT_CALCULATOR_INPUT.workdaysPerMonth);
  const [perDay, setPerDay] = useState(DEFAULT_CALCULATOR_INPUT.companiesPerDay);
  const [offerPct, setOfferPct] = useState(
    Math.round(DEFAULT_CALCULATOR_INPUT.offerRate * 100)
  );
  const [closePct, setClosePct] = useState(
    Math.round(DEFAULT_CALCULATOR_INPUT.closeRate * 100)
  );
  const [avgQty, setAvgQty] = useState(DEFAULT_CALCULATOR_INPUT.avgQuantity);
  const [perPiece, setPerPiece] = useState(examplePerPiece);

  const result = useMemo(
    () =>
      calculateCommissionExample({
        workdaysPerMonth: workdays,
        companiesPerDay: perDay,
        offerRate: offerPct / 100,
        closeRate: closePct / 100,
        avgQuantity: avgQty,
        commissionPerPieceEuro: perPiece,
      }),
    [workdays, perDay, offerPct, closePct, avgQty, perPiece]
  );

  return (
    <SectionCard
      eyebrow="Beispielrechner"
      title="Eigene Modellrechnung erstellen"
    >
      <p className="text-sm text-zinc-600 leading-snug">
        Das ist eine veränderbare Beispielrechnung – keine Prognose und keine Verdienstgarantie.
        Die Abschlussquote im Vorbelegungswert ist nur eine Annahme des Rechenbeispiels, kein
        erwartbarer Standard.
      </p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        Vorbelegt: 1 Unternehmen / Arbeitstag · 20 Tage · ca. 1/3 wünscht Angebot · 100 Stück ·{' '}
        {formatEuro(examplePerPiece)} Beispielprovision je Anhänger (Admin-Beispielwert).
        {config.confirmedCommissionPerPieceCents == null && (
          <span className="block mt-1 font-semibold">
            Es ist noch kein bestätigter Provisionssatz hinterlegt.
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="calc-days">Arbeitstage im Monat</FieldLabel>
          <TextInput
            id="calc-days"
            type="number"
            min={0}
            max={31}
            value={workdays}
            onChange={(e) => setWorkdays(Number(e.target.value))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="calc-per-day">Angesprochene Unternehmen / Tag</FieldLabel>
          <TextInput
            id="calc-per-day"
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={perDay}
            onChange={(e) => setPerDay(Number(e.target.value))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="calc-offer">Anteil mit Angebotswunsch (%)</FieldLabel>
          <TextInput
            id="calc-offer"
            type="number"
            min={0}
            max={100}
            value={offerPct}
            onChange={(e) => setOfferPct(Number(e.target.value))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="calc-close">Anteil bezahlter Bestellungen (%)</FieldLabel>
          <TextInput
            id="calc-close"
            type="number"
            min={0}
            max={100}
            value={closePct}
            onChange={(e) => setClosePct(Number(e.target.value))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="calc-qty">Ø Stückzahl je Bestellung</FieldLabel>
          <TextInput
            id="calc-qty"
            type="number"
            min={0}
            max={100000}
            value={avgQty}
            onChange={(e) => setAvgQty(Number(e.target.value))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="calc-comm">Angenommene Provision je Stück (€)</FieldLabel>
          <TextInput
            id="calc-comm"
            type="number"
            min={0}
            max={10}
            step={0.01}
            value={perPiece}
            onChange={(e) => setPerPiece(Number(e.target.value))}
          />
          <p className="text-[11px] text-zinc-500 mt-1">Beispielwert – nicht verbindlich.</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
        {[
          { label: 'Mögliche Kontakte', value: String(result.contacts) },
          { label: 'Mögliche Angebote', value: String(result.offers) },
          { label: 'Mögliche bezahlte Bestellungen', value: String(result.paidOrders) },
          { label: 'Geschätzte Stückzahl', value: String(result.pieces) },
          {
            label: 'Rein beispielhafte Provision',
            value: formatEuro(result.exampleCommissionEuro),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-navy/10 bg-cream px-3 py-3"
          >
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {item.label}
            </dt>
            <dd className="font-headline font-extrabold text-lg text-navy mt-1">{item.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-zinc-500 leading-snug">
        Stelle die Kalendertagsrechnung nicht als typisches Einkommen dar. Es gibt keinen
        garantierten Verdienst.
      </p>
    </SectionCard>
  );
}
