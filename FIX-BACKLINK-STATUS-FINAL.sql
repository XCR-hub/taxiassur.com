/*
  # Fix Backlink Opportunities Status

  1. Changes
    - Change all "new" opportunities to "pending" if they have an email
    - Create function to auto-update status when email is added
    - Add trigger to ensure new opportunities with emails are "pending"

  2. Security
    - No RLS changes needed
*/

-- 1. Changer tous les "new" en "pending" s'ils ont un email
UPDATE backlink_opportunities
SET status = 'pending'
WHERE status = 'new' 
  AND contact_email IS NOT NULL 
  AND contact_email != '';

-- 2. Fonction pour auto-update status quand email ajouté
CREATE OR REPLACE FUNCTION auto_update_backlink_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un email est ajouté et status = "new", passer à "pending"
  IF NEW.contact_email IS NOT NULL 
     AND NEW.contact_email != '' 
     AND NEW.status = 'new' THEN
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_update_backlink_status ON backlink_opportunities;
CREATE TRIGGER trigger_auto_update_backlink_status
  BEFORE INSERT OR UPDATE ON backlink_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_backlink_status();

-- 4. Vérifier le résultat
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as with_email
FROM backlink_opportunities
GROUP BY status
ORDER BY status;
