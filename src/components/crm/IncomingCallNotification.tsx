import React, { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, User, PhoneIncoming } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { telephonyService, IncomingCallInfo } from '@/lib/telephony-service';
import { logger } from '@/lib/logger';

interface IncomingCallNotificationProps {
  onNavigateToLead?: (leadId: string) => void;
}

interface IncomingCallData {
  callInfo: IncomingCallInfo;
  leadId?: string;
  leadName?: string;
  from: string;
}

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  onNavigateToLead
}) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  useEffect(() => {
    // Listen for incoming calls via WebRTC
    const unsubscribe = telephonyService.onIncomingCall(async (info) => {
      logger.info('Incoming call notification:', info.from);

      let leadName: string | undefined;
      let leadId: string | undefined;

      // Lookup lead by phone
      try {
        const phoneClean = info.from.replace(/^\+33/, '0').replace(/\s/g, '');
        const { data: leads } = await supabase
          .from('crm_leads')
          .select('id, first_name, last_name')
          .or(`phone.eq.${info.from},phone.eq.${phoneClean}`)
          .limit(1);

        if (leads && leads.length > 0) {
          leadId = leads[0].id;
          leadName = `${leads[0].first_name || ''} ${leads[0].last_name || ''}`.trim();
        }
      } catch (err) {
        logger.error('Lead lookup failed:', err);
      }

      setIncomingCall({ callInfo: info, leadId, leadName, from: info.from });
      setCallAccepted(false);

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('Appel entrant', {
          body: leadName ? `${leadName} (${info.from})` : info.from,
          icon: '/favicon.ico',
        });
      }
    });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return unsubscribe;
  }, []);

  // Also listen via Supabase Realtime for redundancy
  useEffect(() => {
    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_event_notifications',
          filter: 'type=eq.incoming_call',
        },
        (payload) => {
          const data = payload.new as any;
          if (data.payload) {
            logger.info('Realtime incoming call event:', data.payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    telephonyService.acceptIncomingCall(incomingCall.callInfo.call);
    setCallAccepted(true);

    if (incomingCall.leadId && onNavigateToLead) {
      onNavigateToLead(incomingCall.leadId);
    }

    setTimeout(() => setIncomingCall(null), 500);
  }, [incomingCall, onNavigateToLead]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    telephonyService.rejectIncomingCall(incomingCall.callInfo.call);
    setIncomingCall(null);
  }, [incomingCall]);

  if (!incomingCall || callAccepted) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-gray-900 border border-green-500/50 rounded-xl shadow-2xl shadow-green-500/20 p-5 w-80">
        {/* Pulsing indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <PhoneIncoming className="w-6 h-6 text-white" />
            </div>
            <div className="absolute inset-0 w-12 h-12 bg-green-500 rounded-full animate-ping opacity-30" />
          </div>
          <div>
            <p className="text-green-400 text-sm font-semibold uppercase tracking-wide">
              Appel entrant
            </p>
            <p className="text-white font-bold text-lg">
              {incomingCall.leadName || incomingCall.from}
            </p>
          </div>
        </div>

        {/* Caller info */}
        {incomingCall.leadName && (
          <div className="flex items-center gap-2 mb-4 text-gray-300 text-sm bg-gray-800 rounded-lg px-3 py-2">
            <User className="w-4 h-4 text-gray-500" />
            <span>{incomingCall.from}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={rejectCall}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            Refuser
          </button>
          <button
            onClick={acceptCall}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-all"
          >
            <Phone className="w-4 h-4" />
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
};
