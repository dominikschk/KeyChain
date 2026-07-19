import { describe, expect, it } from 'vitest';
import {
  buildSiteNavItems,
  filterBlocksForPage,
  isKontaktBlock,
  resolveActivePage,
} from '../siteNav';
import {
  applyCcpSnapshot,
  createCcpSnapshot,
  mergeCcpHistories,
  type CcpSnapshot,
} from '../ccpHistory';
import type { ModelConfig, NFCBlock } from '../../types';
import { DEFAULT_CONFIG } from '../../constants';

const phone: NFCBlock = {
  id: '1',
  type: 'magic_button',
  content: '',
  title: 'Anrufen',
  buttonType: 'phone',
};

const story: NFCBlock = {
  id: '2',
  type: 'text',
  content: 'Hallo',
  title: 'Über uns',
};

const onlyKontakt: NFCBlock = {
  id: '3',
  type: 'text',
  content: 'Nur Kontakt',
  title: 'Impressum',
  settings: { page: 'kontakt' },
};

describe('siteNav', () => {
  it('erkennt Kontakt-Blöcke', () => {
    expect(isKontaktBlock(phone)).toBe(true);
    expect(isKontaktBlock(story)).toBe(false);
    expect(isKontaktBlock(onlyKontakt)).toBe(true);
  });

  it('filtert Home vs Kontakt', () => {
    const blocks = [phone, story, onlyKontakt];
    expect(filterBlocksForPage(blocks, 'home').map((b) => b.id)).toEqual(['1', '2']);
    expect(filterBlocksForPage(blocks, 'kontakt').map((b) => b.id)).toEqual(['1', '3']);
  });

  it('baut Anker-Nav', () => {
    const items = buildSiteNavItems({
      navEnabled: true,
      layoutMode: 'landing',
      nfcBlocks: [story, phone, { id: 'a', type: 'magic_button', content: '', title: 'Shop', buttonType: 'custom_link' }],
    });
    expect(items.some((i) => i.id === 'top')).toBe(true);
    expect(items.some((i) => i.id === 'stories')).toBe(true);
    expect(items.some((i) => i.id === 'actions')).toBe(true);
    expect(items.some((i) => i.isPage && i.id === 'kontakt')).toBe(true);
  });

  it('ohne Nav: leer', () => {
    expect(buildSiteNavItems({ navEnabled: false, nfcBlocks: [phone] })).toEqual([]);
  });

  it('resolveActivePage aus Query/Hash', () => {
    expect(resolveActivePage('?id=ABC&p=kontakt', '')).toBe('kontakt');
    expect(resolveActivePage('?id=ABC', '#kontakt')).toBe('kontakt');
    expect(resolveActivePage('?id=ABC', '#section-actions')).toBe('home');
  });
});

describe('ccpHistory', () => {
  it('Snapshot + Apply', () => {
    const cfg: ModelConfig = {
      ...DEFAULT_CONFIG,
      profileTitle: 'Café Test',
      nfcBlocks: [story],
    };
    const snap = createCcpSnapshot(cfg, 'Test');
    expect(snap.profileTitle).toBe('Café Test');
    const restored = applyCcpSnapshot(
      { ...cfg, profileTitle: 'Neu', nfcBlocks: [] },
      snap
    );
    expect(restored.profileTitle).toBe('Café Test');
    expect(restored.nfcBlocks).toHaveLength(1);
  });

  it('merge dedupliziert und begrenzt', () => {
    const a: CcpSnapshot = {
      id: 'a',
      savedAt: '2026-07-19T10:00:00.000Z',
      label: 'A',
      profileTitle: 'A',
      accentColor: '#000',
      theme: 'light',
      fontStyle: 'modern',
      nfcBlocks: [],
    };
    const b: CcpSnapshot = { ...a, id: 'b', savedAt: '2026-07-19T12:00:00.000Z', label: 'B' };
    const merged = mergeCcpHistories([a], [a, b]);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('b');
  });
});
