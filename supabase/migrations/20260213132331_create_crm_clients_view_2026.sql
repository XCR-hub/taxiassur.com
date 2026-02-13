/*
  # Vue crm_clients pour compatibilité
  
  Crée une vue qui expose crm_leads comme crm_clients
  pour maintenir la compatibilité avec le code existant
*/

-- Vue crm_clients basée sur crm_leads (clients convertis)
CREATE OR REPLACE VIEW crm_clients AS
SELECT 
  id,
  first_name,
  last_name,
  prenom,
  nom,
  email,
  phone,
  telephone,
  address,
  adresse,
  postal_code,
  code_postal,
  city,
  ville,
  company_name,
  siret,
  immatriculation,
  contract_number,
  status,
  metadata,
  created_at,
  updated_at,
  converted_at,
  access_token
FROM crm_leads
WHERE converted_to_client = true
  AND deleted_at IS NULL;