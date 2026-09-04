import { useState, useEffect, useRef } from 'react';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { clearDeliveryRequestId, getDeliveryRequestId } from '@/lib/delivery-idempotency';
import {
  MessageSquare,
  Send,
  Search,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Tag,
  UserPlus,
  X,
  Phone,
  ChevronDown,
  Ban,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
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

const AVATAR_COLORS = [
  'from-green-500 to-emerald-600',
  'from-blue-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-teal-600',
  'from-violet-500 to-purple-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'maintenant';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD === 1) return 'hier';
  if (diffD < 7) return `${diffD}j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const d = new Date(msg.created_at);
    const now = new Date();
    const diffD = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let label = '';
    if (diffD === 0) label = "Aujourd'hui";
    else if (diffD === 1) label = 'Hier';
    else label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (label !== currentDate) {
      currentDate = label;
      groups.push({ date: label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });
  return groups;
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
  const [search, setSearch] = useState('');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void loadConversations();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    if (selectedConversation) {
      void loadMessages(selectedConversation.id);
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') void loadMessages(selectedConversation.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const result = await nativeAdminCall<{ conversations?: Conversation[]; templates?: Template[] }>(
        `/v1/admin/whatsapp?filter=${encodeURIComponent(filter)}`
      );
      setConversations(result.conversations || []);
      setTemplates(result.templates || []);
    } catch (error) {
      logger.error('Error loading WhatsApp conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const result = await nativeAdminCall<{ messages?: Message[] }>(
        `/v1/admin/whatsapp?conversation_id=${encodeURIComponent(conversationId)}`
      );
      setMessages(result.messages || []);
    } catch (error) {
      logger.error('Error loading WhatsApp messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !messageText.trim()) return;
    setLoading(true);
    try {
      const deliverySignature = JSON.stringify({ conversationId: selectedConversation.id, body: messageText.trim() });
      const requestId = getDeliveryRequestId('whatsapp', deliverySignature);
      const sendResult = await nativeAdminCall<{ success?: boolean }>('/v1/admin/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ action: 'send', conversation_id: selectedConversation.id, body: messageText, request_id: requestId }),
      });
      if (sendResult?.success !== true) throw new Error('WhatsApp non envoyé');
      clearDeliveryRequestId('whatsapp', deliverySignature);
      setMessageText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      logger.error('Error sending WhatsApp:', error);
      window.alert("Le message WhatsApp n'a pas pu être envoyé. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const sendTemplate = async () => {
    if (!selectedConversation || !selectedTemplate) return;
    setLoading(true);
    try {
      const deliverySignature = JSON.stringify({ conversationId: selectedConversation.id, templateName: selectedTemplate.name, templateVariables: templateVars });
      const requestId = getDeliveryRequestId('whatsapp', deliverySignature);
      const sendResult = await nativeAdminCall<{ success?: boolean }>('/v1/admin/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send',
          conversation_id: selectedConversation.id,
          template_name: selectedTemplate.name,
          template_variables: templateVars,
          request_id: requestId,
        }),
      });
      if (sendResult?.success !== true) throw new Error('WhatsApp non envoyé');
      clearDeliveryRequestId('whatsapp', deliverySignature);
      setShowTemplates(false);
      setSelectedTemplate(null);
      setTemplateVars({});
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      logger.error('Error sending template:', error);
      window.alert("Le modèle WhatsApp n'a pas pu être envoyé. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!selectedConversation) return;
    await nativeAdminCall('/v1/admin/whatsapp', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'read', conversation_id: selectedConversation.id }),
    });
    await loadConversations();
  };

  const assignToMe = async () => {
    if (!selectedConversation) return;
    await nativeAdminCall('/v1/admin/whatsapp', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'assign', conversation_id: selectedConversation.id }),
    });
    await loadConversations();
  };

  const getStatusIcon = (message: Message) => {
    if (message.direction === 'inbound') return null;
    switch (message.status) {
      case 'queued':
      case 'sent': return <Clock className="w-3 h-3 text-green-200" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-green-200" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-white" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-300" />;
      default: return <Check className="w-3 h-3 text-green-200" />;
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.wa_contacts.display_name.toLowerCase().includes(q) ||
      c.wa_contacts.phone_e164.includes(q)
    );
  });

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const openCount = conversations.filter((c) => c.status === 'open').length;

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top stats bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">WhatsApp Business</div>
            <div className="text-xs text-gray-500">Conversations en direct</div>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <StatPill label="Ouvertes" value={openCount} color="green" />
          <StatPill label="Non lues" value={totalUnread} color={totalUnread > 0 ? 'amber' : 'gray'} />
          <StatPill label="Total" value={conversations.length} color="blue" />
        </div>
        <div className="ml-auto">
          <button
            onClick={loadConversations}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Main split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Conversations list */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Search + Filter */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'unread', 'assigned'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === f
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Assignées'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <MessageCircle size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Aucune conversation</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const name = conv.wa_contacts.display_name;
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => { setSelectedConversation(conv); markAsRead(); }}
                    className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors relative ${
                      isSelected ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-xs font-bold text-white">{getInitials(name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-sm font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {name}
                          </span>
                          <span className="text-[11px] text-gray-400 flex-shrink-0">
                            {conv.last_message_at ? formatRelativeTime(conv.last_message_at) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{conv.wa_contacts.phone_e164}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs truncate flex-1 ${conv.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                            {conv.last_message_preview || 'Aucun message'}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="ml-2 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                              {conv.unread_count > 9 ? '9+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                        {conv.wa_contacts.opted_out && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded">
                            <Ban size={9} /> Désabonné
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel: Conversation thread */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Conversation header */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(selectedConversation.wa_contacts.display_name)} flex items-center justify-center`}>
                  <span className="text-xs font-bold text-white">
                    {getInitials(selectedConversation.wa_contacts.display_name)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {selectedConversation.wa_contacts.display_name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Phone size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{selectedConversation.wa_contacts.phone_e164}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      selectedConversation.status === 'open'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedConversation.status === 'open' ? 'Ouverte' : selectedConversation.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAsRead}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <CheckCheck size={13} />
                  Marquer lu
                </button>
                <button
                  onClick={assignToMe}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <UserPlus size={13} />
                  M'assigner
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
              style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #f9fafb 100%)' }}
            >
              {messageGroups.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-2">
                    {group.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            msg.direction === 'outbound'
                              ? 'bg-green-500 text-white rounded-tr-sm'
                              : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                          }`}
                        >
                          {msg.media_url && (
                            <img src={msg.media_url} alt="Media" className="rounded-lg mb-2 max-w-full" />
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                          <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[11px] ${msg.direction === 'outbound' ? 'text-green-200' : 'text-gray-400'}`}>
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {getStatusIcon(msg)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose area */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
              {selectedConversation.wa_contacts.opted_out ? (
                <div className="flex items-center gap-2 py-3 px-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <Ban size={16} />
                  Ce contact s'est désabonné. Vous ne pouvez plus lui envoyer de messages.
                </div>
              ) : (
                <>
                  {/* Template panel */}
                  {showTemplates && (
                    <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-700">Templates WhatsApp approuvés</span>
                        <button onClick={() => { setShowTemplates(false); setSelectedTemplate(null); setTemplateVars({}); }}
                          className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                      {selectedTemplate ? (
                        <div className="p-4 space-y-3">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700">
                            {selectedTemplate.body}
                          </div>
                          {selectedTemplate.variables.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-600">Variables requises :</p>
                              {selectedTemplate.variables.map((v) => (
                                <div key={v} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">{`{{${v}}}`}</span>
                                  <input
                                    type="text"
                                    value={templateVars[v] || ''}
                                    onChange={(e) => setTemplateVars((prev) => ({ ...prev, [v]: e.target.value }))}
                                    placeholder={`Valeur pour ${v}`}
                                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedTemplate(null); setTemplateVars({}); }}
                              className="flex-1 text-xs py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Retour
                            </button>
                            <button
                              onClick={sendTemplate}
                              disabled={loading}
                              className="flex-1 text-xs py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                              Envoyer ce template
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="max-h-44 overflow-y-auto divide-y divide-gray-100">
                          {templates.length === 0 ? (
                            <div className="py-6 text-center text-sm text-gray-400">
                              Aucun template approuvé
                            </div>
                          ) : (
                            templates.map((tpl) => (
                              <button
                                key={tpl.id}
                                onClick={() => setSelectedTemplate(tpl)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-gray-800">{tpl.name}</span>
                                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{tpl.category}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.body}</p>
                                {tpl.variables.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <ChevronDown size={10} className="text-gray-400" />
                                    <span className="text-[10px] text-gray-400">{tpl.variables.length} variable(s)</span>
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => { setShowTemplates(!showTemplates); if (showTemplates) { setSelectedTemplate(null); setTemplateVars({}); } }}
                      title="Templates"
                      className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                        showTemplates ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <Tag size={18} />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        value={messageText}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Tapez votre message… (Entrée pour envoyer)"
                        rows={1}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-colors"
                        style={{ minHeight: '42px', maxHeight: '120px' }}
                        disabled={loading}
                      />
                      {messageText.length > 0 && (
                        <span className="absolute right-3 bottom-2 text-[10px] text-gray-400">
                          {messageText.length}/4096
                        </span>
                      )}
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim() || loading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 text-sm font-medium"
                    >
                      {loading ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      Envoyer
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 px-1">
                    Shift+Entrée pour saut de ligne · Les messages sont soumis aux politiques WhatsApp Business
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={36} className="text-gray-300" />
              </div>
              <h3 className="text-gray-500 font-medium">Sélectionnez une conversation</h3>
              <p className="text-sm text-gray-400 mt-1">Choisissez une conversation dans la liste à gauche</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: number;
  color: 'green' | 'amber' | 'blue' | 'gray';
}

function StatPill({ label, value, color }: StatPillProps) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${colors[color]}`}>
      <span className="text-sm font-bold">{value}</span>
      <span className="opacity-75">{label}</span>
    </div>
  );
}
