import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import { Clock, CheckCircle, Shield, Phone, FileText, TrendingDown, AlertCircle, Star } from 'lucide-react';

const DevisAssuranceTaxi: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Devis Assurance Taxi', url: '/devis-assurance-taxi' }
  ];

  return (
    <>
      <SEOHead
        title="Devis Assurance Taxi Gratuit en 2 min — Réponse 15 min | TaxiAssur"
        description="Devis assurance taxi gratuit et sans engagement en 2 minutes. Comparez 15+ assureurs, économisez 35%. RC Pro incluse, attestation immédiate. Courtier spécialisé taxi agréé ORIAS."
        canonical="/devis-assurance-taxi"
        keywords="devis assurance taxi, devis assurance taxi gratuit, devis assurance taxi en ligne, tarif assurance taxi, simulation assurance taxi, comparatif devis taxi, demande devis taxi"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        <main>

          {/* Hero */}
          <section className="relative py-16 bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
            <AITaxiBackground section="hero" intensity="medium" />
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url('https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')` }}
            />
            <div className="container-max relative z-20">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-full px-4 py-2 mb-6">
                  <Clock size={16} className="text-green-400" />
                  <span className="text-green-300 text-sm font-semibold">Devis Gratuit — Réponse Garantie en 15 min</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">
                  Devis <span className="text-gradient">Assurance Taxi</span>
                  <br />Gratuit &amp; Sans Engagement
                </h1>
                <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Obtenez en <strong className="text-amber-400">2 minutes</strong> une comparaison des meilleures offres du marché. Notre courtier spécialisé analyse <strong className="text-white">15+ assureurs</strong> pour vous proposer le tarif le plus compétitif. <strong className="text-green-400">Économies moyennes : 35%.</strong>
                </p>
                <div className="flex flex-wrap justify-center gap-6 mb-10">
                  {[
                    { icon: <CheckCircle size={18} className="text-green-400" />, text: '100% Gratuit' },
                    { icon: <CheckCircle size={18} className="text-green-400" />, text: 'Sans Engagement' },
                    { icon: <CheckCircle size={18} className="text-green-400" />, text: 'RC Pro Incluse' },
                    { icon: <CheckCircle size={18} className="text-green-400" />, text: 'Attestation Immédiate' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 text-gray-200">
                      {item.icon}
                      <span className="font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
                <a href="#devis" className="btn-primary text-lg px-10 py-4">
                  Obtenir Mon Devis Maintenant
                </a>
              </div>
            </div>
          </section>

          {/* Ce que comprend votre devis */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Ce que Contient Votre Devis Assurance Taxi
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto">
                  Chaque devis TaxiAssur est personnalisé et inclut une analyse complète de vos garanties.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: <Shield size={32} className="text-amber-400" />,
                    title: 'RC Professionnelle Obligatoire',
                    desc: 'Couverture des dommages causés à vos passagers, piétons et tiers. Obligatoire pour tout taxi en activité. Incluse dans notre devis de base.',
                    badge: 'Obligatoire'
                  },
                  {
                    icon: <FileText size={32} className="text-blue-400" />,
                    title: 'Garanties Recommandées',
                    desc: 'Dommages tous accidents, vol, incendie, bris de glaces, protection juridique. Notre expert analyse ce dont vous avez vraiment besoin.',
                    badge: 'Personnalisé'
                  },
                  {
                    icon: <Phone size={32} className="text-green-400" />,
                    title: 'Assistance 0 km 24h/24',
                    desc: 'Dépannage, remorquage, véhicule de remplacement. Vous ne restez jamais immobilisé, quelle que soit la situation.',
                    badge: 'Inclus'
                  },
                  {
                    icon: <TrendingDown size={32} className="text-amber-400" />,
                    title: 'Tarif Négocié',
                    desc: 'Grâce à notre réseau de 15+ assureurs partenaires, notre devis intègre des remises collectives impossibles à obtenir seul.',
                    badge: '-35% en moyenne'
                  },
                  {
                    icon: <Clock size={32} className="text-green-400" />,
                    title: 'Validité du Devis',
                    desc: 'Votre devis est valable 30 jours. Prenez le temps de comparer sereinement, sans pression commerciale.',
                    badge: '30 jours'
                  },
                  {
                    icon: <Star size={32} className="text-amber-400" />,
                    title: 'Conseil Expert Inclus',
                    desc: 'Un expert taxi vous explique les subtilités des contrats : franchises, exclusions, plafonds. Aucun mauvais surprises.',
                    badge: 'Gratuit'
                  },
                ].map((item) => (
                  <div key={item.title} className="ai-card p-6 hover:shadow-amber-500/20 transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="group-hover:scale-110 transition-transform">{item.icon}</div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">{item.badge}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Informations nécessaires */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
            <div className="container-max">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                  <div>
                    <h2 className="text-3xl font-black text-white mb-6">
                      Quelles Informations pour Votre Devis ?
                    </h2>
                    <p className="text-gray-300 mb-6 leading-relaxed">
                      Pour vous obtenir le tarif le plus précis possible, notre formulaire demande quelques informations essentielles. Le processus prend <strong className="text-amber-400">moins de 2 minutes.</strong>
                    </p>
                    <div className="space-y-4">
                      {[
                        { title: 'Votre situation professionnelle', items: ['Ancienneté en tant que chauffeur taxi', 'Département et ville d\'activité principale', 'Type de taxi (artisan, locataire de plaque...)'] },
                        { title: 'Votre véhicule', items: ['Marque, modèle et année', 'Valeur du véhicule', 'Kilométrage annuel estimé'] },
                        { title: 'Votre historique', items: ['Nombre de sinistres sur 3 ans', 'Coefficient bonus-malus actuel', 'Assureur actuel (si renouvellement)'] },
                      ].map((section) => (
                        <div key={section.title} className="ai-card p-4">
                          <h3 className="font-bold text-amber-400 mb-2 text-sm uppercase tracking-wide">{section.title}</h3>
                          <ul className="space-y-1">
                            {section.items.map((item) => (
                              <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                                <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="ai-card p-6 border border-amber-500/30">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle size={24} className="text-amber-400 flex-shrink-0" />
                        <h3 className="font-bold text-white">Documents à préparer pour la souscription</h3>
                      </div>
                      <ul className="space-y-2">
                        {[
                          'Carte grise du véhicule',
                          'Permis de conduire',
                          'Carte professionnelle de taxi',
                          'Relevé d\'information (assureur précédent)',
                          'Titre de propriété ou contrat de location-gérance',
                        ].map((doc) => (
                          <li key={doc} className="flex items-center gap-2 text-gray-300 text-sm">
                            <FileText size={14} className="text-blue-400 flex-shrink-0" />
                            {doc}
                          </li>
                        ))}
                      </ul>
                      <p className="text-gray-500 text-xs mt-4">Ces documents ne sont nécessaires qu'à la souscription, pas pour recevoir votre devis.</p>
                    </div>

                    <div className="ai-card p-6 taxi-glow">
                      <h3 className="font-bold text-white mb-3">Fourchette de Tarifs 2025</h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Province — Profil optimal', min: '1 170 €', max: '1 600 €', color: 'text-green-400' },
                          { label: 'Grande ville — Standard', min: '1 560 €', max: '2 200 €', color: 'text-amber-400' },
                          { label: 'Paris — Tous risques', min: '2 080 €', max: '3 000 €', color: 'text-orange-400' },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                            <span className="text-gray-300 text-sm">{row.label}</span>
                            <span className={`font-bold text-sm ${row.color}`}>{row.min} — {row.max}/an</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-500 text-xs mt-3">Via TaxiAssur — 35% moins cher que les prix du marché direct</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Témoignages */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-white mb-4">
                  Ils ont Obtenu Leur Devis via TaxiAssur
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    name: 'Karim B.',
                    city: 'Paris (75)',
                    text: 'Devis reçu en 10 minutes. J\'économise 780€ par rapport à mon ancienne assurance. Simple et efficace.',
                    stars: 5,
                    saving: '-780 €/an'
                  },
                  {
                    name: 'Jean-Marc L.',
                    city: 'Lyon (69)',
                    text: 'Mon courtier m\'a expliqué chaque garantie en détail. J\'ai finalement opté pour une couverture mieux adaptée à moins cher.',
                    stars: 5,
                    saving: '-520 €/an'
                  },
                  {
                    name: 'Fatima A.',
                    city: 'Marseille (13)',
                    text: 'Formulaire rapide, rappel dans la demi-heure. Attestation provisoire reçue le jour même. Je recommande à tous les taxis.',
                    stars: 5,
                    saving: '-640 €/an'
                  },
                ].map((review) => (
                  <div key={review.name} className="ai-card p-6">
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: review.stars }).map((_, i) => (
                        <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-gray-300 text-sm italic mb-4 leading-relaxed">"{review.text}"</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{review.name}</div>
                        <div className="text-gray-500 text-xs">{review.city}</div>
                      </div>
                      <span className="text-green-400 font-black text-sm">{review.saving}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <LeadForm />
        </main>
        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default DevisAssuranceTaxi;
