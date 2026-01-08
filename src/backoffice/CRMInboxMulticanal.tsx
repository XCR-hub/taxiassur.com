import React, { useEffect, useState } from 'react';
import { Mail, MessageSquare, Phone, Filter, CheckCircle, Archive, Bot } from 'lucide-react';
import { channelEngineService, InboxMessage, CommunicationChannel } from '@/lib/crm-channel-engine';
import { MessagePreview } from '@/components/crm/MessagePreview';
import BackButton from './BackButton';

const CRMInboxMulticanal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'requires_action'>('all');
  const [channelFilter, setChannelFilter] = useState<CommunicationChannel | 'all'>('all');

  useEffect(() => {
    loadMessages();
  }, [filter, channelFilter]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filter === 'unread') filters.status = 'unread';
      if (filter === 'requires_action') filters.requiresAction = true;
      if (channelFilter !== 'all') filters.channel = channelFilter;

      const data = await channelEngineService.getInbox(filters);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async (message: InboxMessage) => {
    setSelectedMessage(message);
    if (message.status === 'unread') {
      await channelEngineService.markAsRead(message.id);
      await loadMessages();
    }
  };

  const handleArchive = async (messageId: string) => {
    await channelEngineService.archiveMessage(messageId);
    setSelectedMessage(null);
    await loadMessages();
  };

  const handleGenerateResponse = async () => {
    if (!selectedMessage) return;
    const response = await channelEngineService.generateAIResponse(selectedMessage.id);
    console.log('AI Response:', response);
  };

  const stats = {
    total: messages.length,
    unread: messages.filter(m => m.status === 'unread').length,
    requiresAction: messages.filter(m => m.requires_action).length
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-6 py-4">
        <BackButton />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inbox Multicanal</h1>
            <p className="text-gray-600">Tous vos messages en un seul endroit</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
              <div className="text-xs text-blue-700">Non lus</div>
            </div>
            <div className="text-center px-4 py-2 bg-red-100 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.requiresAction}</div>
              <div className="text-xs text-red-700">Nécessite action</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({stats.total})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non lus ({stats.unread})
            </button>
            <button
              onClick={() => setFilter('requires_action')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'requires_action'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Action requise ({stats.requiresAction})
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            {(['all', 'email', 'sms', 'whatsapp'] as const).map((channel) => (
              <button
                key={channel}
                onClick={() => setChannelFilter(channel)}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  channelFilter === channel
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {channel === 'all' && 'Tous'}
                {channel === 'email' && <Mail size={16} />}
                {channel === 'sms' && <MessageSquare size={16} />}
                {channel === 'whatsapp' && <MessageSquare size={16} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r bg-white overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun message
            </div>
          ) : (
            messages.map((message) => (
              <MessagePreview
                key={message.id}
                message={message as any}
                onClick={() => handleMessageClick(message)}
                isSelected={selectedMessage?.id === message.id}
              />
            ))
          )}
        </div>

        <div className="flex-1 bg-gray-50 flex flex-col">
          {selectedMessage ? (
            <>
              <div className="bg-white border-b p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedMessage.lead_name}</h2>
                    <p className="text-gray-600">{selectedMessage.snippet}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleArchive(selectedMessage.id)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <Archive size={16} />
                      Archiver
                    </button>
                    <button
                      onClick={() => channelEngineService.markAsReplied(selectedMessage.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Marquer répondu
                    </button>
                  </div>
                </div>

                {selectedMessage.sentiment && (
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedMessage.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    selectedMessage.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    Sentiment: {selectedMessage.sentiment}
                  </div>
                )}
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {selectedMessage.ai_summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Bot size={16} />
                      Résumé IA
                    </h3>
                    <p className="text-blue-800 text-sm">{selectedMessage.ai_summary}</p>
                  </div>
                )}

                {selectedMessage.ai_suggested_response && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <Bot size={16} />
                      Réponse suggérée par l'IA
                    </h3>
                    <p className="text-purple-800 text-sm whitespace-pre-wrap">
                      {selectedMessage.ai_suggested_response}
                    </p>
                    <button
                      onClick={handleGenerateResponse}
                      className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Utiliser cette réponse
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Message complet</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.snippet}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-t p-6">
                <textarea
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  rows={4}
                  placeholder="Votre réponse..."
                />
                <div className="flex justify-between">
                  <button
                    onClick={handleGenerateResponse}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
                  >
                    <Bot size={16} />
                    Générer avec IA
                  </button>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Envoyer
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sélectionnez un message
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRMInboxMulticanal;
