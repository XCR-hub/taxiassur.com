import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Lead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  status: string;
  pipeline_stage?: string;
  created_at: string;
  updated_at: string;
}

export function useRealtimeLeads(refreshInterval: number = 30000) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Charger les leads
  const loadLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setLeads(data);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }, []);

  // Charger initialement
  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Refresh automatique toutes les X secondes
  useEffect(() => {
    const interval = setInterval(() => {
      loadLeads();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [loadLeads, refreshInterval]);

  // Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_leads'
        },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads(prev => [newLead, ...prev]);
          setLastUpdate(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_leads'
        },
        (payload) => {
          const updatedLead = payload.new as Lead;
          setLeads(prev =>
            prev.map(lead => lead.id === updatedLead.id ? updatedLead : lead)
          );
          setLastUpdate(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'crm_leads'
        },
        (payload) => {
          const deletedLead = payload.old as Lead;
          setLeads(prev => prev.filter(lead => lead.id !== deletedLead.id));
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    leads,
    loading,
    lastUpdate,
    refresh: loadLeads
  };
}
