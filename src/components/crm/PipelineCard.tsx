import React, { useRef, useState, useEffect } from 'react';
import { Calendar, Tag, TrendingUp, Mail, Phone, FileCheck, CreditCard, Clock, Building2, PenTool, AlertTriangle, Euro, Zap, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { CRMLead, PIPELINE_STATUSES } from '@/lib/crm-pipeline';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface PipelineCardProps {
  lead: CRMLead;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  className?: string;
}

interface LeadIndicators {
  documentsValidated: number;
  documentsTotal: number;
  companiesQuoted: number;
  companiesRefused: number;
  companiesTotal: number;
  hasSignature: boolean;
  downPaymentStatus: 'none' | 'required' | 'pending' | 'paid';
  downPaymentAmount: number | null;
  daysInPipeline: number;
  needsRelance: boolean;
  lastInteractionDays: number;
  pendingAutomations: number;
  lastAutomationResult: 'success' | 'failed' | null;
  automationCount: number;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  className
}) => {
  const statusInfo = PIPELINE_STATUSES[lead.status];
  const isDraggingRef = useRef(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const [indicators, setIndicators] = useState<LeadIndicators>({
    documentsValidated: 0,
    documentsTotal: 7,
    companiesQuoted: 0,
    companiesRefused: 0,
    companiesTotal: 5,
    hasSignature: false,
    downPaymentStatus: 'none',
    downPaymentAmount: null,
    daysInPipeline: 0,
    needsRelance: false,
    lastInteractionDays: 0,
    pendingAutomations: 0,
    lastAutomationResult: null,
    automationCount: 0
  });

  useEffect(() => {
    const loadIndicators = async () => {
      try {
        const [docsResult, companyQuotesResult, contractResult, interactionsResult, automationsResult, leadDataResult] = await Promise.allSettled([
          supabase.from('crm_lead_documents').select('status').eq('lead_id', lead.id),
          supabase.from('lead_company_quotes').select('status').eq('lead_id', lead.id),
          supabase.from('lead_contracts').select('status, down_payment_status, down_payment_amount').eq('lead_id', lead.id).limit(1),
          supabase.from('crm_interactions').select('created_at').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('pipeline_action_queue').select('id').eq('lead_id', lead.id).in('status', ['pending', 'processing']),
          supabase.from('crm_leads').select('last_automation_result, automation_count').eq('id', lead.id).maybeSingle()
        ]);

        const docs = (docsResult.status === 'fulfilled' ? docsResult.value.data : null) || [];
        const validatedDocs = docs.filter(d => d.status === 'validated').length;

        const companyQuotes = (companyQuotesResult.status === 'fulfilled' ? companyQuotesResult.value.data : null) || [];
        const quotedCompanies = companyQuotes.filter(q => q.status === 'quote_submitted' || q.status === 'validated').length;
        const refusedCompanies = companyQuotes.filter(q => q.status === 'refused').length;

        const contract = contractResult.status === 'fulfilled' ? contractResult.value.data?.[0] : null;
        const lastInteraction = interactionsResult.status === 'fulfilled' ? interactionsResult.value.data?.[0] : null;
        const pendingAutomations = (automationsResult.status === 'fulfilled' ? automationsResult.value.data?.length : null) || 0;
        const leadData = leadDataResult.status === 'fulfilled' ? leadDataResult.value.data : null;

        const daysInPipeline = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const lastInteractionDays = lastInteraction
          ? Math.floor((Date.now() - new Date(lastInteraction.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : daysInPipeline;

        let downPaymentStatus: 'none' | 'required' | 'pending' | 'paid' = 'none';
        if (contract?.down_payment_status === 'paid') {
          downPaymentStatus = 'paid';
        } else if (contract?.down_payment_status === 'pending') {
          downPaymentStatus = 'pending';
        } else if (lead.status === 'DOWN_PAYMENT_REQUIRED' || lead.status === 'SIGNED') {
          downPaymentStatus = 'required';
        }

        setIndicators({
          documentsValidated: validatedDocs,
          documentsTotal: 7,
          companiesQuoted: quotedCompanies,
          companiesRefused: refusedCompanies,
          companiesTotal: 5,
          hasSignature: contract?.status === 'signed',
          downPaymentStatus,
          downPaymentAmount: contract?.down_payment_amount || null,
          daysInPipeline,
          needsRelance: lastInteractionDays >= 3 && !['ACTIVE_CLIENT', 'LOST', 'CANCELLED'].includes(lead.status),
          lastInteractionDays,
          pendingAutomations,
          lastAutomationResult: leadData?.last_automation_result as 'success' | 'failed' | null,
          automationCount: leadData?.automation_count || 0
        });
      } catch (error) {
        console.error('Error loading indicators:', error);
      }
    };

    loadIndicators();
  }, [lead.id, lead.created_at, lead.status]);

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);

    // Create drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(3deg)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 50);
    setTimeout(() => document.body.removeChild(dragImage), 0);

    onDragStart?.();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
    onDragEnd?.();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx > 5 || dy > 5) {
        e.preventDefault();
        return;
      }
    }

    onClick?.();
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Lead: ${lead.full_name} - ${statusInfo.label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'bg-white rounded-lg shadow-sm border-2 border-gray-200 p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500',
        isDragging
          ? 'opacity-30 scale-95 cursor-grabbing border-blue-400'
          : 'cursor-grab hover:shadow-lg hover:border-blue-300 hover:-translate-y-1',
        'active:cursor-grabbing active:scale-98',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {lead.full_name}
          </h3>
          {lead.company_name && (
            <p className="text-xs text-gray-600 truncate">{lead.company_name}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Calendar size={11} className="text-gray-400" />
            <span className="text-xs text-gray-500" title={`Créé le ${new Date(lead.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${new Date(lead.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}>
              {indicators.daysInPipeline === 0
                ? "Aujourd'hui"
                : indicators.daysInPipeline === 1
                  ? "Hier"
                  : `Il y a ${indicators.daysInPipeline}j`}
            </span>
          </div>
        </div>
        {lead.quality_score && (
          <div className={cn('text-xs font-bold ml-2', getScoreColor(lead.quality_score))}>
            {lead.quality_score}%
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-xs text-gray-600">
          <Mail size={12} className="mr-1.5 flex-shrink-0" />
          <span className="truncate">{lead.email}</span>
        </div>

        {lead.phone && (
          <div className="flex items-center text-xs text-gray-600">
            <Phone size={12} className="mr-1.5 flex-shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}

        {lead.city && (
          <div className="flex items-center text-xs text-gray-600">
            <Tag size={12} className="mr-1.5 flex-shrink-0" />
            <span className="truncate">{lead.city}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        {indicators.needsRelance && (
          <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded bg-red-50 border border-red-200">
            <AlertTriangle size={12} className="text-red-600" />
            <span className="text-xs font-medium text-red-700">Relance necessaire ({indicators.lastInteractionDays}j)</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              indicators.documentsValidated >= 7
                ? 'bg-green-100 text-green-700'
                : indicators.documentsValidated >= 4
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-orange-100 text-orange-700'
            )}
            title={`${indicators.documentsValidated}/${indicators.documentsTotal} documents valides`}
          >
            <FileCheck size={10} />
            {indicators.documentsValidated}/{indicators.documentsTotal}
          </div>

          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              (indicators.companiesQuoted + indicators.companiesRefused) >= 5
                ? 'bg-green-100 text-green-700'
                : indicators.companiesQuoted > 0
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'bg-gray-100 text-gray-600'
            )}
            title={`${indicators.companiesQuoted} devis, ${indicators.companiesRefused} refus sur ${indicators.companiesTotal} compagnies`}
          >
            <Building2 size={10} />
            {indicators.companiesQuoted + indicators.companiesRefused}/{indicators.companiesTotal}
          </div>

          {indicators.hasSignature && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700" title="Contrat signe">
              <PenTool size={10} />
              Signe
            </div>
          )}

          {indicators.downPaymentStatus === 'paid' && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700" title="Comptant recu">
              <Euro size={10} />
              Paye
            </div>
          )}

          {indicators.downPaymentStatus === 'pending' && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 animate-pulse" title="En attente du comptant">
              <Euro size={10} />
              Attente
            </div>
          )}

          {indicators.downPaymentStatus === 'required' && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700" title="Comptant requis">
              <CreditCard size={10} />
              Comptant
            </div>
          )}

          {indicators.daysInPipeline > 7 && (
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                indicators.daysInPipeline > 14 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              )}
              title={`${indicators.daysInPipeline} jours dans le pipeline`}
            >
              <Clock size={10} />
              {indicators.daysInPipeline}j
            </div>
          )}

          {indicators.pendingAutomations > 0 && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 animate-pulse"
              title={`${indicators.pendingAutomations} action(s) en cours`}
            >
              <Loader2 size={10} className="animate-spin" />
              {indicators.pendingAutomations}
            </div>
          )}

          {indicators.automationCount > 0 && indicators.pendingAutomations === 0 && (
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                indicators.lastAutomationResult === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : indicators.lastAutomationResult === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
              )}
              title={`${indicators.automationCount} automatisations executees`}
            >
              {indicators.lastAutomationResult === 'success' ? (
                <CheckCircle size={10} />
              ) : indicators.lastAutomationResult === 'failed' ? (
                <XCircle size={10} />
              ) : (
                <Zap size={10} />
              )}
              {indicators.automationCount}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          {lead.last_contact && (
            <div className="flex items-center text-xs text-gray-500">
              <Calendar size={12} className="mr-1" />
              <span>{new Date(lead.last_contact).toLocaleDateString('fr-FR')}</span>
            </div>
          )}

          {lead.retention_score && (
            <div className="flex items-center text-xs">
              <TrendingUp size={12} className="mr-1" />
              <span className={getScoreColor(lead.retention_score)}>
                {lead.retention_score}%
              </span>
            </div>
          )}
        </div>
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{lead.tags.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
};
