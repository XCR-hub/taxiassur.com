import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  showHomeIcon?: boolean;
}

export default function BackButton({
  to = '/backoffice',
  label = 'Retour au menu principal',
  showHomeIcon = true
}: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all shadow-md mb-6"
    >
      {showHomeIcon ? <Home className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
      <span>{label}</span>
    </button>
  );
}
