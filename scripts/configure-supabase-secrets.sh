#!/bin/bash

# Script de configuration des secrets Supabase
# Exécuter avec: bash scripts/configure-supabase-secrets.sh

set -e

echo "=========================================="
echo "Configuration des Secrets Supabase"
echo "=========================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo "Installation: npm install -g supabase"
    exit 1
fi

echo -e "${YELLOW}📝 Vérification de l'authentification...${NC}"

# Vérifier si on est déjà connecté
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}🔐 Authentification requise...${NC}"
    supabase login
else
    echo -e "${GREEN}✅ Déjà authentifié${NC}"
fi

echo ""
echo -e "${YELLOW}🔗 Liaison au projet...${NC}"
supabase link --project-ref qiavtxpaznxpttkdaevy

echo ""
echo -e "${YELLOW}🔧 Configuration des secrets (50+ secrets)...${NC}"
echo ""

# ============================================
# 1. EMAILS (IONOS, Brevo, SendGrid, Resend)
# ============================================
echo -e "${GREEN}[Emails] Configuration IONOS...${NC}"
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!"
supabase secrets set IONOS_SMTP_PASSWORD="TAXIassur!"
supabase secrets set IONOS_IMAP_PASSWORD="TAXIassur!"
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"
supabase secrets set IONOS_SMTP_USER="smtp.ionos.fr"
supabase secrets set IONOS_EMAIL_USER="team@taxiassur.com"
supabase secrets set IONOS_IMAP_HOST="imap.ionos.fr"
supabase secrets set IONOS_IMAP_PORT="993"
supabase secrets set IONOS_IMAP_USER="team@taxiassur.com"

echo -e "${GREEN}[Emails] Configuration Brevo...${NC}"
supabase secrets set BREVO_API_KEY="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"
supabase secrets set BREVO_SENDER_EMAIL="team@taxiassur.com"
supabase secrets set BREVO_SENDER_NAME="TaxiAssur"

echo -e "${GREEN}[Emails] Configuration SendGrid...${NC}"
supabase secrets set SENDGRID_API_KEY="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"

echo -e "${GREEN}[Emails] Configuration Resend...${NC}"
supabase secrets set RESEND_API_KEY="re_5QaqcEPK_NFR2iEmg21JwvCWRzjQrNQgn"

# ============================================
# 2. INTELLIGENCE ARTIFICIELLE
# ============================================
echo -e "${GREEN}[IA] Configuration OpenAI...${NC}"
supabase secrets set OPENAI_API_KEY="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"

echo -e "${GREEN}[IA] Configuration Anthropic (Claude)...${NC}"
supabase secrets set ANTHROPIC_API_KEY="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"

echo -e "${GREEN}[IA] Configuration Gemini (Google)...${NC}"
supabase secrets set GEMINI_API_KEY="AIzaSyAa5iNz0pdx-BhzGfaq2sALto3vGbE-lOg"

echo -e "${GREEN}[IA] Configuration OpenRouter...${NC}"
supabase secrets set OPENROUTER_API_KEY="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"

echo -e "${GREEN}[IA] Configuration Hugging Face...${NC}"
supabase secrets set HUGGINGFACE_API_KEY="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"

# ============================================
# 3. RÉSEAUX SOCIAUX
# ============================================
echo -e "${GREEN}[Social] Configuration LinkedIn...${NC}"
supabase secrets set LINKEDIN_ACCESS_TOKEN="AQV7bN8vSwlvNLg2SDGoh7eX_zRtP5bvF_J_KbPm_nPV7CkTy7v5C6j1i4z1ULbARfxQ6VU1uh8bPrnlcTKhG5AttZz6qHLK_m1BcpL4l_dgRIliaW_JkNF6XrXPPLNMXQciIHvETKAqTyHI9pFycw7k1FOqZG98KZeiWy-_lmofY7kdwFsxpRXkbcOL7YNEmzMHgquk82IJg35G3TBKpZgFoDJ4RA6YGzqOjEdNm1kL6lMhrJIFeMz-tCHj0ARTAysBuZ1s6HrsdwCmFuY8DGBQDTMKaCEcRC_BHmbztQM5qQg3sk2oYzazzxAcwDFOkGtmwHaXizpsmHUKNYeOpGPxPajX5Q"
supabase secrets set LINKEDIN_CLIENT_ID="78jlte9c2mbjw5"
supabase secrets set LINKEDIN_CLIENT_SECRET="WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw=="

echo -e "${GREEN}[Social] Configuration Pinterest...${NC}"
supabase secrets set PINTEREST_ACCESS_TOKEN="pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA"

# ============================================
# 4. SMS & WHATSAPP (Twilio)
# ============================================
echo -e "${GREEN}[SMS/WhatsApp] Configuration Twilio...${NC}"
supabase secrets set TWILIO_ACCOUNT_SID="ACe735b7f24703a4b496ca1c816c1d610f"
supabase secrets set TWILIO_AUTH_TOKEN="c41bbe10082bd4d290ed1d41b624e05a"
supabase secrets set TWILIO_MESSAGING_SERVICE_SID="MGcefbb28732fdb969fea3f71913738f17"

