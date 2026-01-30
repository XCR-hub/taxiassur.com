import React, { useEffect, useState } from 'react';
import {
  Mail,
  RefreshCw,
  Star,
  User,
  Calendar,
  Paperclip,
  Tag,
  Search,
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  CheckCircle,
  Send,
  Archive,
  AlertCircle,
  AlertTriangle,
  Settings,
  UserPlus,
  History,
  Clock,
  Link as LinkIcon,
  X,
  Trash2,
  ArchiveX,
  FolderPlus,
  Folder,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmailMessage {
  id: string;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  subject: string;
  body_text: string;
  body_html: string;
  received_at: string;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  is_starred: boolean;
  classification: string | null;
  confidence_score: number | null;
  lead_id: string | null;
  attachments: any[];
  auto_matched: boolean;
  email_status?: 'active' | 'archived' | 'deleted' | 'spam';
  folder_id?: string | null;
  deleted_at?: string | null;
  archived_at?: string | null;
}

interface EmailFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  display_order: number;
  parent_folder_id: string | null;
}

interface ExtractedLeadInfo {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
}

interface LeadSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  status: string;
}

// Décoder le contenu encodé en quoted-printable ou base64
const decodeEmailContent = (text: string): string => {
  if (!text) return '';

  let decoded = text;

  // Décoder les caractères quoted-printable (=E9 pour é, =C3=A9 pour é en UTF-8, etc.)
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Corriger les problèmes courants d'encodage UTF-8 double
  const utf8Fixes: Record<string, string> = {
    'Ã©': 'é',
    'Ã¨': 'è',
    'Ãª': 'ê',
    'Ã§': 'ç',
    'Ã ': 'à',
    'Ã¢': 'â',
    'Ã´': 'ô',
    'Ã®': 'î',
    'Ã¹': 'ù',
    'Ã»': 'û',
    'Ã«': 'ë',
    'Ã¯': 'ï',
    'Ã¼': 'ü',
    'Ã‰': 'É',
    'Ã€': 'À',
    'â€™': "'",
    'â€œ': '"',
    'â€': '"',
    'â€¢': '•',
    'â€"': '—',
    'â‚¬': '€',
  };

  for (const [wrong, correct] of Object.entries(utf8Fixes)) {
    decoded = decoded.replace(new RegExp(wrong, 'g'), correct);
  }

  // Décoder les entités HTML
  const textarea = document.createElement('textarea');
  textarea.innerHTML = decoded;
  decoded = textarea.value;

  return decoded;
};

const cleanEmailPreview = (text: string): string => {
  if (!text) return '';

  // D'abord décoder l'UTF-8
  let cleaned = decodeEmailContent(text);

  // Nettoyer les balises MIME
  cleaned = cleaned
    .replace(/--[0-9A-F]+_NextPart_[0-9A-F._]+/g, '')
    .replace(/Content-Type:.*?(?:\r?\n|$)/gi, '')
    .replace(/Content-Transfer-Encoding:.*?(?:\r?\n|$)/gi, '')
    .replace(/charset="?[^"\r\n]+"?/gi, '')
    .replace(/boundary="?[^"\r\n]+"?/gi, '')
    .replace(/={20,}/g, '')
    .replace(/\r?\n\s*\r?\n/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim();

  return cleaned;
};

// Fonction ULTRA-RADICALE : Convertir HTML en texte brut lisible
const htmlToReadableText = (html: string): string => {
  if (!html) return '[Contenu vide]';

  try {
    // Méthode 1: Parser le HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Supprimer les scripts et styles
    doc.querySelectorAll('script, style, head').forEach(el => el.remove());

    // Remplacer les éléments de bloc par des sauts de ligne
    doc.querySelectorAll('p, div, br, hr, h1, h2, h3, h4, h5, h6, li, tr').forEach(el => {
      try {
        const textNode = document.createTextNode('\n');
        el.after(textNode);
      } catch (e) {
        // Ignorer les erreurs
      }
    });

    // Extraire uniquement le texte
    let text = doc.body.textContent || doc.body.innerText || '';

    // Si le texte est vide, essayer une méthode alternative
    if (!text || text.trim() === '') {
      console.warn('Texte extrait vide, utilisation du fallback');
      text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .trim();
    }

    // Nettoyer le texte
    text = text
      .replace(/\n{3,}/g, '\n\n')  // Max 2 sauts de ligne consécutifs
      .replace(/[ \t]{2,}/g, ' ')   // Max 1 espace consécutif
      .replace(/^\s+|\s+$/gm, '')   // Trim chaque ligne
      .trim();

    return text || '[Impossible d\'extraire le texte]';
  } catch (error) {
    console.error('Erreur lors de la conversion HTML vers texte:', error);

    // Fallback ultime: suppression brutale des balises HTML
    try {
      const fallbackText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s{2,}/g, ' ')
        .trim();

      return fallbackText || '[Erreur de conversion]';
    } catch (e) {
      return html.substring(0, 1000) + '...';
    }
  }
};

