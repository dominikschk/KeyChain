/**
 * Scan-Insights für CCP – verständlich, ohne Spam.
 */
export type ScanInsight = {
  headline: string;
  detail: string;
  /** 0–100 grobe Aktivität der letzten 30 Tage relativ zu Gesamt */
  activityPct: number;
};

export function buildScanInsight(total: number, last30: number): ScanInsight {
  const t = Math.max(0, Math.floor(total));
  const d30 = Math.max(0, Math.floor(last30));

  if (t === 0) {
    return {
      headline: 'Noch keine Scans',
      detail: 'Sobald jemand den Chip ans Handy hält, siehst du hier die Zahlen.',
      activityPct: 0,
    };
  }

  if (d30 === 0) {
    return {
      headline: 'Gerade ruhig',
      detail: `Insgesamt ${t} Scan${t === 1 ? '' : 's'}, in den letzten 30 Tagen keiner.`,
      activityPct: 5,
    };
  }

  const pct = Math.min(100, Math.round((d30 / Math.max(t, 1)) * 100));
  if (d30 >= 20) {
    return {
      headline: 'Viel genutzt',
      detail: `${d30} Scans in 30 Tagen (insgesamt ${t}).`,
      activityPct: Math.max(pct, 70),
    };
  }
  if (d30 >= 5) {
    return {
      headline: 'Regelmäßig unterwegs',
      detail: `${d30} Scans in 30 Tagen (insgesamt ${t}).`,
      activityPct: Math.max(pct, 40),
    };
  }
  return {
    headline: 'Erste Scans',
    detail: `${d30} in den letzten 30 Tagen – insgesamt ${t}.`,
    activityPct: Math.max(pct, 15),
  };
}
