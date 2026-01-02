import React, { useEffect } from 'react';
import { CheckCircle, Phone, Mail, FileText, Clock, X, Upload, ArrowRight, Sparkles } from 'lucide-react';

const Merci: React.FC = () => {
  useEffect(() => {
    document.title = 'Merci ! Votre demande a été reçue - TaxiAssur.com';

    const metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Demande reçue ! Votre expert TaxiAssur vous recontacte rapidement. Préparez vos documents pour accélérer votre devis.';
    document.head.appendChild(metaDescription);

    return () => {
      metaDescription.remove();
    };
  }, []);

  const requiredDocuments = [
    {
      title: 'Licence de taxi professionnelle',
      description: 'En cours de validité'
    },
    {
      title: 'Permis de conduire',
      description: 'Recto-verso, lisible'
    },
    {
      title: 'Pièce d\'identité',
      description: 'CNI ou passeport valide'
    },
    {
      title: 'Carte grise du véhicule',
      description: 'Certificat d\'immatriculation'
    },
    {
      title: 'Relevé d\'information',
      description: 'De votre assureur précédent'
    }
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative w-full max-w-6xl animate-in fade-in zoom-in duration-500">

          {/* Close button */}
          <a
            href="/"
            className="absolute top-0 right-0 p-3 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X size={32} />
          </a>

          {/* Main content */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden">

            {/* Success header with animation */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-1">
              <div className="bg-gray-900 px-8 py-12 text-center">
                <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mb-6 animate-bounce shadow-lg shadow-green-500/50">
                  <CheckCircle className="text-white" size={56} />
                </div>

                <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
                  ✅ DEMANDE REÇUE !
                </h1>

                <p className="text-2xl md:text-3xl text-amber-400 font-bold mb-2">
                  Félicitations !
                </p>

                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Notre équipe d'experts <span className="text-white font-bold">vous recontacte dans les 15 minutes</span> pour établir votre devis personnalisé
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                {/* Left column - Next steps */}
                <div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Clock className="text-blue-400" size={32} />
                      <h2 className="text-2xl font-bold text-white">
                        Prochaines Étapes
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 text-black rounded-full flex items-center justify-center font-black text-lg shadow-lg">
                          1
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">Appel de notre expert</h3>
                          <p className="text-gray-400 text-sm">Dans les 15 minutes, confirmation de vos besoins</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 text-black rounded-full flex items-center justify-center font-black text-lg shadow-lg">
                          2
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">Envoi des documents</h3>
                          <p className="text-gray-400 text-sm">Transmettez vos pièces justificatives par email</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 text-black rounded-full flex items-center justify-center font-black text-lg shadow-lg">
                          3
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">Devis personnalisé</h3>
                          <p className="text-gray-400 text-sm">Réception sous 24h de votre offre sur-mesure</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact CTA */}
                  <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="text-yellow-400" size={24} />
                      Besoin d'aide immédiate ?
                    </h3>
                    <div className="flex flex-col gap-3">
                      <a
                        href="tel:0180855786"
                        className="flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50"
                      >
                        <Phone size={24} />
                        <span className="text-lg">01 80 85 57 86</span>
                      </a>
                      <a
                        href="mailto:team@taxiassur.com"
                        className="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
                      >
                        <Mail size={20} />
                        <span>team@taxiassur.com</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right column - Documents */}
                <div>
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <FileText className="text-amber-400" size={32} />
                      <h2 className="text-2xl font-bold text-white">
                        Documents Requis
                      </h2>
                    </div>

                    <p className="text-gray-300 mb-6 text-lg">
                      Pour accélérer votre dossier, préparez ces 5 pièces :
                    </p>

                    <div className="space-y-3 mb-6">
                      {requiredDocuments.map((doc, index) => (
                        <div key={index} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-amber-500/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="text-green-400 flex-shrink-0 mt-1" size={20} />
                            <div>
                              <div className="font-semibold text-white">{doc.title}</div>
                              <div className="text-sm text-gray-400">{doc.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Email documents CTA */}
                    <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 rounded-xl p-1 mb-4">
                      <div className="bg-gray-900 rounded-lg p-6">
                        <div className="text-center">
                          <Upload className="text-amber-400 mx-auto mb-3" size={32} />
                          <h3 className="text-xl font-bold text-white mb-2">
                            📧 ENVOYEZ VOS DOCUMENTS
                          </h3>
                          <p className="text-gray-300 mb-4">
                            Pour un traitement <span className="text-amber-400 font-bold">PRIORITAIRE</span>
                          </p>
                          <a
                            href="mailto:team@taxiassur.com?subject=Documents%20pour%20mon%20devis%20assurance%20taxi"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-amber-500/50"
                          >
                            <Mail size={20} />
                            team@taxiassur.com
                            <ArrowRight size={20} />
                          </a>
                          <p className="text-xs text-gray-500 mt-3">
                            Joignez vos documents en pièces jointes
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                      <p className="text-sm text-green-400 font-semibold text-center">
                        ⚡ Traitement express : Dossier complet = Devis sous 24h !
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="text-center pt-6 border-t border-gray-700">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-semibold text-lg transition-colors"
                >
                  ← Retourner à l'accueil
                </a>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default Merci;
