import { describe, it, expect } from 'vitest';
import { documentCategoriesForDisplay, documentCategoryId, normalizeDocumentType } from './document-categories';

const required = [{ id: 'carte_identite', label: "Carte d'identité", icon: '📄', required: true }];

describe('document categories in the back-office', () => {
  it('shows portal identity uploads in the existing identity category', () => {
    const document = { document_type: 'piece_identite', status: 'pending', validated: false };
    expect(documentCategoryId(document)).toBe('carte_identite');
    expect(documentCategoriesForDisplay(required, [document])).toEqual(required);
    expect(document).toEqual({ document_type: 'piece_identite', status: 'pending', validated: false });
  });

  it('keeps old and unknown types visible without declaring them valid or required', () => {
    const documents = [{ document_type: 'other' }, { document_type: 'autre' }, { document_type: 'licence_professionnelle' }, { document_type: null }];
    const categories = documentCategoriesForDisplay(required, documents);
    expect(categories.map(category => category.id)).toEqual(['carte_identite', 'autre', 'licence_professionnelle']);
    for (const document of documents) expect(categories.some(category => category.id === documentCategoryId(document))).toBe(true);
    expect(categories.slice(1).every(category => category.required === false)).toBe(true);
    expect(required).toHaveLength(1);
  });

  it('retains distinct custom labels and deduplicates identical categories', () => {
    const documents = [{ document_type: 'custom', custom_label: 'Ancien devis' }, { document_type: 'custom', custom_label: 'Ancien devis' }, { document_type: 'custom', custom_label: 'Bon de commande' }];
    expect(documentCategoriesForDisplay(required, documents).map(category => category.id)).toEqual(['carte_identite', 'custom_Ancien devis', 'custom_Bon de commande']);
    expect(normalizeDocumentType(' RIB ')).toBe('rib');
  });
});
