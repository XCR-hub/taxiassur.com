import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * FONCTION EDGE: Générateur de code IA pour SEO
 *
 * 🎯 Workflow:
 * 1. Reçoit des données GSC ou opportunités SEO
 * 2. Génère du code React (nouvelle page, modification)
 * 3. Ajoute à la queue de publication Git
 * 4. Retourne un aperçu du code généré
 *
 * 🤖 Utilisé par:
 * - gsc-ai-orchestrator (opportunités SEO)
 * - auto-generate-city-page (nouvelles villes)
 * - auto-generate-blog-post (articles optimisés)
 */

interface CodeGenerationRequest {
  action: "create_city_page" | "optimize_existing_page" | "create_blog_page";
  data: {
    keyword?: string;
    city?: string;
    current_content?: string;
    seo_recommendations?: any;
    metadata?: any;
  };
  priority?: number;
}

function generateCityPageCode(city: string, keyword: string): string {
  const componentName = `AssuranceTaxi${city.replace(/[- ]/g, "")}`;
  const slug = city.toLowerCase().replace(/\s+/g, "-");

  return `import React from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from '@/components/Hero';
import FormLead from '@/components/FormLead';
import Avantages from '@/components/Avantages';
import FAQ from '@/components/FAQ';

const ${componentName}: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi ${city} - Devis Gratuit en 2 min | TaxiAssur</title>
        <meta
          name="description"
          content="Assurance taxi ${city} à partir de 89€/mois. Devis gratuit instantané, couverture complète, attestation 24h. Plus de 500 chauffeurs nous font confiance."
        />
        <meta name="keywords" content="assurance taxi ${city}, ${keyword}, devis assurance taxi ${city}" />
        <link rel="canonical" href="https://taxiassur.com/assurance-taxi-${slug}" />

        {/* Open Graph */}
        <meta property="og:title" content="Assurance Taxi ${city} - Devis Gratuit | TaxiAssur" />
        <meta property="og:description" content="Assurance taxi ${city} à partir de 89€/mois. Devis instantané, couverture complète." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://taxiassur.com/assurance-taxi-${slug}" />

        {/* Schema.org */}
        <script type="application/ld+json">
          {\`
            {
              "@context": "https://schema.org",
              "@type": "InsuranceAgency",
              "name": "TaxiAssur ${city}",
              "description": "Assurance taxi spécialisée ${city}",
              "areaServed": {
                "@type": "City",
                "name": "${city}"
              },
              "url": "https://taxiassur.com/assurance-taxi-${slug}",
              "telephone": "+33180855786",
              "priceRange": "€€"
            }
          \`}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
        <Hero
          title="Assurance Taxi ${city}"
          subtitle="Devis gratuit en 2 minutes - Couverture complète - Attestation sous 24h"
          ctaText="Obtenir mon devis gratuit"
          backgroundImage="/image.png"
        />

        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Pourquoi choisir TaxiAssur à ${city} ?
                </h2>

                <div className="prose prose-lg text-gray-700 space-y-4">
                  <p>
                    <strong>Leader de l'assurance taxi à ${city}</strong>, TaxiAssur accompagne
                    plus de 500 chauffeurs de taxi dans la région. Notre expertise locale nous
                    permet de proposer des tarifs ultra-compétitifs adaptés au marché ${city}.
                  </p>

                  <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                    Tarifs assurance taxi ${city}
                  </h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Formule Tiers : à partir de <strong>89€/mois</strong></li>
                    <li>Formule Tiers Plus : à partir de <strong>129€/mois</strong></li>
                    <li>Formule Tous Risques : à partir de <strong>169€/mois</strong></li>
                  </ul>

                  <div className="bg-green-50 border-l-4 border-green-500 p-4 my-6">
                    <p className="text-green-800 font-semibold">
                      🎁 Offre spéciale ${city} : -15% la première année pour tout nouveau client
                    </p>
                  </div>

                  <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                    Nos garanties à ${city}
                  </h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Responsabilité Civile Professionnelle</li>
                    <li>Protection juridique taxi</li>
                    <li>Garantie conducteur renforcée</li>
                    <li>Assistance 24h/7j ${city} et région</li>
                    <li>Véhicule de remplacement</li>
                  </ul>
                </div>
              </div>

              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-2xl p-8 border-2 border-blue-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                    Devis Gratuit ${city}
                  </h3>
                  <p className="text-gray-600 text-center mb-6">
                    Réponse immédiate - Sans engagement
                  </p>
                  <FormLead source="page-ville-${slug}" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Avantages />

        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Questions fréquentes - Assurance taxi ${city}
            </h2>
            <FAQ cityName="${city}" />
          </div>
        </section>

        <section className="py-16 px-4 bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à assurer votre taxi à ${city} ?
            </h2>
            <p className="text-xl mb-8">
              Plus de 500 chauffeurs ${city} nous font confiance
            </p>
            <a
              href="#contact"
              className="inline-block bg-white text-orange-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Obtenir mon devis gratuit
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default ${componentName};
`;
}

