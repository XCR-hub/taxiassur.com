import React, { useEffect } from 'react';
import { CheckCircle, Phone, Upload, ArrowRight, FileText } from 'lucide-react';

const Merci: React.FC = () => {
  useEffect(() => {
    document.title = 'Merci ! Votre demande a été reçue - TaxiAssur.com';

    const metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Demande reçue ! Votre expert TaxiAssur vous recontacte rapidement. Uploadez vos documents maintenant.';
    document.head.appendChild(metaDescription);

    return () => {
      metaDescription.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Success header */}
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 p-1 rounded-2xl mb-6">
          <div className="bg-gray-900 p-8 rounded-xl text-center">
            <CheckCircle className="text-green-400 mx-auto mb-4 animate-bounce" size={64} />
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
              ✅ DEMANDE REÇUE !
            </h1>
            <p className="text-xl text-gray-300">
              On vous <span className="text-amber-400 font-bold">rappelle dans 15 min</span>
            </p>
          </div>
        </div>

        {/* CALL TO ACTION - UPLOAD DOCUMENTS */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-1 rounded-2xl mb-6 animate-pulse">
          <div className="bg-gray-900 p-6 rounded-xl">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4 animate-bounce">
                ⚡ ACTION IMMÉDIATE REQUISE
              </div>

              <h2 className="text-3xl font-black text-white mb-3">
                📤 UPLOADEZ VOS DOCUMENTS
              </h2>

              <p className="text-lg text-amber-400 font-bold mb-4">
                Devis sous 24h si dossier complet !
              </p>

              <a
                href="/espace-documents?from=merci"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-xl py-5 px-10 rounded-2xl transition-all duration-300 shadow-2xl shadow-green-500/50 hover:shadow-green-500/70 hover:scale-105 mb-4"
              >
                <Upload size={28} />
                UPLOADER MAINTENANT
                <ArrowRight size={28} />
              </a>

              <p className="text-sm text-gray-400 mb-4">
                Un lien d'accès unique vous a été envoyé par email
              </p>

              {/* Liste compacte des documents requis */}
              <div className="bg-gray-800/50 rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="text-amber-400" size={20} />
                  <h3 className="text-white font-bold">7 documents requis :</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                  <div>✓ Licence de taxi</div>
                  <div>✓ Permis de conduire</div>
                  <div>✓ Pièce d'identité</div>
                  <div>✓ Carte grise</div>
                  <div>✓ Relevé d'information</div>
                  <div>✓ Autorisation stationnement</div>
                  <div>✓ RIB</div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Alternative : envoyez-les par email à{' '}
                <a
                  href="mailto:team@taxiassur.com"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  team@taxiassur.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Quick contact */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 text-center">📞 Une question ?</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:0180855786"
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <Phone size={20} />
              01 80 85 57 86
            </a>
            <a
              href="mailto:team@taxiassur.com"
              className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              team@taxiassur.com
            </a>
          </div>
        </div>

        {/* Return home link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-gray-400 hover:text-amber-400 font-semibold transition-colors"
          >
            ← Retour à l'accueil
          </a>
        </div>

      </div>
    </div>
  );
};

export default Merci;