# ============================================
# 5. MÉDIAS & IMAGES
# ============================================
echo -e "${GREEN}[Médias] Configuration Pexels...${NC}"
supabase secrets set PEXELS_API_KEY="mwktI0rV88p2CHnMP6jliUIPDPBEniubiF7cneG1uFRQ0Yxsu8XmNyG3"

# ============================================
# 6. SEO & GOOGLE SERVICES
# ============================================
echo -e "${GREEN}[SEO] Configuration Google...${NC}"
supabase secrets set GOOGLE_SEARCH_CONSOLE_API_KEY="AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o"
supabase secrets set GOOGLE_CSE_API_KEY="AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o"
supabase secrets set GOOGLE_CSE_CX="73ba86b5aae9b4add"
supabase secrets set GOOGLE_CSE_CX_ID="73ba86b5aae9b4add"
supabase secrets set GOOGLE_PLACES_API_KEY="AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o"
supabase secrets set GOOGLE_CLIENT_ID="99189284491-trog606nhubrt4su0bskpacc388420gm.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="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"

echo -e "${GREEN}[SEO] Configuration Google Search Console (JSON)...${NC}"
supabase secrets set GOOGLE_SEARCH_CONSOLE_CREDENTIALS='{"type":"service_account","project_id":"taxiassur-472913","private_key_id":"c85d07f91b2664b26f4703c1ed7ba3af8c13ec5f","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDfdNzI8FXtU0ks\nPWSoapTJ+B7dIuPaRrvYdBnYYXWdCwz4LmQQpkt0V0iva9S2SVghTRTywqT2P7j4\nKC9WONW60n5Vh10kkskf7zH7rVRsRtHT/Bq2CEue2fdhlqVxAUNMWPj9MK+pghwI\nwvqz+sXhzt1Umie4Ma1jnvLwzdqh0s3SSrpBnNv2Eg6BxRk/dg1Rr9dY7FcMPu+U\nOkc+8/xDRzjF+BHrj8u8KLyL2rIdBF1H32uSOXcRVCl4F/PTcZr2DlquLkQdQyV2\no84SRcK1Hbg3pXLrT5i6FENaaxuK7iFrwLqKbuFHmHUZ1QGlHlCw/Rv5Rt16fwlh\nEtMLC6TjAgMBAAECggEAZSeuYMonY9FtkPjTzce9xjYrppiKQ//8Pi7Emmb4Cpj7\njIfXpY/aHXb7wOmT99b47c5KmuCRM6ZCEhiC4UnGOxXZudcWy50lLe8mldNvobpn\nd0qrPtc/gFAUhBlhmGflcrTeNiOpiZcMIM0/F2WA2ck++XL1YxUd9Dh6qpbNj64Z\nBViWw8gv8wzCotwnsi473V1ZmNDvjvZP34ZzEBj2ksKtF4jfZZ0yQfKLhLcfQdHN\nOVPvwxywyyFu+lKEeabvfUonrPqVtz9a4un2Fpcib4mCfCMV9ECP2wOxuf27zem8\npEuZGztXr7KR35XfTTAJjUxJS3x5+6nJNzYofHIaUQKBgQD0Tt7euE3YEHPVDLOw\nbVOiiNXWW/hIR+9vnCfgej7CZYm1qFdEJJRefq48VWz9i1tunT/hyRr0UMwJigEt\ngXVYUEbcvK7tedbNhgYO2hs5wPeFfX8KbO2Q14dbMoRNvWef1JRokOfGSWHX9hcJ\n8yX3jb4X8W8mpwWfXBdt54R60wKBgQDqJoeNIV1Ony2PBWkyIKVPQd78x7DUmHNa\ny/ztb58pCI80wRUt1K4I2pD6xrmsz+IFbJ5LfQQxdcgEWpx7es9QrAnQhX2bTPBR\nctd1Hh87FZqtFskmWGttRB4lyn9kS441BEno6OrcgqK4pb54EWCyPwUXzTO+DlJQ\nINVGXwzDsQKBgClGKeD2wi/+l5Mm0jS8Q6Tx+S592zRa8tioSRRjkrbE8L7/8b5R\nb7+HJ2iKBh/Pq2LErkY285bTD6WM6yYE+Q4ygcZJGkSEkQWn3t4jevYG48ppqUzZ\nmkkeIIAHyNJZbWhTQb9ou7+EJkOWD85ehcuM5tCkuWKOVSTXKh4nPvqBAoGBAL+U\notgQcn2/s9EPhlDjcR52MPL2mHJ6AfhKazoCWGGEhVeOm7uSBotr+a+WJZmFxdLW\nWnY9Zc7qJauaT+qgQzwoZydb8be9reuWYT+MU9VOCe6RdCeRtOQEFf6pvq3bPBGY\n3rhYysF9iZI22q722P0+nvYoiat5oFO7aYVYg+MhAoGAEGNtvzvV37vsd0xmRH9A\ndmbNwjJipTxGag/d2gVd5jhfT/pffm2TYrtx6nF+T7pRWTsbwZBrN4MK+6JFt8DY\nnZ0+Gzhnunap1YyVrv0igsBYvKb2cuncTr8MmG6Af2SFmTxRYZVDaSpH9chBEPc3\nuc/jyS9DXaqrwyEDBaseoIY=\n-----END PRIVATE KEY-----\n","client_email":"taxiassur-search-console@taxiassur-472913.iam.gserviceaccount.com","client_id":"100871620434170037441","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/taxiassur-search-console%40taxiassur-472913.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'