function generateOptimizedPageCode(
  currentContent: string,
  recommendations: any
): string {
  // Pour l'instant, retourne le contenu actuel avec un commentaire
  // Dans une version complète, utiliserait l'IA pour optimiser
  return `${currentContent}

/*
 * Optimisations SEO appliquées (${new Date().toISOString()}):
 * ${JSON.stringify(recommendations, null, 2)}
 */
`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data, priority = 5 }: CodeGenerationRequest = await req.json();

    console.log(`🤖 Génération de code IA: ${action}`);

    let generatedCode = "";
    let filePath = "";
    let commitMessage = "";

    switch (action) {
      case "create_city_page": {
        if (!data.city || !data.keyword) {
          throw new Error("city et keyword requis");
        }

        const slug = data.city.toLowerCase().replace(/\s+/g, "-");
        filePath = `src/pages/AssuranceTaxi${data.city.replace(/[- ]/g, "")}.tsx`;
        generatedCode = generateCityPageCode(data.city, data.keyword);
        commitMessage = `Création page SEO pour ${data.city} - ${data.keyword}`;

        // Aussi créer la route
        console.log(`📍 Page ville créée: ${filePath}`);
        break;
      }

      case "optimize_existing_page": {
        if (!data.current_content || !data.seo_recommendations) {
          throw new Error("current_content et seo_recommendations requis");
        }

        filePath = data.metadata?.file_path || "src/pages/Unknown.tsx";
        generatedCode = generateOptimizedPageCode(
          data.current_content,
          data.seo_recommendations
        );
        commitMessage = `Optimisation SEO: ${data.seo_recommendations.title || "Amélioration contenu"}`;
        break;
      }

      case "create_blog_page": {
        // TODO: Implémenter génération blog avec IA
        throw new Error("create_blog_page pas encore implémenté");
      }

      default:
        throw new Error(`Action inconnue: ${action}`);
    }

    // Ajouter à la queue de publication
    const { data: queueId, error: queueError } = await supabase.rpc(
      "add_code_to_publish_queue",
      {
        p_file_path: filePath,
        p_file_content: generatedCode,
        p_operation: "create",
        p_commit_message: commitMessage,
        p_triggered_by: `ai-code-generator:${action}`,
        p_priority: priority,
        p_metadata: {
          action,
          data,
          generated_at: new Date().toISOString(),
        },
      }
    );

    if (queueError) {
      throw new Error(`Erreur ajout à la queue: ${queueError.message}`);
    }

    console.log(`✅ Code ajouté à la queue: ${queueId}`);

    return new Response(
      JSON.stringify({
        success: true,
        queue_id: queueId,
        file_path: filePath,
        commit_message: commitMessage,
        preview: generatedCode.substring(0, 500) + "...",
        message: "Code généré et ajouté à la queue de publication",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erreur génération code:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
