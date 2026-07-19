/**
 * document.title + grundlegende Share-Meta für öffentliche Microsite.
 */
export function applyMicrositeShareMeta(opts: {
  title: string;
  description?: string;
  imageUrl?: string | null;
  pageUrl?: string;
}): void {
  if (typeof document === 'undefined') return;
  const title = (opts.title || 'NUDAIM').trim().slice(0, 80);
  document.title = title;

  const desc = (opts.description || 'NFC-Seite von NUDAIM').trim().slice(0, 160);
  upsertMeta('name', 'description', desc);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', desc);
  upsertMeta('property', 'og:type', 'website');
  if (opts.pageUrl) upsertMeta('property', 'og:url', opts.pageUrl);
  if (opts.imageUrl && opts.imageUrl.startsWith('https://')) {
    upsertMeta('property', 'og:image', opts.imageUrl);
  }
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
