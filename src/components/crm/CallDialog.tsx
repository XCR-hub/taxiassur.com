import React, { useState, useEffect, useRef } from 'react';
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
  Play,
  Pause,
  Circle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  onCallCompleted?: () => void;
}

export const CallDialog: React.FC<CallDialogProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadPhone,
  leadEmail,
  onCallCompleted
}) => {
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'active' | 'ended'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  useEffect(() => {
    if (callStatus === 'active') {
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

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setCallStatus('idle');
    setCallDuration(0);
    setIsRecording(false);
    setNotes('');
    setRecordingStartTime(null);
    audioChunksRef.current = [];
  };

  const startCall = async () => {
    setCallStatus('ringing');

    // Simulate ringing for 2 seconds
    setTimeout(() => {
      setCallStatus('active');
    }, 2000);
  };

  const endCall = () => {
    if (isRecording) {
      stopRecording();
    }
    setCallStatus('ended');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStartTime(new Date());
    } catch (err) {
      logger.error('Error starting recording:', err);
      alert('Impossible de démarrer l\'enregistrement. Vérifiez les permissions du microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveCall = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();

      // Save call interaction
      const interactionData: any = {
        lead_id: leadId,
        type: 'call',
        subject: 'Appel téléphonique',
        content: notes || 'Appel sans notes',
        created_by: user?.id,
        metadata: {
          call_duration: callDuration,
          recording_available: isRecording || audioChunksRef.current.length > 0,
          recording_start_time: recordingStartTime?.toISOString()
        }
      };

      const { data: interaction, error: interactionError } = await supabase
        .from('crm_interactions')
        .insert(interactionData)
        .select()
        .single();

      if (interactionError) throw interactionError;

      // If we have audio data, save it
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileName = `call_${leadId}_${Date.now()}.webm`;

        // Upload to Supabase Storage (assuming a bucket exists)
        const { error: uploadError } = await supabase.storage
          .from('call-recordings')
          .upload(fileName, audioBlob);

        if (uploadError) {
          logger.error('Error uploading recording:', uploadError);
          // Don't fail the whole save if upload fails
        } else {
          // Update interaction with recording URL
          await supabase
            .from('crm_interactions')
            .update({
              metadata: {
                ...interactionData.metadata,
                recording_url: fileName
              }
            })
            .eq('id', interaction.id);
        }
      }

      onCallCompleted?.();
      onClose();
      cleanup();
    } catch (err) {
      logger.error('Error saving call:', err);
      alert('Erreur lors de l\'enregistrement de l\'appel');
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
              {callStatus === 'ringing' && 'Appel en cours...'}
              {callStatus === 'active' && 'Appel en cours'}
              {callStatus === 'ended' && 'Appel terminé'}
            </h2>
            <p className="text-blue-100 text-sm">
              {callStatus === 'idle' && 'Démarrer un appel téléphonique'}
              {callStatus === 'ringing' && 'Sonnerie...'}
              {callStatus === 'active' && 'Communication établie'}
              {callStatus === 'ended' && 'Ajouter vos notes'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Lead Info */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-300">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{leadName}</span>
            </div>
            {leadPhone && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{leadPhone}</span>
              </div>
            )}
            {leadEmail && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{leadEmail}</span>
              </div>
            )}
          </div>

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

          {/* Recording Status */}
          {callStatus === 'active' && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }
                `}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Arrêter l'enregistrement
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>

              {isRecording && (
                <div className="flex items-center gap-2 text-red-500">
                  <Circle className="w-3 h-3 fill-current animate-pulse" />
                  <span className="text-sm font-medium">REC</span>
                </div>
              )}
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
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length} caractères
              </p>
            </div>
          )}

          {/* Call Actions */}
          <div className="space-y-3">
            {callStatus === 'idle' && (
              <button
                onClick={startCall}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-lg transition-all shadow-lg shadow-green-500/30"
              >
                <Phone className="w-5 h-5" />
                Démarrer l'appel
              </button>
            )}

            {callStatus === 'ringing' && (
              <div className="text-center">
                <div className="inline-flex items-center gap-3 text-blue-400">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                  <span className="font-medium">Sonnerie en cours...</span>
                </div>
              </div>
            )}

            {callStatus === 'active' && (
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
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
              <strong>Rappel :</strong> Contactez le nouveau lead dans les 15 minutes pour maximiser vos chances de conversion (x7 de taux de réussite).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
