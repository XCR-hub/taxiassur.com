import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Shield, Star, CheckCircle, AlertTriangle, Phone, Clock, Award, Car, Euro, Users } from 'lucide-react';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import JsonLd from '../components/JsonLd';

const faqItems = [
  {
    question: "TaxiAssur couvre-t-il les taxis de Vaux-le-Pénil et la Seine-et-Marne ?",
    answer: "Oui, TaxiAssur est basé à Dammarie-les-Lys, à quelques minutes de Vaux-le-Pénil. Nous connaissons parfaitement le marché du taxi en Seine-et-Marne (77) et pouvons vous accompagner en personne si besoin. Nous couvrons toutes les communes du 77 : Melun, Vaux-le-Pénil, Dammarie-les-Lys, Meaux, Fontainebleau et toute l'Île-de-France."
  },
  {
    question: "Quel est le prix d'une assurance taxi à Vaux-le-Pénil ?",
    answer: "Le tarif moyen pour un taxi en Seine-et-Marne oscille entre 1 100€ et 2 200€/an selon le véhicule, l'ancienneté et le profil du conducteur. Grâce à notre réseau de 15+ assureurs partenaires et notre implantation locale, nous négocions les meilleures conditions pour les taxis du 77."
  },
  {
    question: "Puis-je venir en agence TaxiAssur près de Vaux-le-Pénil ?",
    answer: "Notre bureau est situé au 824 Avenue du Lys à Dammarie-les-Lys (77190), à moins de 5 minutes de Vaux-le-Pénil. Vous pouvez nous rendre visite du lundi au vendredi de 9h à 18h, ou nous contacter par téléphone et email pour un service rapide."
  },
  {
    question: "La RC Pro est-elle obligatoire pour les taxis de Seine-et-Marne ?",
    answer: "Oui, la Responsabilité Civile Professionnelle est obligatoire pour tout taxi en France, y compris en Seine-et-Marne. Sans RC Pro valide, votre carte professionnelle peut être suspendue et vous risquez des amendes jusqu'à 3 750€. TaxiAssur vous garantit une couverture conforme à la réglementation."
  },
  {
    question: "Combien de temps pour obtenir mon attestation d'assurance taxi à Vaux-le-Pénil ?",
    answer: "Après validation de votre dossier, l'attestation est envoyée par email immédiatement. Pour les taxis de Vaux-le-Pénil et de la région melunaise, nous pouvons également remettre les documents en main propre à notre agence de Dammarie-les-Lys. Délai moyen : moins de 24h."
  }
];

const testimonials = [
  {
    name: "Karim B.",
    location: "Taxi Vaux-le-Pénil",
    rating: 5,
    text: "Je travaille sur Melun et Vaux-le-Pénil depuis 8 ans. TaxiAssur m'a fait économiser 420€ sur ma prime annuelle. Et comme ils sont à Dammarie, j'ai pu signer en personne !"
  },
  {
    name: "Sylvie M.",
    location: "Taxi Dammarie-les-Lys",
    rating: 5,
    text: "Voisins de bureau ! J'ai apprécié de pouvoir passer en agence pour finaliser mon contrat. Service très professionnel, couverture complète, tarif imbattable."
  },
  {
    name: "Thierry C.",
    location: "Taxi Seine-et-Marne",
    rating: 5,
    text: "Courtier local qui connaît vraiment les contraintes des taxis du 77. Réseau Paris-Melun, navettes gare de Lyon... Ils ont su trouver la formule adaptée à mon activité."
  }
];

