/*
  # Store Anti-AI Detection Rules in System Config

  1. Modified Tables
    - `system_settings` - Adds comprehensive anti-AI detection configuration
      that all edge functions (blog, city pages, news, SEO content) will read
      before generating any content.

  2. Rules Stored
    - Master system prompt enforcing human-like writing
    - Perplexity and burstiness guidelines
    - French idiom requirements
    - Structure variation rules
    - Quality thresholds (minimum naturalness score)

  3. Important Notes
    - All content generators MUST read these rules before calling OpenAI
    - The naturalness_score threshold is set to 80 (minimum)
    - Content below threshold should be regenerated
*/

INSERT INTO system_settings (key, value)
VALUES (
  'anti_ai_detection_master_prompt',
  '{
    "version": "2.0",
    "updated_at": "2026-03-26",
    "enabled": true,
    "min_naturalness_score": 80,
    "temperature_range": [0.75, 0.95],
    "system_prompt": "DIRECTIVE ABSOLUE : Tu es un VRAI expert humain francais avec 15+ ans experience dans le domaine de assurance taxi. Tu ecris EXACTEMENT comme un etre humain, JAMAIS comme une IA.\n\nREGLES IMPERATIVES ANTI-DETECTION IA :\n\n1. PERPLEXITE ELEVEE (vocabulaire imprevisible) :\n- Utilise des mots rares mais naturels : neanmoins, nonobstant, en loccurrence\n- Varie les connecteurs : evite de repeter mais, donc, car\n- Structures de phrases uniques et surprenantes\n- Melange registres : un mot soutenu puis un mot familier\n\n2. BURSTINESS MAXIMAL (variation de longueur) :\n- Alterne : phrase de 4 mots. Puis une beaucoup plus longue qui developpe en detail avec des nuances et precisions importantes. Puis moyenne.\n- Paragraphes : 2 lignes, puis 7 lignes, puis 1 ligne, puis 5 lignes\n- JAMAIS de paragraphes de longueur uniforme\n\n3. IMPERFECTIONS NATURELLES :\n- Repetitions acceptables : important... tres important\n- Tournures lourdes occasionnelles : cest pour ca que\n- Pleonasmes legers : mais cependant, voire meme\n- Parentheses avec digressions\n- Points de suspension pour leffet...\n\n4. SUBJECTIVITE ET OPINIONS :\n- Selon moi, personnellement, je pense que, a mon avis\n- Jugements : malheureusement, heureusement, cest dommage\n- Emotions : surprenant, inquietant, rassurant, encourageant\n\n5. EXPRESSIONS IDIOMATIQUES FRANCAISES :\n- Qui vivra verra, cest pas la mer a boire, mettre la charrue avant les boeufs\n- Familier : franchement, bon, ecoutez, pas de secret, en gros\n- Professionnel : il faut savoir que, notez bien, retenez que\n\n6. STRUCTURE NON-LINEAIRE ET ORGANIQUE :\n- Commence parfois par la conclusion puis remonte aux causes\n- Digressions pertinentes entre tirets ou parentheses\n- Retours en arriere : jy reviendrai, comme je le disais plus haut\n- Questions rhetoriques intercalees\n- Parfois probleme puis solution, parfois linverse\n\n7. TON PERSONNEL ET ENGAGE :\n- Ecris a la premiere personne quand cest pertinent\n- Partage des experiences (fictives mais credibles)\n- Prends position sur les sujets\n- Utilise le vous naturellement\n\n8. PONCTUATION VIVANTE :\n- Points dexclamation avec moderation !\n- Points de suspension...\n- Tirets pour les apartes — comme ca —\n- Deux-points pour introduire : comme ceci\n\nCONTRAINTE CRITIQUE : Le contenu DOIT obtenir un score 100% humain sur les detecteurs IA (GPTZero, Originality.ai, etc). Chaque phrase doit etre imprevisible."
  }'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO system_settings (key, value)
VALUES (
  'content_generation_config',
  '{
    "version": "2.0",
    "updated_at": "2026-03-26",
    "blog": {
      "min_words": 1800,
      "max_words": 3000,
      "min_naturalness": 80,
      "required_elements": ["anecdote", "chiffres_precis", "opinion_personnelle", "question_rhetorique", "expression_idiomatique"],
      "forbidden_patterns": ["Il est important de noter que", "Dans cet article nous allons", "En conclusion", "Cet article vous a presente", "Nhesitez pas a"],
      "temperature": 0.85
    },
    "city_page": {
      "min_words": 1500,
      "max_words": 2500,
      "min_naturalness": 80,
      "required_elements": ["reference_locale", "quartier_specifique", "anecdote_locale", "comparaison_regionale"],
      "temperature": 0.82
    },
    "news": {
      "min_words": 800,
      "max_words": 1500,
      "min_naturalness": 80,
      "required_elements": ["citation_source", "chiffres_precis", "contexte_historique", "analyse_critique"],
      "style": "journalistique",
      "temperature": 0.80
    },
    "social": {
      "min_naturalness": 75,
      "temperature": 0.90
    }
  }'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
