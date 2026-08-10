import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarCheck,
  Car,
  Clock,
  CreditCard,
  Euro,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  MapPin,
  PenTool,
  Phone,
  Upload,
  User,
  X,
} from "lucide-react";
import { CRMLead, PIPELINE_STATUSES, PipelineStatus } from "@/lib/crm-pipeline";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { withTimeout } from "@/lib/promise-timeout";

interface InsuranceCompanyOption {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
}

interface PipelineCardProps {
  lead: CRMLead;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  className?: string;
  assigneeName?: string;
  onStatusChange?: (leadId: string, newStatus: PipelineStatus) => void;
}

interface LeadIndicators {
  documentsValidated: number;
  documentsTotal: number;
  companiesQuoted: number;
  companiesRefused: number;
  companiesTotal: number;
  hasSignature: boolean;
  downPaymentStatus: "none" | "required" | "pending" | "paid";
  downPaymentAmount: number | null;
  daysInPipeline: number;
  needsRelance: boolean;
  lastInteractionDays: number;
  pendingAutomations: number;
  lastAutomationResult: "success" | "failed" | null;
  automationCount: number;
}

const STATUS_ACCENT: Record<string, string> = {
  NOUVEAU_LEAD: "#f59e0b",
  COLLECTE_DOCUMENTS: "#fb923c",
  DEVIS: "#38bdf8",
  DECISION_CLIENT: "#c084fc",
  PAIEMENT: "#34d399",
  CONTRAT_SIGNATURE: "#60a5fa",
  CLIENT_ACTIF: "#4ade80",
  RELANCE: "#f97316",
  PERDU: "#6b7280",
  RECONTACT_PROGRAMME: "#fbbf24",
};