export default function AssuranceTaxiVauxLePenil() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const breadcrumbData = [
    { name: 'Accueil', url: '/' },
    { name: 'Assurance Taxi par ville', url: '/villes' },
    { name: 'Assurance Taxi Vaux-le-Pénil', url: '/assurance-taxi-vaux-le-penil' }
  ];

  return (
    <>
      <Helmet>
        <title>Assurance Taxi Vaux-le-Pénil & Seine-et-Marne 77 — Dès 1 100€/an | TaxiAssur</title>
        <meta name="description" content="Assurance taxi Vaux-le-Pénil et Seine-et-Marne (77). TaxiAssur, votre courtier local basé à Dammarie-les-Lys. RC Pro obligatoire, devis gratuit en 2 min, économisez jusqu'à 35%." />
        <link rel="canonical" href="https://taxiassur.com/assurance-taxi-vaux-le-penil" />
        <meta name="keywords" content="assurance taxi Vaux-le-Pénil, assurance vaux le penil, assurance taxi Seine-et-Marne, assurance taxi 77, assurance taxi Melun, RC pro taxi 77, courtier assurance taxi 77" />
        <meta property="og:title" content="Assurance Taxi Vaux-le-Pénil & Seine-et-Marne — TaxiAssur" />
        <meta property="og:description" content="Courtier local assurance taxi en Seine-et-Marne. Bureau à Dammarie-les-Lys, à 5 min de Vaux-le-Pénil. Devis gratuit, économisez 35%." />
        <meta property="og:type" content="website" />
        <meta name="geo.region" content="FR-77" />
        <meta name="geo.placename" content="Vaux-le-Pénil, Seine-et-Marne" />
      </Helmet>

      <JsonLd type="faq" data={faqItems} />
      <JsonLd type="breadcrumb" data={breadcrumbData} />
      <JsonLd type="organization" />

      <StickyCTA
        phone="01 80 85 57 86"
        text="Devis taxi Vaux-le-Pénil"
        subtext="Courtier local 77 — réponse en 15 min"
      />

      <main className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900">

        {/* Hero */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-400 rounded-full blur-3xl" />
          </div>

          <div className="container-max relative z-10 px-4">
            <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6" aria-label="Fil d'Ariane">
              <a href="/" className="hover:text-amber-400 transition-colors">Accueil</a>
              <span>/</span>
              <a href="/villes" className="hover:text-amber-400 transition-colors">Villes</a>
              <span>/</span>
              <span className="text-amber-400">Vaux-le-Pénil</span>
            </nav>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5">
                <MapPin size={14} className="text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Courtier Local Seine-et-Marne 77</span>
              </div>
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5">
                <MapPin size={14} className="text-green-400" />
                <span className="text-green-400 text-sm font-medium">Bureau à 5 min de Vaux-le-Pénil</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Assurance Taxi{' '}
              <span className="text-amber-400">Vaux-le-Pénil</span>
              <br />
              <span className="text-2xl md:text-3xl text-gray-300 font-normal">
                &amp; Seine-et-Marne — Dès <span className="text-amber-400 font-bold">1 100 €/an</span>
              </span>
            </h1>

            <p className="text-lg text-gray-300 mb-8 max-w-2xl leading-relaxed">
              Votre <strong className="text-white">courtier local</strong> en assurance taxi basé à{' '}
              <strong className="text-amber-400">Dammarie-les-Lys</strong>, à 5 minutes de Vaux-le-Pénil.
              RC Pro obligatoire, tous risques, flotte de taxis : on compare 15+ assureurs pour vous obtenir
              le meilleur prix en Seine-et-Marne.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle size={16} className="text-amber-400" />
                <span>Bureau local 77 à Dammarie-les-Lys</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle size={16} className="text-amber-400" />
                <span>Devis gratuit en 2 minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle size={16} className="text-amber-400" />
                <span>Économisez jusqu'à 35%</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle size={16} className="text-amber-400" />
                <span>Signature possible en agence</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <div className="ai-card p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">35%</div>
                <div className="text-xs text-gray-400 mt-1">d'économies moyennes</div>
              </div>
              <div className="ai-card p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">15+</div>
                <div className="text-xs text-gray-400 mt-1">assureurs comparés</div>
              </div>
              <div className="ai-card p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">24h</div>
                <div className="text-xs text-gray-400 mt-1">attestation reçue</div>
              </div>
            </div>
          </div>
        </section>

        {/* Local presence highlight */}
        <section className="section-padding bg-gradient-to-r from-amber-500/10 to-transparent border-y border-amber-500/20">
          <div className="container-max px-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <MapPin size={28} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg">TaxiAssur — Bureau Seine-et-Marne</div>
                  <div className="text-amber-400 text-sm">824 Avenue du Lys, 77190 Dammarie-les-Lys</div>
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-gray-700" />
              <div className="flex flex-wrap gap-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <span>Lun–Ven : 9h–18h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-amber-400" />
                  <span>01 80 85 57 86</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car size={14} className="text-amber-400" />
                  <span>À 5 min de Vaux-le-Pénil</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-amber-400" />
                  <span>Rendez-vous en agence possible</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RC Pro obligatoire */}
        <section className="section-padding">
          <div className="container-max px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                RC Pro Taxi Obligatoire en{' '}
                <span className="text-amber-400">Seine-et-Marne</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Comme partout en France, la Responsabilité Civile Professionnelle est une obligation légale
                pour exercer l'activité de taxi dans le 77. Voici ce que vous risquez sans couverture valide.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div className="ai-card p-6 border-red-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle size={24} className="text-red-400" />
                  <h3 className="text-lg font-bold text-red-400">Sans RC Pro valide</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Amende jusqu'à 3 750€",
                    "Suspension immédiate de carte professionnelle",
                    "Interdiction d'exercer l'activité taxi",
                    "Responsabilité personnelle en cas d'accident",
                    "Risque de poursuites pénales"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-400 mt-0.5">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ai-card p-6 border-green-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={24} className="text-green-400" />
                  <h3 className="text-lg font-bold text-green-400">Avec TaxiAssur</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "RC Pro conforme, délivrée en 24h",
                    "Protection complète passagers et tiers",
                    "Attestation valable immédiatement",
                    "Accompagnement sinistres 7j/7",
                    "Courtier agréé ORIAS localisé dans le 77"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="section-padding bg-black/30">
          <div className="container-max px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Tarifs Assurance Taxi{' '}
                <span className="text-amber-400">Seine-et-Marne</span>
              </h2>
              <p className="text-gray-400">Estimations pour taxis du 77 — devis personnalisé gratuit</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  name: "RC Pro Seule",
                  price: "1 100",
                  desc: "Couverture minimale légale",
                  features: [
                    "Responsabilité civile obligatoire",
                    "Protection passagers",
                    "Défense pénale",
                    "Attestation immédiate"
                  ],
                  highlight: false
                },
                {
                  name: "Tous Risques",
                  price: "1 650",
                  desc: "La formule la plus choisie",
                  features: [
                    "RC Pro complète",
                    "Dommages toutes causes",
                    "Vol, incendie, bris de glace",
                    "Assistance 0 km",
                    "Véhicule de remplacement",
                    "Protection juridique"
                  ],
                  highlight: true
                },
                {
                  name: "Flotte 77",
                  price: "Sur devis",
                  desc: "Pour 2+ véhicules en Seine-et-Marne",
                  features: [
                    "Tarif dégressif par véhicule",
                    "Gestion centralisée",
                    "Interlocuteur dédié local",
                    "Bilan annuel en agence"
                  ],
                  highlight: false
                }
              ].map((plan, i) => (
                <div
                  key={i}
                  className={`ai-card p-6 relative ${plan.highlight ? 'border-amber-500/50 ring-1 ring-amber-500/30' : ''}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMANDÉ
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{plan.desc}</p>
                  <div className="mb-5">
                    {plan.price === "Sur devis" ? (
                      <span className="text-2xl font-bold text-amber-400">Sur devis</span>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold text-amber-400">{plan.price} €</span>
                        <span className="text-gray-500 text-sm">/an</span>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#devis"
                    className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      plan.highlight
                        ? 'btn-primary'
                        : 'border border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    Obtenir ce devis
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Local context */}
        <section className="section-padding">
          <div className="container-max px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Assurance Taxi Adaptée au{' '}
                <span className="text-amber-400">Bassin Melunais</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Vaux-le-Pénil et la région de Melun ont leurs spécificités. Notre équipe locale connaît
                les flux de clientèle, les zones d'activité et les risques propres à la Seine-et-Marne.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Car size={22} className="text-amber-400" />,
                  title: "Navettes Gare de Lyon / Melun",
                  desc: "Trajets fréquents Paris–Melun sur l'axe autoroutier A5. Couverture longue distance indispensable."
                },
                {
                  icon: <MapPin size={22} className="text-amber-400" />,
                  title: "Zone Périurbaine Seine-et-Marne",
                  desc: "Activité mixte ville/campagne typique du 77 : risques spécifiques couverts par nos formules."
                },
                {
                  icon: <Award size={22} className="text-amber-400" />,
                  title: "Courtier ORIAS Local",
                  desc: "Bureau physique à 5 min, signature en agence possible, suivi personnalisé par un conseiller du 77."
                },
                {
                  icon: <Shield size={22} className="text-amber-400" />,
                  title: "Couverture Île-de-France Complète",
                  desc: "Paris, Orly, CDG, Disneyland Paris : vos déplacements dans tout le Grand Paris sont couverts."
                },
                {
                  icon: <Euro size={22} className="text-amber-400" />,
                  title: "Tarifs Compétitifs Hors Paris",
                  desc: "Les taxis du 77 bénéficient souvent de primes inférieures à Paris. On optimise votre profil de risque."
                },
                {
                  icon: <Clock size={22} className="text-amber-400" />,
                  title: "Réactivité Sinistres",
                  desc: "En cas d'accident, notre équipe locale vous accompagne pour accélérer les démarches et minimiser l'immobilisation."
                }
              ].map((item, i) => (
                <div key={i} className="ai-card p-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section-padding bg-black/30">
          <div className="container-max px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ils nous font confiance en{' '}
                <span className="text-amber-400">Seine-et-Marne</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {testimonials.map((t, i) => (
                <div key={i} className="ai-card p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-amber-400 text-xs">{t.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding">
          <div className="container-max px-4 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-10">
              Questions Fréquentes —{' '}
              <span className="text-amber-400">Assurance Taxi 77</span>
            </h2>

            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <div key={i} className="ai-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-white font-medium pr-4">{item.question}</span>
                    <span className={`text-amber-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5">
                      <p className="text-gray-300 text-sm leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA + Form */}
        <section id="devis" className="section-padding bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="container-max px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Votre Devis Assurance Taxi{' '}
                <span className="text-amber-400">Vaux-le-Pénil</span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Gratuit, sans engagement, réponse en moins de 15 minutes.
                Notre conseiller local en Seine-et-Marne vous rappelle rapidement.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10 items-start max-w-4xl mx-auto">
              <div className="space-y-5">
                <div className="ai-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin size={20} className="text-amber-400" />
                    <h3 className="text-white font-bold">Notre bureau local 77</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">824 Avenue du Lys</p>
                  <p className="text-amber-400 font-semibold">77190 Dammarie-les-Lys</p>
                  <p className="text-gray-500 text-xs mt-1">(à 5 min de Vaux-le-Pénil)</p>
                </div>

                <div className="ai-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Phone size={20} className="text-amber-400" />
                    <h3 className="text-white font-bold">Appelez-nous</h3>
                  </div>
                  <a href="tel:+33180855786" className="text-2xl font-bold text-amber-400 hover:text-amber-300 transition-colors">
                    01 80 85 57 86
                  </a>
                  <p className="text-gray-500 text-xs mt-1">Lun–Ven 9h–18h</p>
                </div>

                <div className="ai-card p-5">
                  <h3 className="text-white font-bold mb-3">Ce que vous économisez</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Prime marché moyen 77", value: "1 620 €/an", color: "text-red-400" },
                      { label: "Prime TaxiAssur 77", value: "1 100 €/an", color: "text-green-400" },
                      { label: "Économie réalisée", value: "520 €/an", color: "text-amber-400" }
                    ].map((row, j) => (
                      <div key={j} className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">{row.label}</span>
                        <span className={`font-bold ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <LeadForm
                  source="assurance-taxi-vaux-le-penil"
                  title="Devis Gratuit — Taxi 77"
                  subtitle="Réponse en moins de 15 min par votre conseiller local"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="section-padding bg-black/20">
          <div className="container-max px-4">
            <h2 className="text-xl font-bold text-white mb-6 text-center">
              Autres villes couvertes en <span className="text-amber-400">Île-de-France</span>
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Assurance Taxi Paris", href: "/assurance-taxi-paris" },
                { label: "Assurance Taxi Île-de-France", href: "/assurance-taxi" },
                { label: "Devis Assurance Taxi", href: "/devis-assurance-taxi" },
                { label: "RC Pro Taxi", href: "/rc-professionnelle" },
                { label: "Courtier Assurance Taxi", href: "/courtier-assurance-taxi" },
                { label: "Prix Assurance Taxi", href: "/prix-assurance-taxi" }
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  className="px-4 py-2 rounded-full border border-gray-700 text-gray-400 text-sm hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
