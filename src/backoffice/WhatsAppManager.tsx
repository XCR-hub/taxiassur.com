import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Send, User, Check, CheckCheck, Clock, AlertCircle, Tag, UserPlus } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Contact {
  id: string;
  phone_e164: string;
  display_name: string;
  opted_out: boolean;
}

interface Conversation {
  id: string;
  contact_id: string;
  assigned_to_user_id: string | null;
  status: 'open' | 'closed' | 'archived';
  last_message_at: string;
  unread_count: number;
  tags: string[];
  wa_contacts: Contact;
  last_message_preview?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  media_url?: string;
  message_sid?: string;
  status: string;
  created_at: string;
  read_at?: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  variables: string[];
  category: string;
}

export default function WhatsAppManager() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'assigned'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadTemplates();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      const interval = setInterval(() => loadMessages(selectedConversation.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    let query = supabase
      .from('wa_conversations')
      .select('*, wa_contacts(*)')
      .order('last_message_at', { ascending: false });

    if (filter === 'unread') {
      query = query.gt('unread_count', 0);
    } else if (filter === 'assigned') {
      query = query.not('assigned_to_user_id', 'is', null);
    }

    const { data, error } = await query;
    if (!error && data) {
      setConversations(data);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('wa_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('wa_templates')
      .select('*')
      .eq('approved', true)
      .order('name');

    if (data) setTemplates(data);
  };

  const sendMessage = async () => {
    if (!selectedConversation || !messageText.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          conversationId: selectedConversation.id,
          body: messageText,
        },
      });

      if (error) throw error;

      setMessageText('');
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      logger.error('Error sending WhatsApp:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  const sendTemplate = async (template: Template, variables: Record<string, string>) => {
    if (!selectedConversation) return;

    setLoading(true);
    try {
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          conversationId: selectedConversation.id,
          templateName: template.name,
          templateVariables: variables,
        },
      });

      setShowTemplates(false);
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      logger.error('Error sending template:', error);
      alert('Erreur lors de l\'envoi du template');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!selectedConversation) return;

    await supabase
      .from('wa_conversations')
      .update({ unread_count: 0 })
      .eq('id', selectedConversation.id);

    await loadConversations();
  };

  const assignToMe = async () => {
    if (!selectedConversation) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('wa_conversations')
      .update({ assigned_to_user_id: user.id })
      .eq('id', selectedConversation.id);

    await loadConversations();
  };

  const getStatusIcon = (message: Message) => {
    if (message.direction === 'inbound') return null;

    switch (message.status) {
      case 'queued':
      case 'sent':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Check className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-max py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <MessageSquare className="text-green-600" />
                WhatsApp Manager
              </h1>
              <p className="text-gray-600">Gérez vos conversations WhatsApp Business</p>
            </div>
            <a
              href="/backoffice"
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              <User size={18} />
              <span>Accueil Admin</span>
            </a>
          </div>
        </div>
      </div>

      <div className="container-max py-6">
        <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-green-500 to-green-600">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Conversations
              </h2>
              <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'all' ? 'bg-white text-green-600 font-medium' : 'bg-green-400 text-white'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'unread' ? 'bg-white text-green-600 font-medium' : 'bg-green-400 text-white'
              }`}
            >
              Non lues
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-3 py-1 rounded text-sm ${
                filter === 'assigned' ? 'bg-white text-green-600 font-medium' : 'bg-green-400 text-white'
              }`}
            >
              Assignées
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                selectedConversation?.id === conv.id ? 'bg-green-50 border-l-4 border-green-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">
                      {conv.wa_contacts.display_name}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{conv.wa_contacts.phone_e164}</p>
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {conv.last_message_preview || 'Aucun message'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {conv.last_message_at
                    ? new Date(conv.last_message_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
              {conv.wa_contacts.opted_out && (
                <span className="inline-block mt-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                  Désabonné
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {selectedConversation.wa_contacts.display_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedConversation.wa_contacts.phone_e164}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={markAsRead}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Marquer lu
                </button>
                <button
                  onClick={assignToMe}
                  className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm flex items-center gap-1"
                >
                  <UserPlus className="w-4 h-4" />
                  M'assigner
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.direction === 'outbound'
                        ? 'bg-green-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    {msg.media_url && (
                      <img
                        src={msg.media_url}
                        alt="Media"
                        className="rounded mb-2 max-w-full"
                      />
                    )}
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {getStatusIcon(msg)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
              {showTemplates && (
                <div className="mb-3 p-3 bg-gray-50 rounded max-h-48 overflow-y-auto">
                  <p className="text-sm font-semibold mb-2">Templates WhatsApp :</p>
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        const vars: Record<string, string> = {};
                        tpl.variables.forEach((v) => {
                          const value = prompt(`Variable ${v} :`);
                          if (value) vars[v] = value;
                        });
                        sendTemplate(tpl, vars);
                      }}
                      className="block w-full text-left px-3 py-2 mb-2 bg-white border rounded hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium">{tpl.name}</span>
                      <p className="text-xs text-gray-500 mt-1">{tpl.body.substring(0, 100)}...</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  title="Templates"
                >
                  <Tag className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Tapez votre message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={selectedConversation.wa_contacts.opted_out || loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || selectedConversation.wa_contacts.opted_out || loading}
                  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Envoyer
                </button>
              </div>
              {selectedConversation.wa_contacts.opted_out && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Ce contact s'est désabonné. Vous ne pouvez plus lui envoyer de messages.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Sélectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
