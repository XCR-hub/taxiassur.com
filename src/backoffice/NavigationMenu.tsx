import { Link, useLocation } from 'react-router-dom';
import {
  Users, DollarSign, BarChart3, PieChart, Handshake, Zap, Newspaper,
  TrendingUp, FileText, Search, Link2, Mail, Building2, FileCheck,
  Inbox, Clock, Megaphone, Shield, Globe, Settings, QrCode,
  MessageSquare, Brain, MapPin, UserCog, Sparkles, Receipt,
  ClipboardList, Target, Activity, Bell, CreditCard, ChevronDown,
  Package, Send,
} from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { usePendingDocumentsCount } from '../hooks/usePendingDocumentsCount';
import { useState, useEffect, useCallback } from 'react';

interface NavLink {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  featured?: boolean;
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
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="crm-section-header"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          borderRadius: 8,
          background: hasActive ? `${section.accent}0a` : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: hasActive ? `${section.accent}18` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${hasActive ? `${section.accent}20` : 'rgba(255,255,255,0.04)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          <section.icon
            size={11}
            style={{ color: hasActive ? section.accent : 'rgba(255,255,255,0.25)' }}
          />
        </div>
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            fontSize: 10,
            fontWeight: 650,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: hasActive ? section.accent : 'rgba(255,255,255,0.25)',
            transition: 'color 0.2s',
          }}
        >
          {section.title}
        </span>
        {hasActive && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: section.accent,
              boxShadow: `0 0 6px ${section.accent}80`,
              flexShrink: 0,
            }}
          />
        )}
        <ChevronDown
          size={12}
          style={{
            color: hasActive ? `${section.accent}60` : 'rgba(255,255,255,0.12)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0,
          }}
        />
      </button>

      <div
        style={{
          overflow: 'hidden',
          maxHeight: open ? 500 : 0,
          opacity: open ? 1 : 0,
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
        }}
      >
        <div style={{ paddingTop: 2, paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {section.links.map(link => {
            const isActive = currentPath === link.to || currentPath.startsWith(link.to + '/');
            const isFeatured = link.featured && !isActive;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="crm-menu-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: isFeatured ? '8px 10px' : '7px 10px',
                  borderRadius: 8,
                  background: isActive
                    ? `${section.accent}10`
                    : isFeatured
                      ? `${section.accent}08`
                      : 'transparent',
                  border: isFeatured ? `1px solid ${section.accent}18` : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '18%',
                      bottom: '18%',
                      width: 2.5,
                      borderRadius: '0 3px 3px 0',
                      background: section.accent,
                      boxShadow: `0 0 8px ${section.accent}60`,
                    }}
                  />
                )}
                {isFeatured ? (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: `${section.accent}15`,
                      border: `1px solid ${section.accent}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <link.icon size={13} style={{ color: section.accent }} />
                  </div>
                ) : (
                  <link.icon
                    size={14}
                    style={{
                      color: isActive ? section.accent : 'rgba(255,255,255,0.25)',
                      flexShrink: 0,
                      transition: 'color 0.15s',
                    }}
                  />
                )}
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    fontWeight: isActive ? 550 : isFeatured ? 550 : 400,
                    color: isActive ? '#fff' : isFeatured ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
                    letterSpacing: '-0.005em',
                    transition: 'all 0.15s',
                    lineHeight: 1.3,
                  }}
                >
                  {link.label}
                </span>
                {isFeatured && (
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: `${section.accent}15`,
                      color: section.accent,
                    }}
                  >
                    CLE
                  </div>
                )}
                {link.badge && Number(link.badge) > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? `${section.accent}25` : 'rgba(239,68,68,0.7)',
                      color: isActive ? section.accent : '#fff',
                      boxShadow: isActive ? 'none' : '0 2px 6px rgba(239,68,68,0.3)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {Number(link.badge) > 99 ? '99+' : link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface UserPermission {
  permission_type: string;
  can_view?: boolean;
}

function isUserPermission(value: unknown): value is UserPermission {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as UserPermission).permission_type === 'string'
  );
}

function readCachedPermissions(): UserPermission[] {
  try {
    const cached = localStorage.getItem('taxiassur_permissions');
    if (!cached) return [];
    const parsed: unknown = JSON.parse(cached);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUserPermission);
  } catch {
    return [];
  }
}

function useUserPermissions(userId: string | undefined, isMaster: boolean) {
  const [permissions, setPermissions] = useState<UserPermission[]>(readCachedPermissions);

  useEffect(() => {
    if (!userId || isMaster) return;
    if (permissions.length > 0) return;

    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!baseUrl || !anonKey) return;

    fetch(`${baseUrl}/rest/v1/user_permissions?select=id,user_id,permission_type,can_view,can_edit,can_delete&user_id=eq.${userId}`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    })
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) {
          const nextPermissions = data.filter(isUserPermission);
          setPermissions(nextPermissions);
          localStorage.setItem('taxiassur_permissions', JSON.stringify(nextPermissions));
        }
      })
      .catch(() => undefined);
  }, [userId, isMaster, permissions.length]);

  const check = useCallback((permType: string) => {
    if (isMaster) return true;
    return permissions.some((permission) => permission.permission_type === permType && permission.can_view === true);
  }, [isMaster, permissions]);

  return check;
}
export default function NavigationMenu({ excludeSections = [] }: NavigationMenuProps) {
  const { user: currentUser } = useAdminAuth();
  const isMaster = currentUser?.role === 'master';
  const { pathname } = useLocation();
  const { count: pendingDocsCount } = usePendingDocumentsCount();
  const checkPerm = useUserPermissions(currentUser?.id, !!isMaster);

  const canViewCRM           = isMaster || checkPerm('crm_leads');
  const canViewFacturation   = isMaster || checkPerm('facturation');
  const canViewProduction    = isMaster || checkPerm('production');
  const canViewCommunication = isMaster || checkPerm('communication');
  const canViewMarket        = isMaster || checkPerm('marketplace');
  const canViewIAAutomation  = isMaster || checkPerm('ia_automation');
  const canViewContentIA     = isMaster || checkPerm('content_ia');
  const canViewSEO           = isMaster || checkPerm('seo');
  const canViewBacklinks     = isMaster || checkPerm('backlinks');
  const canViewAnalytics     = isMaster || checkPerm('analytics');
  const canViewSocial        = isMaster || checkPerm('social_media');
  const sections: SectionDef[] = [
    {
      title: 'CRM & Clients',
      icon: Target,
      accent: '#3b82f6',
      permission: canViewCRM,
      links: [
        { to: '/backoffice/clients',                      icon: Users,         label: 'Clients' },
        { to: '/backoffice/crm-killer/pipeline',          icon: BarChart3,     label: 'Pipeline', featured: true },
        { to: '/backoffice/crm-killer/inbox',             icon: Inbox,         label: 'Inbox' },
        { to: '/backoffice/quote-queue',                  icon: ClipboardList, label: 'File Devis' },
        { to: '/backoffice/crm-killer/retention',         icon: Shield,        label: 'Retention' },
        { to: '/backoffice/crm-killer/ia',                icon: Brain,         label: 'IA CRM' },
        { to: '/backoffice/crm-killer/templates',         icon: FileText,      label: 'Templates Email' },
        { to: '/backoffice/doublons',                     icon: Users,         label: 'Doublons' },
      ],
    },
    {
      title: 'Facturation',
      icon: CreditCard,
      accent: '#10b981',
      permission: canViewFacturation,
      links: [
        { to: '/backoffice/lead-invoicing',       icon: CreditCard,  label: 'Leads' },
        { to: '/backoffice/free-invoicing',       icon: DollarSign,  label: 'Libre' },
        { to: '/backoffice/monetico-accounting',  icon: DollarSign,  label: 'Monetico' },
      ],
    },
    {
      title: 'Production',
      icon: Building2,
      accent: '#0ea5e9',
      permission: canViewProduction,
      links: [
        { to: '/backoffice/insurance-companies',       icon: Building2,     label: 'Compagnies' },
        { to: '/backoffice/insurance-companies-stats', icon: BarChart3,     label: 'Stats Compagnies' },
        { to: '/backoffice/insurer-dossiers',          icon: Send,          label: 'Dossiers Assureurs', featured: true },
        { to: '/backoffice/production',                icon: ClipboardList, label: 'Production' },
        { to: '/backoffice/quotes',                    icon: Receipt,       label: 'Gestion Devis' },
        { to: '/backoffice/pending-documents',         icon: FileCheck,     label: 'Docs a Valider', badge: pendingDocsCount || undefined },
        { to: '/backoffice/documents',                 icon: FileText,      label: 'Tous Documents' },
        { to: '/backoffice/web-import',                icon: Globe,         label: 'Import Web' },
      ],
    },
    {
      title: 'Communication',
      icon: MessageSquare,
      accent: '#22c55e',
      permission: canViewCommunication,
      links: [
        { to: '/backoffice/whatsapp',        icon: MessageSquare, label: 'WhatsApp' },
        { to: '/backoffice/email-marketing', icon: Mail,          label: 'Email Marketing' },
        { to: '/backoffice/newsletter',      icon: Mail,          label: 'Newsletter' },
        { to: '/backoffice/notifications',   icon: Bell,          label: 'Notifications' },
      ],
    },
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
    {
      title: 'IA & Automatisation',
      icon: Brain,
      accent: '#06b6d4',
      permission: canViewIAAutomation,
      links: [
        { to: '/backoffice/ultron',               icon: Sparkles,     label: 'ULTRON' },
        { to: '/backoffice/llm-dashboard',        icon: Brain,        label: 'LLM Agents' },
        { to: '/backoffice/llm-council',          icon: Users,        label: 'LLM Council' },
        { to: '/backoffice/ai-autonomous',        icon: Zap,          label: 'IA Autonome' },
        { to: '/backoffice/master-ai',            icon: Brain,        label: 'IA Maitre' },
        { to: '/backoffice/automations',          icon: Activity,     label: 'Automations' },
        { to: '/backoffice/automation-scheduler', icon: Clock,        label: 'Scheduler' },
        { to: '/backoffice/auto-optimizer',       icon: TrendingUp,   label: 'Auto-Optimizer' },
      ],
    },
    {
      title: 'Contenu',
      icon: Newspaper,
      accent: '#f97316',
      permission: canViewContentIA,
      links: [
        { to: '/backoffice/ai-generator',    icon: Zap,        label: 'Generateur IA' },
        { to: '/backoffice/content',         icon: FileText,   label: 'Gestion Contenu' },
        { to: '/backoffice/news',            icon: Newspaper,  label: 'Actualites' },
        { to: '/backoffice/popups',          icon: Package,    label: 'Popups' },
        { to: '/backoffice/generate-cities', icon: MapPin,     label: 'Pages Villes' },
        { to: '/backoffice/trend-analyzer',  icon: TrendingUp, label: 'Analyse Tendances' },
      ],
    },
    {
      title: 'SEO & Backlinks',
      icon: Search,
      accent: '#34d399',
      permission: canViewSEO || canViewBacklinks,
      links: [
        { to: '/backoffice/seo',                  icon: Search,   label: 'SEO Tools' },
        { to: '/backoffice/seo-strategy',         icon: Target,   label: 'Strategie SEO' },
        { to: '/backoffice/backlinks',            icon: Link2,    label: 'Backlinks' },
        { to: '/backoffice/backlink-prospector',  icon: Search,   label: 'Prospecteur' },
        { to: '/backoffice/backlink-automation',  icon: Zap,      label: 'Auto Backlinks' },
        { to: '/backoffice/outreach',             icon: Mail,     label: 'Outreach' },
      ],
    },
    {
      title: 'Reseaux Sociaux',
      icon: Megaphone,
      accent: '#f43f5e',
      permission: canViewSocial,
      links: [
        { to: '/backoffice/social-media',        icon: Megaphone, label: 'Social Media' },
        { to: '/backoffice/marketing-templates', icon: FileText,  label: 'Templates Visuels' },
        { to: '/backoffice/qr-codes',            icon: QrCode,    label: 'QR Codes' },
      ],
    },
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
    {
      title: 'Administration',
      icon: UserCog,
      accent: '#94a3b8',
      permission: isMaster,
      links: [
        { to: '/backoffice/crm-killer/settings', icon: Settings,  label: 'Parametres' },
        { to: '/backoffice/users',               icon: Users,     label: 'Utilisateurs' },
        { to: '/backoffice/security',            icon: Shield,    label: 'Securite' },
        { to: '/backoffice/compliance',          icon: FileCheck, label: 'Conformite' },
        { to: '/backoffice/test-automations',    icon: Zap,       label: 'Tests Auto' },
        { to: '/',                               icon: Globe,     label: 'Voir le site' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
