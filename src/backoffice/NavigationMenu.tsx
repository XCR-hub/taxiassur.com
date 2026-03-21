import { Link, useLocation } from 'react-router-dom';
import { Users, DollarSign, BarChart3, PieChart, Handshake, Zap, File as FileEdit, Newspaper, Package, TrendingUp, FileText, Search, Link2, Mail, Eye, Plus, Send, Building2, FileCheck, Inbox, CircleUser as UserCircle, Clock, Megaphone, Shield, Globe, Settings, BookOpen, QrCode, MessageSquare, Brain, MapPin, UserCog, Sparkles, Receipt, ClipboardList, LayoutDashboard, Target, Activity, Bell, CreditCard, ChevronDown } from 'lucide-react';
import { getCurrentUser, hasPermission } from '../lib/auth';
import { usePendingDocumentsCount } from '../hooks/usePendingDocumentsCount';
import { useState } from 'react';

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

const SECTION_ACCENT: Record<string, string> = {
  slate:   'text-slate-400',
  blue:    'text-blue-400',
  green:   'text-green-400',
  amber:   'text-amber-400',
  sky:     'text-sky-400',
  cyan:    'text-cyan-400',
  orange:  'text-orange-400',
  emerald: 'text-emerald-400',
  rose:    'text-rose-400',
  pink:    'text-pink-400',
  teal:    'text-teal-400',
};

const ACTIVE_DOT: Record<string, string> = {
  slate:   'bg-slate-400',
  blue:    'bg-blue-400',
  green:   'bg-green-400',
  amber:   'bg-amber-400',
  sky:     'bg-sky-400',
  cyan:    'bg-cyan-400',
  orange:  'bg-orange-400',
  emerald: 'bg-emerald-400',
  rose:    'bg-rose-400',
  pink:    'bg-pink-400',
  teal:    'bg-teal-400',
};

const ACTIVE_BG: Record<string, string> = {
  slate:   'bg-slate-500/20',
  blue:    'bg-blue-500/20',
  green:   'bg-green-500/20',
  amber:   'bg-amber-500/20',
  sky:     'bg-sky-500/20',
  cyan:    'bg-cyan-500/20',
  orange:  'bg-orange-500/20',
  emerald: 'bg-emerald-500/20',
  rose:    'bg-rose-500/20',
  pink:    'bg-pink-500/20',
  teal:    'bg-teal-500/20',
};

function NavSection({ section, currentPath }: { section: NavSection; currentPath: string }) {
  const [open, setOpen] = useState(true);
  const accentColor = SECTION_ACCENT[section.color] || 'text-slate-400';
  const activeDot = ACTIVE_DOT[section.color] || 'bg-slate-400';
  const activeBg = ACTIVE_BG[section.color] || 'bg-slate-500/20';

  const hasActive = section.links.some(l => currentPath === l.to || currentPath.startsWith(l.to + '/'));

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group ${hasActive ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
      >
        <section.icon className={`w-3.5 h-3.5 flex-shrink-0 ${accentColor}`} />
        <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider">{section.title}</span>
        {hasActive && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeDot}`} />}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="mt-0.5 ml-2 space-y-0.5">
          {section.links.map(link => {
            const isActive = currentPath === link.to || currentPath.startsWith(link.to + '/');
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? `${activeBg} text-white`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {isActive && <span className={`w-1 h-5 rounded-full flex-shrink-0 ${activeDot}`} />}
                <link.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : `group-hover:${accentColor}`}`} />
                <span className="flex-1 truncate">{link.label}</span>
                {link.badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-rose-500/80 text-white'
                  }`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
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
        { to: '/backoffice/lead-invoicing', icon: CreditCard, label: 'Facturation Leads' },
        { to: '/backoffice/free-invoicing', icon: DollarSign, label: 'Facturation Libre' },
        { to: '/backoffice/monetico-accounting', icon: DollarSign, label: 'Comptabilite Monetico' },
      ],
    },
    {
      title: 'Clients',
      icon: Users,
      color: 'teal',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/clients', icon: Users, label: 'Gestion Clients' },
      ],
    },
    {
      title: 'CRM & Pipeline',
      icon: Target,
      color: 'blue',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/crm', icon: Sparkles, label: 'CRM Dashboard' },
        { to: '/backoffice/quote-queue', icon: ClipboardList, label: 'File Devis' },
        { to: '/backoffice/crm-killer/pipeline', icon: BarChart3, label: 'Pipeline Kanban' },
        { to: '/backoffice/crm-killer/inbox', icon: Inbox, label: 'Inbox' },
        { to: '/backoffice/crm-killer/inbox-intelligent', icon: Sparkles, label: 'Inbox Intelligent' },
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
        { to: '/backoffice/insurance-companies', icon: Building2, label: 'Compagnies' },
        { to: '/backoffice/insurance-companies-stats', icon: BarChart3, label: 'Stats Compagnies' },
        { to: '/backoffice/production', icon: ClipboardList, label: 'Production' },
        { to: '/backoffice/web-import', icon: DollarSign, label: 'Import Web' },
        { to: '/backoffice/quotes', icon: Receipt, label: 'Gestion Devis' },
        { to: '/backoffice/pending-documents', icon: FileCheck, label: 'Docs a Valider', badge: pendingDocsCount > 0 ? pendingDocsCount.toString() : undefined },
        { to: '/backoffice/documents', icon: FileText, label: 'Tous Documents' },
      ],
    },
    {
      title: 'IA & Automatisation',
      icon: Brain,
      color: 'cyan',
      permission: canViewContentIA || canViewSettings,
      links: [
        { to: '/backoffice/ultron', icon: Sparkles, label: 'ULTRON' },
        { to: '/backoffice/llm-dashboard', icon: Brain, label: 'LLM Agents' },
        { to: '/backoffice/llm-council', icon: Users, label: 'LLM Council' },
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
        { to: '/backoffice/ga4-seo', icon: BarChart3, label: 'GA4 SEO' },
        { to: '/backoffice/old-dashboard', icon: LayoutDashboard, label: 'Dashboard Pro' },
        { to: '/backoffice/conversion', icon: TrendingUp, label: 'Conversions' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map(section => {
        if (section.permission === false) return null;
        if (excludeSections.includes(section.title)) return null;
        return (
          <NavSection
            key={section.title}
            section={section}
            currentPath={pathname}
          />
        );
      })}
    </div>
  );
}
