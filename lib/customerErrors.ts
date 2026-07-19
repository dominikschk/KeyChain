/**
 * Kundenfreundliche Fehlertexte (Technik nur in der Console).
 */
import { getDetailedError } from './supabase';

export function customerSaveError(error: unknown): { title: string; msg: string } {
  const detailed = getDetailedError(error);
  if (detailed.code === 'NETWORK_DISCONNECT') {
    return {
      title: 'Keine Verbindung',
      msg: 'Bitte Internet prüfen und nochmal versuchen.',
    };
  }
  if (detailed.code === 'SYNC_TIMEOUT') {
    return {
      title: 'Dauert zu lange',
      msg: 'Bitte nochmal tippen – oft klappt der zweite Versuch.',
    };
  }
  return {
    title: 'Speichern hat nicht geklappt',
    msg: 'Bitte nochmal versuchen. Wenn es wieder passiert: kurz warten und die Seite neu laden.',
  };
}
