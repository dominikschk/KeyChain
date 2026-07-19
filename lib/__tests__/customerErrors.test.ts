import { describe, expect, it, vi } from 'vitest';
import { customerSaveError } from '../customerErrors';

describe('customerSaveError', () => {
  it('Netzwerk → Alltagssprache', () => {
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const spyErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spyEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const r = customerSaveError({ message: 'Failed to fetch' });
    expect(r.title).toMatch(/Verbindung/i);
    expect(r.msg).not.toMatch(/supabase|RLS|policy/i);
    spy.mockRestore();
    spyErr.mockRestore();
    spyEnd.mockRestore();
  });

  it('unbekannt → freundlicher Fallback', () => {
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const spyErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spyEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const r = customerSaveError({ message: 'new row violates row-level security policy' });
    expect(r.title).toMatch(/nicht geklappt/i);
    expect(r.msg).not.toMatch(/Policy|Bucket|SQL/i);
    spy.mockRestore();
    spyErr.mockRestore();
    spyEnd.mockRestore();
  });
});
