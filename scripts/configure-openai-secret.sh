#!/usr/bin/env bash

# Configure OPENAI_API_KEY in Supabase without storing the key in Git.
# Usage:
#   OPENAI_API_KEY=... SUPABASE_PROJECT_REF=drohhxrkoequjphvabvq bash scripts/configure-openai-secret.sh

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-drohhxrkoequjphvabvq}"
OPENAI_KEY="${OPENAI_API_KEY:-}"

if [[ -z "${OPENAI_KEY}" ]]; then
  read -r -s -p "OPENAI_API_KEY: " OPENAI_KEY
  echo
fi

if [[ -z "${OPENAI_KEY}" ]]; then
  echo "OPENAI_API_KEY manquante."
  exit 1
fi

supabase secrets set "OPENAI_API_KEY=${OPENAI_KEY}" --project-ref "${PROJECT_REF}" >/dev/null
echo "OPENAI_API_KEY configuree dans Supabase (${PROJECT_REF})."
