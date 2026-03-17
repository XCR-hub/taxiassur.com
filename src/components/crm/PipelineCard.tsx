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
        'rounded-lg border px-3 py-2.5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 select-none',
        isDragging
          ? 'opacity-25 scale-95 cursor-grabbing border-yellow-500/40 bg-gray-800'
          : 'cursor-grab bg-gray-800/90 border-gray-700/60 hover:bg-gray-800 hover:border-gray-600 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/40',
        'active:cursor-grabbing',
        className
      )}
    >
      {/* Top: name + score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm leading-tight">
            {lead.full_name}
          </h3>
          {lead.company_name && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{lead.company_name}</p>
          )}
        </div>
        {lead.quality_score && (
          <div className={cn('text-xs font-bold shrink-0', getScoreColor(lead.quality_score))}>
            {lead.quality_score}%
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Mail size={11} className="shrink-0 text-gray-600" />
          <span className="truncate">{lead.email}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Phone size={11} className="shrink-0 text-gray-600" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.city && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Tag size={11} className="shrink-0 text-gray-600" />
            <span className="truncate">{lead.city}</span>
          </div>
        )}
      </div>

      {/* Relance alert */}
      {indicators.needsRelance && (
        <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-md bg-red-900/40 border border-red-700/50">
          <AlertTriangle size={11} className="text-red-400 shrink-0" />
          <span className="text-xs font-medium text-red-300">Relance necessaire ({indicators.lastInteractionDays}j)</span>
        </div>
      )}

      {/* Bottom: indicator chips + date */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          <div
            className={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium',
              indicators.documentsValidated >= 7
                ? 'bg-green-900/60 text-green-400'
                : indicators.documentsValidated >= 4
                  ? 'bg-yellow-900/60 text-yellow-400'
                  : 'bg-orange-900/50 text-orange-400'
            )}
            title={`${indicators.documentsValidated}/${indicators.documentsTotal} documents validés`}
          >
            <FileCheck size={9} />
            {indicators.documentsValidated}/{indicators.documentsTotal}
          </div>

          <div
            className={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium',
              (indicators.companiesQuoted + indicators.companiesRefused) >= 5
                ? 'bg-green-900/60 text-green-400'
                : indicators.companiesQuoted > 0
                  ? 'bg-cyan-900/60 text-cyan-400'
                  : 'bg-gray-700/60 text-gray-500'
            )}
            title={`${indicators.companiesQuoted} devis, ${indicators.companiesRefused} refus`}
          >
            <Building2 size={9} />
            {indicators.companiesQuoted + indicators.companiesRefused}/{indicators.companiesTotal}
          </div>

          {indicators.hasSignature && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900/60 text-blue-400">
              <PenTool size={9} />Signé
            </div>
          )}

          {indicators.downPaymentStatus === 'paid' && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-green-900/60 text-green-400">
              <Euro size={9} />Payé
            </div>
          )}
          {indicators.downPaymentStatus === 'pending' && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-400 animate-pulse">
              <Euro size={9} />Attente
            </div>
          )}
          {indicators.downPaymentStatus === 'required' && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-900/50 text-orange-400">
              <CreditCard size={9} />Comptant
            </div>
          )}

          {indicators.pendingAutomations > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900/60 text-blue-400 animate-pulse">
              <Loader2 size={9} className="animate-spin" />{indicators.pendingAutomations}
            </div>
          )}
        </div>

        {/* Age badge */}
        <div
          className={cn(
            'flex items-center gap-0.5 shrink-0 text-xs font-medium px-1.5 py-0.5 rounded',
            indicators.daysInPipeline > 14
              ? 'bg-red-900/50 text-red-400'
              : indicators.daysInPipeline > 7
                ? 'bg-amber-900/40 text-amber-400'
                : 'text-gray-600'
          )}
          title={`${indicators.daysInPipeline} jours dans le pipeline`}
        >
          <Clock size={9} />
          {indicators.daysInPipeline === 0 ? "Auj." : `${indicators.daysInPipeline}j`}
        </div>
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((tag, index) => (
            <span key={index} className="inline-block px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="text-xs text-gray-600">+{lead.tags.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
};