export const PipelineCard: React.FC<PipelineCardProps> = ({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  className,
  assigneeName,
  onStatusChange,
}) => {
  const statusInfo = PIPELINE_STATUSES[lead.status];
  const accentColor = STATUS_ACCENT[lead.status] || "#6b7280";
  const isDraggingRef = useRef(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const [indicators, setIndicators] = useState<LeadIndicators>({
    documentsValidated: 0,
    documentsTotal: 9,
    companiesQuoted: 0,
    companiesRefused: 0,
    companiesTotal: 5,
    hasSignature: false,
    downPaymentStatus: "none",
    downPaymentAmount: null,
    daysInPipeline: 0,
    needsRelance: false,
    lastInteractionDays: 0,
    pendingAutomations: 0,
    lastAutomationResult: null,
    automationCount: 0,
  });

  useEffect(() => {
    const loadIndicators = async () => {
      try {
        const [
          docsResult,
          companyQuotesResult,
          contractResult,
          interactionsResult,
          automationsResult,
          leadDataResult,
        ] = await Promise.allSettled([
          supabase.from("crm_lead_documents").select("status").eq(
            "lead_id",
            lead.id,
          ),
          supabase.from("lead_company_quotes").select("status").eq(
            "lead_id",
            lead.id,
          ),
          supabase.from("lead_contracts").select(
            "status, down_payment_status, down_payment_amount",
          ).eq("lead_id", lead.id).limit(1),
          supabase.from("crm_interactions").select("created_at").eq(
            "lead_id",
            lead.id,
          ).order("created_at", { ascending: false }).limit(1),
          supabase.from("pipeline_action_queue").select("id").eq(
            "lead_id",
            lead.id,
          ).in("status", ["pending", "processing"]),
          supabase.from("crm_leads").select(
            "last_automation_result, automation_count",
          ).eq("id", lead.id).maybeSingle(),
        ]);

        const docs =
          (docsResult.status === "fulfilled" ? docsResult.value.data : null) ||
          [];
        const validatedDocs = docs.filter((d) =>
          d.status === "validated"
        ).length;
        const totalUploadedDocs = docs.length;

        const companyQuotes = (companyQuotesResult.status === "fulfilled"
          ? companyQuotesResult.value.data
          : null) || [];
        const quotedCompanies = companyQuotes.filter((q) =>
          q.status === "quote_submitted" || q.status === "validated"
        ).length;
        const refusedCompanies = companyQuotes.filter((q) =>
          q.status === "refused"
        ).length;

        const contract = contractResult.status === "fulfilled"
          ? contractResult.value.data?.[0]
          : null;
        const lastInteraction = interactionsResult.status === "fulfilled"
          ? interactionsResult.value.data?.[0]
          : null;
        const pendingAutomations = (automationsResult.status === "fulfilled"
          ? automationsResult.value.data?.length
          : null) || 0;
        const leadData = leadDataResult.status === "fulfilled"
          ? leadDataResult.value.data
          : null;

        const referenceDate = lead.first_request_at || lead.created_at;
        const daysInPipeline = Math.floor(
          (Date.now() - new Date(referenceDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const lastInteractionDays = lastInteraction
          ? Math.floor(
            (Date.now() - new Date(lastInteraction.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
          : daysInPipeline;

        let downPaymentStatus: "none" | "required" | "pending" | "paid" =
          "none";
        if (contract?.down_payment_status === "paid") {
          downPaymentStatus = "paid";
        } else if (contract?.down_payment_status === "pending") {
          downPaymentStatus = "pending";
        } else if (
          lead.status === "DOWN_PAYMENT_REQUIRED" || lead.status === "SIGNED"
        ) {
          downPaymentStatus = "required";
        }

        setIndicators({
          documentsValidated: totalUploadedDocs,
          documentsTotal: 9,
          companiesQuoted: quotedCompanies,
          companiesRefused: refusedCompanies,
          companiesTotal: 5,
          hasSignature: contract?.status === "signed",
          downPaymentStatus,
          downPaymentAmount: contract?.down_payment_amount || null,
          daysInPipeline,
          needsRelance: lastInteractionDays >= 3 &&
            !["ACTIVE_CLIENT", "LOST", "CANCELLED"].includes(lead.status),
          lastInteractionDays,
          pendingAutomations,
          lastAutomationResult: leadData?.last_automation_result as
            | "success"
            | "failed"
            | null,
          automationCount: leadData?.automation_count || 0,
        });
      } catch (error) {
        console.error("Error loading indicators:", error);
      }
    };

    loadIndicators();
  }, [lead.id, lead.created_at, lead.status]);

  const handleDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead.id);

    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = "0.8";
    dragImage.style.transform = "rotate(3deg)";
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

  const docPct = Math.round(
    (indicators.documentsValidated / indicators.documentsTotal) * 100,
  );

  const isRecontactProgramme = lead.status === "RECONTACT_PROGRAMME";
  const recontactDate = lead.recontact_scheduled_date
    ? new Date(lead.recontact_scheduled_date)
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isReadyToRecontact = isRecontactProgramme && recontactDate !== null &&
    recontactDate <= today;
  const daysUntilRecontact = recontactDate
    ? Math.ceil(
      (recontactDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )
    : null;

  const [movingToNew, setMovingToNew] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [pendingQuoteFile, setPendingQuoteFile] = useState<File | null>(null);
  const [companyOptions, setCompanyOptions] = useState<
    InsuranceCompanyOption[]
  >([]);
  const [uploadingQuote, setUploadingQuote] = useState(false);
  const dragCounterRef = useRef(0);

  const handleSetRecontactDate = async (date: string) => {
    setSavingDate(true);
    try {
      await supabase
        .from("crm_leads")
        .update({
          recontact_scheduled_date: date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      lead.recontact_scheduled_date = date;
      setShowDatePicker(false);
    } catch (err) {
      console.error("Erreur sauvegarde date recontact:", err);
    } finally {
      setSavingDate(false);
    }
  };

  const handleQuickDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    handleSetRecontactDate(d.toISOString().split("T")[0]);
  };

  useEffect(() => {
    if (!showDatePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(e.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatePicker]);

  const isReactivatedFromRecontact = !isRecontactProgramme &&
    (lead.recontact_attempts || 0) > 0;

  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes("Files");

  const handleCardDragEnter = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsFileDragOver(true);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsFileDragOver(false);
    }
  };

  const handleCardDrop = async (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsFileDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      (file.type && file.type !== "application/pdf")
    ) {
      toast.error("Seuls les devis PDF sont acceptés");
      return;
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      toast.error("Le devis doit être un PDF non vide de 10 Mo maximum");
      return;
    }

    if (companyOptions.length === 0) {
      const { data, error } = await supabase
        .from("insurance_companies")
        .select("id, name, code, logo_url")
        .eq("is_active", true)
        .order("priority_order", { ascending: true });
      if (error) {
        console.error("Erreur chargement compagnies:", error);
        toast.error("Impossible de charger les compagnies");
        return;
      }
      setCompanyOptions(data || []);
    }

    setPendingQuoteFile(file);
  };

  const closeQuoteModal = () => {
    if (uploadingQuote) return;
    setPendingQuoteFile(null);
  };

  const handleUploadQuote = async (companyId: string) => {
    if (!pendingQuoteFile) return;
    setUploadingQuote(true);
    try {
      const safeName = pendingQuoteFile.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w.\-]+/g, "_")
        .replace(/_+/g, "_");
      const filePath = lead.id + "/" + companyId + "/" + crypto.randomUUID() +
        "_" + safeName.slice(0, 160);

      const { error: uploadError } = await withTimeout(
        supabase.storage.from("contract-documents").upload(
          filePath,
          pendingQuoteFile,
          {
            contentType: "application/pdf",
            upsert: false,
          },
        ),
        60_000,
      );
      if (uploadError) throw new Error(uploadError.message);

      const submittedAt = new Date().toISOString();
      const { error: insertError } = await withTimeout(
        supabase.from("lead_company_quotes").insert({
          lead_id: lead.id,
          company_id: companyId,
          insurance_company_id: companyId,
          quote_file_url: filePath,
          quote_pdf_url: filePath,
          status: "quote_submitted",
          quote_status: "quote_submitted",
          submitted_at: submittedAt,
        }),
        20_000,
      );

      if (insertError) {
        await supabase.storage.from("contract-documents").remove([filePath]);
        throw new Error(insertError.message);
      }

      const company = companyOptions.find((c) => c.id === companyId);
      toast.success(`Devis ${company?.name || ""} ajouté`);
      setPendingQuoteFile(null);
    } catch (err: any) {
      console.error("Erreur upload devis:", err);
      toast.error(`Erreur: ${err.message || err}`);
    } finally {
      setUploadingQuote(false);
    }
  };

  const handleMoveToNew = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movingToNew) return;
    setMovingToNew(true);
    try {
      await supabase
        .from("crm_leads")
        .update({
          status: "NOUVEAU_LEAD",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      onStatusChange?.(lead.id, "NOUVEAU_LEAD");
    } catch (err) {
      console.error("Erreur passage nouveau lead:", err);
    } finally {
      setMovingToNew(false);
    }
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragEnter={handleCardDragEnter}
      onDragOver={handleCardDragOver}
      onDragLeave={handleCardDragLeave}
      onDrop={handleCardDrop}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Lead: ${lead.full_name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative overflow-hidden rounded-xl select-none transition-all duration-200 focus:outline-none",
        isDragging
          ? "opacity-20 scale-95 cursor-grabbing"
          : "cursor-grab hover:-translate-y-px",
        className,
      )}
      style={{
        background: isDragging ? "#f5f6f8" : "#ffffff",
        boxShadow: isDragging
          ? "none"
          : `0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.06)`,
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-200"
        style={{
          backgroundColor: accentColor,
          opacity: isDragging ? 0.3 : 0.9,
        }}
      />

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
        style={{
          boxShadow: `inset 0 0 0 1px ${accentColor}30`,
          background:
            `radial-gradient(ellipse at 0% 0%, ${accentColor}06 0%, transparent 60%)`,
        }}
      />

      {/* Content */}
      <div className="px-3 pt-2.5 pb-2.5 pl-4">
        {/* Name + score */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {lead.full_name}
              </h3>
              {lead.vehicle_type && (
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide leading-none",
                    lead.vehicle_type.toLowerCase() === "vtc"
                      ? "bg-sky-100 text-sky-700 border border-sky-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200",
                  )}
                >
                  <Car size={8} />
                  {lead.vehicle_type}
                </span>
              )}
            </div>
            {lead.company_name && (
              <p className="text-[11px] text-gray-500 truncate mt-0.5 leading-tight">
                {lead.company_name}
              </p>
            )}
          </div>
          {lead.quality_score
            ? (
              <div
                className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none"
                style={{
                  background: lead.quality_score >= 80
                    ? "rgba(22,163,74,0.1)"
                    : lead.quality_score >= 60
                    ? "rgba(217,119,6,0.1)"
                    : "rgba(220,38,38,0.1)",
                  color: lead.quality_score >= 80
                    ? "#16a34a"
                    : lead.quality_score >= 60
                    ? "#d97706"
                    : "#dc2626",
                  border: `1px solid ${
                    lead.quality_score >= 80
                      ? "rgba(22,163,74,0.25)"
                      : lead.quality_score >= 60
                      ? "rgba(217,119,6,0.25)"
                      : "rgba(220,38,38,0.25)"
                  }`,
                }}
              >
                {lead.quality_score}%
              </div>
            )
            : null}
        </div>

        {/* Contact info */}
        <div className="space-y-[5px] mb-2.5">
          <div className="flex items-center gap-1.5">
            <Mail size={10} className="shrink-0 text-gray-400" />
            <span className="text-[11px] text-gray-600 truncate">
              {lead.email}
            </span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={10} className="shrink-0 text-gray-400" />
              <span className="text-[11px] text-gray-600 truncate">
                {lead.phone}
              </span>
            </div>
          )}
          {lead.city && (
            <div className="flex items-center gap-1.5">
              <MapPin size={10} className="shrink-0 text-gray-400" />
              <span className="text-[11px] text-gray-500 truncate">
                {lead.city}
              </span>
            </div>
          )}
        </div>

        {/* Recontact — date + badge */}
        {isRecontactProgramme && (
          <div className="mb-2.5 relative">
            {isReadyToRecontact
              ? (
                <div
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg animate-pulse"
                  style={{
                    background: "rgba(22,163,74,0.1)",
                    border: "1px solid rgba(22,163,74,0.35)",
                  }}
                >
                  <CalendarCheck
                    size={12}
                    className="text-green-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-green-700 leading-tight">
                      Pret a recontacter !
                    </p>
                    <p className="text-[10px] text-green-600 leading-tight">
                      {recontactDate!.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )
              : recontactDate
              ? (
                <div
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: "rgba(251,191,36,0.08)",
                    border: "1px solid rgba(251,191,36,0.25)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDatePicker(!showDatePicker);
                  }}
                >
                  <Calendar size={10} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] text-amber-700 font-medium">
                    {daysUntilRecontact !== null && daysUntilRecontact > 0
                      ? `Recontact dans ${daysUntilRecontact}j — ${
                        recontactDate.toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })
                      }`
                      : `Recontact le ${
                        recontactDate.toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      }`}
                  </span>
                </div>
              )
              : (
                <div
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  style={{
                    background: "rgba(107,114,128,0.08)",
                    border: "1px solid rgba(107,114,128,0.2)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDatePicker(!showDatePicker);
                  }}
                >
                  <Calendar size={10} className="text-gray-400 shrink-0" />
                  <span className="text-[11px] text-gray-500">
                    Date de recontact non definie
                  </span>
                </div>
              )}

            {showDatePicker && (
              <div
                ref={datePickerRef}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[11px] font-semibold text-gray-700 mb-2">
                  Programmer le recontact
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    { label: "1 mois", months: 1 },
                    { label: "3 mois", months: 3 },
                    { label: "6 mois", months: 6 },
                    { label: "1 an", months: 12 },
                  ].map((opt) => (
                    <button
                      key={opt.months}
                      onClick={() => handleQuickDate(opt.months)}
                      disabled={savingDate}
                      className="px-2 py-1 text-[10px] font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split(
                    "T",
                  )[0]}
                  className="w-full text-[11px] px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                  onChange={(e) => {
                    if (e.target.value) handleSetRecontactDate(e.target.value);
                  }}
                />
                {savingDate && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Loader2
                      size={10}
                      className="animate-spin text-amber-500"
                    />
                    <span className="text-[10px] text-gray-500">
                      Enregistrement...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Badge recontact programme for reactivated leads */}
        {isReactivatedFromRecontact && (
          <div
            className="flex items-center gap-1.5 mb-2.5 px-2.5 py-1.5 rounded-lg"
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.25)",
            }}
          >
            <CalendarCheck size={10} className="text-blue-600 shrink-0" />
            <span className="text-[11px] text-blue-700 font-medium">
              Contact programme
            </span>
          </div>
        )}

        {/* Relance alert */}
        {indicators.needsRelance && !isRecontactProgramme && (
          <div
            className="flex items-center gap-1.5 mb-2.5 px-2 py-1.5 rounded-lg"
            style={{
              background: "rgba(220,38,38,0.07)",
              border: "1px solid rgba(220,38,38,0.2)",
            }}
          >
            <AlertTriangle size={10} className="text-red-600 shrink-0" />
            <span className="text-[11px] text-red-600 font-medium">
              Relance — {indicators.lastInteractionDays}j sans contact
            </span>
          </div>
        )}

        {/* Document progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <FileCheck size={9} className="text-gray-400" />
              <span className="text-[10px] text-gray-500">Docs</span>
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold",
                indicators.documentsValidated >= indicators.documentsTotal
                  ? "text-green-600"
                  : indicators.documentsValidated >= 2
                  ? "text-amber-600"
                  : "text-orange-500",
              )}
            >
              {indicators.documentsValidated}/{indicators.documentsTotal}
            </span>
          </div>
          <div
            className="h-1 bg-gray-150 rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(docPct, 100)}%`,
                background:
                  indicators.documentsValidated >= indicators.documentsTotal
                    ? "#16a34a"
                    : indicators.documentsValidated >= 2
                    ? "#d97706"
                    : "#ea580c",
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
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium",
                (indicators.companiesQuoted + indicators.companiesRefused) >= 5
                  ? "bg-green-100 text-green-700"
                  : indicators.companiesQuoted > 0
                  ? "bg-sky-100 text-sky-700"
                  : "bg-gray-100 text-gray-500",
              )}
              title={`${indicators.companiesQuoted} devis, ${indicators.companiesRefused} refus`}
            >
              <Building2 size={8} />
              {indicators.companiesQuoted +
                indicators.companiesRefused}/{indicators.companiesTotal}
            </div>

            {indicators.hasSignature && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-700">
                <PenTool size={8} />Signé
              </div>
            )}

            {indicators.downPaymentStatus === "paid" && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-green-100 text-green-700">
                <Euro size={8} />Payé
              </div>
            )}
            {indicators.downPaymentStatus === "pending" && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-700 animate-pulse">
                <Euro size={8} />Attente
              </div>
            )}
            {indicators.downPaymentStatus === "required" && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-orange-100 text-orange-700">
                <CreditCard size={8} />Comptant
              </div>
            )}

            {indicators.pendingAutomations > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-sky-100 text-sky-700 animate-pulse">
                <Loader2 size={8} className="animate-spin" />
                {indicators.pendingAutomations}
              </div>
            )}
          </div>

          {/* Age badge + date */}
          <div className="shrink-0 flex flex-col items-end gap-0.5">
            <div
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                indicators.daysInPipeline > 14
                  ? "bg-red-100 text-red-700"
                  : indicators.daysInPipeline > 7
                  ? "bg-amber-100 text-amber-700"
                  : "text-gray-500",
              )}
            >
              <Clock size={8} />
              {indicators.daysInPipeline === 0
                ? "Auj."
                : `${indicators.daysInPipeline}j`}
            </div>
            <span className="text-[9px] text-gray-400 leading-none">
              {new Date(lead.first_request_at || lead.created_at)
                .toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                })}
            </span>
          </div>
        </div>

        {lead.tags && lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-md border border-gray-200"
              >
                {tag}
              </span>
            ))}
            {lead.tags.length > 2 && (
              <span className="text-[10px] text-gray-400">
                +{lead.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Quick recontact action */}
        {isReadyToRecontact && (
          <button
            onClick={handleMoveToNew}
            disabled={movingToNew}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "#fff",
              boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
            }}
          >
            {movingToNew
              ? <Loader2 size={11} className="animate-spin" />
              : <ArrowRight size={11} />}
            {movingToNew ? "Déplacement..." : "Remettre en Nouveau Lead"}
          </button>
        )}

        {/* Assignee footer */}
        <div
          className="mt-2 pt-2 flex items-center gap-1.5"
          style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
        >
          {assigneeName
            ? (
              <>
                <div
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}35`,
                    color: accentColor,
                  }}
                >
                  {assigneeName.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] text-gray-500 truncate">
                  {assigneeName}
                </span>
              </>
            )
            : (
              <>
                <div className="w-[18px] h-[18px] rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <User size={8} className="text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-400 italic">
                  Non attribue
                </span>
              </>
            )}
        </div>
      </div>

      {isFileDragOver && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center rounded-xl pointer-events-none"
          style={{
            background: "rgba(56,189,248,0.12)",
            border: "2px dashed #38bdf8",
          }}
        >
          <div className="flex flex-col items-center gap-1.5 text-sky-700">
            <Upload size={20} />
            <span className="text-[11px] font-bold">Déposer le devis</span>
          </div>
        </div>
      )}

      {pendingQuoteFile && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={closeQuoteModal}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-sky-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {pendingQuoteFile.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Pour {lead.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeQuoteModal}
                disabled={uploadingQuote}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-[12px] font-medium text-gray-700 mb-2">
                Choisir la compagnie d'assurance :
              </p>
              <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto">
                {companyOptions.length === 0
                  ? (
                    <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                      <Loader2 size={14} className="animate-spin mr-2" />
                      Chargement...
                    </div>
                  )
                  : companyOptions.map((c) => (
                    <button
                      key={c.id}
                      disabled={uploadingQuote}
                      onClick={() => handleUploadQuote(c.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-sky-400 hover:bg-sky-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {c.logo_url
                        ? (
                          <img
                            src={c.logo_url}
                            alt={c.name}
                            className="w-7 h-7 object-contain shrink-0"
                          />
                        )
                        : (
                          <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center shrink-0">
                            <Building2 size={14} className="text-gray-400" />
                          </div>
                        )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">
                          {c.code}
                        </p>
                      </div>
                      {uploadingQuote && (
                        <Loader2
                          size={14}
                          className="animate-spin text-sky-500"
                        />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
