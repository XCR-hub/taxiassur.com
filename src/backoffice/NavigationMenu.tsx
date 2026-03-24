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
  accent: string;
  links: NavLink[];
  permission?: boolean;
}

interface NavigationMenuProps {
  excludeSections?: string[];
}

function NavSection({ section, currentPath }: { section: NavSection; currentPath: string }) {
  const [open, setOpen] = useState(true);
  const hasActive = section.links.some(l => currentPath === l.to || currentPath.startsWith(l.to + '/'));

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center transition-all"
        style={{
          gap: 8,
          padding: '5px 8px',
          borderRadius: 7,
          background: hasActive ? `${section.accent}14` : 'transparent',
        }}
      >
        <section.icon
          size={12}
          className="flex-shrink-0"
          style={{ color: section.accent }}
        />
        <span
          className="flex-1 text-left uppercase tracking-wider"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: hasActive ? section.accent : 'rgba(255,255,255,0.3)',
            letterSpacing: '0.07em',
          }}
        >
          {section.title}
        </span>
        {hasActive && (
          <span
            className="flex-shrink-0"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: section.accent,
              boxShadow: `0 0 5px ${section.accent}`,
            }}
          />
        )}
        <ChevronDown
          size={11}
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'rgba(255,255,255,0.2)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>

      {open && (
        <div className="mt-0.5 ml-2 space-y-px">
          {section.links.map(link => {
            const isActive = currentPath === link.to || currentPath.startsWith(link.to + '/');
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center transition-all"
                style={{
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 7,
                  background: isActive ? `${section.accent}15` : 'transparent',
                  boxShadow: isActive ? `inset 2px 0 0 ${section.accent}` : 'none',
                  textDecoration: 'none',
                }}
              >
                <link.icon
                  size={13}
                  className="flex-shrink-0"
                  style={{ color: isActive ? section.accent : 'rgba(255,255,255,0.3)' }}
                />
                <span
                  className="flex-1 truncate"
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {link.label}
                </span>
                {link.badge && (
                  <span
                    className="flex-shrink-0 flex items-center justify-center font-bold"
                    style={{
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      padding: '0 4px',
                      fontSize: 9,
                      background: isActive ? `${section.accent}30` : 'rgba(239,68,68,0.7)',
                      color: isActive ? section.accent : '#fff',
                    }}
                  >
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
      accent: '#94a3b8',
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
      accent: '#10b981',
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
      accent: '#14b8a6',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/clients', icon: Users, label: 'Gestion Clients' },
      ],
    },
    {
      title: 'CRM & Pipeline',
      icon: Target,
      color: 'blue',
      accent: '#3b82f6',
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
      accent: '#22c55e',
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
      accent: '#f59e0b',
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
      accent: '#0ea5e9',
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
      accent: '#06b6d4',
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
      accent: '#f97316',
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
      accent: '#34d399',
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
      accent: '#f43f5e',
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
      accent: '#ec4899',
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
    <div className="space-y-1">
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
