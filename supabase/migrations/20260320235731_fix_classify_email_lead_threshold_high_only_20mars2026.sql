/*
  # Fix classify_email_lead - Raise threshold for new lead creation

  ## Problem
  The threshold was `score >= 10`, meaning any email from Gmail (score +15 for
  consumer domain) would be classified as a real lead. This created hundreds of
  junk leads from random emails.

  ## Solution
  - `is_real_lead = score >= 50` (HIGH confidence only) → creates a new lead
  - Score 10-49 = MEDIUM → email linked to existing lead only (no new lead)
  - Score -10 to 9 = LOW → email stored, no lead action
  - Score < -10 = REJECTED → email ignored

  ## What score >= 50 requires (examples)
  - Real full name (+30) + taxi/assurance keyword in subject (+40) = 70 → HIGH ✓
  - Phone number in body (+20) + taxi keyword (+40) = 60 → HIGH ✓
  - Already in CRM (+35) + real name (+30) = 65 → HIGH ✓ (links to existing)
  - Just a Gmail address with no taxi signals (+15) = 15 → MEDIUM → NO new lead ✗
*/

CREATE OR REPLACE FUNCTION classify_email_lead(
  p_email      text,
  p_subject    text    DEFAULT NULL,
  p_body       text    DEFAULT NULL,
  p_from_name  text    DEFAULT NULL,
  p_has_attach boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score       integer := 0;
  v_reasons     text[]  := ARRAY[]::text[];
  v_email_lower text;
  v_username    text;
  v_domain      text;
  v_name_parts  text[];
  v_digit_count integer;
  v_char_count  integer;
  v_is_real     boolean;
  v_confidence  text;
BEGIN
  v_email_lower := LOWER(TRIM(p_email));
  v_username    := SPLIT_PART(v_email_lower, '@', 1);
  v_domain      := SPLIT_PART(v_email_lower, '@', 2);

  -- ---- SIGNAUX NÉGATIFS ----

  IF is_email_blacklisted(p_email) THEN
    v_score   := v_score - 100;
    v_reasons := array_append(v_reasons, 'Email/domaine sur liste noire');
  END IF;

  IF length(v_username) < 3 THEN
    v_score   := v_score - 30;
    v_reasons := array_append(v_reasons, 'Nom d''utilisateur trop court');
  END IF;

  v_digit_count := length(regexp_replace(v_username, '[^0-9]', '', 'g'));
  v_char_count  := length(v_username);
  IF v_char_count > 0 AND (v_digit_count::float / v_char_count) > 0.5 THEN
    v_score   := v_score - 25;
    v_reasons := array_append(v_reasons, 'Username avec majorité de chiffres (aléatoire)');
  END IF;

  IF length(v_username) > 20
    AND v_username NOT LIKE '%.%'
    AND v_username NOT LIKE '%_%'
    AND v_username NOT LIKE '%-%'
  THEN
    v_score   := v_score - 20;
    v_reasons := array_append(v_reasons, 'Username trop long sans séparateur');
  END IF;

  IF p_subject IS NOT NULL AND (
    p_subject ILIKE 'Re:%' OR p_subject ILIKE 'Fwd:%' OR
    p_subject ILIKE 'TR:%' OR p_subject ILIKE 'AW:%'
  ) THEN
    v_score   := v_score - 20;
    v_reasons := array_append(v_reasons, 'Email de réponse/transfert');
  END IF;

  IF p_subject IS NOT NULL AND (
    p_subject ILIKE '%verify%'        OR p_subject ILIKE '%vérifi%'     OR
    p_subject ILIKE '%test email%'    OR p_subject ILIKE '%email check%' OR
    p_subject ILIKE '%validation%'    OR p_subject ILIKE '%unsubscribe%' OR
    p_subject ILIKE '%désabonnement%' OR p_subject ILIKE '%automatique%' OR
    p_subject ILIKE '%out of office%' OR p_subject ILIKE '%absence%'     OR
    p_subject ILIKE '%newsletter%'    OR p_subject ILIKE '%bounce%'      OR
    p_subject ILIKE '%congé%'         OR p_subject ILIKE '%automatic reply%'
  ) THEN
    v_score   := v_score - 30;
    v_reasons := array_append(v_reasons, 'Sujet lié à vérification/automatisation/absence');
  END IF;

  IF p_body IS NOT NULL AND (
    p_body ILIKE '%email verification%' OR p_body ILIKE '%verify your email%' OR
    p_body ILIKE '%email validation%'   OR p_body ILIKE '%confirm your email%' OR
    p_body ILIKE '%click to verify%'    OR p_body ILIKE '%email deliverability%' OR
    p_body ILIKE '%email checker%'      OR p_body ILIKE '%inbox placement%' OR
    p_body ILIKE '%catch-all%'          OR p_body ILIKE '%email exists%'
  ) THEN
    v_score   := v_score - 40;
    v_reasons := array_append(v_reasons, 'Corps contient pattern de vérification d''email');
  END IF;

  -- ---- SIGNAUX POSITIFS ----

  IF p_from_name IS NOT NULL
    AND length(TRIM(p_from_name)) > 3
    AND p_from_name NOT ILIKE '%@%'
    AND p_from_name ~ '^[A-ZÀ-Ÿa-zà-ÿ]'
  THEN
    v_name_parts := regexp_split_to_array(TRIM(p_from_name), '\s+');
    IF array_length(v_name_parts, 1) >= 2 THEN
      v_score   := v_score + 30;
      v_reasons := array_append(v_reasons, 'Vrai nom complet (Prénom + Nom)');
    ELSE
      v_score   := v_score + 10;
      v_reasons := array_append(v_reasons, 'Nom partiel fourni');
    END IF;
  END IF;

  IF p_has_attach THEN
    v_score   := v_score + 25;
    v_reasons := array_append(v_reasons, 'Pièces jointes (signal positif)');
  END IF;

  -- Mots-clés taxi/assurance dans le sujet (signal fort)
  IF p_subject IS NOT NULL AND (
    p_subject ILIKE '%taxi%'      OR p_subject ILIKE '%assurance%'      OR
    p_subject ILIKE '%devis%'     OR p_subject ILIKE '%cotisation%'     OR
    p_subject ILIKE '%vtc%'       OR p_subject ILIKE '%conducteur%'     OR
    p_subject ILIKE '%carte pro%' OR p_subject ILIKE '%renouvellement%' OR
    p_subject ILIKE '%contrat%'   OR p_subject ILIKE '%résiliation%'    OR
    p_subject ILIKE '%tarif%'     OR p_subject ILIKE '%prime%'          OR
    p_subject ILIKE '%sinistre%'  OR p_subject ILIKE '%accident%'
  ) THEN
    v_score   := v_score + 40;
    v_reasons := array_append(v_reasons, 'Sujet lié à taxi/assurance (signal fort)');
  END IF;

  -- Mots-clés taxi/assurance dans le corps du message
  IF p_body IS NOT NULL AND (
    p_body ILIKE '%taxi%'      OR p_body ILIKE '%assurance%'      OR
    p_body ILIKE '%devis%'     OR p_body ILIKE '%cotisation%'     OR
    p_body ILIKE '%vtc%'       OR p_body ILIKE '%conducteur taxi%' OR
    p_body ILIKE '%carte pro%' OR p_body ILIKE '%licence taxi%'
  ) THEN
    v_score   := v_score + 20;
    v_reasons := array_append(v_reasons, 'Corps contient mots-clés taxi/assurance');
  END IF;

  IF p_body IS NOT NULL AND p_body ~ '(?:^|\s)(?:\+?33|0)[1-9](?:[\s.\-]?\d{2}){4}' THEN
    v_score   := v_score + 20;
    v_reasons := array_append(v_reasons, 'Numéro de téléphone trouvé');
  END IF;

  IF v_domain IN (
    'gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.fr', 'hotmail.com',
    'outlook.fr', 'outlook.com', 'wanadoo.fr', 'orange.fr', 'free.fr',
    'laposte.net', 'sfr.fr', 'bbox.fr', 'neuf.fr', 'live.fr', 'live.com',
    'msn.com', 'icloud.com', 'me.com', 'numericable.fr', 'bouyguestelecom.fr',
    'protonmail.com', 'pm.me'
  ) THEN
    v_score   := v_score + 15;
    v_reasons := array_append(v_reasons, 'Domaine email grand public reconnu');
  END IF;

  IF v_domain NOT IN (
    'gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.fr', 'hotmail.com',
    'outlook.fr', 'outlook.com', 'wanadoo.fr', 'orange.fr', 'free.fr',
    'laposte.net', 'sfr.fr', 'bbox.fr', 'live.fr', 'live.com', 'icloud.com'
  )
    AND length(v_domain) > 5
    AND NOT is_email_blacklisted(p_email)
  THEN
    v_score   := v_score + 10;
    v_reasons := array_append(v_reasons, 'Domaine professionnel potentiel');
  END IF;

  IF EXISTS (
    SELECT 1 FROM crm_leads
    WHERE LOWER(email) = v_email_lower LIMIT 1
  ) THEN
    v_score   := v_score + 35;
    v_reasons := array_append(v_reasons, 'Contact déjà connu dans le CRM');
  END IF;

  -- ---- DÉCISION (seuil relevé à 50 = HIGH confidence uniquement) ----
  -- Avant : is_real_lead = score >= 10 → créait des leads depuis n'importe quel Gmail
  -- Maintenant : is_real_lead = score >= 50 → exige mots-clés taxi/assurance + signaux réels
  v_is_real := v_score >= 50;

  IF v_score >= 50 THEN
    v_confidence := 'high';
  ELSIF v_score >= 10 THEN
    v_confidence := 'medium';
  ELSIF v_score >= -10 THEN
    v_confidence := 'low';
  ELSE
    v_confidence := 'rejected';
  END IF;

  RETURN jsonb_build_object(
    'is_real_lead', v_is_real,
    'confidence',   v_confidence,
    'score',        v_score,
    'reasons',      v_reasons,
    'email',        p_email,
    'action',       CASE
                      WHEN v_is_real THEN 'create_lead'
                      WHEN v_score >= 10 THEN 'link_existing_only'
                      ELSE 'skip'
                    END
  );
END;
$$;
