import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import StickyCTA from '../components/StickyCTA';
import JsonLd from '../components/JsonLd';
import CityPageSEO from '../components/CityPageSEO';
import { Shield, CheckCircle, Phone, Clock, Star, MapPin, TrendingDown, Plane, Car, AlertCircle } from 'lucide-react';

const AssuranceTaxiNice: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Assurance Taxi par Ville', url: '/villes-assurance-taxi' },
    { name: 'Assurance Taxi Nice', url: '/assurance-taxi-nice' }
  ];

  const faqItems = [
    {
      question: "Quel est le prix d'une assurance taxi à Nice ?",
      answer: "L'assurance taxi à Nice coûte entre 1 820 € et 2 600 €/an selon votre profil et vos garanties. Via TaxiAssur, courtier spécialisé, vous économisez en moyenne 35% par rapport aux tarifs du marché direct. Demandez votre devis gratuit en 2 minutes."
    },
    {
      question: "L'assurance VTC Nice est-elle différente de l'assurance taxi ?",
      answer: "Oui, l'assurance VTC (Véhicule de Tourisme avec Chauffeur) est distincte de l'assurance taxi classique. Les garanties sont similaires mais les contrats sont adaptés au statut juridique différent. TaxiAssur propose des solutions pour les deux statuts à Nice et sur la Côte d'Azur."
    },
    {
      question: "Faut-il une assurance spécifique pour l'aéroport de Nice ?",
      answer: "Non, une assurance taxi standard couvre les courses vers et depuis l'Aéroport Nice Côte d'Azur. Assurez-vous que votre contrat couvre bien les zones aéroportuaires, ce qui est le cas de tous nos contrats TaxiAssur à Nice."
    },
    {
      question: "Puis-je exercer comme taxi l'été à Nice avec une attestation provisoire ?",
      answer: "Oui, TaxiAssur émet une attestation provisoire immédiate par email. Vous pouvez exercer dès le lendemain de votre demande, y compris pendant la saison touristique estivale, pendant le traitement de votre dossier complet."
    },
    {
      question: "Mon contrat couvre-t-il les courses sur toute la Côte d'Azur ?",
      answer: "Oui, votre couverture est valable sur l'ensemble du territoire français. Que vous soyez à Nice, Cannes, Monaco, Antibes ou Menton, votre assurance taxi TaxiAssur vous couvre intégralement."
    }
  ];

  return (
    <>
      <CityPageSEO citySlug="nice" />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />
      <JsonLd type="faq" data={faqItems} />

      <Header />
      <main className="bg-white">

        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-950 via-blue-950 to-black text-white py-20 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url('https://images.pexels.com/photos/1139073/pexels-photo-1139073.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')` }}
          />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 rounded-full px-4 py-2 mb-6">
                <MapPin size={16} className="text-blue-300" />
                <span className="text-blue-200 text-sm font-semibold">Courtier Spécialisé — Alpes-Maritimes (06)</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                Assurance Taxi <span className="text-blue-400">Nice</span>
                <br />
                <span className="text-amber-400">Assurance VTC Nice</span>
                <br />
                <span className="text-green-400 text-3xl md:text-5xl">Dès 1 820 €/an</span>
              </h1>
              <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
                Votre <strong className="text-amber-400">courtier assurance taxi et VTC à Nice</strong> — RC Professionnelle obligatoire, couverture aéroport et Côte d'Azur, assistance 24h/24. Agréé ORIAS, spécialiste des Alpes-Maritimes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#devis" className="bg-amber-500 hover:bg-amber-400 text-black font-black px-8 py-4 rounded-xl transition-colors text-lg">
                  Devis Gratuit Nice — 2 min
                </a>
                <a href="tel:0180855786" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 font-bold px-8 py-4 rounded-xl transition-colors text-lg flex items-center gap-2 justify-center">
                  <Phone size={20} />
                  01 80 85 57 86
                </a>
              </div>
              <div className="flex flex-wrap justify-center gap-8 mt-10">
                {[
                  { value: '1 820 €', label: 'Dès / an Taxi Nice' },
                  { value: '-35%', label: 'vs marché direct' },
                  { value: 'Taxi + VTC', label: 'Les deux statuts' },
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

        {/* Taxi vs VTC Nice */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                  Assurance Taxi &amp; Assurance VTC à Nice
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Nice concentre un flux touristique exceptionnel. TaxiAssur couvre les deux statuts avec des contrats adaptés à la réalité de la Côte d'Azur.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Car size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Assurance Taxi Nice</h3>
                      <div className="text-amber-600 font-bold text-sm">Dès 1 820 €/an</div>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {[
                      "RC Professionnelle obligatoire",
                      "Dommages tous accidents",
                      "Couverture Aéroport Nice Côte d'Azur",
                      "Courses Cannes, Monaco, Antibes",
                      "Assistance 0km 24h/24 - 7j/7",
                      "Véhicule de remplacement",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-gray-700">
                        <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="#devis" className="block w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-center transition-colors">
                    Devis Taxi Nice
                  </a>
                </div>

                <div className="bg-white rounded-2xl border border-blue-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Car size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Assurance VTC Nice</h3>
                      <div className="text-blue-600 font-bold text-sm">Dès 1 950 €/an</div>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {[
                      "RC Professionnelle VTC adaptée",
                      "Couverture Uber, Bolt, Chauffeur Privé",
                      "Garanties spécifiques statut VTC",
                      "Protection pendant et hors mission",
                      "Assistance Premium 24h/24",
                      "Protection juridique renforcée",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-gray-700">
                        <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="#devis" className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-center transition-colors">
                    Devis VTC Nice
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Spécificités Nice */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 mb-4">
                  Nice &amp; Côte d'Azur : Les Enjeux pour Votre Assurance
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <Plane size={24} className="text-blue-500" />,
                    title: "Aéroport Nice Côte d'Azur",
                    desc: "14 millions de passagers/an. L'aéroport de Nice est le 2ème de France. Courses fréquentes, souvent de nuit. Votre assurance doit couvrir toutes les zones aéroportuaires (terminal 1 et 2)."
                  },
                  {
                    icon: <MapPin size={24} className="text-amber-500" />,
                    title: "Couverture Monaco & Frontière",
                    desc: "Les courses vers Monaco sont fréquentes depuis Nice. Vérifiez que votre contrat couvre les transports transfrontaliers. Tous nos contrats TaxiAssur incluent cette couverture."
                  },
                  {
                    icon: <Star size={24} className="text-amber-500" />,
                    title: "Saison Estivale & Festival",
                    desc: "Cannes, Nice Carnaval, Festival Jazz... L'activité explose en haute saison. Votre couverture doit être adaptée à des volumes de courses multipliés par 3 en juillet-août."
                  },
                  {
                    icon: <TrendingDown size={24} className="text-green-500" />,
                    title: "Tarif Nice : +5% vs moyenne nationale",
                    desc: "Le trafic dense et la fréquentation touristique impliquent un tarif légèrement supérieur. Mais TaxiAssur vous garantit -35% vs les tarifs de marché grâce à son réseau de 15+ assureurs."
                  },
                ].map((item) => (
                  <div key={item.title} className="bg-gray-50 rounded-xl border border-gray-200 p-6">
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

        {/* Tarifs Nice */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 mb-4">
                  Tarifs Assurance Taxi &amp; VTC Nice 2025
                </h2>
                <p className="text-gray-600">Tarifs négociés pour les conducteurs des Alpes-Maritimes (06)</p>
              </div>

              <div className="overflow-x-auto mb-8">
                <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <thead className="bg-gray-900 text-white">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold">Profil Conducteur</th>
                      <th className="text-right py-4 px-4 font-semibold">Prix Marché</th>
                      <th className="text-right py-4 px-4 text-amber-400 font-bold">Via TaxiAssur</th>
                      <th className="text-right py-4 px-4 text-green-400 font-semibold">Économie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { profil: 'Taxi Nice — RC Pro seule', direct: '1 800 €/an', courtier: '1 170 €/an', eco: '-35%' },
                      { profil: 'Taxi Nice — Tous risques, exp. +5 ans', direct: '2 800 €/an', courtier: '1 820 €/an', eco: '-35%' },
                      { profil: 'VTC Nice — Uber/Bolt standard', direct: '3 000 €/an', courtier: '1 950 €/an', eco: '-35%' },
                      { profil: 'Taxi Aéroport Nice — Premium', direct: '3 400 €/an', courtier: '2 210 €/an', eco: '-35%' },
                      { profil: 'VTC Haut de gamme — Monaco', direct: '4 000 €/an', courtier: '2 600 €/an', eco: '-35%' },
                    ].map((row) => (
                      <tr key={row.profil} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 text-gray-900 font-medium text-sm">{row.profil}</td>
                        <td className="py-4 px-4 text-right text-gray-400 line-through text-sm">{row.direct}</td>
                        <td className="py-4 px-4 text-right text-amber-600 font-bold">{row.courtier}</td>
                        <td className="py-4 px-4 text-right text-green-600 font-bold">{row.eco}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-gray-500 text-xs">Tarifs indicatifs — économies réelles variables selon profil et compagnie retenue</p>
            </div>
          </div>
        </section>

        {/* RC Pro Nice */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-6">
                    RC Pro Taxi/VTC Nice : Ce que la Loi Exige
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Que vous soyez chauffeur de taxi ou VTC à Nice, la <strong>Responsabilité Civile Professionnelle est obligatoire</strong>. Elle couvre les dommages causés à vos passagers et aux tiers pendant votre activité.
                  </p>
                  <ul className="space-y-3">
                    {[
                      'Couverture dommages corporels illimitée',
                      'Dommages matériels aux tiers',
                      'Protection juridique en cas de litige',
                      'Défense pénale incluse',
                      'Assistance aux victimes prise en charge',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-gray-700">
                        <Shield size={16} className="text-amber-500 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
                    <h3 className="font-bold text-gray-900">Sans RC Pro à Nice</h3>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Amende jusqu'à 3 750 €",
                      'Retrait de la carte professionnelle',
                      'Immobilisation du véhicule',
                      'Responsabilité personnelle illimitée',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-red-800 text-sm">
                        <span className="text-red-500 font-bold flex-shrink-0">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a href="#devis" className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-center transition-colors text-sm">
                    Souscrire Ma RC Pro Nice
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Avis */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">
                Avis Taxis &amp; VTC de Nice
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    name: 'Yacine B.',
                    job: 'Taxi Aéroport Nice',
                    text: "J'ai économisé 820€ par rapport à mon assureur précédent. Même couverture, même assureur, juste négocié via TaxiAssur. Je l'aurais su avant.",
                    stars: 5,
                    saving: '-820 €/an'
                  },
                  {
                    name: 'Cécile V.',
                    job: 'Chauffeur VTC — Nice/Cannes',
                    text: 'Mon contrat VTC Nice couvre bien Monaco et la frontière italienne. Attestation reçue en 2h. Service impeccable.',
                    stars: 5,
                    saving: '-700 €/an'
                  },
                  {
                    name: 'Sofiane M.',
                    job: 'Artisan Taxi — Alpes-Maritimes',
                    text: 'Je recommande TaxiAssur à tous les taxis de Nice. Connaissance parfaite du marché local, tarifs imbattables.',
                    stars: 5,
                    saving: '-650 €/an'
                  },
                ].map((review) => (
                  <div key={review.name} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.stars }).map((_, i) => (
                          <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-green-600 font-black text-sm">{review.saving}</span>
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

        {/* FAQ */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">
                Questions Fréquentes — Assurance Taxi &amp; VTC Nice
              </h2>
              <div className="space-y-4">
                {faqItems.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                    <h3 className="font-bold text-amber-600 mb-2 text-sm">{item.question}</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">{item.answer}</p>
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
              <h2 className="text-3xl font-black mb-3">Devis Assurance Taxi &amp; VTC Nice — Gratuit</h2>
              <p className="text-gray-300">Notre expert Côte d'Azur vous rappelle sous 15 minutes.</p>
              <div className="flex flex-wrap justify-center gap-6 mt-4">
                {[
                  { icon: <Clock size={16} className="text-green-400" />, text: 'Réponse 15 min' },
                  { icon: <CheckCircle size={16} className="text-green-400" />, text: 'Taxi & VTC' },
                  { icon: <CheckCircle size={16} className="text-green-400" />, text: 'RC Pro incluse' },
                  { icon: <CheckCircle size={16} className="text-green-400" />, text: 'Sans engagement' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-gray-300 text-sm">
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
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

export default AssuranceTaxiNice;
