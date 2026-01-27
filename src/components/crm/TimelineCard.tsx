import React, { useState } from 'react';
import { MessageSquare, Maximize2, X, Mail, Phone as PhoneIcon, MessageCircle } from 'lucide-react';
import CommunicationTimeline from './CommunicationTimeline';

interface TimelineCardProps {
  leadId: string;
  leadEmail: string;
  leadPhone: string;
  messageCount: number;
  onReply: (emailId: string, subject: string, originalContent: string) => void;
  onNewEmail: () => void;
  onNewSMS: () => void;
  onNewWhatsApp: () => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({
  leadId,
  leadEmail,
  leadPhone,
  messageCount,
  onReply,
  onNewEmail,
  onNewSMS,
  onNewWhatsApp
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-blue-500" size={18} />
            <h3 className="text-sm font-bold text-gray-900">Timeline échanges</h3>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
            title="Ouvrir en plein écran"
          >
            <Maximize2 size={14} className="text-gray-600" />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-900">{messageCount}</span> interaction(s)
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onNewEmail}
            className="flex flex-col items-center gap-1 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
          >
            <Mail size={14} className="text-blue-600" />
            <span className="text-[10px] font-medium text-blue-700">Email</span>
          </button>
          <button
            onClick={onNewSMS}
            className="flex flex-col items-center gap-1 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all"
          >
            <MessageCircle size={14} className="text-purple-600" />
            <span className="text-[10px] font-medium text-purple-700">SMS</span>
          </button>
          <button
            onClick={onNewWhatsApp}
            className="flex flex-col items-center gap-1 p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-all"
          >
            <PhoneIcon size={14} className="text-green-600" />
            <span className="text-[10px] font-medium text-green-700">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Modal plein écran */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="text-blue-500" size={20} />
                Timeline des échanges
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <CommunicationTimeline
                leadId={leadId}
                leadEmail={leadEmail}
                leadPhone={leadPhone}
                onReply={onReply}
                onNewEmail={onNewEmail}
                onNewSMS={onNewSMS}
                onNewWhatsApp={onNewWhatsApp}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimelineCard;
