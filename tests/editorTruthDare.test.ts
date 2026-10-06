import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

// Exercise the editor's actual approval handlers without launching a browser.
const html = readFileSync(resolve(process.cwd(), '../Tools/word-editor/index.html'), 'utf8');
const handlers = html.slice(html.indexOf('    function truthDareAdditionTarget('), html.indexOf('    window.excludePendingItem'));
function editor(category: string, texts: string[], banks = { TruthDareBank: [] as { heat: string; truths: string[]; dares: string[] }[] }) {
  const window = {} as {
    approvePendingItem: (index: number) => Promise<void>;
    approveAllPendingInCurrentCat: () => Promise<void>;
  };
  const pending = [{ bank: 'TruthDareBank', category, items: texts.map(text => ({ text })) }];
  const save = vi.fn(async () => {});
  runInNewContext(handlers, {
    window, activeBanks: banks, pendingAdditions: pending, activeCategoryIndex: 0,
    unsavedChangesCount: 0, confirm: () => true, saveChanges: save,
    updateSaveIndicator() {}, updateStats() {}, renderSidebar() {}, renderCurrentCategory() {}, showToast() {},
  });
  return { window, banks, pending, save };
}
describe('TruthDare editor approval', () => {
  it.each(['family', 'party', 'spicy'])('routes single and bulk approvals to %s arrays without duplicates', async (heat) => {
    for (const kind of ['truths', 'dares'] as const) {
      const banks = { TruthDareBank: [{ heat, truths: ['existing truth'], dares: ['existing dare'] }] };
      const single = editor(`${heat}.${kind}`, ['addition'], banks);
      await single.window.approvePendingItem(0);
      const bulk = editor(`${heat}.${kind}`, ['addition', 'second', 'second'], banks);
      await bulk.window.approveAllPendingInCurrentCat();
      expect(banks.TruthDareBank).toHaveLength(1);
      expect(banks.TruthDareBank[0][kind]).toEqual([kind === 'truths' ? 'existing truth' : 'existing dare', 'addition', 'second']);
      expect(single.pending[0].items).toHaveLength(0);
      expect(bulk.pending[0].items).toHaveLength(0);
      expect(single.save).toHaveBeenCalledOnce();
      expect(bulk.save).toHaveBeenCalledOnce();
    }
  });
  it('creates the heat set with both arrays', async () => {
    const e = editor('party.dares', ['new']);
    await e.window.approvePendingItem(0);
    expect(e.banks.TruthDareBank).toEqual([{ heat: 'party', truths: [], dares: ['new'] }]);
  });
  it('rejects an invalid category before removing pending text or saving', async () => {
    const e = editor('party.words', ['keep']);
    await expect(e.window.approvePendingItem(0)).rejects.toThrow();
    expect(e.pending[0].items).toHaveLength(1);
    expect(e.banks.TruthDareBank).toHaveLength(0);
    expect(e.save).not.toHaveBeenCalled();
  });
});
