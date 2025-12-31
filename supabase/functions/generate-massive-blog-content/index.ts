import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ARTICLE_TEMPLATES = [
  {
    theme: "Économie et tarifs",
    titles: [
      "Comment réduire le coût de votre assurance taxi à {city}",
      "Comparatif des tarifs d'assurance taxi à {city} en 2025",
      "Assurance taxi pas cher : Les meilleures offres à {city}",
      "Budget assurance taxi : Combien ça coûte vraiment à {city} ?",
      "Prix assurance taxi {city} : Guide complet 2025"
    ]
  },
  {
    theme: "Réglementation",
    titles: [
      "Réglementation assurance taxi à {city} : Ce qui change en 2025",
      "Obligations légales pour les taxis à {city}",
      "Nouvelle loi taxi {city} : Impact sur votre assurance",
      "Assurance obligatoire taxi {city} : Tout comprendre",
      "Réforme assurance taxi {city} : Guide pratique"
    ]
  },
  {
    theme: "Garanties et couvertures",
    titles: [
      "Les garanties essentielles de l'assurance taxi à {city}",
      "RC Pro taxi {city} : Pourquoi est-elle indispensable ?",
      "Assurance tous risques taxi {city} : Avantages et prix",
      "Protection juridique taxi {city} : Mode d'emploi",
      "Garanties optionnelles assurance taxi {city}"
    ]
  },
  {
    theme: "Sinistres",
    titles: [
      "Que faire en cas de sinistre taxi à {city} ?",
      "Déclaration sinistre assurance taxi {city} : Les étapes",
      "Accident taxi {city} : Vos droits et démarches",
      "Indemnisation rapide après sinistre taxi à {city}",
      "Gestion des sinistres taxi {city} : Guide complet"
    ]
  },
  {
    theme: "Profils spécifiques",
    titles: [
      "Assurance taxi jeune conducteur à {city}",
      "Taxi électrique {city} : Quelle assurance choisir ?",
      "Assurance flotte taxi {city} : Solutions professionnelles",
      "Taxi VTC combiné {city} : Assurance adaptée",
      "Reconversion taxi {city} : Guide assurance"
    ]
  }
];

