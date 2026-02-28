import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeDocumentsOptions {
  leadId?: string;
  onDocumentChange?: () => void;
  onDocumentInsert?: (document: any) => void;
  onDocumentUpdate?: (document: any) => void;
  onDocumentDelete?: (documentId: string) => void;
  enabled?: boolean;
}

export function useRealtimeDocuments(options: UseRealtimeDocumentsOptions = {}) {
  const {
    leadId,
    onDocumentChange,
    onDocumentInsert,
    onDocumentUpdate,
    onDocumentDelete,
    enabled = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const handleDocumentChange = useCallback(() => {
    if (!isMountedRef.current) return;

    logger.info('📄 Document change detected, refreshing...');
    onDocumentChange?.();
  }, [onDocumentChange]);

  const handleInsert = useCallback((payload: any) => {
    if (!isMountedRef.current) return;

    const newDocument = payload.new;
    logger.info('📄 New document inserted:', newDocument);

    // Si on filtre par leadId et que le document n'est pas pour ce lead, ignorer
    if (leadId && newDocument.lead_id !== leadId) {
      return;
    }

    onDocumentInsert?.(newDocument);
    handleDocumentChange();
  }, [leadId, onDocumentInsert, handleDocumentChange]);

  const handleUpdate = useCallback((payload: any) => {
    if (!isMountedRef.current) return;

    const updatedDocument = payload.new;
    logger.info('📄 Document updated:', updatedDocument);

    // Si on filtre par leadId et que le document n'est pas pour ce lead, ignorer
    if (leadId && updatedDocument.lead_id !== leadId) {
      return;
    }

    onDocumentUpdate?.(updatedDocument);
    handleDocumentChange();
  }, [leadId, onDocumentUpdate, handleDocumentChange]);

  const handleDelete = useCallback((payload: any) => {
    if (!isMountedRef.current) return;

    const deletedDocument = payload.old;
    logger.info('📄 Document deleted:', deletedDocument);

    // Si on filtre par leadId et que le document n'est pas pour ce lead, ignorer
    if (leadId && deletedDocument.lead_id !== leadId) {
      return;
    }

    onDocumentDelete?.(deletedDocument.id);
    handleDocumentChange();
  }, [leadId, onDocumentDelete, handleDocumentChange]);

  useEffect(() => {
    if (!enabled) {
      logger.info('🔌 Realtime documents disabled');
      return;
    }

    isMountedRef.current = true;

    // Créer le channel de subscription
    const channelName = leadId
      ? `documents-realtime-${leadId}`
      : 'documents-realtime-all';

    logger.info(`🔌 Subscribing to ${channelName}...`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_lead_documents',
          ...(leadId && { filter: `lead_id=eq.${leadId}` })
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_lead_documents',
          ...(leadId && { filter: `lead_id=eq.${leadId}` })
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'crm_lead_documents',
          ...(leadId && { filter: `lead_id=eq.${leadId}` })
        },
        handleDelete
      )
      .subscribe((status) => {
        if (!isMountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          logger.info(`✅ Realtime documents subscribed (${channelName})`);
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('❌ Realtime documents subscription error');
        } else if (status === 'TIMED_OUT') {
          logger.error('⏱️ Realtime documents subscription timed out');
        } else if (status === 'CLOSED') {
          logger.info('🔌 Realtime documents subscription closed');
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      logger.info(`🔌 Unsubscribing from ${channelName}`);
      isMountedRef.current = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, leadId, handleInsert, handleUpdate, handleDelete]);

  return {
    isConnected: channelRef.current !== null
  };
}
