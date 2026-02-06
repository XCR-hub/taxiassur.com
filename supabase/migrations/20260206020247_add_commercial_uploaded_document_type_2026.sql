/*
  # Ajout du type 'commercial_uploaded_document' aux notifications

  Ajoute le nouveau type de notification pour différencier les uploads
  du commercial de ceux du prospect
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE crm_document_notifications 
DROP CONSTRAINT IF EXISTS crm_document_notifications_notification_type_check;

-- Recréer la contrainte avec le nouveau type
ALTER TABLE crm_document_notifications
ADD CONSTRAINT crm_document_notifications_notification_type_check
CHECK (notification_type = ANY (ARRAY[
  'document_uploaded'::text,
  'commercial_uploaded_document'::text,
  'document_validated'::text,
  'document_rejected'::text,
  'contract_ready'::text,
  'all_documents_complete'::text
]));

-- Maintenant mettre à jour les anciennes notifications avec le bon type
UPDATE crm_document_notifications n
SET notification_type = 'commercial_uploaded_document'
WHERE n.notification_type = 'document_uploaded'
  AND n.status IN ('pending', 'error')
  AND EXISTS (
    SELECT 1 
    FROM crm_lead_documents d
    WHERE d.id = n.document_id
      AND (d.uploaded_by IS NULL OR d.uploaded_by != 'prospect')
  );

-- Supprimer les notifications qui sont des uploads prospect
DELETE FROM crm_document_notifications n
WHERE n.notification_type = 'document_uploaded'
  AND EXISTS (
    SELECT 1 
    FROM crm_lead_documents d
    WHERE d.id = n.document_id
      AND d.uploaded_by = 'prospect'
  );
