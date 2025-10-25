# 🚨 URGENT : Appliquer Migration signature_requests

## Erreur détectée

```
signature_requests?select=*&lead_id=eq.xxx 404
```

La table `signature_requests` n'existe pas dans votre base Supabase.

---

## ✅ Solution : Exécuter la migration SQL

### Étape 1 : Aller sur Supabase SQL Editor

1. Ouvrir : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
2. Cliquer sur "New Query"

### Étape 2 : Copier-coller ce SQL

```sql
/*
  # Table des demandes de signature électronique (EDI Signature)
*/

-- Créer la table signature_requests si elle n'existe pas
CREATE TABLE IF NOT EXISTS signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  edi_request_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  title text NOT NULL,
  document_url text,
  signature_url text,
  signed_document_url text,
  viewed_at timestamptz,
  signed_at timestamptz,
  completed_at timestamptz,
  expired_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_signature_requests_lead_id
  ON signature_requests(lead_id);

CREATE INDEX IF NOT EXISTS idx_signature_requests_edi_request_id
  ON signature_requests(edi_request_id);

CREATE INDEX IF NOT EXISTS idx_signature_requests_status
  ON signature_requests(status);

CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at
  ON signature_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all signature requests
DROP POLICY IF EXISTS "Authenticated users can read signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can read signature requests"
  ON signature_requests FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert signature requests
DROP POLICY IF EXISTS "Authenticated users can insert signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can insert signature requests"
  ON signature_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update signature requests
DROP POLICY IF EXISTS "Authenticated users can update signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can update signature requests"
  ON signature_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete signature requests
DROP POLICY IF EXISTS "Authenticated users can delete signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can delete signature requests"
  ON signature_requests FOR DELETE
  TO authenticated
  USING (true);

-- Function pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS signature_requests_updated_at ON signature_requests;
CREATE TRIGGER signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_requests_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE signature_requests IS 'Demandes de signature électronique via EDI Signature';
COMMENT ON COLUMN signature_requests.edi_request_id IS 'ID unique de la demande dans EDI Signature';
COMMENT ON COLUMN signature_requests.status IS 'Statut: pending, viewed, signed, completed, declined, expired, cancelled';
COMMENT ON COLUMN signature_requests.signature_url IS 'URL unique pour que le client signe le document';
COMMENT ON COLUMN signature_requests.signed_document_url IS 'URL du document signé final';
```

### Étape 3 : Cliquer sur "Run"

✅ La table sera créée
✅ Les RLS policies seront appliquées
✅ L'erreur 404 disparaîtra

---

## Vérification

Pour vérifier que la table existe :

```sql
SELECT * FROM signature_requests LIMIT 5;
```

Devrait retourner une table vide (0 lignes) sans erreur.

---

**Fichier source :** `supabase/migrations/20251014040000_create_signature_requests_table.sql`
