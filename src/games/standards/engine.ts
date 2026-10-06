import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, categoryIDs, cleanCategoryIDs, selectionKey } from '../../core/settings';
import { StandardsBank } from '../../content/banks';

export type StandardsPhase = 'setup' | 'discussion';
/** `categoryIDs: []` — ყველა კატეგორია. */
interface StandardsSettings { categoryIDs: string[] }
const KEY = 'splash.standards.discussion.v1';

/** An open-ended conversation deck. No votes, turn passing, timers or scores. */
export class StandardsEngine extends Observable {
  phase: StandardsPhase = 'setup';
  currentExpectation = '';
  settings = loadSettings<StandardsSettings>(KEY, { categoryIDs: [] }, (s) => ({
    categoryIDs: categoryIDs(s, (id) => StandardsBank.category(id) !== undefined),
  }));
  private shoe: ContentShoe | null = null;

  startGame(): void {
    this.shoe = new ContentShoe(
      `standards.${selectionKey(this.settings.categoryIDs)}`,
      StandardsBank.deck(this.settings.categoryIDs),
    );
    this.phase = 'discussion';
    this.next();
  }

  next(): void {
    if (this.phase !== 'discussion' || !this.shoe) return;
    this.currentExpectation = this.shoe.draw() ?? '';
    this.notify();
  }

  setCategories(ids: string[]): void {
    if (this.phase !== 'setup') return;
    this.settings = { categoryIDs: cleanCategoryIDs(ids, (value) => StandardsBank.category(value) !== undefined) };
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
