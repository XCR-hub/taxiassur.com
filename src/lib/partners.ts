import { supabase } from './supabase';
import { Prospect, Consent, Directory, Outreach } from './schema';

export async function getProspects(): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveProspect(prospect: Prospect): Promise<void> {
  const { error } = await supabase
    .from('prospects')
    .upsert(prospect);

  if (error) throw error;
}

export async function saveConsent(consent: Consent): Promise<void> {
  const { error } = await supabase
    .from('consents')
    .insert(consent);

  if (error) throw error;
}

export async function getOutreaches(): Promise<Outreach[]> {
  const { data, error } = await supabase
    .from('outreaches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveOutreach(outreach: Outreach): Promise<void> {
  const { error } = await supabase
    .from('outreaches')
    .upsert(outreach);

  if (error) throw error;
}

export async function sendOutreach(outreachId: string): Promise<void> {
  const { error } = await supabase
    .from('outreaches')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', outreachId);

  if (error) throw error;
}

export async function getDirectories(): Promise<Directory[]> {
  const { data, error } = await supabase
    .from('directories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function submitToDirectory(directoryId: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('directory_submissions')
    .insert({
      directory_id: directoryId,
      status: 'pending',
      data,
      submitted_at: new Date().toISOString()
    });

  if (error) throw error;
}
