import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Shield, CreditCard, Bell, User, LogOut, Menu, X, Home, Gift, ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClientLayoutProps {
  children: React.ReactNode;
  email: string;
}

export default function ClientLayout({ children, email }: ClientLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!email) return;
    loadUnreadCount();
  }, [email]);

  const loadUnreadCount = async () => {
    try {
      const { data: portal } = await supabase
        .from('client_portal_users')
        .select('lead_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      let leadId = portal?.lead_id;
      if (!leadId) {
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();
        leadId = lead?.id;
      }
      if (!leadId) return;

      const { count } = await supabase
        .from('crm_event_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', leadId)
        .is('read_at', null);

      setUnreadCount(count || 0);
    } catch {
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('client_email');
    navigate('/');
  };

  const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/client/dashboard' },
    { icon: FileText,        label: 'Documents',       path: '/client/documents' },
    { icon: Shield,          label: 'Sinistres',       path: '/client/sinistres' },
    { icon: CreditCard,      label: 'Paiements',       path: '/client/paiements' },
    { icon: Bell,            label: 'Notifications',   path: '/client/notifications', badge: unreadCount },
    { icon: Gift,            label: 'Parrainage',      path: '/client/parrainage' },
    { icon: ShieldCheck,     label: 'Confidentialite', path: '/client/confidentialite' },
    { icon: User,            label: 'Mon Profil',      path: '/client/profil' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-white hover:text-yellow-400 transition-colors p-1"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Link to={`/client/dashboard${emailParam}`} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
                  <rect x="9" y="11" width="14" height="10" rx="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <circle cx="20" cy="16" r="1"/>
                </svg>
              </div>
              <div>
                <div className="text-white font-black text-lg leading-tight">TaxiAssur</div>
                <div className="text-yellow-400 text-[10px] tracking-widest font-bold leading-none hidden sm:block">ESPACE CLIENT</div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
              <User size={14} className="text-yellow-400" />
              <span className="text-white text-sm font-medium truncate max-w-[200px]">{email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-white hover:text-yellow-400 rounded-lg hover:bg-white/10 transition-all text-sm font-medium"
              title="Se déconnecter"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-[61px] left-0 h-[calc(100vh-61px)] bg-white border-r border-gray-200 z-30
          transition-transform duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-60
        `}>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={`${item.path}${emailParam}`}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium relative
                    ${active
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-black shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[11px] font-bold px-1 ${
                      active ? 'bg-black/20 text-black' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-gray-100">
              <a
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all text-sm font-medium"
              >
                <Home size={18} />
                <span>Retour au site</span>
              </a>
            </div>
          </nav>

          <div className="p-3 border-t border-gray-100">
            <div className="bg-gray-900 rounded-xl p-3 text-white">
              <div className="text-xs font-bold mb-0.5">Support client</div>
              <div className="text-gray-400 text-xs">Lun–Ven, 9h–18h</div>
              <a href="tel:0180855786" className="block font-bold text-yellow-400 hover:text-yellow-300 text-sm mt-1 transition-colors">
                01 80 85 57 86
              </a>
            </div>
          </div>
        </aside>

        {/* Overlay mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
