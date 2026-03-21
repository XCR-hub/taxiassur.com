import { Link, useLocation } from 'react-router-dom';
import { Users, DollarSign, BarChart3, PieChart, Handshake, Zap, File as FileEdit, Newspaper, Package, TrendingUp, FileText, Search, Link2, Mail, Eye, Plus, Send, Building2, FileCheck, Inbox, CircleUser as UserCircle, Clock, Megaphone, Shield, Globe, Settings, BookOpen, QrCode, MessageSquare, Brain, MapPin, UserCog, Sparkles, Receipt, ClipboardList, LayoutDashboard, Target, Activity, Bell, CreditCard } from 'lucide-react';
import { getCurrentUser, hasPermission } from '../lib/auth';
import { usePendingDocumentsCount } from '../hooks/usePendingDocumentsCount';

interface NavLink {
  to: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  icon: React.ElementType;
  color: string;
  links: NavLink[];
  permission?: boolean;
}

interface NavigationMenuProps {
  excludeSections?: string[];
}

export default function NavigationMenu({ excludeSections = [] }: NavigationMenuProps) {
  const currentUser = getCurrentUser();
  const isMaster = currentUser?.role === 'master';
  const { pathname } = useLocation();
  const { count: pendingDocsCount } = usePendingDocumentsCount();

  const canViewCRM = isMaster || hasPermission('crm_leads', 'view');
  const canViewMarketplace = isMaster || hasPermission('marketplace', 'view');
  const canViewContentIA = isMaster || hasPermission('content_ia', 'view');
  const canViewSEO = isMaster || hasPermission('seo', 'view');
  const canViewBacklinks = isMaster || hasPermission('backlinks', 'view');
  const canViewAnalytics = isMaster || hasPermission('analytics', 'view');
  const canViewSocialMedia = isMaster || hasPermission('social_media', 'view');
  const canViewSettings = isMaster || hasPermission('settings', 'view');

  const sections: NavSection[] = [
    {
      title: 'Administration',
      icon: UserCog,
      color: 'slate',
      permission: isMaster,
      links: [
        { to: '/backoffice/users', icon: Users, label: 'Utilisateurs' },
        { to: '/backoffice/security', icon: Shield, label: 'Securite' },
        { to: '/backoffice/compliance', icon: FileCheck, label: 'Conformite' },
        { to: '/backoffice/test-automations', icon: Zap, label: 'Test Auto' },
        { to: '/', icon: Globe, label: 'Voir Site' },
      ],
    },
    {
      title: 'Facturation',
      icon: CreditCard,
      color: 'emerald',
      permission: true,
      links: [
        { to: '/backoffice/lead-invoicing', icon: CreditCard, label: 'Facturation Leads', highlight: true },
        { to: '/backoffice/free-invoicing', icon: DollarSign, label: 'Facturation Libre', highlight: true },
        { to: '/backoffice/monetico-accounting', icon: DollarSign, label: 'Comptabilité Monético' },
      ],
    },
    {
      title: 'Clients',
      icon: Users,
      color: 'teal',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/clients', icon: Users, label: 'Gestion Clients', highlight: true },
      ],
    },
    {
      title: 'CRM & Pipeline',
      icon: Target,
      color: 'blue',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/crm', icon: Sparkles, label: 'CRM Dashboard', highlight: true },
        { to: '/backoffice/quote-queue', icon: ClipboardList, label: 'File Devis', highlight: true },
        { to: '/backoffice/crm-killer/pipeline', icon: BarChart3, label: 'Pipeline Kanban' },
        { to: '/backoffice/crm-killer/inbox', icon: Inbox, label: 'Inbox' },
        { to: '/backoffice/crm-killer/inbox-intelligent', icon: Sparkles, label: 'Inbox Intelligent', highlight: true },
        { to: '/backoffice/crm-killer/retention', icon: Shield, label: 'Retention' },
        { to: '/backoffice/crm-killer/ia', icon: Brain, label: 'IA CRM' },
        { to: '/backoffice/crm-killer/templates', icon: FileText, label: 'Templates' },
        { to: '/backoffice/doublons', icon: Users, label: 'Doublons' },
      ],
    },
    {
      title: 'Communication',
      icon: MessageSquare,
      color: 'green',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
        { to: '/backoffice/email-marketing', icon: Mail, label: 'Email Marketing' },
        { to: '/backoffice/newsletter', icon: Mail, label: 'Newsletter' },
        { to: '/backoffice/notifications', icon: Bell, label: 'Notifications' },
      ],
    },
    {
      title: 'Marketplace',
      icon: DollarSign,
      color: 'amber',
      permission: canViewMarketplace,
      links: [
        { to: '/backoffice/lead-marketplace', icon: DollarSign, label: 'Marketplace' },
        { to: '/backoffice/partner-portal', icon: Handshake, label: 'Portail Courtier' },
        { to: '/backoffice/partners', icon: UserCircle, label: 'Partenaires' },
      ],
    },
    {
      title: 'Production & Compagnies',
      icon: Building2,
      color: 'sky',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/insurance-companies', icon: Building2, label: 'Compagnies', highlight: true },
        { to: '/backoffice/insurance-companies-stats', icon: BarChart3, label: 'Stats Compagnies' },
        { to: '/backoffice/production', icon: ClipboardList, label: 'Production', highlight: true },
        { to: '/backoffice/web-import', icon: DollarSign, label: 'Import Web', highlight: true },
        { to: '/backoffice/quotes', icon: Receipt, label: 'Gestion Devis' },
        { to: '/backoffice/pending-documents', icon: FileCheck, label: 'Documents à Valider', highlight: pendingDocsCount > 0, badge: pendingDocsCount > 0 ? pendingDocsCount.toString() : undefined },
        { to: '/backoffice/documents', icon: FileText, label: 'Tous Documents' },
      ],
    },
    {
      title: 'IA & Automatisation',
      icon: Brain,
      color: 'cyan',
      permission: canViewContentIA || canViewSettings,
      links: [
        { to: '/backoffice/ultron', icon: Sparkles, label: 'ULTRON', highlight: true },
        { to: '/backoffice/llm-dashboard', icon: Brain, label: 'LLM Agents', highlight: true },
        { to: '/backoffice/llm-council', icon: Users, label: 'LLM Council', highlight: true },
        { to: '/backoffice/ai-autonomous', icon: Zap, label: 'IA Autonome' },
        { to: '/backoffice/master-ai', icon: Brain, label: 'IA Maitre' },
        { to: '/backoffice/automations', icon: Activity, label: 'Automations' },
        { to: '/backoffice/automation-scheduler', icon: Clock, label: 'Scheduler' },
        { to: '/backoffice/auto-optimizer', icon: TrendingUp, label: 'Auto-Optimizer' },
      ],
    },
    {
      title: 'Contenu',
      icon: FileEdit,
      color: 'orange',
      permission: canViewContentIA,
      links: [
        { to: '/backoffice/ai-generator', icon: Zap, label: 'Generateur IA' },
        { to: '/backoffice/content', icon: FileEdit, label: 'Contenu' },
        { to: '/backoffice/news', icon: Newspaper, label: 'Actualites' },
        { to: '/backoffice/popups', icon: Package, label: 'Popups' },
        { to: '/backoffice/generate-cities', icon: MapPin, label: 'Pages Ville' },
        { to: '/backoffice/trend-analyzer', icon: TrendingUp, label: 'Trends' },
      ],
    },
    {
      title: 'SEO & Backlinks',
      icon: Search,
      color: 'emerald',
      permission: canViewSEO || canViewBacklinks,
      links: [
        { to: '/backoffice/seo', icon: Search, label: 'SEO Tools' },
        { to: '/backoffice/seo-strategy', icon: Target, label: 'Strategie SEO' },
        { to: '/backoffice/backlinks', icon: Link2, label: 'Backlinks' },
        { to: '/backoffice/backlink-prospector', icon: Search, label: 'Prospecteur' },
        { to: '/backoffice/backlink-automation', icon: Zap, label: 'Auto Backlinks' },
        { to: '/backoffice/outreach', icon: Mail, label: 'Outreach' },
      ],
    },
    {
      title: 'Reseaux Sociaux',
      icon: Megaphone,
      color: 'rose',
      permission: canViewSocialMedia,
      links: [
        { to: '/backoffice/social-media', icon: Megaphone, label: 'Social Media' },
        { to: '/backoffice/marketing-templates', icon: FileText, label: 'Templates' },
        { to: '/backoffice/qr-codes', icon: QrCode, label: 'QR Codes' },
      ],
    },
    {
      title: 'Analytics',
      icon: PieChart,
      color: 'pink',
      permission: canViewAnalytics,
      links: [
        { to: '/backoffice/analytics', icon: PieChart, label: 'Analytics' },
        { to: '/backoffice/ga4-seo', icon: BarChart3, label: 'GA4 SEO', highlight: true },
        { to: '/backoffice/old-dashboard', icon: LayoutDashboard, label: 'Dashboard Pro' },
        { to: '/backoffice/conversion', icon: TrendingUp, label: 'Conversions' },
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; hover: string; border: string; active: string; sectionBg: string; titleColor: string }> = {
    slate:   { bg: 'from-slate-600 to-slate-700',   hover: 'hover:from-slate-700 hover:to-slate-800',     border: 'border-slate-400',   active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-slate-800/50 to-slate-900/50 border-slate-600/50',     titleColor: 'text-slate-300' },
    blue:    { bg: 'from-blue-600 to-blue-700',      hover: 'hover:from-blue-700 hover:to-blue-800',       border: 'border-blue-400',    active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-blue-900/40 to-blue-950/40 border-blue-600/50',         titleColor: 'text-blue-300' },
    green:   { bg: 'from-green-600 to-green-700',    hover: 'hover:from-green-700 hover:to-green-800',     border: 'border-green-400',   active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-green-900/40 to-green-950/40 border-green-600/50',     titleColor: 'text-green-300' },
    amber:   { bg: 'from-amber-500 to-amber-600',    hover: 'hover:from-amber-600 hover:to-amber-700',     border: 'border-amber-400',   active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-amber-900/40 to-amber-950/40 border-amber-600/50',     titleColor: 'text-amber-300' },
    sky:     { bg: 'from-sky-600 to-sky-700',        hover: 'hover:from-sky-700 hover:to-sky-800',         border: 'border-sky-400',     active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-sky-900/40 to-sky-950/40 border-sky-600/50',           titleColor: 'text-sky-300' },
    cyan:    { bg: 'from-cyan-600 to-cyan-700',      hover: 'hover:from-cyan-700 hover:to-cyan-800',       border: 'border-cyan-400',    active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-cyan-900/40 to-cyan-950/40 border-cyan-600/50',         titleColor: 'text-cyan-300' },
    orange:  { bg: 'from-orange-500 to-orange-600',  hover: 'hover:from-orange-600 hover:to-orange-700',   border: 'border-orange-400',  active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-orange-900/40 to-orange-950/40 border-orange-600/50', titleColor: 'text-orange-300' },
    emerald: { bg: 'from-emerald-600 to-emerald-700',hover: 'hover:from-emerald-700 hover:to-emerald-800', border: 'border-emerald-400', active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-emerald-900/40 to-emerald-950/40 border-emerald-600/50', titleColor: 'text-emerald-300' },
    rose:    { bg: 'from-rose-500 to-rose-600',      hover: 'hover:from-rose-600 hover:to-rose-700',       border: 'border-rose-400',    active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-rose-900/40 to-rose-950/40 border-rose-600/50',         titleColor: 'text-rose-300' },
    pink:    { bg: 'from-pink-500 to-pink-600',      hover: 'hover:from-pink-600 hover:to-pink-700',       border: 'border-pink-400',    active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-pink-900/40 to-pink-950/40 border-pink-600/50',         titleColor: 'text-pink-300' },
    teal:    { bg: 'from-teal-600 to-teal-700',      hover: 'hover:from-teal-700 hover:to-teal-800',       border: 'border-teal-400',    active: 'ring-2 ring-white/60 brightness-125', sectionBg: 'from-teal-900/40 to-teal-950/40 border-teal-600/50',         titleColor: 'text-teal-300' },
  };

  const getColorClasses = (color: string, highlight?: boolean, isActive?: boolean) => {
    const c = colorMap[color] || colorMap.slate;
    const base = highlight
      ? `bg-gradient-to-r ${c.bg} ${c.hover} border-2 ${c.border} shadow-lg`
      : `bg-gradient-to-r ${c.bg} ${c.hover} shadow-md`;
    return isActive ? `${base} ${c.active} scale-[1.02]` : base;
  };

  const getSectionBg = (color: string) => (colorMap[color] || colorMap.slate).sectionBg;
  const getTitleColor = (color: string) => (colorMap[color] || colorMap.slate).titleColor;

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        if (section.permission === false) return null;
        if (excludeSections.includes(section.title)) return null;

        return (
          <div
            key={section.title}
            className={`bg-gradient-to-r ${getSectionBg(section.color)} border rounded-lg p-3`}
          >
            <h3 className={`${getTitleColor(section.color)} font-semibold text-sm mb-2 flex items-center gap-2`}>
              <section.icon className="w-4 h-4" />
              {section.title}
            </h3>
            <div className="flex flex-col gap-1">
              {section.links.map((link) => {
                const isActive = pathname === link.to || pathname.startsWith(link.to + '/');
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-3 py-2 text-white rounded-md font-medium transition-all text-xs ${isActive ? '' : 'hover:scale-105'} ${getColorClasses(section.color, link.highlight, isActive)}`}
                  >
                    <link.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{link.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                    )}
                    {!isActive && link.badge && (
                      <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full font-bold">
                        {link.badge}
                      </span>
                    )}
                    {isActive && link.badge && (
                      <span className="bg-white/50 text-xs px-1.5 py-0.5 rounded-full font-bold">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
