import React, { useEffect } from 'react';
import { CheckCircle, Phone, Mail, FileText, Clock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

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
    'Licence de taxi professionnelle en cours de validité',
    'Permis de conduire (recto-verso)',
    'Pièce d\'identité (carte nationale ou passeport)',
    'Certificat d\'immatriculation du véhicule taxi',
    'Relevé d\'information de votre assureur précédent'
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="section-padding">
        <div className="container-max">
          <div className="max-w-4xl mx-auto">
            {/* Success message */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-6">
                <CheckCircle className="text-white" size={40} />
              </div>
              
              <h1 className="text-4xl font-bold text-white mb-4">
                Merci ! Demande Bien Reçue
              </h1>
              
              <p className="text-xl text-gray-300 mb-8">
                Votre demande de devis a été <strong className="text-gradient">confirmée</strong> ! 
                Votre expert TaxiAssur vous recontacte <strong className="text-white">rapidement</strong>.
              </p>

              <div className="card-premium inline-block">
                <div className="flex items-center justify-center space-x-2 text-amber-400">
                  <Clock size={24} />
                  <span className="font-semibold text-lg">Réponse rapide garantie</span>
                </div>
              </div>
            </div>

            {/* Next steps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* What happens next */}
              <div className="card-premium">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Phone className="text-amber-400 mr-3" size={28} />
                  Prochaines Étapes
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Analyse de votre demande</h3>
                      <p className="text-gray-600 text-sm">Notre équipe étudie votre profil et vos besoins spécifiques</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Contact personnalisé</h3>
                      <p className="text-gray-600 text-sm">Votre conseiller dédié vous contacte pour affiner votre devis</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Proposition sur-mesure</h3>
                      <p className="text-gray-600 text-sm">Réception de votre devis personnalisé avec les meilleures conditions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required documents */}
              <div className="card-premium">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <FileText className="text-blue-400 mr-3" size={28} />
                  Documents à Préparer
                </h2>
                
                <p className="text-gray-300 mb-6">
                  Pour accélérer le traitement de votre dossier, préparez ces pièces :
                </p>
                
                <div className="space-y-3">
                  {requiredDocuments.map((doc, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                      <span className="text-sm text-gray-300">{doc}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-sm text-amber-400">
                    <strong>💡 Conseil :</strong> Envoyez ces pièces par email à 
                    <a href="mailto:team@taxiassur.com" className="font-semibold underline ml-1">
                      team@taxiassur.com
                    </a>
                    <strong> pour un traitement prioritaire !</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="card-premium text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Besoin d'Aide ou d'Informations ?
              </h3>
              <p className="text-gray-300 mb-6 text-lg">
                Notre équipe TaxiAssur est disponible pour répondre à toutes vos questions
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="tel:0180855786" 
                  className="btn-primary flex items-center justify-center space-x-2"
                >
                  <Phone size={20} />
                  <span>01 80 85 57 86</span>
                </a>
                <a 
                  href="mailto:team@taxiassur.com" 
                  className="btn-outline flex items-center justify-center space-x-2"
                >
                  <Mail size={20} />
                  <span>team@taxiassur.com</span>
                </a>
              </div>
            </div>

            {/* Return home */}
            <div className="text-center mt-12">
              <a 
                href="/" 
                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors duration-200"
              >
                ← Retourner à l'accueil
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Merci;