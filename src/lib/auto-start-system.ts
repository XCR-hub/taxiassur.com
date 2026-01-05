import { supabase } from './supabase';

export const autoStartSystem = async (): Promise<void> => {
  try {
    console.log('🚀 Vérification auto-start système...');
    console.log('📅 Filtre: Leads >= 04/01/2026 uniquement');

    const { data: shouldStart, error: checkError } = await supabase.rpc('should_ai_auto_start');

    if (checkError) {
      console.error('Erreur vérification auto-start:', checkError);
      return;
    }

    if (!shouldStart) {
      console.log('⏸️ Auto-start désactivé dans la config');
      return;
    }

    const { data: currentStatus, error: statusError } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'ai_engine_running')
      .single();

    if (statusError) {
      console.error('Erreur lecture status:', statusError);
    }

    const isRunning = currentStatus?.value === true || currentStatus?.value === 'true';

    if (isRunning) {
      console.log('✅ IA déjà active');
      return;
    }

    console.log('🎬 Démarrage automatique IA...');

    const { data: result, error: startError } = await supabase.rpc('start_ai_engine');

    if (startError) {
      console.error('❌ Erreur démarrage IA:', startError);
      return;
    }

    console.log('✅ IA démarrée avec succès:', result);

    await activateAllTemplates();

    console.log('🎉 Système activé pour nouveaux leads (>= 04/01/2026) !');
  } catch (error) {
    console.error('❌ Erreur auto-start système:', error);
  }
};

const activateAllTemplates = async (): Promise<void> => {
  try {
    const { data: templates, error } = await supabase
      .from('reminder_templates')
      .select('id, active')
      .eq('active', false);

    if (error) {
      console.error('Erreur lecture templates:', error);
      return;
    }

    if (!templates || templates.length === 0) {
      console.log('✅ Tous les templates déjà actifs');
      return;
    }

    console.log(`📋 Activation de ${templates.length} templates...`);

    for (const template of templates) {
      await supabase.rpc('activate_reminder_template', {
        p_template_id: template.id
      });
    }

    console.log('✅ Templates activés (nouveaux leads uniquement)');
  } catch (error) {
    console.error('❌ Erreur activation templates:', error);
  }
};

export const getSystemStatus = async () => {
  try {
    const { data, error } = await supabase.rpc('get_filtered_system_status');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Erreur lecture status système:', error);
    return null;
  }
};

export const startAI = async () => {
  try {
    const { data, error } = await supabase.rpc('start_ai_engine');

    if (error) throw error;

    console.log('✅ IA démarrée (nouveaux leads >= 04/01/2026):', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur démarrage IA:', error);
    throw error;
  }
};

export const stopAI = async () => {
  try {
    const { data, error } = await supabase.rpc('stop_ai_engine');

    if (error) throw error;

    console.log('⏸️ IA arrêtée:', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur arrêt IA:', error);
    throw error;
  }
};
