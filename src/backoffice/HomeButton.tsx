import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

interface HomeButtonProps {
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function HomeButton({
  label = 'Accueil Admin',
  icon,
  className = 'flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors'
}: HomeButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/backoffice')}
      className={className}
      type="button"
    >
      {icon || <Home size={18} />}
      <span>{label}</span>
    </button>
  );
}
