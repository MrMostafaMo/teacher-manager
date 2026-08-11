export interface Section<T> {
  id: string;
  name: string;
  list: T[];
}

export interface GroupedSections<T> {
  sections: Section<T>[];
  ungrouped: T[];
}

/**
 * Buckets rows into one section per membership group (a row may appear in
 * several sections), sorted by group name. Rows with no group land in
 * `ungrouped`.
 */
export function buildSectionsByGroup<T>(
  rows: T[],
  groupsOf: (row: T) => Array<{ id: string; name: string }>,
): GroupedSections<T> {
  const byGroup = new Map<string, Section<T>>();
  const ungrouped: T[] = [];
  for (const row of rows) {
    const groups = groupsOf(row);
    if (groups.length === 0) {
      ungrouped.push(row);
      continue;
    }
    for (const g of groups) {
      let sec = byGroup.get(g.id);
      if (!sec) {
        sec = { id: g.id, name: g.name, list: [] };
        byGroup.set(g.id, sec);
      }
      sec.list.push(row);
    }
  }
  const sections = [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return { sections, ungrouped };
}
