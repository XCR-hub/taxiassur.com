-- Vérifier l'état de la fonction toggle_automation
SELECT 
  proname as "Nom fonction",
  prosecdef as "SECURITY DEFINER?",
  CASE 
    WHEN prosecdef THEN '✅ OUI - La fonction a les permissions'
    ELSE '❌ NON - ERREUR 401 normale'
  END as "Status"
FROM pg_proc 
WHERE proname = 'toggle_automation';

-- Si la colonne "SECURITY DEFINER?" = false (ou ❌)
-- → Il FAUT exécuter FIX-CLEAN-FINAL.sql
