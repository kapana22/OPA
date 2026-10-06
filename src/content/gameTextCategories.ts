interface GameTextSource {
  categories: { id: string; name: string; emoji: string; itemIDs: string[] }[];
  items: { id: string; text: string }[];
}

/** Keep migrated categories; new editor entries appear under added texts. */
export function gameTextCategories(source: GameTextSource) {
  const assigned = new Set(source.categories.flatMap((category) => category.itemIDs));
  const categories = source.categories.map(({ itemIDs, ...category }) => {
    const ids = new Set(itemIDs);
    return { ...category, items: source.items.filter((item) => ids.has(item.id)).map((item) => item.text) };
  }).filter((category) => category.items.length > 0);
  const added = source.items.filter((item) => !assigned.has(item.id)).map((item) => item.text);
  if (added.length) categories.push({ id: 'editor_added', name: 'დამატებული ტექსტები', emoji: '✨', items: added });
  return categories;
}
