#!/usr/bin/env node

/**
 * Script pour ajouter automatiquement id et autocomplete aux champs de formulaire
 * Corrige les 31+ avertissements d'accessibilité
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/**/*.tsx', { ignore: ['node_modules/**', 'dist/**'] });

let totalFixed = 0;

files.forEach(file => {
  let content = readFileSync(file, 'utf8');
  let modified = false;

  // Ajouter id et autocomplete pour les inputs type="email"
  const emailInputRegex = /<input\s+([^>]*type="email"[^>]*)(>)/g;
  content = content.replace(emailInputRegex, (match, attrs, end) => {
    if (!attrs.includes('id=') && !attrs.includes('name=')) {
      modified = true;
      totalFixed++;
      return `<input ${attrs} id="email" name="email" autoComplete="email"${end}`;
    }
    if (!attrs.includes('autoComplete=')) {
      modified = true;
      return `<input ${attrs} autoComplete="email"${end}`;
    }
    return match;
  });

  // Ajouter id et autocomplete pour les inputs type="tel"
  const telInputRegex = /<input\s+([^>]*type="tel"[^>]*)(>)/g;
  content = content.replace(telInputRegex, (match, attrs, end) => {
    if (!attrs.includes('id=') && !attrs.includes('name=')) {
      modified = true;
      totalFixed++;
      return `<input ${attrs} id="phone" name="phone" autoComplete="tel"${end}`;
    }
    if (!attrs.includes('autoComplete=')) {
      modified = true;
      return `<input ${attrs} autoComplete="tel"${end}`;
    }
    return match;
  });

  // Ajouter id et autocomplete pour les inputs type="text" qui ont un placeholder ou name
  const textInputRegex = /<input\s+([^>]*type="text"[^>]*)(>)/g;
  content = content.replace(textInputRegex, (match, attrs, end) => {
    if (!attrs.includes('id=') && !attrs.includes('name=')) {
      // Essayer de déduire le nom depuis placeholder
      const placeholderMatch = attrs.match(/placeholder="([^"]+)"/);
      if (placeholderMatch) {
        const fieldName = placeholderMatch[1].toLowerCase()
          .replace(/[éèê]/g, 'e')
          .replace(/[à]/g, 'a')
          .replace(/[^a-z0-9]/g, '_');
        modified = true;
        totalFixed++;
        return `<input ${attrs} id="${fieldName}" name="${fieldName}"${end}`;
      }
    }
    return match;
  });

  // Ajouter id et name pour les textareas
  const textareaRegex = /<textarea\s+([^>]*)(>)/g;
  content = content.replace(textareaRegex, (match, attrs, end) => {
    if (!attrs.includes('id=') && !attrs.includes('name=')) {
      const placeholderMatch = attrs.match(/placeholder="([^"]+)"/);
      const fieldName = placeholderMatch ?
        placeholderMatch[1].toLowerCase().replace(/[éèê]/g, 'e').replace(/[à]/g, 'a').replace(/[^a-z0-9]/g, '_') :
        'message';
      modified = true;
      totalFixed++;
      return `<textarea ${attrs} id="${fieldName}" name="${fieldName}"${end}`;
    }
    return match;
  });

  // Ajouter id et name pour les selects
  const selectRegex = /<select\s+([^>]*)(>)/g;
  content = content.replace(selectRegex, (match, attrs, end) => {
    if (!attrs.includes('id=') && !attrs.includes('name=')) {
      modified = true;
      totalFixed++;
      return `<select ${attrs} id="select_field" name="select_field"${end}`;
    }
    return match;
  });

  if (modified) {
    writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed ${file}`);
  }
});

console.log(`\n✅ Total fields fixed: ${totalFixed}`);
