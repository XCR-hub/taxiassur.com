import React from 'react';
import { Search, TrendingUp, Target, Award, CheckCircle, Star, Globe, Zap, Shield, Users } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const SEOBooster: React.FC = () => {
  const seoKeywords = [
    { keyword: 'assurance taxi', volume: '8100/mois', difficulty: 'Élevée', position: 'Objectif #1' },
    { keyword: 'devis assurance taxi', volume: '1300/mois', difficulty: 'Moyenne', position: 'Objectif #1' },
    { keyword: 'assurance taxi pas cher', volume: '720/mois', difficulty: 'Moyenne', position: 'Objectif #1' },
    { keyword: 'courtier assurance taxi', volume: '480/mois', difficulty: 'Faible', position: 'Objectif #1' },
    { keyword: 'rc professionnelle taxi', volume: '880/mois', difficulty: 'Faible', position: 'Objectif #1' },
    { keyword: 'prix assurance taxi', volume: '590/mois', difficulty: 'Moyenne', position: 'Objectif #1' }
  ];

  const localKeywords = [
    'assurance taxi paris', 'assurance taxi lyon', 'assurance taxi marseille',
    'devis taxi paris', 'courtier taxi lyon', 'rc pro taxi marseille'
  ];

  const competitorAnalysis = [
    { competitor: 'Assureurs traditionnels', weakness: 'Pas spécialisés taxi', opportunity: 'Expertise métier' },
    { competitor: 'Courtiers généralistes', weakness: 'Tarifs non négociés', opportunity: 'Prix exclusifs' },
    { competitor: 'Comparateurs', weakness: 'Pas de conseil', opportunity: 'Accompagnement expert' }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="low" />
      <div className="container-max">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
              <Search className="text-black drop-shadow-md" size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              Stratégie SEO <span className="text-gradient">#1 Google</span>
            </h2>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
              <Target className="text-black animate-pulse drop-shadow-md" size={24} />
            </div>
          </div>
          
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            🎯 <strong className="text-yellow-500">Objectif : Position #1 Google</strong> pour "assurance taxi" 
            et générer <strong className="text-green-400">1+ lead qualifié/jour</strong> en trafic organique. 
            Stratégie complète : <strong className="text-yellow-400">contenu expert + maillage + autorité</strong>.
          </p>
        </div>

        {/* Keyword Strategy */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center drop-shadow-lg">
            🔍 Mots-Clés Cibles Prioritaires
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seoKeywords.map((kw, index) => (
              <div key={index} className="ai-card p-6 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">{kw.keyword}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    kw.difficulty === 'Élevée' ? 'bg-red-100 text-red-800' :
                    kw.difficulty === 'Moyenne' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {kw.difficulty}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volume :</span>
                    <span className="font-bold text-yellow-500">{kw.volume}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Objectif :</span>
                    <span className="font-bold text-green-400">{kw.position}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local SEO */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            🗺️ SEO Local : Domination Géographique
          </h3>
          
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Mots-Clés Locaux Prioritaires</h4>
                <div className="grid grid-cols-2 gap-3">
                  {localKeywords.map((keyword, index) => (
                    <div key={index} className="bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium text-center">
                      {keyword}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Pages Villes Créées</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux'].map(city => (
                    <div key={city} className="bg-green-50 text-green-800 px-2 py-1 rounded text-center font-medium">
                      {city}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">+12 autres villes configurées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Competitor Analysis */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            🥊 Analyse Concurrentielle
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {competitorAnalysis.map((comp, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3">{comp.competitor}</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-red-600 font-medium">FAIBLESSE :</span>
                    <p className="text-sm text-gray-700">{comp.weakness}</p>
                  </div>
                  <div>
                    <span className="text-xs text-green-600 font-medium">NOTRE AVANTAGE :</span>
                    <p className="text-sm text-gray-700">{comp.opportunity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Metrics */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            📈 Objectifs SEO 6 Mois
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Target className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-green-600">#1</div>
              <div className="text-sm text-gray-600">Position "assurance taxi"</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-yellow-600">5000+</div>
              <div className="text-sm text-gray-600">Visiteurs/mois organiques</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-yellow-600">30+</div>
              <div className="text-sm text-gray-600">Leads/mois SEO</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Award className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-amber-600">500%</div>
              <div className="text-sm text-gray-600">ROI SEO attendu</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SEOBooster;