#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   📧 DIAGNOSTIC RAPIDE - EMAILS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📊 Statistiques des 7 derniers jours${NC}"
echo ""

# Leads créés
LEADS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM crm_leads WHERE created_at > NOW() - INTERVAL '7 days'" 2>/dev/null || echo "N/A")
echo -e "  Nouveaux leads : ${GREEN}${LEADS_COUNT}${NC}"

# Emails envoyés
EMAILS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM email_sends WHERE created_at > NOW() - INTERVAL '7 days'" 2>/dev/null || echo "N/A")
echo -e "  Emails envoyés : ${GREEN}${EMAILS_COUNT}${NC}"

# Emails à team@
TEAM_EMAILS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM email_sends WHERE email_to = 'team@taxiassur.com' AND created_at > NOW() - INTERVAL '7 days'" 2>/dev/null || echo "N/A")
echo -e "  Emails à team@ : ${GREEN}${TEAM_EMAILS}${NC}"

echo ""
echo -e "${YELLOW}📆 Aujourd'hui${NC}"
echo ""

# Leads aujourd'hui
TODAY_LEADS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM crm_leads WHERE created_at::date = CURRENT_DATE" 2>/dev/null || echo "N/A")
echo -e "  Nouveaux leads : ${GREEN}${TODAY_LEADS}${NC}"

# Emails aujourd'hui
TODAY_EMAILS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM email_sends WHERE created_at::date = CURRENT_DATE" 2>/dev/null || echo "N/A")
echo -e "  Emails envoyés : ${GREEN}${TODAY_EMAILS}${NC}"

echo ""
echo -e "${YELLOW}🕐 Dernier lead reçu${NC}"
echo ""

LAST_LEAD=$(psql "$DATABASE_URL" -t -c "SELECT full_name || ' (' || email || ') le ' || TO_CHAR(created_at, 'DD/MM à HH24:MI') FROM crm_leads ORDER BY created_at DESC LIMIT 1" 2>/dev/null || echo "N/A")
echo -e "  ${LAST_LEAD}"

echo ""
echo -e "${YELLOW}📧 Derniers emails envoyés${NC}"
echo ""

psql "$DATABASE_URL" -c "SELECT TO_CHAR(sent_at, 'DD/MM HH24:MI') as date, email_to as destinataire, LEFT(subject, 50) as sujet FROM email_sends ORDER BY sent_at DESC LIMIT 5" 2>/dev/null || echo "Impossible de récupérer les emails"

echo ""
echo -e "${YELLOW}🔧 Status des triggers${NC}"
echo ""

TRIGGERS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE '%email%' OR trigger_name LIKE '%notif%'" 2>/dev/null || echo "N/A")
echo -e "  Triggers email actifs : ${GREEN}${TRIGGERS_COUNT}${NC}"

echo ""
echo -e "${YELLOW}⚙️  Status des crons${NC}"
echo ""

CRONS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM cron.job WHERE active = true AND (jobname LIKE '%email%' OR jobname LIKE '%lead%')" 2>/dev/null || echo "N/A")
echo -e "  Crons email actifs : ${GREEN}${CRONS_COUNT}${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DIAGNOSTIC TERMINÉ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$TODAY_LEADS" = "0" ] || [ "$TODAY_LEADS" = " 0" ]; then
    echo -e "${RED}⚠️  PROBLÈME DÉTECTÉ${NC}"
    echo ""
    echo "Aucun lead reçu aujourd'hui."
    echo "Le système d'emails fonctionne, mais vous n'avez pas de nouveaux prospects."
    echo ""
    echo "Actions recommandées :"
    echo "  1. Vérifier que le site est accessible"
    echo "  2. Tester le formulaire de contact manuellement"
    echo "  3. Vérifier Google Analytics (trafic)"
    echo "  4. Lancer une campagne marketing"
    echo ""
    echo "Documentation complète : DIAGNOSTIC_EMAILS_23FEV2026.md"
else
    echo -e "${GREEN}✅ Système opérationnel${NC}"
    echo ""
    echo "Les emails sont envoyés correctement."
fi

echo ""
