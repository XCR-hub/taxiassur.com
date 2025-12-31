import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Shield,
  CreditCard,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home
} from 'lucide-react';

interface ClientLayoutProps {
  children: React.ReactNode;
  email: string;
}

export default function ClientLayout({ children, email }: ClientLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem('client_email');
    navigate('/');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de Bord', path: '/client/dashboard' },
    { icon: FileText, label: 'Documents', path: '/client/documents' },
    { icon: Shield, label: 'Sinistres', path: '/client/sinistres' },
    { icon: CreditCard, label: 'Paiements', path: '/client/paiements' },
    { icon: Bell, label: 'Notifications', path: '/client/notifications' },
    { icon: User, label: 'Mon Profil', path: '/client/profil' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-white hover:text-yellow-400 transition-colors"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <Link to="/client/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-black font-black text-lg">🚖</span>
              </div>
              <div>
                <span className="text-xl font-black text-white">TaxiAssur</span>
                <span className="hidden sm:block text-xs text-yellow-400 tracking-wider font-bold">ESPACE CLIENT</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-white text-sm">
              <User size={16} className="text-yellow-400" />
              <span className="font-medium">{email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold transition-all text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`
          fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] bg-white border-r border-gray-200 z-30
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64
        `}>
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm
                    ${active
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {active && <ChevronRight size={16} className="ml-auto" />}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-gray-200">
              <a
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all font-medium text-sm"
              >
                <Home size={20} />
                <span>Retour au Site</span>
              </a>
            </div>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-r from-gray-900 to-black text-white">
            <div className="text-xs space-y-1">
              <div className="font-bold">Support Client</div>
              <div className="text-gray-300">Lun-Ven 9h-18h</div>
              <a href="tel:0180855786" className="block font-bold text-yellow-400 hover:text-yellow-300">
                01 80 85 57 86
              </a>
            </div>
          </div>
        </aside>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
