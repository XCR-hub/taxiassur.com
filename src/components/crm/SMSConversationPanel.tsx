import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Loader2, Bot, User, Clock,
  Sparkles, RefreshCw, Phone, ChevronDown, Zap, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status: string;
  is_automated: boolean;
  workflow_trigger: string | null;
  ai_analysis: any;
  ai_suggested_reply: string | null;
  created_at: string;
  delivered_at: string | null;
}

interface SMSConversation {
  id: string;
  phone_number: string;
  unread_count: number;
  last_message_at: string;
}

interface Props {
  leadId: string;
  leadPhone: string | null;
  leadFirstName: string;
}

const SMSConversationPanel: React.FC<Props> = ({ leadId, leadPhone, leadFirstName }) => {
  const [conversation, setConversation] = useState<SMSConversation | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showAISuggest, setShowAISuggest] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leadPhone) loadConversation();
  }, [leadId, leadPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversation() {
    setLoading(true);
    try {
      const { data: convData } = await supabase
        .from('sms_conversations')
        .select('*')
        .eq('lead_id', leadId)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convData) {
        setConversation(convData);
        await loadMessages(convData.id);

        if (convData.unread_count > 0) {
          await supabase
            .from('sms_conversations')
            .update({ unread_count: 0 })
            .eq('id', convData.id);
        }
      } else {
        const { data: msgData } = await supabase
          .from('sms_messages')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true });

        setMessages(msgData || []);
      }
    } catch (err) {
      console.error('Error loading SMS conversation:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  }

  async function handleSend() {
    if (!newMessage.trim() || !leadPhone) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-sms-brevo', {
        body: {
          to: leadPhone,
          content: newMessage.trim(),
          lead_id: leadId,
          tag: 'crm-manual',
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Echec envoi');
      }

      // Get or create conversation and add message locally
      let convId = conversation?.id;
      if (!convId) {
        const { data: newConvId } = await supabase.rpc('get_or_create_sms_conversation', {
          p_phone_number: leadPhone,
          p_lead_id: leadId,
        });
        convId = newConvId;
      }

      if (convId) {
        await supabase.from('sms_messages').insert({
          conversation_id: convId,
          lead_id: leadId,
          direction: 'outbound',
          from_number: '+33744410598',
          to_number: leadPhone,
          content: newMessage.trim(),
          status: 'sent',
          provider_message_id: data.messageId,
          is_automated: false,
          delivered_at: new Date().toISOString(),
        });
      }

      setNewMessage('');
      await loadConversation();
    } catch (err: any) {
      console.error('SMS send error:', err);
      alert('Erreur: ' + (err.message || 'Impossible d\'envoyer le SMS'));
    } finally {
      setSending(false);
    }
  }

  async function handleAISuggest() {
    setAiGenerating(true);
    setShowAISuggest(true);

    try {
      const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');

      if (lastInbound?.ai_suggested_reply) {
        setNewMessage(lastInbound.ai_suggested_reply);
        setAiGenerating(false);
        return;
      }

      const context = messages.slice(-5).map(m =>
        `${m.direction === 'inbound' ? 'Client' : 'Nous'}: ${m.content}`
      ).join('\n');

      const { data, error } = await supabase.functions.invoke('generate-inbox-response', {
        body: {
          context: `Conversation SMS avec ${leadFirstName}. Notre societe: TaxiAssur (courtier assurance taxi). Genere une reponse SMS courte (max 160 chars), professionnelle et engageante.`,
          message: context || `Genere un SMS de suivi pour ${leadFirstName} concernant son assurance taxi.`,
          max_length: 160,
        },
      });

      if (data?.response) {
        setNewMessage(data.response.substring(0, 160));
      }
    } catch (err) {
      console.error('AI suggest error:', err);
    } finally {
      setAiGenerating(false);
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return `Hier ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  if (!leadPhone) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700">Conversation SMS</h3>
        </div>
        <p className="text-sm text-gray-500">Aucun numero de telephone renseigne pour ce lead.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: '600px' }}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">SMS - {leadFirstName}</h3>
            <p className="text-xs text-green-100">{leadPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation?.unread_count ? (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {conversation.unread_count}
            </span>
          ) : null}
          <button
            onClick={loadConversation}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-[200px] max-h-[380px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Aucun SMS echange</p>
            <p className="text-xs text-gray-400 mt-1">Envoyez le premier message</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${msg.direction === 'outbound' ? 'order-2' : ''}`}>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.direction === 'outbound'
                      ? 'bg-green-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 px-1 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                  {msg.is_automated && (
                    <Zap className="h-3 w-3 text-amber-500" title="Automatique" />
                  )}
                  {msg.direction === 'inbound' && msg.ai_analysis && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      msg.ai_analysis.urgency === 'haute' ? 'bg-red-100 text-red-700' :
                      msg.ai_analysis.sentiment === 'positif' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {msg.ai_analysis.intent}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {formatTime(msg.created_at)}
                  </span>
                  {msg.direction === 'outbound' && msg.status === 'failed' && (
                    <AlertCircle className="h-3 w-3 text-red-500" title="Echec" />
                  )}
                </div>

                {/* AI suggested reply for inbound */}
                {msg.direction === 'inbound' && msg.ai_suggested_reply && msg === messages[messages.length - 1] && (
                  <button
                    onClick={() => setNewMessage(msg.ai_suggested_reply!)}
                    className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    Utiliser suggestion IA
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.substring(0, 160))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Tapez votre SMS..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <span className={`absolute bottom-1 right-2 text-[10px] ${newMessage.length > 140 ? 'text-amber-600' : 'text-gray-400'}`}>
              {newMessage.length}/160
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={handleAISuggest}
              disabled={aiGenerating}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Suggestion IA"
            >
              {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSConversationPanel;
