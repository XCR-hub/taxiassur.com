import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Phone, Mail } from 'lucide-react';
import { ConversionTracker } from '../lib/conversion';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  message: string;
  timestamp: Date;
  options?: Array<{ text: string; action: string; value?: string }>;
}

const SmartChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<{
    name?: string;
    interest?: string;
    city?: string;
  }>({});

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen]);

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'bot',
      message: "👋 Bonjour ! Je suis l'assistant TaxiAssur. Comment puis-je vous aider avec votre assurance taxi ?",
      timestamp: new Date(),
      options: [
        { text: "💰 Obtenir un devis", action: "devis" },
        { text: "❓ Poser une question", action: "question" },
        { text: "📞 Être rappelé", action: "callback" },
        { text: "💬 Discuter avec un expert", action: "human" }
      ]
    };

    setMessages([welcomeMessage]);
    ConversionTracker.track('chat_opened');
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateTyping = (duration: number = 1500) => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), duration);
  };

  const handleOptionClick = (action: string, value?: string) => {
    ConversionTracker.track('chat_option_selected', { action, value });

    switch (action) {
      case 'devis':
        addMessage({ type: 'user', message: "Je veux un devis" });
        simulateTyping();
        setTimeout(() => {
          addMessage({
            type: 'bot',
            message: "Parfait ! Pour vous proposer le meilleur devis, j'ai besoin de quelques informations. Quel est votre statut ?",
            options: [
              { text: "🚖 Taxi (licence)", action: "status", value: "taxi" },
              { text: "🚗 VTC", action: "status", value: "vtc" },
              { text: "🚐 Autre transport", action: "status", value: "autre" }
            ]
          });
        }, 1500);
        break;

      case 'status':
        addMessage({ type: 'user', message: `Je suis ${value}` });
        setUserContext(prev => ({ ...prev, interest: value }));
        simulateTyping();
        setTimeout(() => {
          addMessage({
            type: 'bot',
            message: `Excellent ! En tant que ${value}, vous pouvez économiser jusqu'à 35% avec nos tarifs négociés. Dans quelle ville exercez-vous ?`,
            options: [
              { text: "🏙️ Paris", action: "city", value: "Paris" },
              { text: "🦁 Lyon", action: "city", value: "Lyon" },
              { text: "⚓ Marseille", action: "city", value: "Marseille" },
              { text: "🌹 Toulouse", action: "city", value: "Toulouse" },
              { text: "🏖️ Autre ville", action: "city_other" }
            ]
          });
        }, 1500);
        break;

      case 'city':
        addMessage({ type: 'user', message: `J'exerce à ${value}` });
        setUserContext(prev => ({ ...prev, city: value }));
        simulateTyping(2000);
        setTimeout(() => {
          addMessage({
            type: 'bot',
            message: `Parfait ! À ${value}, nos clients économisent en moyenne 580€/an. Voulez-vous que je vous mette en relation avec votre expert local pour un devis personnalisé ?`,
            options: [
              { text: "✅ Oui, je veux mon devis", action: "convert" },
              { text: "📞 Préférer être rappelé", action: "callback" },
              { text: "❓ J'ai d'autres questions", action: "questions" }
            ]
          });
        }, 2000);
        break;

      case 'convert':
        addMessage({ type: 'user', message: "Oui, je veux mon devis personnalisé" });
        simulateTyping();
        setTimeout(() => {
          addMessage({
            type: 'bot',
            message: "🎉 Excellent choix ! Je vous redirige vers notre formulaire sécurisé. Votre expert vous recontactera sous 15 minutes avec votre devis personnalisé.",
          });
          
          // Redirect to form with pre-filled data
          setTimeout(() => {
            const formElement = document.getElementById('devis');
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth' });
              
              // Pre-fill form if possible
              if (userContext.city) {
                const cityInput = document.getElementById('city') as HTMLInputElement;
                if (cityInput) cityInput.value = userContext.city;
              }
            }
            setIsOpen(false);
          }, 2000);
        }, 1500);
        break;

      case 'callback':
        addMessage({ type: 'user', message: "Je préfère être rappelé" });
        simulateTyping();
        setTimeout(() => {
          addMessage({
            type: 'bot',
            message: "📞 Parfait ! Appelez directement le 01 80 85 57 86 ou laissez vos coordonnées dans le formulaire pour un rappel immédiat.",
            options: [
              { text: "📞 Appeler maintenant", action: "call" },
              { text: "📝 Laisser mes coordonnées", action: "form" }
            ]
          });
        }, 1500);
        break;

      case 'call':
        window.open('tel:0180855786');
        ConversionTracker.track('phone_click', { source: 'chatbot' });
        break;

      case 'form':
        const formElement = document.getElementById('devis');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' });
        }
        setIsOpen(false);
        break;

      case 'question':
        addMessage({ type: 'user', message: "J'ai une question" });
        simulateTyping();
        setTimeout(() => {
          addMessage({
            type: 'bot',
            message: "Je suis là pour vous aider ! Voici les questions les plus fréquentes :",
            options: [
              { text: "💰 Combien ça coûte ?", action: "faq", value: "prix" },
              { text: "📋 Quels documents ?", action: "faq", value: "documents" },
              { text: "⏱️ Délai d'obtention ?", action: "faq", value: "delai" },
              { text: "🔄 Puis-je résilier ?", action: "faq", value: "resiliation" }
            ]
          });
        }, 1500);
        break;

      case 'faq':
        const faqAnswers: Record<string, string> = {
          prix: "Nos tarifs négociés vous font économiser jusqu'à 35% ! Prix moyen : 1200-2500€/an selon votre profil. Demandez votre devis gratuit pour connaître votre tarif exact.",
          documents: "Simple ! Carte professionnelle taxi + Permis + Carte d'identité + Carte grise + Relevé d'informations. Notre équipe vous guide étape par étape.",
          delai: "Ultra-rapide ! Attestation par email sous 2h ouvrées. En urgence, transmission immédiate possible !",
          resiliation: "Oui, 100% légal ! Loi Hamon : résiliation gratuite après 1 an. Nous nous occupons de toutes les démarches pour vous."
        };
        
        addMessage({ type: 'user', message: `Question sur ${value}` });
        simulateTyping(2000);
        setTimeout(() => {
          addMessage({
            type: 'bot',
            message: faqAnswers[value!] || "Je n'ai pas trouvé cette information. Un expert peut vous répondre directement.",
            options: [
              { text: "🎯 Obtenir mon devis", action: "convert" },
              { text: "📞 Parler à un expert", action: "callback" },
              { text: "❓ Autre question", action: "question" }
            ]
          });
        }, 2000);
        break;
    }
  };

  const handleSendMessage = () => {
    if (!currentInput.trim()) return;

    addMessage({ type: 'user', message: currentInput });
    setCurrentInput('');
    
    // Simple AI response simulation
    simulateTyping();
    setTimeout(() => {
      addMessage({
        type: 'bot',
        message: "Merci pour votre message ! Pour une réponse personnalisée, je vous recommande de parler directement avec un de nos experts.",
        options: [
          { text: "📞 Appeler un expert", action: "call" },
          { text: "📝 Demander un devis", action: "convert" }
        ]
      });
    }, 1500);
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 animate-pulse"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <h4 className="font-bold">Assistant TaxiAssur</h4>
                <p className="text-xs text-blue-100">En ligne • Répond en 2min</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.message}</p>
                  
                  {message.options && (
                    <div className="mt-3 space-y-2">
                      {message.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleOptionClick(option.action, option.value)}
                          className="block w-full text-left p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs transition-colors"
                        >
                          {option.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tapez votre message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartChatBot;