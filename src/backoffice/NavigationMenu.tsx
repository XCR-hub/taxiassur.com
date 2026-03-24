import { Link, useLocation } from 'react-router-dom';
import {
  Users, DollarSign, BarChart3, PieChart, Handshake, Zap, Newspaper,
  TrendingUp, FileText, Search, Link2, Mail, Building2, FileCheck,
  Inbox, Clock, Megaphone, Shield, Globe, Settings, QrCode,
  MessageSquare, Brain, MapPin, UserCog, Sparkles, Receipt,
  ClipboardList, Target, Activity, Bell, CreditCard, ChevronDown,
  Package, BookOpen,
} from 'lucide-react';
import { getCurrentUser, hasPermission } from '../lib/auth';
import { usePendingDocumentsCount } from '../hooks/usePendingDocumentsCount';
import { useState, useEffect } from 'react';

interface NavLink {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
}

interface SectionDef {
  title: string;
  icon: React.ElementType;
  accent: string;
  links: NavLink[];
  permission?: boolean;
}

interface NavigationMenuProps {
  excludeSections?: string[];
}

function SectionGroup({
  section,
  currentPath,
}: {
  section: SectionDef;
  currentPath: string;
}) {
  const hasActive = section.links.some(
    l => currentPath === l.to || currentPath.startsWith(l.to + '/')
  );
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Section header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 8px',
          borderRadius: 7,
          background: hasActive ? `${section.accent}12` : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <section.icon
          size={11}
          style={{ color: hasActive ? section.accent : 'rgba(255,255,255,0.28)', flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            color: hasActive ? section.accent : 'rgba(255,255,255,0.28)',
          }}
        >
          {section.title}
        </span>
        {hasActive && (
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: section.accent,
              boxShadow: `0 0 5px ${section.accent}`,
              flexShrink: 0,
            }}
          />
        )}
        <ChevronDown
          size={11}
          style={{
            color: 'rgba(255,255,255,0.18)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Section links */}
      {open && (
        <div style={{ marginTop: 1, paddingLeft: 6, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {section.links.map(link => {
            const isActive = currentPath === link.to || currentPath.startsWith(link.to + '/');
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 7,
                  background: isActive ? `${section.accent}15` : 'transparent',
                  boxShadow: isActive ? `inset 2px 0 0 ${section.accent}` : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.12s',
                }}
              >
                <link.icon
                  size={13}
                  style={{
                    color: isActive ? section.accent : 'rgba(255,255,255,0.28)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {link.label}
                </span>
                {link.badge && Number(link.badge) > 0 && (
                  <span
                    style={{
                      minWidth: 17,
                      height: 17,
                      borderRadius: 8,
                      padding: '0 4px',
                      fontSize: 9.5,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? `${section.accent}30` : 'rgba(239,68,68,0.65)',
                      color: isActive ? section.accent : '#fff',
                    }}
                  >
                    {Number(link.badge) > 99 ? '99+' : link.badge}
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

  const canViewCRM        = isMaster || hasPermission('crm_leads', 'view');
  const canViewMarket     = isMaster || hasPermission('marketplace', 'view');
  const canViewContentIA  = isMaster || hasPermission('content_ia', 'view');
  const canViewSEO        = isMaster || hasPermission('seo', 'view');
  const canViewBacklinks  = isMaster || hasPermission('backlinks', 'view');
  const canViewAnalytics  = isMaster || hasPermission('analytics', 'view');
  const canViewSocial     = isMaster || hasPermission('social_media', 'view');
  const canViewSettings   = isMaster || hasPermission('settings', 'view');

  const sections: SectionDef[] = [
    /* ── CRM & Pipeline (Clients merged in) ── */
    {
      title: 'CRM & Clients',
      icon: Target,
      accent: '#3b82f6',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/clients',                      icon: Users,         label: 'Clients' },
        { to: '/backoffice/crm-killer/pipeline',          icon: BarChart3,     label: 'Pipeline' },
        { to: '/backoffice/crm-killer/inbox',             icon: Inbox,         label: 'Inbox' },
        { to: '/backoffice/quote-queue',                  icon: ClipboardList, label: 'File Devis' },
        { to: '/backoffice/crm-killer/retention',         icon: Shield,        label: 'Rétention' },
        { to: '/backoffice/crm-killer/ia',                icon: Brain,         label: 'IA CRM' },
        { to: '/backoffice/crm-killer/templates',         icon: FileText,      label: 'Templates Email' },
        { to: '/backoffice/doublons',                     icon: Users,         label: 'Doublons' },
      ],
    },

    /* ── Facturation ── */
    {
      title: 'Facturation',
      icon: CreditCard,
      accent: '#10b981',
      permission: true,
      links: [
        { to: '/backoffice/lead-invoicing',       icon: CreditCard,  label: 'Leads' },
        { to: '/backoffice/free-invoicing',       icon: DollarSign,  label: 'Libre' },
        { to: '/backoffice/monetico-accounting',  icon: DollarSign,  label: 'Monético' },
      ],
    },

    /* ── Production & Compagnies ── */
    {
      title: 'Production',
      icon: Building2,
      accent: '#0ea5e9',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/insurance-companies',       icon: Building2,     label: 'Compagnies' },
        { to: '/backoffice/insurance-companies-stats', icon: BarChart3,     label: 'Stats Compagnies' },
        { to: '/backoffice/production',                icon: ClipboardList, label: 'Production' },
        { to: '/backoffice/quotes',                    icon: Receipt,       label: 'Gestion Devis' },
        { to: '/backoffice/pending-documents',         icon: FileCheck,     label: 'Docs à Valider', badge: pendingDocsCount || undefined },
        { to: '/backoffice/documents',                 icon: FileText,      label: 'Tous Documents' },
        { to: '/backoffice/web-import',                icon: Globe,         label: 'Import Web' },
      ],
    },

    /* ── Communication ── */
    {
      title: 'Communication',
      icon: MessageSquare,
      accent: '#22c55e',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/whatsapp',        icon: MessageSquare, label: 'WhatsApp' },
        { to: '/backoffice/email-marketing', icon: Mail,          label: 'Email Marketing' },
        { to: '/backoffice/newsletter',      icon: Mail,          label: 'Newsletter' },
        { to: '/backoffice/notifications',   icon: Bell,          label: 'Notifications' },
      ],
    },

    /* ── Marketplace ── */
    {
      title: 'Marketplace',
      icon: DollarSign,
      accent: '#f59e0b',
      permission: canViewMarket,
      links: [
        { to: '/backoffice/lead-marketplace', icon: DollarSign,  label: 'Marketplace' },
        { to: '/backoffice/partner-portal',   icon: Handshake,   label: 'Portail Courtier' },
        { to: '/backoffice/partners',         icon: Users,       label: 'Partenaires' },
      ],
    },

    /* ── IA & Automatisation ── */
    {
      title: 'IA & Automatisation',
      icon: Brain,
      accent: '#06b6d4',
      permission: canViewContentIA || canViewSettings,
      links: [
        { to: '/backoffice/ultron',               icon: Sparkles,     label: 'ULTRON' },
        { to: '/backoffice/llm-dashboard',        icon: Brain,        label: 'LLM Agents' },
        { to: '/backoffice/llm-council',          icon: Users,        label: 'LLM Council' },
        { to: '/backoffice/ai-autonomous',        icon: Zap,          label: 'IA Autonome' },
        { to: '/backoffice/master-ai',            icon: Brain,        label: 'IA Maître' },
        { to: '/backoffice/automations',          icon: Activity,     label: 'Automations' },
        { to: '/backoffice/automation-scheduler', icon: Clock,        label: 'Scheduler' },
        { to: '/backoffice/auto-optimizer',       icon: TrendingUp,   label: 'Auto-Optimizer' },
      ],
    },

    /* ── Contenu ── */
    {
      title: 'Contenu',
      icon: Newspaper,
      accent: '#f97316',
      permission: canViewContentIA,
      links: [
        { to: '/backoffice/ai-generator',    icon: Zap,        label: 'Générateur IA' },
        { to: '/backoffice/content',         icon: FileText,   label: 'Gestion Contenu' },
        { to: '/backoffice/news',            icon: Newspaper,  label: 'Actualités' },
        { to: '/backoffice/popups',          icon: Package,    label: 'Popups' },
        { to: '/backoffice/generate-cities', icon: MapPin,     label: 'Pages Villes' },
        { to: '/backoffice/trend-analyzer',  icon: TrendingUp, label: 'Analyse Tendances' },
      ],
    },

    /* ── SEO & Backlinks ── */
    {
      title: 'SEO & Backlinks',
      icon: Search,
      accent: '#34d399',
      permission: canViewSEO || canViewBacklinks,
      links: [
        { to: '/backoffice/seo',                  icon: Search,   label: 'SEO Tools' },
        { to: '/backoffice/seo-strategy',         icon: Target,   label: 'Stratégie SEO' },
        { to: '/backoffice/backlinks',            icon: Link2,    label: 'Backlinks' },
        { to: '/backoffice/backlink-prospector',  icon: Search,   label: 'Prospecteur' },
        { to: '/backoffice/backlink-automation',  icon: Zap,      label: 'Auto Backlinks' },
        { to: '/backoffice/outreach',             icon: Mail,     label: 'Outreach' },
      ],
    },

    /* ── Réseaux Sociaux ── */
    {
      title: 'Réseaux Sociaux',
      icon: Megaphone,
      accent: '#f43f5e',
      permission: canViewSocial,
      links: [
        { to: '/backoffice/social-media',        icon: Megaphone, label: 'Social Media' },
        { to: '/backoffice/marketing-templates', icon: FileText,  label: 'Templates Visuels' },
        { to: '/backoffice/qr-codes',            icon: QrCode,    label: 'QR Codes' },
      ],
    },

    /* ── Analytics ── */
    {
      title: 'Analytics',
      icon: PieChart,
      accent: '#ec4899',
      permission: canViewAnalytics,
      links: [
        { to: '/backoffice/analytics',    icon: PieChart,   label: 'Tableau de bord' },
        { to: '/backoffice/ga4-seo',      icon: BarChart3,  label: 'GA4 / SEO' },
        { to: '/backoffice/conversion',   icon: TrendingUp, label: 'Conversions' },
        { to: '/backoffice/old-dashboard',icon: BarChart3,  label: 'Dashboard Pro' },
      ],
    },

    /* ── Administration ── */
    {
      title: 'Administration',
      icon: UserCog,
      accent: '#94a3b8',
      permission: isMaster,
      links: [
        { to: '/backoffice/users',            icon: Users,     label: 'Utilisateurs' },
        { to: '/backoffice/security',         icon: Shield,    label: 'Sécurité' },
        { to: '/backoffice/compliance',       icon: FileCheck, label: 'Conformité' },
        { to: '/backoffice/test-automations', icon: Zap,       label: 'Tests Auto' },
        { to: '/',                            icon: Globe,     label: 'Voir le site' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {sections.map(section => {
        if (section.permission === false) return null;
        if (excludeSections.includes(section.title)) return null;
        return (
          <SectionGroup
            key={section.title}
            section={section}
            currentPath={pathname}
          />
        );
      })}
    </div>
  );
}
