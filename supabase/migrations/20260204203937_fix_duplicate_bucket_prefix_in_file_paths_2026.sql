/*
  # Nettoyage des préfixes de bucket dupliqués dans les file_path

  1. Problème
    - Certains file_path contiennent le préfixe du bucket (ex: crm-documents/...)
    - Lors de la génération d'URL, cela crée une duplication: /crm-documents/crm-documents/...
    - Résultat: erreur 404 "Object not found"

  2. Solution
    - Nettoyer tous les file_path pour enlever les préfixes de bucket
    - Le file_path doit contenir uniquement le chemin relatif dans le bucket
    - Les buckets sont déterminés par la source ou par le code

  3. Tables affectées
    - crm_lead_documents
    - prospect_documents
    - email_attachments (storage_path)
*/

-- Nettoyer crm_lead_documents
UPDATE crm_lead_documents
SET file_path = REGEXP_REPLACE(file_path, '^(email-attachments|prospect-documents|crm-documents)/', '', 'g')
WHERE file_path ~ '^(email-attachments|prospect-documents|crm-documents)/';

-- Nettoyer prospect_documents
UPDATE prospect_documents
SET file_path = REGEXP_REPLACE(file_path, '^(email-attachments|prospect-documents|crm-documents)/', '', 'g')
WHERE file_path ~ '^(email-attachments|prospect-documents|crm-documents)/';

-- Nettoyer email_attachments (colonne storage_path)
UPDATE email_attachments
SET storage_path = REGEXP_REPLACE(storage_path, '^(email-attachments|prospect-documents|crm-documents)/', '', 'g')
WHERE storage_path ~ '^(email-attachments|prospect-documents|crm-documents)/';

-- Vérifier les résultats
DO $$
DECLARE
  crm_fixed integer;
  prospect_fixed integer;
  email_fixed integer;
BEGIN
  SELECT COUNT(*) INTO crm_fixed FROM crm_lead_documents WHERE file_path ~ '^(email-attachments|prospect-documents|crm-documents)/';
  SELECT COUNT(*) INTO prospect_fixed FROM prospect_documents WHERE file_path ~ '^(email-attachments|prospect-documents|crm-documents)/';
  SELECT COUNT(*) INTO email_fixed FROM email_attachments WHERE storage_path ~ '^(email-attachments|prospect-documents|crm-documents)/';
  
  IF crm_fixed > 0 OR prospect_fixed > 0 OR email_fixed > 0 THEN
    RAISE WARNING 'Il reste encore des préfixes à nettoyer: crm=%, prospect=%, email=%', crm_fixed, prospect_fixed, email_fixed;
  ELSE
    RAISE NOTICE '✅ Tous les file_path ont été nettoyés correctement';
  END IF;
END $$;