// Fonction ultra-agressive pour supprimer TOUS les styles inline (backup)
const stripAllInlineStyles = (html: string): string => {
  if (!html) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const allElements = doc.querySelectorAll('*');

    allElements.forEach(element => {
      element.removeAttribute('style');
      element.removeAttribute('bgcolor');
      element.removeAttribute('background');
      element.removeAttribute('color');
      element.removeAttribute('class');
    });

    return doc.body.innerHTML;
  } catch (error) {
    console.error('Erreur lors du nettoyage du HTML:', error);
    return html
      .replace(/style\s*=\s*["'][^"']*["']/gi, '')
      .replace(/bgcolor\s*=\s*["']?[^"'\s>]*["']?/gi, '')
      .replace(/background\s*=\s*["']?[^"'\s>]*["']?/gi, '')
      .replace(/color\s*=\s*["']?[^"'\s>]*["']?/gi, '')
      .replace(/class\s*=\s*["'][^"']*["']/gi, '');
  }
};

const extractLeadInfoFromEmail = (email: EmailMessage): ExtractedLeadInfo | null => {
  const text = email.body_text || '';
  const html = email.body_html || '';
  const content = text + ' ' + html;

  if (!email.subject?.toLowerCase().includes('nouveau lead') &&
      !email.subject?.toLowerCase().includes('new lead') &&
      !content.toLowerCase().includes('nouveau lead')) {
    return null;
  }

  const info: ExtractedLeadInfo = {};

  const emailMatch = content.match(/(?:EMAIL|E-mail|Courriel)[:\s]*(?:<[^>]*>)*\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) info.email = emailMatch[1].toLowerCase();

  const phoneMatch = content.match(/(?:TELEPHONE|Tel|Phone|Portable|Mobile)[:\s]*(?:<[^>]*>)*\s*(0[1-9][0-9]{8,9})/i);
  if (phoneMatch) info.phone = phoneMatch[1];

  const nameMatch = content.match(/(?:NOM COMPLET|Nom|Name)[:\s]*(?:<[^>]*>)*\s*([A-Za-zÀ-ÿ\s-]+?)(?:<|$|\n)/i);
  if (nameMatch) info.name = nameMatch[1].trim();

  const cityMatch = content.match(/(?:VILLE|City|Localisation)[:\s]*(?:<[^>]*>)*\s*([A-Za-zÀ-ÿ\s-]+?)(?:<|$|\n)/i);
  if (cityMatch) info.city = cityMatch[1].trim();

  const subjectMatch = email.subject?.match(/Nouveau Lead\s*:\s*([^-]+)\s*-\s*(.+)/i);
  if (subjectMatch) {
    if (!info.name) info.name = subjectMatch[1].trim();
    if (!info.city) info.city = subjectMatch[2].trim();
  }

  return (info.email || info.phone || info.name) ? info : null;
};

// Extraire toutes les adresses emails du contenu de l'email
const extractAllEmailsFromContent = (email: EmailMessage): string[] => {
  const text = email.body_text || '';
  const html = email.body_html || '';
  const content = `${text} ${html} ${email.subject || ''}`;

  // Regex pour extraire les emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = content.match(emailRegex) || [];

  // Filtrer les emails de taxiassur pour ne garder que les emails des prospects
  const uniqueEmails = [...new Set(matches)]
    .filter(e => !e.toLowerCase().includes('taxiassur'))
    .filter(e => e !== email.from_email); // Exclure l'expéditeur déjà connu

  // Ajouter l'expéditeur en premier
  return [email.from_email, ...uniqueEmails];
};

