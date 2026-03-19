import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle, Phone, Upload, ArrowRight, FileText,
  Clock, Shield, Copy, ExternalLink, Sparkles
} from 'lucide-react';
import SEOHead from '../components/SEOHead';

const Merci: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [copied, setCopied] = useState(false);

  const prospectSpaceUrl = token
    ? `${window.location.origin}/espace-prospect/${token}`
    : null;

  const handleCopyLink = () => {
    if (prospectSpaceUrl) {
      navigator.clipboard.writeText(prospectSpaceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
    <SEOHead
      title="Merci - Demande recue"
      description="Votre demande de devis a ete recue. Un expert vous contacte sous 15 minutes."
      noindex={true}
      canonical="/merci"
    />
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-1 rounded-2xl mb-6">
          <div className="bg-gray-900 p-8 rounded-xl text-center">
            <CheckCircle className="text-green-400 mx-auto mb-4" size={64} />
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              DEMANDE RECUE !
            </h1>
            <p className="text-xl text-gray-300">
              Un expert vous rappelle sous <span className="text-green-400 font-bold">15 minutes</span>
            </p>
          </div>
        </div>

        {token && (
          <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-1 rounded-2xl mb-6">
            <div className="bg-gray-900 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-amber-500 p-2 rounded-lg">
                  <Sparkles className="text-black" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Votre Espace Personnel</h2>
                  <p className="text-amber-400 text-sm">Acces securise a votre dossier</p>
                </div>
              </div>

              <p className="text-gray-300 mb-4">
                Un espace dedie a ete cree pour vous permettre de :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2 text-gray-300">
                  <Upload className="text-green-400 flex-shrink-0" size={18} />
                  <span className="text-sm">Uploader vos documents</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="text-blue-400 flex-shrink-0" size={18} />
                  <span className="text-sm">Consulter vos devis</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="text-amber-400 flex-shrink-0" size={18} />
                  <span className="text-sm">Suivre votre dossier</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Shield className="text-emerald-400 flex-shrink-0" size={18} />
                  <span className="text-sm">Signer votre contrat</span>
                </div>
              </div>

              <Link
                to={`/espace-prospect/${token}`}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black text-lg py-4 px-6 rounded-xl transition-all mb-4"
              >
                <Upload size={24} />
                ACCEDER A MON ESPACE
                <ArrowRight size={24} />
              </Link>

              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-gray-500 mb-1">Lien de votre espace (conservez-le) :</p>
                    <p className="text-sm text-gray-400 truncate font-mono">{prospectSpaceUrl}</p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors"
                    title="Copier le lien"
                  >
                    {copied ? (
                      <CheckCircle className="text-green-400" size={18} />
                    ) : (
                      <Copy className="text-gray-400" size={18} />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-400 mt-2">Lien copie !</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Clock className="text-blue-400" size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Ce qui va se passer</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold text-white">Appel de votre expert (sous 15 min)</p>
                <p className="text-sm text-gray-400">Analyse de vos besoins specifiques</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-amber-500 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold text-white">Devis personnalise</p>
                <p className="text-sm text-gray-400">Jusqu'a 35% d'economies garanties</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold text-white">Souscription rapide</p>
                <p className="text-sm text-gray-400">Attestation sous 24h apres validation</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-500 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-500 p-2 rounded-lg">
              <FileText size={24} className="text-black" />
            </div>
            <h3 className="text-xl font-black text-white">7 Documents Requis (pour devis sous 24h)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span>Licence de taxi</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span>Permis de conduire</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span>Piece d'identite</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span>Carte grise</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span>Releve d'information</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span>Autorisation stationnement</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span>RIB</span>
            </div>
          </div>

          {token && (
            <Link
              to={`/espace-prospect/${token}`}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-lg py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <Upload size={24} />
              UPLOADER MES DOCUMENTS MAINTENANT
              <ArrowRight size={24} />
            </Link>
          )}
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 text-center">Une question ?</h3>
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

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-gray-400 hover:text-amber-400 font-semibold transition-colors"
          >
            Retour a l'accueil
          </Link>
        </div>

      </div>
    </div>
    </>
  );
};

export default Merci;
