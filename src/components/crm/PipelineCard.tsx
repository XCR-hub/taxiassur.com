import React, { useRef, useState, useEffect } from 'react';
import { Mail, Phone, MapPin, FileCheck, CreditCard, Clock, Building2, PenTool, AlertTriangle, Euro, Loader2, User } from 'lucide-react';
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
  assigneeName?: string;
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

const STATUS_ACCENT: Record<string, string> = {
  NOUVEAU_LEAD: '#f59e0b',
  COLLECTE_DOCUMENTS: '#fb923c',
  DEVIS: '#38bdf8',
  DECISION_CLIENT: '#c084fc',
  PAIEMENT: '#34d399',
  CONTRAT_SIGNATURE: '#60a5fa',
  CLIENT_ACTIF: '#4ade80',
  RELANCE: '#f97316',
  PERDU: '#6b7280',
  RECONTACT_PROGRAMME: '#fbbf24',
};

export const PipelineCard: React.FC<PipelineCardProps> = ({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  className,
  assigneeName
}) => {
  const statusInfo = PIPELINE_STATUSES[lead.status];
  const accentColor = STATUS_ACCENT[lead.status] || '#6b7280';
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

  const handleDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);

    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(3deg)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 50);
    setTimeout(() => document.body.removeChild(dragImage), 0);

    onDragStart?.();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setTimeout(() => { isDraggingRef.current = false; }, 100);
    onDragEnd?.();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) { e.preventDefault(); e.stopPropagation(); return; }
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx > 5 || dy > 5) { e.preventDefault(); return; }
    }
    onClick?.();
  };

  const docPct = Math.round((indicators.documentsValidated / indicators.documentsTotal) * 100);

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Lead: ${lead.full_name}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className={cn(
        'group relative overflow-hidden rounded-xl select-none transition-all duration-200 focus:outline-none',
        isDragging
          ? 'opacity-20 scale-95 cursor-grabbing'
          : 'cursor-grab hover:-translate-y-px',
        className
      )}
      style={{
        background: isDragging ? '#1e1e1e' : 'linear-gradient(145deg, #252525 0%, #202020 100%)',
        boxShadow: isDragging ? 'none' : `0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-200"
        style={{ backgroundColor: accentColor, opacity: isDragging ? 0.3 : 0.9 }}
      />

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
        style={{ boxShadow: `inset 0 0 0 1px ${accentColor}22`, background: `radial-gradient(ellipse at 0% 0%, ${accentColor}08 0%, transparent 60%)` }}
      />

      {/* Content */}
      <div className="px-3 pt-2.5 pb-2.5 pl-4">

        {/* Name + score */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm leading-tight truncate">
              {lead.full_name}
            </h3>
            {lead.company_name && (
              <p className="text-[11px] text-gray-500 truncate mt-0.5 leading-tight">{lead.company_name}</p>
            )}
          </div>
          {lead.quality_score ? (
            <div
              className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none"
              style={{
                background: lead.quality_score >= 80 ? 'rgba(74,222,128,0.12)' : lead.quality_score >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                color: lead.quality_score >= 80 ? '#4ade80' : lead.quality_score >= 60 ? '#fbbf24' : '#f87171',
                border: `1px solid ${lead.quality_score >= 80 ? 'rgba(74,222,128,0.2)' : lead.quality_score >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              {lead.quality_score}%
            </div>
          ) : null}
        </div>

        {/* Contact info */}
        <div className="space-y-[5px] mb-2.5">
          <div className="flex items-center gap-1.5">
            <Mail size={10} className="shrink-0 text-gray-600" />
            <span className="text-[11px] text-gray-400 truncate">{lead.email}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={10} className="shrink-0 text-gray-600" />
              <span className="text-[11px] text-gray-400 truncate">{lead.phone}</span>
            </div>
          )}
          {lead.city && (
            <div className="flex items-center gap-1.5">
              <MapPin size={10} className="shrink-0 text-gray-600" />
              <span className="text-[11px] text-gray-500 truncate">{lead.city}</span>
            </div>
          )}
        </div>

        {/* Relance alert */}
        {indicators.needsRelance && (
          <div
            className="flex items-center gap-1.5 mb-2.5 px-2 py-1.5 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertTriangle size={10} className="text-red-400 shrink-0" />
            <span className="text-[11px] text-red-400 font-medium">Relance — {indicators.lastInteractionDays}j sans contact</span>
          </div>
        )}

        {/* Document progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <FileCheck size={9} className="text-gray-600" />
              <span className="text-[10px] text-gray-600">Docs</span>
            </div>
            <span className={cn(
              'text-[10px] font-semibold',
              indicators.documentsValidated >= 7 ? 'text-green-400' : indicators.documentsValidated >= 4 ? 'text-yellow-400' : 'text-orange-400'
            )}>
              {indicators.documentsValidated}/{indicators.documentsTotal}
            </span>
          </div>
          <div className="h-1 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${docPct}%`,
                background: indicators.documentsValidated >= 7 ? '#4ade80' : indicators.documentsValidated >= 4 ? '#fbbf24' : '#fb923c'
              }}
            />
          </div>
        </div>

        {/* Status chips + age */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-wrap">

            {/* Companies */}
            <div
              className={cn(
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium',
                (indicators.companiesQuoted + indicators.companiesRefused) >= 5
                  ? 'bg-green-900/40 text-green-400'
                  : indicators.companiesQuoted > 0
                    ? 'bg-sky-900/40 text-sky-400'
                    : 'bg-white/[0.04] text-gray-600'
              )}
              title={`${indicators.companiesQuoted} devis, ${indicators.companiesRefused} refus`}
            >
              <Building2 size={8} />
              {indicators.companiesQuoted + indicators.companiesRefused}/{indicators.companiesTotal}
            </div>

            {indicators.hasSignature && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-900/40 text-blue-400">
                <PenTool size={8} />Signé
              </div>
            )}

            {indicators.downPaymentStatus === 'paid' && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-green-900/40 text-green-400">
                <Euro size={8} />Payé
              </div>
            )}
            {indicators.downPaymentStatus === 'pending' && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-yellow-900/30 text-yellow-400 animate-pulse">
                <Euro size={8} />Attente
              </div>
            )}
            {indicators.downPaymentStatus === 'required' && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-orange-900/30 text-orange-400">
                <CreditCard size={8} />Comptant
              </div>
            )}

            {indicators.pendingAutomations > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-900/40 text-blue-400 animate-pulse">
                <Loader2 size={8} className="animate-spin" />{indicators.pendingAutomations}
              </div>
            )}
          </div>

          {/* Age badge */}
          <div
            className={cn(
              'shrink-0 flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md',
              indicators.daysInPipeline > 14
                ? 'bg-red-900/30 text-red-400'
                : indicators.daysInPipeline > 7
                  ? 'bg-amber-900/20 text-amber-500'
                  : 'text-gray-600'
            )}
          >
            <Clock size={8} />
            {indicators.daysInPipeline === 0 ? 'Auj.' : `${indicators.daysInPipeline}j`}
          </div>
        </div>

        {lead.tags && lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="inline-block px-1.5 py-0.5 bg-white/[0.05] text-gray-400 text-[10px] rounded-md border border-white/[0.06]">
                {tag}
              </span>
            ))}
            {lead.tags.length > 2 && (
              <span className="text-[10px] text-gray-600">+{lead.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Assignee footer */}
        <div className="mt-2 pt-2 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {assigneeName ? (
            <>
              <div
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}40`, color: accentColor }}
              >
                {assigneeName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] text-gray-500 truncate">{assigneeName}</span>
            </>
          ) : (
            <>
              <div className="w-[18px] h-[18px] rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
                <User size={8} className="text-gray-600" />
              </div>
              <span className="text-[10px] text-gray-600 italic">Non attribue</span>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
