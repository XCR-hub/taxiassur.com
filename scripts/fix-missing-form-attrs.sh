#!/bin/bash

# Script pour ajouter id/name automatiquement aux inputs sans attributs

# Fonction pour ajouter id et name à un input basé sur son contexte
fix_input() {
  local file="$1"

  # Créer une sauvegarde
  cp "$file" "$file.bak"

  # Utiliser Python pour un traitement plus intelligent
  python3 << 'PYTHON_SCRIPT'
import re
import sys

def add_id_name(match):
    full_match = match.group(0)
    attrs = match.group(1)

    # Si déjà id ou name, ne rien faire
    if 'id=' in attrs or 'name=' in attrs:
        return full_match

    # Détecter le type d'input
    type_match = re.search(r'type="([^"]+)"', attrs)
    placeholder_match = re.search(r'placeholder="([^"]+)"', attrs)
    value_match = re.search(r'value=\{[^}]*\.([^}]+)\}', attrs)

    field_name = "field"
    autocomplete_attr = ""

    if type_match:
        input_type = type_match.group(1)
        if input_type == "email":
            field_name = "email"
            autocomplete_attr = ' autoComplete="email"'
        elif input_type == "tel":
            field_name = "phone"
            autocomplete_attr = ' autoComplete="tel"'
        elif input_type == "text":
            if placeholder_match:
                ph = placeholder_match.group(1).lower()
                if "nom" in ph or "name" in ph:
                    field_name = "name"
                    autocomplete_attr = ' autoComplete="name"'
                elif "prenom" in ph or "first" in ph:
                    field_name = "first_name"
                    autocomplete_attr = ' autoComplete="given-name"'
                elif "email" in ph:
                    field_name = "email"
                    autocomplete_attr = ' autoComplete="email"'
                elif "ville" in ph or "city" in ph:
                    field_name = "city"
                    autocomplete_attr = ' autoComplete="address-level2"'
                elif "code postal" in ph or "postal" in ph:
                    field_name = "postal_code"
                    autocomplete_attr = ' autoComplete="postal-code"'
                else:
                    # Nettoyer le placeholder pour en faire un nom de champ
                    field_name = ph.replace(" ", "_").replace("'", "").replace("é", "e").replace("è", "e")[:20]
            elif value_match:
                field_name = value_match.group(1)
        elif input_type == "number":
            if placeholder_match and "montant" in placeholder_match.group(1).lower():
                field_name = "amount"
            else:
                field_name = "number"

    # Ajouter les attributs
    new_attrs = f'{attrs} id="{field_name}" name="{field_name}"{autocomplete_attr}'
    return f'<input {new_attrs}>'

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer les inputs sans id/name
pattern = r'<input\s+([^>]*?)>'
content = re.sub(pattern, add_id_name, content)

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✓ Fixed {sys.argv[1]}")
PYTHON_SCRIPT
}

# Fichiers critiques à corriger en priorité
CRITICAL_FILES=(
  "src/pages/AdminDashboard.tsx"
  "src/components/AdminLogin.tsx"
  "src/components/crm/PaymentManager.tsx"
  "src/components/crm/CallLoggerModal.tsx"
  "src/components/crm/PaiementRIBStep.tsx"
)

echo "Correction des attributs manquants dans les formulaires..."

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    python3 -c "
import re
import sys

def add_id_name(match):
    full_match = match.group(0)
    attrs = match.group(1)

    if 'id=' in attrs or 'name=' in attrs:
        return full_match

    type_match = re.search(r'type=\"([^\"]+)\"', attrs)
    if type_match:
        input_type = type_match.group(1)
        field_name = input_type if input_type in ['email', 'tel'] else 'field'
        autocomplete = ' autoComplete=\"' + input_type + '\"' if input_type in ['email', 'tel'] else ''
        return f'<input {attrs} id=\"{field_name}\" name=\"{field_name}\"{autocomplete}>'
    return full_match

with open('$file', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<input\s+([^>]*?)>'
content = re.sub(pattern, add_id_name, content)

with open('$file', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'✓ Fixed $file')
"
  fi
done

echo "✅ Correction terminée !"