const CRMInboxMulticanal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [foundLeadId, setFoundLeadId] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedLeadInfo | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred' | 'leads' | 'archived'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [stats, setStats] = useState({ total: 0, unread: 0, leads: 0, starred: 0, archived: 0 });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [autoSyncActive, setAutoSyncActive] = useState(false);
  const [lastAutoSync, setLastAutoSync] = useState<string | null>(null);

  // États pour l'assignation manuelle
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [emailsFoundInContent, setEmailsFoundInContent] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<LeadSearchResult[]>([]);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [searchingLeads, setSearchingLeads] = useState(false);

  // États pour la réponse
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    loadMessages();
    loadStats();
    checkAutoSyncStatus();
    const interval = setInterval(() => {
      loadMessages();
      loadStats();
      checkAutoSyncStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, directionFilter, searchQuery, sortBy]);

  useEffect(() => {
    const findLeadFromNotification = async () => {
      setFoundLeadId(null);
      setExtractedInfo(null);

      if (!selectedMessage) return;

      if (selectedMessage.lead_id) {
        setFoundLeadId(selectedMessage.lead_id);
        return;
      }

      const info = extractLeadInfoFromEmail(selectedMessage);
      if (!info) return;

      setExtractedInfo(info);

      try {
        let query = supabase.from('crm_leads').select('id').limit(1);

        if (info.email) {
          const { data } = await query.eq('email', info.email).maybeSingle();
          if (data) {
            setFoundLeadId(data.id);
            return;
          }
        }

        if (info.phone) {
          const cleanPhone = info.phone.replace(/\s/g, '');
          const { data } = await supabase
            .from('crm_leads')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${cleanPhone.replace(/^0/, '+33')}`)
            .limit(1)
            .maybeSingle();
          if (data) {
            setFoundLeadId(data.id);
            return;
          }
        }

        if (info.name) {
          const nameParts = info.name.toLowerCase().split(/\s+/);
          const { data } = await supabase
            .from('crm_leads')
            .select('id, first_name, last_name')
            .limit(10);

          if (data) {
            const match = data.find(lead => {
              const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase();
              return nameParts.some(part => leadName.includes(part) && part.length > 2);
            });
            if (match) {
              setFoundLeadId(match.id);
            }
          }
        }
      } catch (error) {
        console.error('Error finding lead from notification:', error);
      }
    };

    findLeadFromNotification();
  }, [selectedMessage]);

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .or('email_status.is.null,email_status.eq.active');

      const { count: unread } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .or('email_status.is.null,email_status.eq.active');

      const { count: leads } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .not('lead_id', 'is', null)
        .or('email_status.is.null,email_status.eq.active');

      const { count: starred } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_starred', true)
        .or('email_status.is.null,email_status.eq.active');

      const { count: archived } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('email_status', 'archived');

      setStats({
        total: total || 0,
        unread: unread || 0,
        leads: leads || 0,
        starred: starred || 0,
        archived: archived || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const checkAutoSyncStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_auto_sync_status');
      if (error) throw error;

      if (data) {
        setAutoSyncActive(data.active || false);
        setLastAutoSync(data.last_check || null);

        const unlinkedCount = data.unlinked_emails || 0;
        if (unlinkedCount > 0) {
          console.log(`⚠️ ${unlinkedCount} email(s) non lié(s) à un lead`);
        }
      }
    } catch (error) {
      console.error('Failed to check auto-sync status:', error);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(500);

      if (filter === 'archived') {
        // Afficher uniquement les emails archivés
        query = query.eq('email_status', 'archived');
      } else {
        // Exclure les emails archivés et supprimés des autres vues
        query = query.or('email_status.is.null,email_status.eq.active');

        if (filter === 'unread') {
          query = query.eq('is_read', false);
        } else if (filter === 'starred') {
          query = query.eq('is_starred', true);
        } else if (filter === 'leads') {
          query = query.not('lead_id', 'is', null);
        }
      }

      if (directionFilter !== 'all') {
        query = query.eq('direction', directionFilter);
      }

      if (searchQuery) {
        query = query.or(
          `subject.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%,body_text.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      let sortedData = data || [];
      if (sortBy === 'priority') {
        sortedData = sortedData.sort((a, b) => {
          const scoreA = calculatePriority(a);
          const scoreB = calculatePriority(b);
          return scoreB - scoreA;
        });
      }

      setMessages(sortedData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePriority = (email: EmailMessage): number => {
    let score = 0;
    if (!email.is_read) score += 10;
    if (email.lead_id) score += 20;
    if (email.classification === 'lead_inquiry') score += 30;
    if (email.attachments?.length > 0) score += 5;
    if (email.is_starred) score += 15;
    const hoursSinceReceived =
      (Date.now() - new Date(email.received_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReceived < 24) score += 10;
    return score;
  };

  const syncEmails = async () => {
    try {
      setSyncing(true);
      setSyncStatus('syncing');
      setSyncMessage('🔄 Synchronisation des emails et affectation aux leads...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-emails-complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      console.log('Complete sync result:', result);

      if (result.success) {
        setSyncStatus('success');
        const {
          emails_retrieved,
          emails_inserted,
          emails_linked,
          leads_created,
          interactions_created
        } = result.stats || {};

        setSyncMessage(
          `✅ Synchronisation complète réussie !\n\n` +
          `📧 ${emails_retrieved || 0} emails récupérés (${emails_inserted || 0} nouveaux)\n` +
          `👤 ${leads_created || 0} nouveaux leads créés\n` +
          `🔗 ${emails_linked || 0} emails affectés aux leads\n` +
          `💬 ${interactions_created || 0} interactions enregistrées`
        );

        await loadMessages();
        await loadStats();

        setTimeout(() => {
          setSyncStatus('idle');
          setSyncMessage('');
        }, 8000);
      } else {
        setSyncStatus('error');
        let errorMsg = result.error || result.message || 'Erreur lors de la synchronisation';

        // Si c'est une erreur de configuration IONOS
        if (errorMsg.includes('IONOS') || errorMsg.includes('credentials') || errorMsg.includes('502 Bad Gateway')) {
          errorMsg = `⚠️ Configuration IONOS Email manquante\n\n` +
            `Les identifiants IONOS ne sont pas configurés dans Supabase.\n\n` +
            `📝 Action requise :\n` +
            `1. Aller sur Supabase Dashboard\n` +
            `2. Project Settings > Edge Functions > Secrets\n` +
            `3. Ajouter : IONOS_EMAIL_PASSWORD = TaxiAssur2025!,&\n` +
            `4. Ajouter : IONOS_EMAIL_USER = team@taxiassur.com\n\n` +
            `En attendant, la synchronisation Brevo continue de fonctionner.`;
        }

        setSyncMessage(errorMsg);

        if (result.details?.errors?.length > 0) {
          const details = result.details.errors
            .filter((e: string) => !e.includes('502 Bad Gateway'))
            .join('\n');
          if (details) {
            setSyncMessage(prev => `${prev}\n\n⚠️ Détails: ${details}`);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      setSyncStatus('error');
      setSyncMessage(`❌ Erreur réseau : ${error instanceof Error ? error.message : 'Impossible de contacter le serveur'}`);
    } finally {
      setSyncing(false);
    }
  };


  const linkEmailHistoryToLead = async (leadId: string, senderEmail: string) => {
    const { data: allSenderEmails, error: emailsError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('from_email', senderEmail)
      .order('received_at', { ascending: true });

    if (emailsError) throw emailsError;

    let linkedCount = 0;
    let interactionsCreated = 0;

    if (allSenderEmails && allSenderEmails.length > 0) {
      const emailUpdates = allSenderEmails.map((e) =>
        supabase.from('email_messages').update({ lead_id: leadId }).eq('id', e.id)
      );
      await Promise.all(emailUpdates);
      linkedCount = allSenderEmails.length;

      const interactions = allSenderEmails.map((e) => ({
        lead_id: leadId,
        type: 'email' as const,
        direction: e.direction as 'inbound' | 'outbound',
        subject: e.subject,
        content: e.body_text?.substring(0, 5000) || '',
        created_at: e.received_at,
        metadata: {
          email_id: e.id,
          from: e.from_email,
          to: e.to_emails,
        },
      }));

      const { data: existingInteractions } = await supabase
        .from('crm_interactions')
        .select('metadata')
        .eq('lead_id', leadId);

      const existingEmailIds = new Set(
        existingInteractions?.map((i: any) => i.metadata?.email_id).filter(Boolean) || []
      );

      const newInteractions = interactions.filter(
        (i) => !existingEmailIds.has(i.metadata.email_id)
      );

      if (newInteractions.length > 0) {
        const { error: interactionsError } = await supabase
          .from('crm_interactions')
          .insert(newInteractions);

        if (!interactionsError) {
          interactionsCreated = newInteractions.length;
        }
      }
    }

    return { linkedCount, interactionsCreated };
  };

  const createLeadFromEmail = async (email: EmailMessage) => {
    if (!extractedInfo) return;

    try {
      const nameParts = (extractedInfo.name || email.from_name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: newLead, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: extractedInfo.email || email.from_email,
          phone: extractedInfo.phone || null,
          status: 'new',
          source: 'email',
          notes: `Lead créé depuis l'email: ${email.subject}\n\nContenu:\n${email.body_text?.substring(0, 500)}`,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      const { linkedCount, interactionsCreated } = await linkEmailHistoryToLead(
        newLead.id,
        email.from_email
      );

      setFoundLeadId(newLead.id);
      await loadMessages();
      await loadStats();

      setSyncMessage(
        `✅ Lead créé avec succès !\n\n` +
        `👤 ${firstName} ${lastName}\n` +
        `📧 ${linkedCount} email(s) lié(s) automatiquement\n` +
        `💬 ${interactionsCreated} interaction(s) créée(s)\n\n` +
        `Tout l'historique de cette conversation est maintenant dans le CRM !`
      );
      setSyncStatus('success');

      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 8000);
    } catch (error) {
      console.error('Error creating lead from email:', error);
      setSyncMessage(`❌ Erreur lors de la création du lead : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setSyncStatus('error');
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      await supabase.from('email_messages').update({ is_read: true }).eq('id', emailId);

      setMessages(messages.map((e) => (e.id === emailId ? { ...e, is_read: true } : e)));
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleStar = async (emailId: string, currentState: boolean) => {
    try {
      await supabase
        .from('email_messages')
        .update({ is_starred: !currentState })
        .eq('id', emailId);

      setMessages(
        messages.map((e) => (e.id === emailId ? { ...e, is_starred: !currentState } : e))
      );
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const classifyEmail = async (emailId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-email-ai`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ emailId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await loadMessages();
        alert(
          `Email classifié comme "${result.classification.category}" ${
            result.leadCreated ? '+ Lead créé !' : ''
          }`
        );
      }
    } catch (error) {
      console.error('Error classifying email:', error);
    }
  };

  // Rechercher des leads par email ou nom
  const searchLeads = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchingLeads(true);
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email, phone, city, status')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching leads:', error);
      setSearchResults([]);
    } finally {
      setSearchingLeads(false);
    }
  };

  // Assigner manuellement un email à un lead
  const assignEmailToLead = async (leadId: string, emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_messages')
        .update({ lead_id: leadId, auto_matched: false })
        .eq('id', emailId);

      if (error) throw error;

      // Recharger les messages et fermer la modal
      await loadMessages();
      await loadStats();
      setShowAssignModal(false);
      setSelectedMessage(null);

      alert('✅ Email assigné au lead avec succès !');
    } catch (error) {
      console.error('Error assigning email to lead:', error);
      alert('❌ Erreur lors de l\'assignation de l\'email');
    }
  };

  // Archiver un email
  const archiveEmail = async (emailId: string) => {
    try {
      const { data, error } = await supabase.rpc('archive_email', {
        p_email_id: emailId
      });

      if (error) throw error;

      await loadMessages();
      await loadStats();
      setSelectedMessage(null);

      setSyncMessage('✅ Email archivé avec succès !');
      setSyncStatus('success');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error archiving email:', error);
      alert('❌ Erreur lors de l\'archivage de l\'email');
    }
  };

  // Supprimer un email (corbeille)
  const deleteEmail = async (emailId: string) => {
    if (!confirm('Mettre cet email à la corbeille ?')) return;

    try {
      const { data, error } = await supabase.rpc('delete_email', {
        p_email_id: emailId
      });

      if (error) throw error;

      await loadMessages();
      await loadStats();
      setSelectedMessage(null);

      setSyncMessage('✅ Email mis à la corbeille !');
      setSyncStatus('success');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('❌ Erreur lors de la suppression de l\'email');
    }
  };

  // Marquer comme spam
  const markEmailAsSpam = async (emailId: string) => {
    if (!confirm('Marquer cet email comme spam ?')) return;

    try {
      const { data, error } = await supabase.rpc('mark_as_spam', {
        p_email_id: emailId
      });

      if (error) throw error;

      await loadMessages();
      await loadStats();
      setSelectedMessage(null);

      setSyncMessage('✅ Email marqué comme spam !');
      setSyncStatus('success');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error marking as spam:', error);
      alert('❌ Erreur lors du marquage comme spam');
    }
  };

  // Envoyer une réponse
  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      alert('Veuillez saisir un message');
      return;
    }

    setReplySending(true);
    try {
      const { error } = await supabase.functions.invoke('send-crm-email', {
        body: {
          to: selectedMessage.from_email,
          subject: `Re: ${selectedMessage.subject}`,
          html: `<p>${replyContent.replace(/\n/g, '<br>')}</p>
                 <hr>
                 <p><em>Message original :</em></p>
                 <blockquote>${selectedMessage.body_html || selectedMessage.body_text}</blockquote>`,
        },
      });

      if (error) throw error;

      await loadMessages();
      setShowReplyModal(false);
      setReplyContent('');

      setSyncMessage('✅ Réponse envoyée avec succès !');
      setSyncStatus('success');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('❌ Erreur lors de l\'envoi de la réponse');
    } finally {
      setReplySending(false);
    }
  };

  // Restaurer un email
  const restoreEmail = async (emailId: string) => {
    try {
      const { data, error} = await supabase.rpc('restore_email', {
        p_email_id: emailId
      });

      if (error) throw error;

      await loadMessages();
      await loadStats();

      setSyncMessage('✅ Email restauré !');
      setSyncStatus('success');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error restoring email:', error);
      alert('❌ Erreur lors de la restauration');
    }
  };

  // Ouvrir la modal d'assignation manuelle
  const openAssignModal = () => {
    if (!selectedMessage) return;

    // Extraire les emails du contenu
    const emails = extractAllEmailsFromContent(selectedMessage);
    setEmailsFoundInContent(emails);

    // Rechercher automatiquement avec le premier email trouvé
    if (emails.length > 0) {
      setLeadSearchQuery(emails[0]);
      searchLeads(emails[0]);
    }

    setShowAssignModal(true);
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;

    const colors: Record<string, string> = {
      lead_inquiry: 'bg-green-100 text-green-800',
      customer_support: 'bg-blue-100 text-blue-800',
      reply: 'bg-gray-100 text-gray-800',
      spam: 'bg-red-100 text-red-800',
      documents: 'bg-purple-100 text-purple-800',
      general: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${colors[category] || 'bg-gray-100 text-gray-800'}`}
      >
        {category.replace('_', ' ')}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPriorityIndicator = (email: EmailMessage) => {
    const priority = calculatePriority(email);
    if (priority >= 50) return <TrendingUp className="text-red-500" size={16} />;
    if (priority >= 30) return <TrendingUp className="text-orange-500" size={16} />;
    return null;
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold">Inbox Multicanal</h1>
            <p className="text-blue-200 mt-1">Tous vos emails en un seul endroit</p>
            {autoSyncActive && (
              <div className="flex items-center gap-2 mt-2 text-sm text-green-300 bg-green-900/30 px-3 py-1.5 rounded-lg inline-flex">
                <CheckCircle size={16} className="animate-pulse" />
                <span className="font-medium">Synchronisation automatique : toutes les 5 minutes</span>
                {lastAutoSync && (
                  <span className="text-blue-200 ml-2 flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(lastAutoSync).toLocaleTimeString('fr-FR')}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-900 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-blue-200 text-sm">Total emails</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.unread}</div>
            <div className="text-blue-200 text-sm">Non lus</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.leads}</div>
            <div className="text-blue-200 text-sm">Leads associés</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.starred}</div>
            <div className="text-blue-200 text-sm">Favoris</div>
          </div>
        </div>

        {syncMessage && (
          <div className={`mt-4 p-4 rounded-lg ${
            syncStatus === 'success' ? 'bg-green-100 text-green-800' :
            syncStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            <div className="flex items-start gap-3">
              {syncStatus === 'syncing' && <RefreshCw className="animate-spin flex-shrink-0 mt-0.5" size={20} />}
              {syncStatus === 'success' && <CheckCircle className="flex-shrink-0 mt-0.5" size={20} />}
              {syncStatus === 'error' && <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />}
              <div className="flex-1 whitespace-pre-wrap text-sm">{syncMessage}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Rechercher dans les emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'priority')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Par date</option>
              <option value="priority">Par priorité</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={() => setFilter('starred')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'starred'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Favoris ({stats.starred})
            </button>
            <button
              onClick={() => setFilter('leads')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'leads'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Leads ({stats.leads})
            </button>
            <button
              onClick={() => setFilter('archived')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filter === 'archived'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Archive size={16} />
              Archives ({stats.archived})
            </button>

            <div className="ml-4 flex gap-2">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  directionFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setDirectionFilter('inbound')}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  directionFilter === 'inbound'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Reçus
              </button>
              <button
                onClick={() => setDirectionFilter('outbound')}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  directionFilter === 'outbound'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Envoyés
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement des emails...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 max-w-2xl mx-auto">
              <Mail size={64} className="text-gray-300 mx-auto mb-6" />
              <h3 className="text-gray-800 text-2xl font-semibold mb-3">Aucun email trouvé</h3>
              <p className="text-gray-600 mb-6">
                Votre inbox est vide. Pour commencer à recevoir vos emails :
              </p>

              <div className="space-y-4 text-left bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 mb-1">Configurez votre mot de passe IMAP</p>
                    <p className="text-sm text-gray-600 mb-2">
                      Allez dans la configuration email pour ajouter votre mot de passe IONOS
                    </p>
                    <a
                      href="/backoffice/email-settings"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Settings size={16} />
                      Configurer maintenant →
                    </a>
                  </div>
                </div>

                <div className="border-t-2 border-blue-200 pt-4"></div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 mb-1">Synchronisez vos emails</p>
                    <p className="text-sm text-gray-600 mb-2">
                      Cliquez sur le bouton "Synchroniser" en haut de page
                    </p>
                    <button
                      onClick={syncEmails}
                      disabled={syncing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                      {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-500">
                <p>
                  💡 Besoin d'aide ? Consultez le{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    guide de configuration
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((email) => {
                const isUnlinked = !email.lead_id && email.direction === 'inbound';
                return (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedMessage(email);
                    if (!email.is_read) markAsRead(email.id);
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isUnlinked
                      ? 'bg-orange-50 border-orange-400 border-dashed hover:border-orange-500'
                      : !email.is_read
                      ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(email.id, email.is_starred);
                      }}
                      className="flex-shrink-0 mt-1"
                    >
                      <Star
                        size={20}
                        className={
                          email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }
                      />
                    </button>

                    {email.direction === 'outbound' && (
                      <Send size={16} className="text-gray-400 mt-1" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`font-semibold ${!email.is_read ? 'text-gray-900' : 'text-gray-700'}`}
                        >
                          {email.direction === 'outbound'
                            ? email.to_emails?.[0] || 'Destinataire'
                            : email.from_name || email.from_email}
                        </span>
                        {email.lead_id && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <User size={12} />
                            Lead
                          </span>
                        )}
                        {email.auto_matched && (
                          <CheckCircle size={16} className="text-green-600" />
                        )}
                        {getCategoryBadge(email.classification)}
                        {getPriorityIndicator(email)}
                      </div>

                      <div className="text-sm text-gray-600 mb-1">
                        {email.direction === 'outbound' ? 'À: ' : 'De: '}
                        {email.direction === 'outbound'
                          ? email.to_emails?.[0]
                          : email.from_email}
                      </div>

                      <div
                        className={`mb-2 ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                      >
                        {email.subject || '(Pas de sujet)'}
                      </div>

                      <div className="text-sm text-gray-600 line-clamp-2">
                        {cleanEmailPreview(email.body_text || '').substring(0, 200)}...
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(email.received_at)}
                        </span>
                        {email.attachments?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip size={14} />
                            {email.attachments.length} pièce(s)
                          </span>
                        )}
                        {email.confidence_score && (
                          <span className="flex items-center gap-1">
                            <Tag size={14} />
                            {Math.round(email.confidence_score * 100)}% confiance
                          </span>
                        )}
                      </div>
                    </div>

                    {!email.classification && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          classifyEmail(email.id);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Classifier
                      </button>
                    )}
                  </div>

                  {/* Alerte pour les emails non liés */}
                  {isUnlinked && (
                    <div className="mt-3 pt-3 border-t border-orange-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
                          <AlertTriangle size={16} />
                          Email non lié à un lead
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessage(email);
                          }}
                          className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors font-medium"
                        >
                          Créer le lead
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedMessage(null);
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={20} />
                  Retour
                </button>

                <div className="flex items-center gap-2">
                  {foundLeadId && (
                    <>
                      <a
                        href={`/backoffice/crm-killer/lead/${foundLeadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <ExternalLink size={16} />
                        Voir le lead
                      </a>
                      <button
                        onClick={async () => {
                          try {
                            const { linkedCount, interactionsCreated } =
                              await linkEmailHistoryToLead(foundLeadId, selectedMessage.from_email);
                            setSyncMessage(
                              `✅ Historique synchronisé !\n\n` +
                              `📧 ${linkedCount} email(s) lié(s)\n` +
                              `💬 ${interactionsCreated} nouvelle(s) interaction(s)`
                            );
                            setSyncStatus('success');
                            await loadMessages();
                            await loadStats();
                            setTimeout(() => {
                              setSyncStatus('idle');
                              setSyncMessage('');
                            }, 5000);
                          } catch (error) {
                            console.error('Error linking history:', error);
                            setSyncMessage('❌ Erreur lors de la synchronisation de l\'historique');
                            setSyncStatus('error');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        title="Re-lier tout l'historique des emails de cet expéditeur"
                      >
                        <History size={16} />
                        Sync historique
                      </button>
                    </>
                  )}
                  {!foundLeadId && extractedInfo && (
                    <button
                      onClick={() => createLeadFromEmail(selectedMessage)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <UserPlus size={16} />
                      Créer le lead + lier l'historique
                    </button>
                  )}
                  {!foundLeadId && (
                    <button
                      onClick={openAssignModal}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      title="Assigner manuellement cet email à un lead existant"
                    >
                      <LinkIcon size={16} />
                      Assigner manuellement
                    </button>
                  )}
                  <button
                    onClick={() =>
                      toggleStar(selectedMessage.id, selectedMessage.is_starred)
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={selectedMessage.is_starred ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Star
                      size={20}
                      className={
                        selectedMessage.is_starred
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      }
                    />
                  </button>

                  {/* Actions email type Outlook */}
                  <div className="flex items-center gap-1 border-l pl-2 ml-2">
                    {selectedMessage.direction === 'inbound' && selectedMessage.email_status !== 'deleted' && (
                      <button
                        onClick={() => {
                          setReplyContent('');
                          setShowReplyModal(true);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 font-medium"
                        title="Répondre"
                      >
                        <Send size={20} />
                      </button>
                    )}

                    {selectedMessage.email_status === 'deleted' ? (
                      <button
                        onClick={() => restoreEmail(selectedMessage.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-green-600"
                        title="Restaurer"
                      >
                        <RotateCcw size={20} />
                      </button>
                    ) : selectedMessage.email_status === 'archived' ? (
                      <button
                        onClick={() => restoreEmail(selectedMessage.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600"
                        title="Désarchiver"
                      >
                        <ArchiveX size={20} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => archiveEmail(selectedMessage.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                          title="Archiver"
                        >
                          <Archive size={20} />
                        </button>
                        <button
                          onClick={() => deleteEmail(selectedMessage.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 size={20} />
                        </button>
                        <button
                          onClick={() => markEmailAsSpam(selectedMessage.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-orange-600"
                          title="Marquer comme spam"
                        >
                          <AlertTriangle size={20} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Bouton X pour fermer */}
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 ml-2"
                    title="Fermer"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedMessage.subject || '(Pas de sujet)'}
              </h2>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">
                    {selectedMessage.direction === 'outbound' ? 'À: ' : 'De: '}
                  </span>
                  <span className="font-semibold">
                    {selectedMessage.direction === 'outbound'
                      ? selectedMessage.to_emails?.join(', ')
                      : selectedMessage.from_name || selectedMessage.from_email}
                  </span>
                  <span className="ml-2 text-gray-600">
                    {selectedMessage.direction === 'outbound'
                      ? ''
                      : `<${selectedMessage.from_email}>`}
                  </span>
                </div>
                <div className="text-gray-500">
                  {new Date(selectedMessage.received_at).toLocaleString('fr-FR')}
                </div>
              </div>

              {selectedMessage.classification && (
                <div className="mt-4 flex items-center gap-2">
                  {getCategoryBadge(selectedMessage.classification)}
                  {selectedMessage.confidence_score && (
                    <span className="text-sm text-gray-600">
                      Confiance: {Math.round(selectedMessage.confidence_score * 100)}%
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
              {/* BANNIÈRE DE VERSION - Pour confirmer que c'est la bonne version */}
              <div
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  textAlign: 'center',
                  border: '3px solid #059669'
                }}
              >
                ✅ VERSION CORRIGÉE DU 30 JANVIER 2026 - 16h23
              </div>

              {/* AFFICHAGE ULTRA-SIMPLE AVEC STYLES INLINE FORCÉS - DIVS AU LIEU DE PRE */}
              <div
                style={{
                  backgroundColor: '#f3f4f6',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '3px solid #3b82f6',
                  minHeight: '200px'
                }}
              >
                <style>
                  {`
                    .email-content-safe ::selection {
                      background-color: #bfdbfe !important;
                      color: #000000 !important;
                    }
                    .email-content-safe ::-moz-selection {
                      background-color: #bfdbfe !important;
                      color: #000000 !important;
                    }
                  `}
                </style>
                <div
                  className="email-content-safe"
                  style={{
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: '15px',
                    lineHeight: '1.7',
                    padding: '24px',
                    border: '3px solid #ef4444',
                    borderRadius: '8px',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text',
                    WebkitTextFillColor: '#000000',
                    textFillColor: '#000000'
                  }}
                >
                  {(() => {
                    // Debug console
                    console.log('📧 Email sélectionné:', {
                      hasHtml: !!selectedMessage.body_html,
                      hasText: !!selectedMessage.body_text,
                      htmlLength: selectedMessage.body_html?.length || 0,
                      textLength: selectedMessage.body_text?.length || 0,
                      subject: selectedMessage.subject
                    });

                    const text = selectedMessage.body_html
                      ? htmlToReadableText(selectedMessage.body_html)
                      : cleanEmailPreview(selectedMessage.body_text || '');

                    console.log('📝 Texte extrait:', {
                      textLength: text.length,
                      preview: text.substring(0, 100)
                    });

                    // Debug: afficher si le texte est vide
                    if (!text || text.trim() === '') {
                      return (
                        <div style={{ color: '#dc2626', fontWeight: 'bold' }}>
                          ⚠️ Contenu vide ou illisible. HTML brut:
                          <br /><br />
                          {selectedMessage.body_html || selectedMessage.body_text || 'Aucun contenu'}
                        </div>
                      );
                    }

                    // Afficher le texte ligne par ligne pour garantir la visibilité
                    return text.split('\n').map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          color: '#111827',
                          marginBottom: line.trim() === '' ? '12px' : '0',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          WebkitTextFillColor: '#111827',
                          textFillColor: '#111827'
                        }}
                      >
                        {line || '\u00A0'}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Bouton pour afficher le HTML original (mode debug) */}
              {selectedMessage.body_html && (
                <details className="mt-4">
                  <summary
                    style={{
                      cursor: 'pointer',
                      color: '#2563eb',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    🔍 Afficher le HTML original (mode avancé)
                  </summary>
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fbbf24',
                      borderRadius: '8px'
                    }}
                  >
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#92400e',
                        marginBottom: '8px'
                      }}
                    >
                      ⚠️ Le HTML ci-dessous peut contenir des styles qui rendent le texte invisible.
                    </p>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: stripAllInlineStyles(selectedMessage.body_html)
                      }}
                      style={{
                        color: '#000000',
                        backgroundColor: '#ffffff',
                        padding: '16px',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </details>
              )}

              {selectedMessage.attachments?.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Pièces jointes</h3>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <Paperclip size={20} className="text-gray-400" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {attachment.filename}
                          </div>
                          <div className="text-sm text-gray-600">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'assignation manuelle */}
      {showAssignModal && selectedMessage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAssignModal(false);
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <LinkIcon className="text-orange-600" size={28} />
                  Assigner l'email à un lead
                </h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Email de: <span className="font-semibold">{selectedMessage.from_email}</span>
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Emails trouvés dans le contenu */}
              {emailsFoundInContent.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail size={18} className="text-blue-600" />
                    Emails trouvés dans le contenu:
                  </p>
                  <div className="space-y-2">
                    {emailsFoundInContent.map((email, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setLeadSearchQuery(email);
                          searchLeads(email);
                        }}
                        className="w-full text-left px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors"
                      >
                        <code className="text-sm font-mono text-blue-900">{email}</code>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recherche de leads */}
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Rechercher un lead par email, nom ou téléphone:
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={leadSearchQuery}
                    onChange={(e) => {
                      setLeadSearchQuery(e.target.value);
                      searchLeads(e.target.value);
                    }}
                    placeholder="Tapez au moins 3 caractères..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900"
                  />
                </div>
              </div>

              {/* Résultats de recherche */}
              {searchingLeads && (
                <div className="text-center py-4">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Recherche en cours...</p>
                </div>
              )}

              {!searchingLeads && searchResults.length === 0 && leadSearchQuery.length >= 3 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <AlertCircle size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">Aucun lead trouvé</p>
                  <p className="text-sm text-gray-500 mt-1">Essayez avec un autre terme de recherche</p>
                </div>
              )}

              {!searchingLeads && searchResults.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-900 mb-3">
                    {searchResults.length} lead(s) trouvé(s):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-orange-400 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-lg mb-1">
                              {lead.first_name || ''} {lead.last_name || '(Sans nom)'}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Mail size={14} className="text-blue-600" />
                                <span className="font-mono">{lead.email}</span>
                              </div>
                              {lead.phone && (
                                <div className="flex items-center gap-2 text-gray-700">
                                  <User size={14} className="text-green-600" />
                                  {lead.phone}
                                </div>
                              )}
                              {lead.city && (
                                <div className="text-gray-600">
                                  📍 {lead.city}
                                </div>
                              )}
                              <div>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  {lead.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => assignEmailToLead(lead.id, selectedMessage.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            <LinkIcon size={16} />
                            Assigner
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de réponse */}
      {showReplyModal && selectedMessage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReplyModal(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Répondre à : {selectedMessage.from_email}
                </h2>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Objet : Re: {selectedMessage.subject}
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Votre message
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Tapez votre réponse..."
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Message original :</h4>
                <div className="text-sm text-gray-600 max-h-40 overflow-y-auto">
                  {cleanEmailPreview(selectedMessage.body_text || selectedMessage.body_html).substring(0, 500)}...
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReplyModal(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={replySending}
              >
                Annuler
              </button>
              <button
                onClick={sendReply}
                disabled={replySending || !replyContent.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {replySending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Envoyer la réponse
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMInboxMulticanal;
