#!/usr/bin/env bash

# Configure Monetico production secrets without storing the MAC key in Git.
# Usage:
#   SUPABASE_PROJECT_REF=drohhxrkoequjphvabvq MONETICO_TPE=... MONETICO_SOCIETE=taxiassur bash scripts/configure-monetico-production.sh

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-drohhxrkoequjphvabvq}"
MONETICO_TPE_VALUE="${MONETICO_TPE:-7374133}"
MONETICO_SOCIETE_VALUE="${MONETICO_SOCIETE:-taxiassur}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if ! command -v supabase >/dev/null 2>&1; then
  echo -e "${RED}Supabase CLI non installe.${NC}"
  echo "Installation: npm install -g supabase"
  exit 1
fi

if ! supabase projects list >/dev/null 2>&1; then
  echo -e "${YELLOW}Connexion Supabase requise.${NC}"
  supabase login
fi

echo -e "${BLUE}Configuration Monetico production${NC}"
echo "  Project ref: ${PROJECT_REF}"
echo "  TPE: ${MONETICO_TPE_VALUE}"
echo "  Societe: ${MONETICO_SOCIETE_VALUE}"
echo "  Webhook: https://${PROJECT_REF}.supabase.co/functions/v1/monetico-webhook"
echo ""
echo -e "${YELLOW}Attention: les paiements seront reels en mode production.${NC}"
echo ""

supabase secrets list --project-ref "${PROJECT_REF}" 2>/dev/null | grep MONETICO || echo "  Aucun secret Monetico trouve."
echo ""

read -r -s -p "Cle MAC Monetico production (40 caracteres hexadecimaux): " mac_key
echo ""

if [[ ${#mac_key} -ne 40 ]]; then
  echo -e "${RED}Erreur: la cle MAC doit faire 40 caracteres.${NC}"
  exit 1
fi

if ! [[ $mac_key =~ ^[0-9A-Fa-f]{40}$ ]]; then
  echo -e "${RED}Erreur: la cle MAC doit etre hexadecimale (0-9, A-F).${NC}"
  exit 1
fi

echo "MONETICO_MODE=production"
echo "MONETICO_TPE=${MONETICO_TPE_VALUE}"
echo "MONETICO_SOCIETE=${MONETICO_SOCIETE_VALUE}"
echo "MONETICO_MAC_KEY=${mac_key:0:6}...${mac_key:34:6}"
read -r -p "Confirmer la configuration en production ? (o/N) " confirm

if [[ ! $confirm =~ ^[Oo]$ ]]; then
  echo "Configuration annulee."
  exit 0
fi

supabase secrets set \
  --project-ref "${PROJECT_REF}" \
  MONETICO_MODE="production" \
  MONETICO_TPE="${MONETICO_TPE_VALUE}" \
  MONETICO_SOCIETE="${MONETICO_SOCIETE_VALUE}" \
  MONETICO_MAC_KEY="$mac_key" >/dev/null

echo -e "${GREEN}Secrets Monetico configures.${NC}"
supabase secrets list --project-ref "${PROJECT_REF}" | grep MONETICO
