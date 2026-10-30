interface CategorizedDocument {
  document_type?: string | null;
  custom_label?: string | null;
}

interface DisplayCategory {
  id: string;
  label: string;
  icon: string;
  required: boolean;
}

export function normalizeDocumentType(type?: string | null): string {
  const value = String(type || '').trim().toLowerCase();
  return ({ piece_identite: 'carte_identite', other: 'autre' } as Record<string, string>)[value] || value || 'autre';
}

export function documentCategoryId(document: CategorizedDocument): string {
  const type = normalizeDocumentType(document.document_type);
  return type === 'custom' && document.custom_label?.trim()
    ? `custom_${document.custom_label.trim()}`
    : type;
}

// Every stored document needs a visible category, including old imported types.
// Displaying a file never validates it or makes an optional category mandatory.
export function documentCategoriesForDisplay(
  requiredCategories: readonly DisplayCategory[],
  documents: readonly CategorizedDocument[],
): DisplayCategory[] {
  const categories = requiredCategories.map(category => ({ ...category }));
  const ids = new Set(categories.map(category => category.id));
  for (const document of documents) {
    const id = documentCategoryId(document);
    if (ids.has(id)) continue;
    const customLabel = document.custom_label?.trim();
    const label = id.startsWith('custom_') && customLabel
      ? customLabel
      : id === 'autre'
        ? 'Autres documents à examiner'
        : `Documents à examiner (${id})`;
    categories.push({ id, label, icon: '📎', required: false });
    ids.add(id);
  }
  return categories;
}
