#!/usr/bin/env python3
"""
Script pour remplacer toutes les références .from('leads') par .from('crm_leads')
"""
import os
import re
from pathlib import Path

def fix_leads_references(directory):
    """Parcourir tous les fichiers .ts et .tsx et remplacer les références"""
    count = 0
    files_modified = []

    for root, dirs, files in os.walk(directory):
        # Ignorer node_modules et dist
        if 'node_modules' in root or 'dist' in root:
            continue

        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)

                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # Remplacer .from('leads') par .from('crm_leads')
                    new_content = content.replace(".from('leads')", ".from('crm_leads')")
                    new_content = new_content.replace('.from("leads")', '.from("crm_leads")')

                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        count += 1
                        files_modified.append(filepath)
                        print(f"✅ Fixed: {filepath}")

                except Exception as e:
                    print(f"❌ Error in {filepath}: {e}")

    print(f"\n✅ Total files modified: {count}")
    return files_modified

if __name__ == "__main__":
    src_dir = "/tmp/cc-agent/61788020/project/src"
    print(f"🔍 Scanning {src_dir}...\n")
    fix_leads_references(src_dir)
