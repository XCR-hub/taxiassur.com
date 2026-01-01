import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { getSupabaseUrl, getSupabaseAnonKey } from '../lib/env';
import { logger } from '@/lib/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MAX_MESSAGES = 50;

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant d'assurance taxi. Comment puis-je vous aider aujourd'hui ?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
    setInput('');
    setIsLoading(true);

    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseAnonKey();

      // Check if Supabase is configured
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        throw new Error('Supabase not configured');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })).concat([{ role: 'user', content: userMessage.content }])
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
      });
    } catch (error) {
      logger.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Le chatbot AI nécessite une configuration Supabase. Pour l'instant, contactez-nous au 01 80 85 57 86 ou via notre formulaire de contact.",
        timestamp: new Date()
      };
      setMessages(prev => {
        const updated = [...prev, errorMessage];
        return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: "Devis gratuit", text: "Je voudrais un devis gratuit" },
    { label: "Prix moyen", text: "Quel est le prix moyen d'une assurance taxi ?" },
    { label: "RC Pro", text: "Qu'est-ce que la RC professionnelle ?" },
    { label: "VTC vs Taxi", text: "Quelle différence entre assurance VTC et Taxi ?" },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full p-4 shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300 group"
        aria-label="Ouvrir le chat assistant"
      >
        <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          AI
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 w-auto sm:w-[380px] h-[calc(100vh-2rem)] sm:h-[600px] max-h-[calc(100vh-2rem)] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-yellow-200">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Sparkles size={24} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 bg-green-400 w-3 h-3 rounded-full border-2 border-white"></span>
          </div>
          <div>
            <h3 className="font-bold text-lg">Assistant TaxiAssur</h3>
            <p className="text-xs text-orange-100">Propulsé par ChatGPT</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          aria-label="Fermer le chat"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white border border-yellow-100">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none shadow-md border border-yellow-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className={`text-xs mt-1 block ${
                message.role === 'user' ? 'text-orange-100' : 'text-gray-600'
              }`}>
                {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-md border border-yellow-200">
              <Loader2 className="animate-spin text-orange-500" size={20} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 py-2 bg-white border-t border-yellow-200">
          <p className="text-xs text-gray-600 mb-2 font-medium">Questions rapides :</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  setInput(action.text);
                  setTimeout(() => sendMessage(), 100);
                }}
                className="text-xs bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-600 rounded-lg px-3 py-2 transition-colors text-left"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t border-yellow-200">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez votre question..."
            className="flex-1 px-4 py-3 border border-orange-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base sm:text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full p-3 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
            aria-label="Envoyer le message"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Réponses instantanées • Disponible 24/7
        </p>
      </div>
    </div>
  );
}
