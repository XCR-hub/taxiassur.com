import { Helmet } from 'react-helmet-async';
import NewsletterSubscribeForm from '../components/NewsletterSubscribeForm';
import { Mail, TrendingUp, Users, Zap } from 'lucide-react';

export default function NewsletterSubscribe() {
  return (
    <>
      <Helmet>
        <title>Newsletter TaxiAssur - Restez Informé</title>
        <meta
          name="description"
          content="Inscrivez-vous à la newsletter TaxiAssur et recevez gratuitement nos actualités, conseils et offres exclusives sur l'assurance taxi."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Newsletter TaxiAssur - Restez Informé" />
        <meta property="og:description" content="Inscrivez-vous à la newsletter TaxiAssur et recevez gratuitement nos actualités, conseils et offres exclusives sur l'assurance taxi." />
        <meta property="og:url" content="https://taxiassur.com/newsletter" />
        <meta property="og:image" content="https://taxiassur.com/logo-600x300.png" />
        <meta property="og:site_name" content="TaxiAssur" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="300" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Rejoignez notre newsletter
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Recevez chaque semaine les meilleures actualités et conseils pour votre assurance taxi
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="space-y-8">
              <NewsletterSubscribeForm />
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Rejoignez des milliers de professionnels
                    </h3>
                    <p className="text-gray-600">
                      Des chauffeurs de taxi et VTC nous font confiance pour rester informés des dernières actualités du secteur.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Contenu exclusif et pertinent
                    </h3>
                    <p className="text-gray-600">
                      Analyses approfondies, guides pratiques, astuces d'économies et décryptages de la réglementation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Offres spéciales en avant-première
                    </h3>
                    <p className="text-gray-600">
                      Soyez les premiers informés de nos promotions exclusives et bénéficiez d'avantages réservés aux abonnés.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-xl shadow-lg text-white">
                <h3 className="text-2xl font-bold mb-4">100% Gratuit</h3>
                <p className="text-blue-100 mb-4">
                  Aucun engagement, aucun spam. Désabonnez-vous à tout moment en un clic.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <div className="text-3xl font-bold">1x</div>
                    <div className="text-blue-200">par semaine</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">5min</div>
                    <div className="text-blue-200">de lecture</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">0€</div>
                    <div className="text-blue-200">coût</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Derniers articles publiés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <h3 className="font-semibold text-gray-900">Guide complet assurance taxi 2026</h3>
                <p className="text-sm text-gray-600">Tout ce qu'il faut savoir pour bien choisir</p>
              </div>
              <div className="space-y-2">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <h3 className="font-semibold text-gray-900">Nouvelle réglementation VTC</h3>
                <p className="text-sm text-gray-600">Les changements à connaître</p>
              </div>
              <div className="space-y-2">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <h3 className="font-semibold text-gray-900">Économisez jusqu'à 30%</h3>
                <p className="text-sm text-gray-600">Nos astuces pour réduire vos coûts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
