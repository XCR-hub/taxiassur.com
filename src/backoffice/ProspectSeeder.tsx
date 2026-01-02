import { useState } from 'react';
import { DatabaseZap, CheckCircle, AlertCircle, Loader2, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PROSPECTS = [
  {
    company_name: "Blog Taxi",
    website: "https://www.blogtaxi.fr",
    contact_email: "contact@blogtaxi.fr",
    industry: "Média Transport",
    relevance_score: 0.92,
    notes: "Blog très actif sur l'actualité taxi. Parfait pour articles invités.",
    source: "Google Search"
  },
  {
    company_name: "Chauffeur Magazine",
    website: "https://www.chauffeurmag.com",
    contact_email: "redaction@chauffeurmag.com",
    industry: "Presse Professionnelle",
    relevance_score: 0.95,
    notes: "Magazine de référence. Forte audience chauffeurs VTC/Taxi.",
    source: "Google Search"
  },
  {
    company_name: "Taxi Actu",
    website: "https://www.taxi-actu.fr",
    contact_email: "info@taxi-actu.fr",
    industry: "Actualités Transport",
    relevance_score: 0.88,
    notes: "Site d'actualités spécialisé. Bonne visibilité SEO.",
    source: "Google Search"
  },
  {
    company_name: "Forum Taxi",
    website: "https://www.forumtaxi.com",
    contact_email: "admin@forumtaxi.com",
    industry: "Communauté",
    relevance_score: 0.85,
    notes: "Forum actif 12k membres. Bannière publicitaire possible.",
    source: "Recherche communauté"
  },
  {
    company_name: "École Taxi Formation",
    website: "https://www.ecole-taxi.fr",
    contact_email: "contact@ecole-taxi.fr",
    industry: "Formation",
    relevance_score: 0.90,
    notes: "École de formation taxi. Partenariat sur assurance nouveaux diplômés.",
    source: "Google Search"
  },
  {
    company_name: "Centrale VTC",
    website: "https://www.centrale-vtc.fr",
    contact_email: "partenariats@centrale-vtc.fr",
    industry: "Plateforme VTC",
    relevance_score: 0.87,
    notes: "Centrale de réservation VTC. 3000+ chauffeurs inscrits.",
    source: "Recherche VTC"
  },
  {
    company_name: "Garage Pro Taxi",
    website: "https://www.garagepro-taxi.fr",
    contact_email: "contact@garagepro-taxi.fr",
    industry: "Garage Spécialisé",
    relevance_score: 0.82,
    notes: "Réseau de garages spécialisés taxi. Cross-selling possible.",
    source: "Google Search"
  },
  {
    company_name: "Association des Taxis Parisiens",
    website: "https://www.atparisien.com",
    contact_email: "secretariat@atparisien.com",
    industry: "Association Professionnelle",
    relevance_score: 0.93,
    notes: "1200 adhérents. Partenariat institutionnel stratégique.",
    source: "Recherche association"
  },
  {
    company_name: "Comparateur Auto Pro",
    website: "https://www.comparateur-autopro.fr",
    contact_email: "commercial@comparateur-autopro.fr",
    industry: "Comparateur",
    relevance_score: 0.78,
    notes: "Comparateur véhicules pro. Intégration module assurance.",
    source: "Recherche comparateur"
  },
  {
    company_name: "Comptable Taxi Services",
    website: "https://www.comptabletaxi.fr",
    contact_email: "contact@comptabletaxi.fr",
    industry: "Services Comptables",
    relevance_score: 0.84,
    notes: "Cabinet comptable spécialisé taxi. Recommandations clients.",
    source: "Google Search"
  },
  {
    company_name: "Plateforme Résa Taxi",
    website: "https://www.resataxi.com",
    contact_email: "business@resataxi.com",
    industry: "Technologie",
    relevance_score: 0.86,
    notes: "Logiciel de réservation taxi. 500+ compagnies clientes.",
    source: "Recherche logiciel"
  },
  {
    company_name: "Blog Auto Entrepreneur",
    website: "https://www.autoentrepreneur-taxi.fr",
    contact_email: "redac@autoentrepreneur-taxi.fr",
    industry: "Média Entrepreneuriat",
    relevance_score: 0.81,
    notes: "Blog guides création entreprise taxi. Articles invités.",
    source: "Google Search"
  },
  {
    company_name: "Fédération Nationale Taxi",
    website: "https://www.fntaxi.fr",
    contact_email: "contact@fntaxi.fr",
    industry: "Fédération",
    relevance_score: 0.94,
    notes: "Fédération nationale. Partenariat prestigieux.",
    source: "Recherche fédération"
  },
  {
    company_name: "Taxi Tesla Club France",
    website: "https://www.taxitesla.fr",
    contact_email: "admin@taxitesla.fr",
    industry: "Communauté",
    relevance_score: 0.89,
    notes: "Communauté taxis électriques. Niche haute valeur.",
    source: "Recherche Tesla"
  },
  {
    company_name: "Forum VTC Pro",
    website: "https://www.forumvtcpro.com",
    contact_email: "contact@forumvtcpro.com",
    industry: "Communauté VTC",
    relevance_score: 0.83,
    notes: "Forum VTC 8k membres. Bannière sponsorisée.",
    source: "Recherche forum"
  },
  {
    company_name: "Avocat Droit Transport",
    website: "https://www.avocat-transport.fr",
    contact_email: "cabinet@avocat-transport.fr",
    industry: "Services Juridiques",
    relevance_score: 0.80,
    notes: "Cabinet avocat spécialisé. Recommandations mutuelles.",
    source: "Google Search"
  },
  {
    company_name: "YouTube Taxi Vlog",
    website: "https://www.youtube.com/@TaxiVlogFR",
    contact_email: "taxivlogfr@gmail.com",
    industry: "Média YouTube",
    relevance_score: 0.87,
    notes: "Chaîne YouTube 45k abonnés. Sponsoring vidéos.",
    source: "Recherche YouTube"
  },
  {
    company_name: "Achat Véhicule Pro",
    website: "https://www.achatvehiculepro.fr",
    contact_email: "commercial@achatvehiculepro.fr",
    industry: "Vente Véhicules",
    relevance_score: 0.79,
    notes: "Concessionnaire multi-marques taxi. Pack assurance+véhicule.",
    source: "Recherche concessionnaire"
  },
  {
    company_name: "Radio Taxi France",
    website: "https://www.radiotaxifrance.fr",
    contact_email: "direction@radiotaxifrance.fr",
    industry: "Centrale Radio",
    relevance_score: 0.91,
    notes: "Plus grande centrale France. 12k chauffeurs affiliés.",
    source: "Recherche centrale"
  },
  {
    company_name: "Appli Chauffeur",
    website: "https://www.applichauffeur.com",
    contact_email: "support@applichauffeur.com",
    industry: "Application Mobile",
    relevance_score: 0.85,
    notes: "App gestion courses. 7k utilisateurs actifs. Intégration API.",
    source: "Recherche application"
  }
];

export default function ProspectSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ success: number; errors: number } | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setResults([]);
    setSummary(null);

    const newResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const prospect of PROSPECTS) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert({
            ...prospect,
            outreach_status: 'not_contacted',
            outreach_attempts: 0,
            last_scraped_at: new Date().toISOString(),
            next_contact_date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (error) {
          newResults.push({ company: prospect.company_name, success: false, error: error.message });
          errorCount++;
        } else {
          newResults.push({ company: prospect.company_name, success: true });
          successCount++;
        }

        setResults([...newResults]);

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err: any) {
        newResults.push({ company: prospect.company_name, success: false, error: err.message });
        errorCount++;
      }
    }

    setSummary({ success: successCount, errors: errorCount });
    setIsSeeding(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-r from-orange-600 to-orange-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <DatabaseZap size={32} />
            <h2 className="text-2xl font-bold">Seeding Prospects Partenaires</h2>
          </div>
          <a
            href="/backoffice"
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Home size={20} />
            <span>Retour</span>
          </a>
        </div>
        <p className="text-orange-100">
          Ajouter 20 prospects de qualité dans la base de données pour lancer les campagnes d'outreach
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">20 Prospects Pré-Qualifiés</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {PROSPECTS.slice(0, 6).map((p, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="font-medium text-gray-800">{p.company_name}</p>
              <p className="text-sm text-gray-600">{p.industry}</p>
              <p className="text-xs text-gray-600 mt-1">Score: {(p.relevance_score * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mb-4">+ 14 autres prospects...</p>

        <button
          onClick={handleSeed}
          disabled={isSeeding || summary !== null}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-600 text-white px-6 py-4 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
        >
          {isSeeding ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Ajout en cours...</span>
            </>
          ) : summary ? (
            <>
              <CheckCircle size={20} />
              <span>Ajouté avec succès</span>
            </>
          ) : (
            <>
              <DatabaseZap size={20} />
              <span>Ajouter les 20 Prospects</span>
            </>
          )}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Résultats</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span className="font-medium text-gray-800">{result.company}</span>
                {result.success ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
              </div>
            ))}
          </div>

          {summary && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm font-medium text-orange-800">
                ✅ Succès : {summary.success} | ❌ Erreurs : {summary.errors}
              </p>
            </div>
          )}
        </div>
      )}

      {summary && summary.success > 0 && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-orange-50 rounded-xl p-6 border-2 border-green-200">
          <h3 className="text-lg font-bold text-green-800 mb-3">🎉 Prochaine Étape</h3>
          <p className="text-gray-700 mb-4">
            {summary.success} prospects ajoutés avec succès ! Vous pouvez maintenant :
          </p>
          <div className="space-y-2">
            <a
              href="/backoffice/outreach"
              className="block bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
            >
              Lancer la Première Campagne d'Outreach
            </a>
            <a
              href="/backoffice/prospects"
              className="block bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
            >
              Voir les Prospects
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
