import React from 'react';
import { Shield, Award, CheckCircle, FileCheck, Lock, Users, Building2, Globe } from 'lucide-react';

interface TrustBadgesProps {
  variant?: 'full' | 'compact' | 'minimal';
  showLogos?: boolean;
}

export default function TrustBadges({ variant = 'full', showLogos = true }: TrustBadgesProps) {
  const badges = [
    {
      icon: Building2,
      title: 'Adhérent CSCA',
      description: 'Chambre Syndicale du Courtage d\'Assurance',
      color: 'blue',
      verified: true
    },
    {
      icon: Globe,
      title: 'EDI Courtage',
      description: 'Plateforme d\'échanges professionnels',
      color: 'indigo',
      verified: true
    },
    {
      icon: FileCheck,
      title: 'EDI Messages',
      description: 'Communication sécurisée avec assureurs',
      color: 'purple',
      verified: true
    },
    {
      icon: FileCheck,
      title: 'EDI Signature',
      description: 'Signature électronique certifiée eIDAS',
      color: 'violet',
      verified: true
    },
    {
      icon: Users,
      title: 'CRM EXCALIBUR',
      description: 'Logiciel spécialisé assurances',
      color: 'cyan',
      verified: true
    },
    {
      icon: Shield,
      title: 'RC Pro CGPA',
      description: 'Responsabilité Civile Professionnelle',
      color: 'green',
      verified: true
    },
    {
      icon: Lock,
      title: 'Caisse de Garantie',
      description: 'Protection financière CGPA',
      color: 'emerald',
      verified: true
    },
    {
      icon: CheckCircle,
      title: 'Conformité LCB-FT',
      description: 'Contrôles gel avoirs, PPE, élus',
      color: 'teal',
      verified: true
    },
    {
      icon: Award,
      title: 'jeresiliemoncontrat.com',
      description: 'Service résiliation simplifiée',
      color: 'orange',
      verified: true
    }
  ];

  if (variant === 'minimal') {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {badges.map((badge, index) => (
          <div
            key={index}
            className={`px-3 py-1 rounded-full text-xs font-medium bg-${badge.color}-100 text-${badge.color}-800 flex items-center space-x-1`}
          >
            <badge.icon size={12} />
            <span>{badge.title}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="bg-white border-2 border-yellow-200 rounded-lg p-3 hover:border-yellow-500 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg bg-${badge.color}-100`}>
                <badge.icon className={`text-${badge.color}-600`} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">
                  {badge.title}
                </div>
                {badge.verified && (
                  <div className="flex items-center text-xs text-green-600">
                    <CheckCircle size={10} className="mr-1" />
                    Vérifié
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          🏆 Votre Courtier de Confiance
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Un courtier professionnel, certifié et assuré, membre des principales organisations
          du courtage d'assurance en France
        </p>
      </div>

      {/* Badges principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="bg-white border-2 border-yellow-200 rounded-xl p-6 hover:border-yellow-500 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1"
          >
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br from-${badge.color}-100 to-${badge.color}-200 flex-shrink-0`}>
                <badge.icon className={`text-${badge.color}-600`} size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {badge.title}
                  </h3>
                  {badge.verified && (
                    <div className="flex items-center space-x-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle size={12} />
                      <span>Vérifié</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {badge.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section conformité renforcée */}
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-yellow-200 rounded-xl p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start space-x-4 mb-6">
            <div className="p-3 rounded-xl bg-yellow-500 flex-shrink-0">
              <Shield className="text-white" size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Conformité Totale LCB-FT
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Nous appliquons rigoureusement les obligations de Lutte Contre le Blanchiment
                et le Financement du Terrorisme
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Lock className="text-yellow-600" size={20} />
                <h4 className="font-semibold text-gray-900">Gel des Avoirs</h4>
              </div>
              <p className="text-sm text-gray-600">
                Vérification automatique contre les listes de sanctions internationales
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="text-yellow-600" size={20} />
                <h4 className="font-semibold text-gray-900">Personnes Politiquement Exposées</h4>
              </div>
              <p className="text-sm text-gray-600">
                Contrôle PPE selon les directives européennes
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <FileCheck className="text-yellow-600" size={20} />
                <h4 className="font-semibold text-gray-900">Registre des Élus</h4>
              </div>
              <p className="text-sm text-gray-600">
                Surveillance des mandats électifs et publics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logos partenaires */}
      {showLogos && (
        <div className="bg-white border border-yellow-100 rounded-xl p-8">
          <h3 className="text-center text-lg font-semibold text-gray-700 mb-6">
            Nos Partenaires Professionnels
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60 hover:opacity-100 transition-opacity">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-700">CSCA</div>
              <div className="text-xs text-gray-500 mt-1">Chambre Syndicale</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-700">EDI</div>
              <div className="text-xs text-gray-500 mt-1">Courtage</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-700">CGPA</div>
              <div className="text-xs text-gray-500 mt-1">Assurance RC Pro</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-700">EXCALIBUR</div>
              <div className="text-xs text-gray-500 mt-1">CRM Assurance</div>
            </div>
          </div>
        </div>
      )}

      {/* Certification finale */}
      <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <Award className="text-green-600" size={32} />
          <h3 className="text-2xl font-bold text-gray-900">
            Courtier 100% Conforme et Assuré
          </h3>
        </div>
        <p className="text-gray-700 max-w-2xl mx-auto leading-relaxed">
          Nous respectons scrupuleusement toutes les obligations réglementaires
          du courtage d'assurance en France. Votre sécurité et votre confiance
          sont notre priorité absolue.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ✅ RC Pro Active
          </span>
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ✅ Caisse de Garantie
          </span>
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ✅ Conformité LCB-FT
          </span>
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ✅ Certifié ORIAS
          </span>
        </div>
      </div>
    </div>
  );
}
