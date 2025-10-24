import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { pingWebhook } from '../lib/feeds';

const AdminPing: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastCheck, setLastCheck] = useState<string>('');

  useEffect(() => {
    checkWebhook();
    const interval = setInterval(checkWebhook, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkWebhook = async () => {
    setStatus('loading');
    try {
      const result = await pingWebhook();
      setStatus(result.ok ? 'success' : 'error');
      setLastCheck(new Date().toLocaleTimeString('fr-FR'));
    } catch (error) {
      setStatus('error');
      setLastCheck(new Date().toLocaleTimeString('fr-FR'));
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Activity className="animate-spin text-yellow-500" size={16} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <AlertCircle className="text-gray-600" size={16} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'loading':
        return 'Test...';
      case 'success':
        return 'Webhook OK';
      case 'error':
        return 'Webhook KO';
      default:
        return 'En attente';
    }
  };

  return (
    <div className="flex items-center space-x-3 bg-white rounded-lg px-4 py-2 shadow-lg border border-yellow-200">
      {getStatusIcon()}
      <span className={`font-bold text-base ${
        status === 'success' ? 'text-green-600' : 
        status === 'error' ? 'text-red-600' : 'text-gray-600'
      }`}>
        {getStatusText()}
      </span>
      {lastCheck && (
        <span className="text-gray-600 text-sm font-medium">
          {lastCheck}
        </span>
      )}
    </div>
  );
};

export default AdminPing;