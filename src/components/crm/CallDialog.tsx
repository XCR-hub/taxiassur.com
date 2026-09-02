import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  X,
  Clock,
  User,
  Mail,
  FileText,
  Save,
  PhoneOutgoing,
  Loader2
} from 'lucide-react';
import { nativeAdminSession } from '@/lib/native-admin-auth';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { logger } from '@/lib/logger';
import { telephonyService, TelephonyStatus } from '@/lib/telephony-service';

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  onCallCompleted?: () => void;
}

const CALLER_PHONE_DISPLAY = '07 44 41 05 98';

export const CallDialog: React.FC<CallDialogProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadPhone,
  leadEmail,
  onCallCompleted
}) => {
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [deviceStatus, setDeviceStatus] = useState<TelephonyStatus>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartRef = useRef<Date | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallStatus('idle');
    setCallDuration(0);
    setIsMuted(false);
    setNotes('');
    callStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    // Initialize Twilio device when dialog opens
    const initDevice = async () => {
      if (telephonyService.getStatus() === 'disconnected') {
        setInitializing(true);
        try {
          await telephonyService.initialize();
        } catch (err) {
          logger.error('Failed to initialize telephony:', err);
          toast.error('Impossible de se connecter au service telephonique. Verifiez votre connexion.');
        } finally {
          setInitializing(false);
        }
      }
    };

    initDevice();

    const unsubscribe = telephonyService.onStatusChange((status) => {
      setDeviceStatus(status);
      if (status === 'on-call') {
        setCallStatus('active');
      } else if (status === 'ready') {
        setCallStatus((current) => current === 'active' ? 'ended' : current);
      }
    });

    return unsubscribe;
  }, [isOpen, cleanup]);

  useEffect(() => {
    if (callStatus === 'active') {
      callStartRef.current = new Date();
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  const startCall = async () => {
    if (!leadPhone) return;

    setCallStatus('connecting');
    try {
      await telephonyService.makeCall(leadPhone);
    } catch (err: any) {
      logger.error('Error starting call:', err);
      toast.error('Impossible de lancer l\'appel: ' + (err.message || 'Erreur inconnue'));
      setCallStatus('idle');
    }
  };

  const endCall = () => {
    telephonyService.hangUp();
    setCallStatus('ended');
  };

  const toggleMute = () => {
    const muted = telephonyService.toggleMute();
    setIsMuted(muted);
  };

  const saveCall = async () => {
    try {
      setSaving(true);

      const { user } = await nativeAdminSession();
      if (!user) throw new Error('User not authenticated');

      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(leadId)}/timeline`, { method: 'POST', body: JSON.stringify({
        type: 'call_outgoing',
        channel: 'phone',
        direction: 'outbound',
        subject: 'Appel sortant',
        content: notes || `Duree: ${Math.floor(callDuration / 60)} min ${callDuration % 60} sec`,
        status: 'completed',
        metadata: {
          from: '+33744410598',
          to: leadPhone || 'unknown',
          duration: callDuration,
          talk_time: callDuration,
          via: 'webrtc',
        },
      }) });

      toast.success('Appel enregistre avec succes');
      onCallCompleted?.();
      onClose();
      cleanup();
    } catch (err: any) {
      logger.error('Error saving call:', err);
      toast.error('Erreur lors de l\'enregistrement: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isDeviceReady = deviceStatus === 'ready' || deviceStatus === 'on-call';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 relative">
          <button
            onClick={() => {
              if (callStatus === 'active') {
                if (!confirm('Voulez-vous vraiment fermer sans sauvegarder l\'appel en cours ?')) {
                  return;
                }
                telephonyService.hangUp();
              }
              onClose();
              cleanup();
            }}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-3">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {callStatus === 'idle' && 'Appeler le client'}
              {callStatus === 'connecting' && 'Connexion...'}
              {callStatus === 'active' && 'Appel en cours'}
              {callStatus === 'ended' && 'Appel termine'}
            </h2>
            <p className="text-blue-100 text-sm">
              {callStatus === 'idle' && 'Appel via casque WebRTC'}
              {callStatus === 'connecting' && 'Etablissement de la connexion'}
              {callStatus === 'active' && 'Communication en cours via casque'}
              {callStatus === 'ended' && 'Ajoutez vos notes avant de sauvegarder'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Lead Info */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-200">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{leadName}</span>
            </div>
            {leadPhone && (
              <div className="flex items-center gap-2 text-gray-200 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{leadPhone}</span>
              </div>
            )}
            {leadEmail && (
              <div className="flex items-center gap-2 text-gray-200 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{leadEmail}</span>
              </div>
            )}
          </div>

          {/* Caller Info */}
          {callStatus === 'idle' && (
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <PhoneOutgoing className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium text-sm">Appel depuis votre casque</p>
                  <p className="text-blue-300 font-mono text-lg">{CALLER_PHONE_DISPLAY}</p>
                </div>
              </div>
              <p className="text-blue-200/70 text-xs mt-3">
                L'appel passera directement via votre casque en WebRTC. Assurez-vous que votre casque est connecte.
              </p>
              {initializing && (
                <div className="flex items-center gap-2 mt-3 text-blue-300 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connexion au service telephonique...
                </div>
              )}
              {!initializing && !isDeviceReady && deviceStatus !== 'disconnected' && (
                <div className="text-yellow-300 text-xs mt-3">
                  Statut: {deviceStatus}
                </div>
              )}
            </div>
          )}

          {/* Timer */}
          {(callStatus === 'active' || callStatus === 'ended') && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-gray-800 rounded-full px-6 py-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-mono font-bold text-white">
                  {formatDuration(callDuration)}
                </span>
              </div>
            </div>
          )}

          {/* Connecting animation */}
          {callStatus === 'connecting' && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Connexion en cours...</p>
            </div>
          )}

          {/* Mute Control */}
          {callStatus === 'active' && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleMute}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${isMuted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }
                `}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Micro coupe
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Micro actif
                  </>
                )}
              </button>
            </div>
          )}

          {/* Notes */}
          {(callStatus === 'active' || callStatus === 'ended') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes de l'appel
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez des notes sur cet appel..."
                rows={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {notes.length} caracteres
              </p>
            </div>
          )}

          {/* Call Actions */}
          <div className="space-y-3">
            {callStatus === 'idle' && (
              <button
                onClick={startCall}
                disabled={!leadPhone || initializing || (!isDeviceReady && deviceStatus !== 'disconnected')}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-lg transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="w-5 h-5" />
                Appeler {leadPhone || '(pas de numero)'}
              </button>
            )}

            {(callStatus === 'connecting' || callStatus === 'active') && (
              <button
                onClick={endCall}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition-all shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-5 h-5" />
                Raccrocher
              </button>
            )}

            {callStatus === 'ended' && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onClose();
                    cleanup();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={saveCall}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Sauvegarder
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Info Message */}
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
            <p className="text-yellow-200 text-xs">
              <strong>Rappel :</strong> Contactez le nouveau lead dans les 15 minutes pour maximiser vos chances de conversion (x7 de taux de reussite).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
