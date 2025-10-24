#!/usr/bin/env python3
"""
Script de mise à jour automatique des couleurs vers le thème TaxiAssur
Remplace bleu/violet/indigo par jaune/noir dans tous les fichiers TSX
"""

import os
import re
from pathlib import Path

# Mappings de remplacement
REPLACEMENTS = [
    # Gradients from-to
    ('from-blue-600', 'from-yellow-500'),
    ('to-blue-600', 'to-yellow-600'),
    ('from-blue-500', 'from-yellow-400'),
    ('to-blue-500', 'to-yellow-500'),
    ('from-blue-700', 'from-yellow-600'),
    ('to-blue-700', 'to-yellow-700'),

    ('from-purple-600', 'from-gray-900'),
    ('to-purple-600', 'to-yellow-600'),
    ('from-purple-500', 'from-gray-800'),
    ('to-purple-500', 'to-yellow-500'),

    ('from-indigo-600', 'from-yellow-500'),
    ('to-indigo-600', 'to-yellow-600'),

    # Backgrounds
    ('bg-blue-600', 'bg-yellow-500'),
    ('bg-blue-500', 'bg-yellow-500'),
    ('bg-blue-700', 'bg-yellow-600'),
    ('bg-blue-50', 'bg-yellow-50'),
    ('bg-blue-100', 'bg-yellow-100'),

    ('bg-purple-600', 'bg-gray-900'),
    ('bg-purple-500', 'bg-gray-800'),
    ('bg-purple-100', 'bg-yellow-100'),

    ('bg-indigo-600', 'bg-yellow-500'),
    ('bg-indigo-500', 'bg-yellow-500'),

    # Hover states
    ('hover:bg-blue-700', 'hover:bg-yellow-600'),
    ('hover:bg-blue-600', 'hover:bg-yellow-500'),
    ('hover:bg-blue-50', 'hover:bg-yellow-50'),

    # Text colors
    ('text-blue-600', 'text-yellow-600'),
    ('text-blue-500', 'text-yellow-500'),
    ('text-blue-400', 'text-yellow-400'),
    ('text-blue-700', 'text-yellow-700'),
    ('text-blue-800', 'text-yellow-800'),
    ('text-blue-100', 'text-yellow-100'),
    ('text-blue-200', 'text-yellow-200'),

    ('text-purple-600', 'text-yellow-600'),
    ('text-purple-500', 'text-yellow-500'),
    ('text-purple-400', 'text-yellow-400'),

    ('text-indigo-600', 'text-yellow-600'),
    ('text-indigo-500', 'text-yellow-500'),

    # Borders
    ('border-blue-600', 'border-yellow-500'),
    ('border-blue-500', 'border-yellow-500'),
    ('border-blue-200', 'border-yellow-200'),

    # Shadows
    ('shadow-blue-500', 'shadow-yellow-500'),
    ('shadow-blue-600', 'shadow-yellow-600'),
    ('shadow-purple-500', 'shadow-yellow-500'),

    # Rings
    ('ring-blue-500', 'ring-yellow-500'),
    ('ring-blue-600', 'ring-yellow-600'),

    # Focus states
    ('focus:ring-blue-500', 'focus:ring-yellow-500'),
    ('focus:border-blue-500', 'focus:border-yellow-500'),
]

def update_file(file_path):
    """Mise à jour d'un fichier avec les remplacements"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Appliquer tous les remplacements
        for old, new in REPLACEMENTS:
            content = content.replace(old, new)

        # Si des changements ont été faits
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"  ❌ Erreur sur {file_path}: {e}")
        return False

def main():
    print("🎨 Mise à jour des couleurs vers le thème TaxiAssur...\n")

    # Répertoires à traiter
    directories = ['src/pages', 'src/components']

    total_files = 0
    updated_files = 0

    for directory in directories:
        print(f"📁 Traitement de {directory}...")

        # Trouver tous les fichiers .tsx
        for tsx_file in Path(directory).rglob('*.tsx'):
            total_files += 1
            if update_file(tsx_file):
                updated_files += 1
                print(f"  ✅ Mis à jour: {tsx_file.name}")

    print(f"\n✅ Mise à jour terminée !")
    print(f"📊 {updated_files}/{total_files} fichiers modifiés")
    print(f"🎨 Tous les bleu/violet/indigo ont été remplacés par jaune/noir")

if __name__ == '__main__':
    main()
