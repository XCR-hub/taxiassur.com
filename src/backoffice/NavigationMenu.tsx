import { Link } from 'react-router-dom';
import {
  Users, DollarSign, BarChart3, PieChart, Handshake,
  Zap, FileEdit, Newspaper, Package, TrendingUp, FileText,
  Search, Link2, Mail, Eye, Plus, Send,
  UserCircle, Clock, Megaphone, Shield, Globe, Settings, BookOpen,
  QrCode, MessageSquare
} from 'lucide-react';

export default function NavigationMenu() {
  return (
    <div className="mb-8 space-y-6">
      {/* Leads & Marketplace */}
      <div className="bg-gray-800/50 border border-amber-500/30 rounded-lg p-4">
        <h3 className="text-amber-400 font-bold text-sm mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          LEADS & MARKETPLACE
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link to="/backoffice/leads" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Users className="w-5 h-5" />
            <span>Gestion Leads</span>
          </Link>
          <Link to="/backoffice/lead-marketplace" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <DollarSign className="w-5 h-5" />
            <span>Marketplace</span>
          </Link>
          <Link to="/backoffice/partner-portal" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Handshake className="w-5 h-5" />
            <span>Portail Courtier</span>
          </Link>
          <Link to="/backoffice/analytics" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <PieChart className="w-5 h-5" />
            <span>Analytics</span>
          </Link>
          <Link to="/backoffice/old-dashboard" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard Pro</span>
          </Link>
        </div>
      </div>

      {/* Contenu & IA */}
      <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-4">
        <h3 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          CONTENU & GÉNÉRATION IA
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/backoffice/ai-generator" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Zap className="w-5 h-5" />
            <span>Générateur IA</span>
          </Link>
          <Link to="/backoffice/content" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <FileEdit className="w-5 h-5" />
            <span>Contenu Manuel</span>
          </Link>
          <Link to="/backoffice/news" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Newspaper className="w-5 h-5" />
            <span>Actualités</span>
          </Link>
          <Link to="/backoffice/popups" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Package className="w-5 h-5" />
            <span>Popups</span>
          </Link>
          <Link to="/backoffice/trend-analyzer" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <TrendingUp className="w-5 h-5" />
            <span>Trends</span>
          </Link>
          <Link to="/backoffice/directory" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <FileText className="w-5 h-5" />
            <span>Annuaires</span>
          </Link>
        </div>
      </div>

      {/* SEO & Backlinks */}
      <div className="bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
        <h3 className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" />
          SEO & BACKLINKS
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/backoffice/seo" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Search className="w-5 h-5" />
            <span>SEO Tools</span>
          </Link>
          <Link to="/backoffice/seo-strategy" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <TrendingUp className="w-5 h-5" />
            <span>Stratégie SEO</span>
          </Link>
          <Link to="/backoffice/backlinks" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Link2 className="w-5 h-5" />
            <span>Backlinks</span>
          </Link>
          <Link to="/backoffice/backlink-prospector" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Search className="w-5 h-5" />
            <span>Prospecteur</span>
          </Link>
          <Link to="/backoffice/backlink-automation" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Zap className="w-5 h-5" />
            <span>Auto Backlinks</span>
          </Link>
          <Link to="/backoffice/outreach" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Mail className="w-5 h-5" />
            <span>Outreach</span>
          </Link>
        </div>
      </div>

      {/* Partenaires & Prospects */}
      <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4">
        <h3 className="text-cyan-400 font-bold text-sm mb-3 flex items-center gap-2">
          <UserCircle className="w-4 h-4" />
          PARTENAIRES & PROSPECTS
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link to="/backoffice/partners" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <UserCircle className="w-5 h-5" />
            <span>Partenaires</span>
          </Link>
          <Link to="/backoffice/partner-finder" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Search className="w-5 h-5" />
            <span>Chercher</span>
          </Link>
          <Link to="/backoffice/prospects" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Eye className="w-5 h-5" />
            <span>Prospects</span>
          </Link>
          <Link to="/backoffice/seed-prospects" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Plus className="w-5 h-5" />
            <span>Seed DB</span>
          </Link>
          <Link to="/backoffice/launch-campaign" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Send className="w-5 h-5" />
            <span>Campagnes</span>
          </Link>
        </div>
      </div>

      {/* Automatisation & Sécurité */}
      <div className="bg-gray-800/50 border border-red-500/30 rounded-lg p-4">
        <h3 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          AUTOMATISATION & SÉCURITÉ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/backoffice/auto-optimizer" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm animate-pulse">
            <Zap className="w-5 h-5" />
            <span>Auto-Optimisation</span>
          </Link>
          <Link to="/backoffice/automation-scheduler" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Clock className="w-5 h-5" />
            <span>Scheduler</span>
          </Link>
          <Link to="/backoffice/social-media" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Megaphone className="w-5 h-5" />
            <span>Réseaux Sociaux</span>
          </Link>
          <Link to="/backoffice/marketing-templates" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <MessageSquare className="w-5 h-5" />
            <span>Templates Marketing</span>
          </Link>
          <Link to="/backoffice/qr-codes" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <QrCode className="w-5 h-5" />
            <span>QR Codes</span>
          </Link>
          <Link to="/backoffice/security" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Shield className="w-5 h-5" />
            <span>Sécurité</span>
          </Link>
          <Link to="/backoffice/compliance" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Shield className="w-5 h-5" />
            <span>Conformité</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-semibold transition-all shadow-md text-sm">
            <Globe className="w-5 h-5" />
            <span>Voir le site</span>
          </Link>
        </div>
      </div>

      {/* Documentation & Guides */}
      <div className="bg-gray-800/50 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-blue-400 font-bold text-sm mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          DOCUMENTATION & GUIDES
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link
            to="/backoffice"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm"
          >
            <BookOpen className="w-5 h-5" />
            <span>Toutes les pages</span>
          </Link>
          <a
            href="https://github.com/yourusername/taxiassur"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm"
          >
            <BookOpen className="w-5 h-5" />
            <span>Guide Backoffice</span>
          </a>
          <Link
            to="/backoffice"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm"
          >
            <BookOpen className="w-5 h-5" />
            <span>Config API</span>
          </Link>
          <Link
            to="/backoffice"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm"
          >
            <BookOpen className="w-5 h-5" />
            <span>Clé OpenAI</span>
          </Link>
          <a
            href="https://docs.taxiassur.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm"
          >
            <BookOpen className="w-5 h-5" />
            <span>Guide Déploiement</span>
          </a>
        </div>
      </div>
    </div>
  );
}