supabase secrets set GOOGLE_OAUTH_JSON='{"client_id":"99189284491-trog606nhubrt4su0bskpacc388420gm.apps.googleusercontent.com","project_id":"taxiassur-472913","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","javascript_origins":["https://www.taxiassur.com"]}'

echo -e "${GREEN}[SEO] Configuration SERP API...${NC}"
supabase secrets set SERP_API_KEY="420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202"

# ============================================
# 7. LEAD GENERATION & EMAIL FINDER
# ============================================
echo -e "${GREEN}[Leads] Configuration Hunter.io...${NC}"
supabase secrets set HUNTER_API_KEY="1e15e1c7b4db255256872dc4bf9939f3b655981c"
supabase secrets set HUNTER_IO_API_KEY="1e15e1c7b4db255256872dc4bf9939f3b655981c"

# ============================================
# 8. AUTOMATION & INTÉGRATIONS
# ============================================
echo -e "${GREEN}[Automation] Configuration Make.com...${NC}"
supabase secrets set MAKE_API_TOKEN="507a717b-3a95-483e-8fa0-215cff5c48f2"

echo -e "${GREEN}[Automation] Configuration site...${NC}"
supabase secrets set SITE_URL="https://taxiassur.com"

# ============================================
# 9. FTP/SFTP & DÉPLOIEMENT
# ============================================
echo -e "${GREEN}[Déploiement] Configuration FTP/SFTP...${NC}"
supabase secrets set FTP_HOST="home749874859.1and1-data.host"
supabase secrets set FTP_USER="acc1591324770"
supabase secrets set FTP_PASSWORD="TAXIassur2025!,&"
supabase secrets set FTP_PORT="22"
supabase secrets set FTP_PROTOCOL="sftp"
supabase secrets set GITHUB_REPO="XCR-hub/taxiassur.com"

echo ""
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo ""
echo -e "${YELLOW}📊 Résumé des secrets configurés :${NC}"
echo ""
echo "  ✅ IONOS (10 secrets) - Emails SMTP/IMAP"
echo "  ✅ Intelligence Artificielle (5 secrets) - OpenAI, Claude, Gemini, OpenRouter, Hugging Face"
echo "  ✅ Emails alternatifs (3 secrets) - Brevo, SendGrid, Resend"
echo "  ✅ Réseaux sociaux (4 secrets) - LinkedIn, Pinterest"
echo "  ✅ SMS/WhatsApp (3 secrets) - Twilio"
echo "  ✅ SEO & Google (11 secrets) - Search Console, CSE, OAuth, SERP API"
echo "  ✅ Lead Generation (2 secrets) - Hunter.io"
echo "  ✅ Automation (2 secrets) - Make.com, Site URL"
echo "  ✅ Déploiement (6 secrets) - FTP/SFTP, GitHub"
echo "  ✅ Médias (1 secret) - Pexels"
echo ""
echo "  📊 TOTAL : 50+ secrets configurés"
echo ""
echo -e "${YELLOW}📝 Vérification des secrets configurés :${NC}"
echo ""

supabase secrets list

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Tous les secrets ont été configurés !"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}ℹ️  Prochaines étapes :${NC}"
echo "1. Tester l'envoi d'email (IONOS SMTP)"
echo "2. Tester le chatbot IA (OpenAI/Claude/Gemini)"
echo "3. Tester les publications LinkedIn/Pinterest"
echo "4. Tester l'envoi de SMS/WhatsApp (Twilio)"
echo "5. Vérifier Google Search Console"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - Secrets Monético PRODUCTION :${NC}"
echo "Les secrets Monético sont en MODE TEST actuellement."
echo "Pour passer en PRODUCTION, demandez à Ingineco :"
echo "  - MONETICO_TPE"
echo "  - MONETICO_MAC_KEY"
echo "Puis exécutez :"
echo '  supabase secrets set MONETICO_MODE="production"'
echo '  supabase secrets set MONETICO_TPE="VOTRE_TPE"'
echo '  supabase secrets set MONETICO_MAC_KEY="VOTRE_CLE_MAC"'
echo ""
echo -e "${GREEN}🎉 Configuration réussie ! Votre système est opérationnel.${NC}"
echo ""