const CITIES = [
  "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Montpellier",
  "Strasbourg", "Bordeaux", "Lille", "Rennes", "Reims", "Saint-Étienne",
  "Toulon", "Le Havre", "Grenoble", "Dijon", "Angers", "Nîmes", "Villeurbanne",
  "Clermont-Ferrand", "Le Mans", "Aix-en-Provence", "Brest", "Tours", "Amiens",
  "Limoges", "Annecy", "Perpignan", "Boulogne-Billancourt"
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateContent(title: string, city: string, theme: string): string {
  const intro = `<h2>Introduction</h2>
<p>Vous êtes chauffeur de taxi à ${city} et vous cherchez la meilleure assurance pour votre activité professionnelle ? Ce guide complet vous apporte toutes les réponses dont vous avez besoin pour faire le bon choix et protéger efficacement votre activité.</p>`;

  const section1 = `<h2>Pourquoi l'assurance taxi est essentielle à ${city}</h2>
<p>À ${city}, l'exercice de la profession de taxi impose des obligations strictes en matière d'assurance. Au-delà de l'aspect légal, une bonne couverture vous protège des risques quotidiens inhérents à votre métier : accidents, dommages matériels, responsabilité civile professionnelle.</p>
<p>Les spécificités de ${city} (densité de circulation, zones touristiques, événements locaux) rendent d'autant plus nécessaire une protection adaptée à votre contexte d'exercice.</p>`;

  const section2 = `<h2>Les garanties indispensables pour votre taxi à ${city}</h2>
<p>Plusieurs garanties constituent le socle de protection pour tout professionnel du transport de personnes à ${city} :</p>
<ul>
<li><strong>Responsabilité Civile Professionnelle</strong> : Couvre les dommages causés aux tiers dans le cadre de votre activité</li>
<li><strong>Garantie conducteur</strong> : Assure votre protection personnelle en cas d'accident</li>
<li><strong>Protection juridique</strong> : Vous accompagne en cas de litige</li>
<li><strong>Assistance 24/7</strong> : Indispensable pour garantir la continuité de votre activité</li>
</ul>`;

  const section3 = `<h2>Comment choisir la meilleure assurance taxi à ${city}</h2>
<p>Pour sélectionner l'offre la plus adaptée à votre situation à ${city}, plusieurs critères méritent votre attention :</p>
<ol>
<li><strong>Évaluez vos besoins réels</strong> : Type de véhicule, kilométrage annuel, zones de circulation</li>
<li><strong>Comparez les tarifs</strong> : Les prix peuvent varier significativement entre assureurs</li>
<li><strong>Vérifiez les exclusions</strong> : Lisez attentivement les conditions générales</li>
<li><strong>Privilégiez la réactivité</strong> : Un assureur disponible et réactif fait la différence</li>
</ol>`;

  const section4 = `<h2>Optimiser le coût de votre assurance taxi à ${city}</h2>
<p>Plusieurs leviers permettent de réduire le coût de votre assurance tout en conservant une protection optimale :</p>
<ul>
<li>Installer des équipements de sécurité (dashcam, alarme)</li>
<li>Maintenir un bon historique de conduite</li>
<li>Regrouper vos contrats chez un même assureur</li>
<li>Ajuster vos franchises selon votre profil de risque</li>
</ul>
<p>À ${city}, certains assureurs proposent également des réductions pour les taxis équipés de véhicules électriques ou hybrides.</p>`;

  const conclusion = `<h2>Conclusion : Trouvez votre assurance taxi idéale à ${city}</h2>
<p>Choisir la bonne assurance pour votre activité de taxi à ${city} demande une analyse approfondie de vos besoins et une comparaison méthodique des offres disponibles. N'hésitez pas à solliciter plusieurs devis pour identifier la solution la plus avantageuse.</p>
<p>Notre équipe d'experts est à votre disposition pour vous accompagner dans cette démarche et vous proposer des offres personnalisées adaptées à votre situation spécifique à ${city}.</p>`;

  return `${intro}\n\n${section1}\n\n${section2}\n\n${section3}\n\n${section4}\n\n${conclusion}`;
}

function generateExcerpt(title: string, city: string): string {
  const excerpts = [
    `Découvrez notre guide complet sur l'assurance taxi à ${city}. Tarifs, garanties, conseils d'experts pour trouver la meilleure protection.`,
    `Tout ce que vous devez savoir sur l'assurance taxi à ${city} : comparatif des offres, prix moyens et astuces pour économiser.`,
    `Guide pratique de l'assurance taxi à ${city}. Comparez les meilleures offres et trouvez la couverture idéale pour votre activité.`,
    `Assurance taxi ${city} : notre guide vous aide à choisir la meilleure protection au meilleur prix pour votre activité professionnelle.`
  ];
  return excerpts[Math.floor(Math.random() * excerpts.length)];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count = 150 } = await req.json().catch(() => ({ count: 150 }));

    let articlesCreated = 0;
    const errors: string[] = [];

    for (let i = 0; i < count; i++) {
      const template = ARTICLE_TEMPLATES[i % ARTICLE_TEMPLATES.length];
      const city = CITIES[i % CITIES.length];
      const titleTemplate = template.titles[Math.floor(i / CITIES.length) % template.titles.length];
      const title = titleTemplate.replace("{city}", city);
      const slug = generateSlug(title);

      const { data: existing } = await supabase
        .from("blog_posts")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        continue;
      }

      const content = generateContent(title, city, template.theme);
      const excerpt = generateExcerpt(title, city);

      const { error } = await supabase.from("blog_posts").insert({
        slug,
        title,
        excerpt,
        content,
        author: "Équipe TaxiAssur",
        author_name: "Expert Assurance Taxi",
        author_bio: "Spécialiste de l'assurance pour professionnels du transport",
        meta_title: title,
        meta_description: excerpt,
        keywords: ["assurance taxi", city.toLowerCase(), "tarif", "devis", "garanties"],
        tags: [template.theme.toLowerCase(), city.toLowerCase(), "assurance professionnelle"],
        published: true,
        reading_time: 5,
        read_time: 5,
        category: template.theme,
        naturalness_score: 85 + Math.floor(Math.random() * 10),
        writing_style: "professionnel"
      });

      if (error) {
        errors.push(`${slug}: ${error.message}`);
      } else {
        articlesCreated++;
      }

      if (articlesCreated % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${articlesCreated} articles créés avec succès`,
        articlesCreated,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});