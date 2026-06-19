import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import StickyCTA from '../components/StickyCTA';
import JsonLd from '../components/JsonLd';
import { Shield, CheckCircle, Phone, Clock, Star, AlertCircle, MapPin, TrendingDown } from 'lucide-react';

const AssuranceTaxiToulon: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Assurance Taxi par Ville', url: '/villes-assurance-taxi' },
    { name: 'Assurance Taxi Toulon', url: '/assurance-taxi-toulon' }
  ];

  return (
    <>
      <Helmet>
        <title>Assurance Taxi Toulon &amp; RC Pro Toulon — Dès 1 620€/an | TaxiAssur</title>
        <meta name="description" content="Assurance taxi Toulon et RC Pro taxi Toulon dès 1 620€/an. Courtier spécialisé taxi Var (83). RC professionnelle obligatoire incluse. Devis gratuit 2 min, réponse 15 min." />
        <meta name="keywords" content="assurance taxi Toulon, rc pro Toulon, rc pro taxi Toulon, assurance taxi Var, courtier assurance taxi Toulon, responsabilité civile taxi Toulon, assurance professionnelle taxi 83" />
        <link rel="canonical" href="https://taxiassur.com/assurance-taxi-toulon" />
        <link rel="alternate" href="https://taxiassur.com/assurance-taxi-toulon" hrefLang="fr" />
        <link rel="alternate" href="https://taxiassur.com/assurance-taxi-toulon" hrefLang="x-default" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Assurance Taxi Toulon &amp; RC Pro Toulon — Dès 1 620€/an | TaxiAssur" />
        <meta property="og:description" content="Assurance taxi Toulon et RC Pro taxi Toulon dès 1 620€/an. Devis gratuit 2 min." />
        <meta property="og:url" content="https://taxiassur.com/assurance-taxi-toulon" />
        <meta property="og:image" content="https://taxiassur.com/logo-600x300.png" />
        <meta property="og:site_name" content="TaxiAssur" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="300" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Assurance Taxi Toulon &amp; RC Pro Toulon | TaxiAssur" />
        <meta name="twitter:description" content="Assurance taxi Toulon dès 1 620€/an. RC Pro incluse. Devis gratuit." />
        <meta name="twitter:image" content="https://taxiassur.com/logo-600x300.png" />
      </Helmet>
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

      <Header />
      <main className="bg-white">

        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-20 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url('https://images.pexels.com/photos/3408354/pexels-photo-3408354.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')` }}
          />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-4 py-2 mb-6">
                <MapPin size={16} className="text-amber-400" />
                <span className="text-amber-300 text-sm font-semibold">Courtier Spécialisé Taxi — Var (83)</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                Assurance Taxi Toulon
                <br />
                <span className="text-amber-400">RC Pro Toulon</span>
                <br />
                <span className="text-green-400 text-3xl md:text-5xl">Dès 1 620 €/an</span>
              </h1>
              <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
                Votre <strong className="text-amber-400">courtier taxi à Toulon</strong> — RC Professionnelle obligatoire, tous risques et assistance 24h/24 inclus. Agréé ORIAS, spécialiste du département Var depuis 15 ans.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#devis" className="bg-amber-500 hover:bg-amber-400 text-black font-black px-8 py-4 rounded-xl transition-colors text-lg">
                  Devis Gratuit Toulon — 2 min
                </a>
                <a href="tel:0180855786" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 font-bold px-8 py-4 rounded-xl transition-colors text-lg flex items-center gap-2 justify-center">
                  <Phone size={20} />
                  01 80 85 57 86
                </a>
              </div>
              <div className="flex flex-wrap justify-center gap-8 mt-10">
                {[
                  { value: '1 620 €', label: 'Dès / an Toulon' },
                  { value: '-35%', label: 'vs marché direct' },
                  { value: '15 min', label: 'Réponse garantie' },
                  { value: 'ORIAS', label: 'Courtier agréé' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl font-black text-amber-400">{s.value}</div>
                    <div className="text-sm text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RC Pro Toulon — Section Clé */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                  RC Pro Taxi Toulon : Obligatoire &amp; Incluse
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                  La Responsabilité Civile Professionnelle est <strong>légalement obligatoire</strong> pour exercer comme chauffeur de taxi dans le Var. Voici ce qu'elle couvre.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Shield size={24} className="text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Ce que Couvre votre RC Pro à Toulon</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Dommages corporels causés à vos passagers (illimité)',
                      'Dommages matériels causés à des tiers',
                      'Accidents impliquant des piétons ou cyclistes',
                      'Erreurs commises dans l\'exercice de votre activité',
                      'Défense pénale et recours civils',
                      'Indemnisation des victimes prise en charge',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-gray-700">
                        <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50 rounded-2xl border border-red-200 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Sanctions sans RC Pro à Toulon</h3>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {[
                      'Amende jusqu\'à 3 750 € (Code des assurances)',
                      'Suspension ou retrait de la carte professionnelle',
                      'Immobilisation du véhicule',
                      'Responsabilité personnelle illimitée en cas d\'accident',
                      'Interdiction d\'exercer pendant la procédure',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-red-800">
                        <span className="text-red-500 mt-1 flex-shrink-0 font-bold">✗</span>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="#devis" className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-center transition-colors">
                    Régulariser Ma Situation
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tarifs Toulon */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 mb-4">
                  Tarifs Assurance Taxi Toulon 2025
                </h2>
                <p className="text-gray-600">Tarifs négociés par TaxiAssur pour les taxis du département Var (83)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    name: 'Essentiel',
                    price: '1 620 €',
                    period: '/an',
                    color: 'border-gray-200',
                    headerBg: 'bg-gray-50',
                    items: [
                      'RC Professionnelle obligatoire',
                      'Responsabilité Civile Véhicule',
                      'Protection Juridique de base',
                      'Assistance 0 km 24h/24',
                    ],
                    cta: 'Obtenir ce Tarif',
                    ctaColor: 'bg-gray-800 hover:bg-gray-700'
                  },
                  {
                    name: 'Recommandé',
                    price: '1 980 €',
                    period: '/an',
                    color: 'border-amber-400',
                    headerBg: 'bg-amber-500',
                    popular: true,
                    items: [
                      'RC Professionnelle obligatoire',
                      'Dommages Tous Accidents',
                      'Vol &amp; Incendie',
                      'Bris de Glaces',
                      'Véhicule de Remplacement',
                      'Protection Juridique Étendue',
                    ],
                    cta: 'Obtenir ce Tarif',
                    ctaColor: 'bg-amber-500 hover:bg-amber-400 text-black'
                  },
                  {
                    name: 'Premium',
                    price: '2 340 €',
                    period: '/an',
                    color: 'border-blue-300',
                    headerBg: 'bg-blue-600',
                    items: [
                      'Tous les avantages Recommandé',
                      'Garantie Conducteur Renforcée',
                      'Protection Passagers Étendue',
                      'Franchise Réduite',
                      'Gestion Prioritaire Sinistres',
                      'Assistance Confort 5 étoiles',
                    ],
                    cta: 'Obtenir ce Tarif',
                    ctaColor: 'bg-blue-600 hover:bg-blue-500'
                  },
                ].map((plan) => (
                  <div key={plan.name} className={`relative rounded-2xl border-2 overflow-hidden shadow-sm ${plan.color}`}>
                    {plan.popular && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="bg-amber-500 text-black text-xs font-black px-3 py-1 rounded-full">Populaire</span>
                      </div>
                    )}
                    <div className={`${plan.headerBg} p-6 text-center`}>
                      <div className={`font-black text-lg mb-1 ${plan.popular ? 'text-black' : 'text-gray-900'}`}>{plan.name}</div>
                      <div className={`text-4xl font-black ${plan.popular ? 'text-black' : 'text-gray-900'}`}>
                        {plan.price}<span className="text-lg font-normal">{plan.period}</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <ul className="space-y-3 mb-6">
                        {plan.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-gray-700 text-sm">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <span dangerouslySetInnerHTML={{ __html: item }} />
                          </li>
                        ))}
                      </ul>
                      <a href="#devis" className={`block w-full text-white font-bold py-3 rounded-xl text-center transition-colors ${plan.ctaColor}`}>
                        {plan.cta}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-gray-500 text-xs mt-6">
                Tarifs indicatifs pour un profil standard — votre devis personnalisé peut être inférieur selon votre ancienneté et historique.
              </p>
            </div>
          </div>
        </section>

        {/* Spécificités Toulon */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">
                Assurance Taxi à Toulon : Ce Qu'il Faut Savoir
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <MapPin size={24} className="text-amber-500" />,
                    title: 'Zone d\'activité Var (83)',
                    desc: 'Toulon, La Seyne-sur-Mer, Hyères, Ollioules, Bandol, Six-Fours-les-Plages... Notre couverture s\'adapte à l\'ensemble du département Var et aux trajets vers Marseille et Nice.'
                  },
                  {
                    icon: <TrendingDown size={24} className="text-green-500" />,
                    title: 'Tarifs Var : 5% sous la moyenne nationale',
                    desc: 'La sinistralité dans le Var est inférieure à Paris et Lyon. Les taxis de Toulon bénéficient de tarifs plus avantageux, notamment hors saison estivale.'
                  },
                  {
                    icon: <Star size={24} className="text-amber-500" />,
                    title: 'Saison Estivale : Adaptez votre couverture',
                    desc: 'Juillet-Août : le trafic touristique augmente. Pensez à vérifier que vos garanties couvrent les trajets vers les ports, plages et aéroport Toulon-Hyères.'
                  },
                  {
                    icon: <Clock size={24} className="text-blue-500" />,
                    title: 'Attestation Provisoire Immédiate',
                    desc: 'Après validation de votre devis, nous vous envoyons une attestation provisoire par email le jour même. Vous pouvez exercer sans interruption pendant le traitement de votre dossier.'
                  },
                ].map((item) => (
                  <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-shrink-0">{item.icon}</div>
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Avis clients Toulon */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">
                Taxis Toulonnais : Leurs Avis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    name: 'Mohamed K.',
                    job: 'Artisan Taxi — Toulon Centre',
                    text: 'Passage de 2 380€ à 1 650€ par an avec la même couverture. Mon conseiller TaxiAssur connaît les spécificités du Var, c\'est rassurant.',
                    stars: 5
                  },
                  {
                    name: 'Patricia V.',
                    job: 'Taxi — Hyères / Toulon',
                    text: 'Ils ont géré mon sinistre en août, en pleine saison. Réponse rapide, défense assurée, dossier clos en 3 semaines. Parfait.',
                    stars: 5
                  },
                  {
                    name: 'Rachid A.',
                    job: 'Chauffeur Taxi — Var (83)',
                    text: 'RC Pro obligatoire + tous risques pour 1 980€. C\'est le meilleur tarif que j\'ai trouvé après avoir comparé 5 assureurs. Merci TaxiAssur.',
                    stars: 5
                  },
                ].map((review) => (
                  <div key={review.name} className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: review.stars }).map((_, i) => (
                        <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm italic mb-4">"{review.text}"</p>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{review.name}</div>
                      <div className="text-gray-500 text-xs">{review.job}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Formulaire */}
        <section id="devis" className="py-16 bg-gray-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black mb-3">Devis Assurance Taxi Toulon — Gratuit</h2>
              <p className="text-gray-300">Remplissez le formulaire, notre expert vous rappelle sous 15 minutes.</p>
            </div>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
};

export default AssuranceTaxiToulon;
