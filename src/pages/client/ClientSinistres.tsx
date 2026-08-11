import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  Car,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Loader,
  type LucideIcon,
  MapPin,
  Phone,
  Plus,
  Shield,
  User,
  Wrench,
  X,
} from "lucide-react";
import ClientLayout from "../../components/client/ClientLayout";
import SEOHead from "../../components/SEOHead";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { getClientAccessToken } from "@/lib/client-access";
import { withTimeout } from "@/lib/promise-timeout";

interface InsuranceCompanyLink {
  label: string;
  url: string;
  type?: string;
  description?: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  contract_number: string | null;
  useful_links: InsuranceCompanyLink[];
}

interface ClaimEvent {
  id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
}

interface Claim {
  id: string;
  claim_number: string | null;
  incident_type: string | null;
  claim_type: string;
  incident_date: string;
  incident_location: string | null;
  incident_description: string;
  claim_status: string | null;
  client_visible_status: string | null;
  client_visible_notes: string | null;
  estimated_amount: number | null;
  indemnisation_amount: number | null;
  indemnisation_date: string | null;
  indemnisation_paid_at: string | null;
  expert_name: string | null;
  expert_company: string | null;
  expert_phone: string | null;
  expert_appointment_date: string | null;
  expertise_garage_name: string | null;
  expertise_garage_address: string | null;
  expertise_garage_phone: string | null;
  expertise_date: string | null;
  repair_garage_name: string | null;
  repair_garage_address: string | null;
  repair_garage_phone: string | null;
  repair_start_date: string | null;
  repair_end_date: string | null;
  third_party_involved: boolean;
  police_report_number: string | null;
  declared_at: string;
  created_at: string;
  events: ClaimEvent[];
}

const INCIDENT_TYPES = [
  { value: "ACCIDENT_RESPONSABLE", label: "Accident responsable" },
  { value: "ACCIDENT_NON_RESPONSABLE", label: "Accident non responsable" },
  { value: "BRIS_GLACE", label: "Bris de glace" },
  { value: "VOL", label: "Vol ou tentative de vol" },
  { value: "INCENDIE", label: "Incendie" },
  { value: "CATASTROPHE_NATURELLE", label: "Catastrophe naturelle" },
  { value: "VANDALISME", label: "Vandalisme / dégradation" },
  { value: "DOMMAGES_COLLISION", label: "Dommages / collision" },
  { value: "ASSISTANCE", label: "Assistance" },
  { value: "AUTRE", label: "Autre incident" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: LucideIcon; step: number }
> = {
  open: {
    label: "Déclaré",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    icon: FileText,
    step: 1,
  },
  DECLARED: {
    label: "Déclaré",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    icon: FileText,
    step: 1,
  },
  DOCUMENTS_PENDING: {
    label: "Documents attendus",
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: Clock,
    step: 1,
  },
  EXPERT_MISSIONED: {
    label: "Expert missionné",
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: User,
    step: 2,
  },
  EXPERTISE_SCHEDULED: {
    label: "Expertise planifiée",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    icon: Calendar,
    step: 2,
  },
  EXPERTISE_DONE: {
    label: "Expertise réalisée",
    bg: "bg-teal-50",
    text: "text-teal-700",
    icon: CheckCircle,
    step: 3,
  },
  UNDER_REVIEW: {
    label: "En cours d'instruction",
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: Clock,
    step: 3,
  },
  INDEMNISATION_PROPOSED: {
    label: "Proposition d'indemnisation",
    bg: "bg-orange-50",
    text: "text-orange-700",
    icon: DollarSign,
    step: 4,
  },
  REPAIR_IN_PROGRESS: {
    label: "Réparation en cours",
    bg: "bg-purple-50",
    text: "text-purple-700",
    icon: Wrench,
    step: 3,
  },
  APPROVED: {
    label: "Approuvé",
    bg: "bg-green-50",
    text: "text-green-700",
    icon: CheckCircle,
    step: 4,
  },
  REJECTED: {
    label: "Refusé",
    bg: "bg-red-50",
    text: "text-red-700",
    icon: AlertCircle,
    step: 5,
  },
  PAID: {
    label: "Indemnisé",
    bg: "bg-green-50",
    text: "text-green-700",
    icon: CheckCircle,
    step: 5,
  },
  CLOSED: {
    label: "Clôturé",
    bg: "bg-gray-50",
    text: "text-gray-600",
    icon: CheckCircle,
    step: 5,
  },
};

const PIPELINE_STEPS = [
  { step: 1, label: "Déclaration", icon: FileText },
  { step: 2, label: "Expertise", icon: User },
  { step: 3, label: "Instruction", icon: Clock },
  { step: 4, label: "Décision", icon: DollarSign },
  { step: 5, label: "Clôture", icon: CheckCircle },
];

const EVENT_ICONS: Record<string, LucideIcon> = {
  declaration: FileText,
  status_update: Clock,
  expert_assigned: User,
  appointment: Calendar,
  expertise: Car,
  repair: Wrench,
  indemnisation: DollarSign,
  document: FileText,
  closure: CheckCircle,
  note: FileText,
};

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase() || "DECLARED"] ||
    STATUS_CONFIG.DECLARED;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow(
  { icon: Icon, label, value }: {
    icon: LucideIcon;
    label: string;
    value: string | null;
  },
) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-xs text-gray-500">{label} :</span>
        <span className="text-xs font-medium text-gray-800">{value}</span>
      </div>
    </div>
  );
}

export default function ClientSinistres() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = getClientAccessToken(searchParams.get("token"));

  const [claims, setClaims] = useState<Claim[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [company, setCompany] = useState<InsuranceCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  const [form, setForm] = useState({
    incident_type: "",
    incident_date: "",
    description: "",
    location: "",
    third_party_involved: false,
    third_party_info: "",
    police_report: false,
    police_report_number: "",
  });

  useEffect(() => {
    if (!accessToken) {
      navigate("/espace-client");
      return;
    }
    loadData();
  }, [accessToken, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data, error }, { data: companyData, error: companyError }] =
        await withTimeout(
          Promise.all([
            supabase.rpc("get_client_claims_by_token", {
              p_token: accessToken,
            }),
            supabase.rpc("get_client_insurance_company_by_token", {
              p_token: accessToken,
            }),
          ]),
          20_000,
        );
      if (error) throw error;
      if (companyError) throw companyError;
      if (!data?.success) {
        throw new Error(data?.error || "Accès sinistres indisponible");
      }
      if (data?.success) {
        setLeadId(data.lead_id || null);
        setClaims((data.claims || []) as Claim[]);
      }
      if (companyData?.success && companyData.company) {
        const c = companyData.company;
        setCompany({
          id: c.id,
          name: c.name,
          code: c.code,
          logo_url: c.logo_url,
          contract_number: c.contract_number,
          useful_links: Array.isArray(c.useful_links) ? c.useful_links : [],
        });
      } else {
        setCompany(null);
      }
    } catch (err) {
      logger.error("Error loading claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !leadId || !form.incident_type || !form.incident_date || !form.description
    ) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data, error } = await withTimeout(
        supabase.rpc("insert_client_claim_by_token_v2", {
          p_token: accessToken,
          p_incident_type: form.incident_type,
          p_incident_date: form.incident_date,
          p_incident_description: form.description,
          p_incident_location: form.location || null,
          p_third_party_involved: form.third_party_involved,
          p_third_party_info: form.third_party_involved
            ? form.third_party_info
            : null,
          p_police_report_number: form.police_report
            ? form.police_report_number
            : null,
        }),
        20_000,
      );
      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.error || "Erreur lors de la déclaration");
      }
      setSubmitSuccess(true);
      setShowForm(false);
      setForm({
        incident_type: "",
        incident_date: "",
        description: "",
        location: "",
        third_party_involved: false,
        third_party_info: "",
        police_report: false,
        police_report_number: "",
      });
      await loadData();
      setTimeout(() => setSubmitSuccess(false), 8000);
    } catch (err) {
      setSubmitError(err.message || "Erreur lors de la déclaration");
    } finally {
      setSubmitting(false);
    }
  };

  const activeClaims = claims.filter((c) =>
    !["CLOSED", "REJECTED", "PAID"].includes(
      (c.claim_status || "DECLARED").toUpperCase(),
    )
  );
  const closedClaims = claims.filter((c) =>
    ["CLOSED", "REJECTED", "PAID"].includes(
      (c.claim_status || "DECLARED").toUpperCase(),
    )
  );

  const renderClaim = (claim: Claim, closed = false) => {
    const isExpanded = expandedClaim === claim.id;
    const status = (claim.claim_status || "DECLARED").toUpperCase();
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DECLARED;
    const currentStep = cfg.step;
    const incidentLabel =
      INCIDENT_TYPES.find((t) =>
        t.value === (claim.incident_type || claim.claim_type)
      )?.label || claim.incident_type || claim.claim_type;
    const hasExpert = !!(claim.expert_name || claim.expert_company);
    const hasExpertiseGarage = !!claim.expertise_garage_name;
    const hasRepairGarage = !!claim.repair_garage_name;
    const hasIndemnisation = claim.indemnisation_amount != null;

    return (
      <div
        key={claim.id}
        className={`bg-white rounded-xl border ${
          closed ? "border-gray-100 opacity-80" : "border-gray-200 shadow-sm"
        } overflow-hidden`}
      >
        <div
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpandedClaim(isExpanded ? null : claim.id)}
        >
          <div
            className={`w-10 h-10 ${
              closed ? "bg-gray-100" : "bg-yellow-100"
            } rounded-xl flex items-center justify-center flex-shrink-0`}
          >
            <Shield
              size={18}
              className={closed ? "text-gray-400" : "text-yellow-600"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-gray-900 text-sm">
                {incidentLabel}
              </span>
              <StatusBadge status={claim.claim_status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                {fmtDate(claim.incident_date)}
              </span>
              {claim.claim_number && (
                <span className="flex items-center gap-1">
                  <FileText size={10} />N° {claim.claim_number}
                </span>
              )}
              {claim.incident_location && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {claim.incident_location}
                </span>
              )}
            </div>
          </div>
          {isExpanded
            ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
            : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100">
            {/* Progress */}
            {!closed && (
              <div className="px-5 pt-5 pb-1">
                <div className="flex items-start gap-0">
                  {PIPELINE_STEPS.map((ps, idx) => {
                    const done = ps.step < currentStep;
                    const active = ps.step === currentStep;
                    const Icon = ps.icon;
                    return (
                      <div key={ps.step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center
                            ${
                              done
                                ? "bg-green-500"
                                : active
                                ? "bg-yellow-500 ring-2 ring-yellow-200"
                                : "bg-gray-100"
                            }`}
                          >
                            {done
                              ? <CheckCircle size={14} className="text-white" />
                              : (
                                <Icon
                                  size={13}
                                  className={active
                                    ? "text-white"
                                    : "text-gray-400"}
                                />
                              )}
                          </div>
                          <span
                            className={`text-xs mt-1 font-medium text-center leading-tight w-full ${
                              active
                                ? "text-yellow-700"
                                : done
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            {ps.label}
                          </span>
                        </div>
                        {idx < PIPELINE_STEPS.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 mx-1 mb-5 rounded ${
                              done ? "bg-green-400" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-5 space-y-5">
              {/* Admin message */}
              {claim.client_visible_status && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">
                    Mise à jour de votre dossier
                  </p>
                  <p className="text-sm text-blue-900 font-medium">
                    {claim.client_visible_status}
                  </p>
                  {claim.client_visible_notes && (
                    <p className="text-xs text-blue-700 mt-2 leading-relaxed">
                      {claim.client_visible_notes}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Description de l'incident
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {claim.incident_description}
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {claim.third_party_involved && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User size={10} />Tiers impliqué
                    </span>
                  )}
                  {claim.police_report_number && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <FileText size={10} />PV n° {claim.police_report_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Tracking blocks grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {hasExpert && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <User size={11} className="text-blue-500" />Expert
                      missionné
                    </p>
                    <div className="space-y-1.5">
                      <InfoRow
                        icon={User}
                        label="Expert"
                        value={[claim.expert_name, claim.expert_company].filter(
                          Boolean,
                        ).join(" — ")}
                      />
                      <InfoRow
                        icon={Phone}
                        label="Téléphone"
                        value={claim.expert_phone}
                      />
                      <InfoRow
                        icon={Calendar}
                        label="Rendez-vous"
                        value={fmtDateTime(claim.expert_appointment_date)}
                      />
                    </div>
                  </div>
                )}

                {hasExpertiseGarage && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Car size={11} className="text-cyan-500" />Garage
                      d'expertise
                    </p>
                    <div className="space-y-1.5">
                      <InfoRow
                        icon={Building2}
                        label="Garage"
                        value={claim.expertise_garage_name}
                      />
                      <InfoRow
                        icon={MapPin}
                        label="Adresse"
                        value={claim.expertise_garage_address}
                      />
                      <InfoRow
                        icon={Phone}
                        label="Téléphone"
                        value={claim.expertise_garage_phone}
                      />
                      <InfoRow
                        icon={Calendar}
                        label="Date expertise"
                        value={fmtDate(claim.expertise_date)}
                      />
                    </div>
                  </div>
                )}

                {hasRepairGarage && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Wrench size={11} className="text-purple-500" />Garage de
                      réparation
                    </p>
                    <div className="space-y-1.5">
                      <InfoRow
                        icon={Building2}
                        label="Garage"
                        value={claim.repair_garage_name}
                      />
                      <InfoRow
                        icon={MapPin}
                        label="Adresse"
                        value={claim.repair_garage_address}
                      />
                      <InfoRow
                        icon={Phone}
                        label="Téléphone"
                        value={claim.repair_garage_phone}
                      />
                      <InfoRow
                        icon={Calendar}
                        label="Début"
                        value={fmtDate(claim.repair_start_date)}
                      />
                      <InfoRow
                        icon={Calendar}
                        label="Fin prévue"
                        value={fmtDate(claim.repair_end_date)}
                      />
                    </div>
                  </div>
                )}

                {hasIndemnisation && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <DollarSign size={11} />Indemnisation
                    </p>
                    <p className="text-2xl font-bold text-green-800 mb-2">
                      {claim.indemnisation_amount?.toFixed(2)} €
                    </p>
                    <div className="space-y-1.5">
                      <InfoRow
                        icon={Calendar}
                        label="Date proposition"
                        value={fmtDate(claim.indemnisation_date)}
                      />
                      {claim.indemnisation_paid_at && (
                        <InfoRow
                          icon={CheckCircle}
                          label="Paiement effectué"
                          value={fmtDate(claim.indemnisation_paid_at)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {claim.events && claim.events.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                    <Clock size={11} />Suivi de votre dossier
                  </p>
                  <div className="relative space-y-3 pl-6">
                    <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200" />
                    {claim.events.map((ev, idx) => {
                      const EvIcon = EVENT_ICONS[ev.event_type] || Clock;
                      const isLast = idx === claim.events.length - 1;
                      return (
                        <div key={ev.id} className="relative">
                          <div
                            className={`absolute -left-6 top-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white
                            ${isLast ? "bg-yellow-500" : "bg-gray-300"}`}
                          >
                            <EvIcon
                              size={9}
                              className={isLast
                                ? "text-white"
                                : "text-gray-500"}
                            />
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              isLast
                                ? "bg-yellow-50 border border-yellow-200"
                                : "bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm font-semibold ${
                                  isLast ? "text-yellow-900" : "text-gray-800"
                                }`}
                              >
                                {ev.title}
                              </p>
                              <p className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                                {fmtDateTime(ev.event_date)}
                              </p>
                            </div>
                            {ev.description && (
                              <p
                                className={`text-xs mt-1 leading-relaxed ${
                                  isLast ? "text-yellow-800" : "text-gray-600"
                                }`}
                              >
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <SEOHead
        title="Mes Sinistres - Espace Client TaxiAssur"
        description="Déclarez et suivez vos sinistres"
        noIndex={true}
      />
      <ClientLayout email={userData?.email || ""}>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mes Sinistres
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Déclarez et suivez l'avancement de vos dossiers sinistres
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all shadow-sm flex-shrink-0"
              >
                <Plus size={16} />
                Déclarer un sinistre
              </button>
            )}
          </div>

          {submitSuccess && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800 text-sm">
                  Sinistre déclaré avec succès
                </p>
                <p className="text-green-700 text-xs mt-0.5">
                  Notre équipe prend en charge votre dossier. Vous serez informé
                  de chaque avancement par email.
                </p>
              </div>
            </div>
          )}

          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div>
                  <h2 className="font-bold text-gray-900">
                    Déclarer un sinistre
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Notre équipe vous contactera dans les 24h ouvrées
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSubmitError(null);
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {submitError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle
                      size={14}
                      className="text-red-600 flex-shrink-0"
                    />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Type d'incident <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.incident_type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          incident_type: e.target.value,
                        }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
                    >
                      <option value="">Sélectionnez...</option>
                      {INCIDENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Date de l'incident <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split("T")[0]}
                      value={form.incident_date}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          incident_date: e.target.value,
                        }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Lieu de l'incident
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Paris 15ème, Boulevard du Montparnasse"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Description des faits{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Décrivez précisément les circonstances de l'incident..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.third_party_involved}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            third_party_involved: e.target.checked,
                          }))}
                        className="w-4 h-4 accent-yellow-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Tiers impliqué
                      </span>
                    </label>
                    {form.third_party_involved && (
                      <input
                        type="text"
                        placeholder="Nom, prénom, plaque du tiers..."
                        value={form.third_party_info}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            third_party_info: e.target.value,
                          }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.police_report}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            police_report: e.target.checked,
                          }))}
                        className="w-4 h-4 accent-yellow-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Procès-verbal établi
                      </span>
                    </label>
                    {form.police_report && (
                      <input
                        type="text"
                        placeholder="Numéro du PV"
                        value={form.police_report_number}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            police_report_number: e.target.value,
                          }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                  Vous recevrez une confirmation par email. Notre équipe vous
                  contactera dans les 24h ouvrées.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setSubmitError(null);
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.incident_type ||
                      !form.incident_date || !form.description}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-lg transition-all"
                  >
                    {submitting
                      ? (
                        <>
                          <Loader size={14} className="animate-spin" />Envoi...
                        </>
                      )
                      : (
                        <>
                          <ChevronRight size={14} />Déclarer le sinistre
                        </>
                      )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading
            ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div
                  className="w-10 h-10 rounded-full animate-spin mx-auto mb-3"
                  style={{
                    border: "3px solid #fbbf24",
                    borderTopColor: "transparent",
                  }}
                />
                <p className="text-sm text-gray-500">
                  Chargement de vos sinistres...
                </p>
              </div>
            )
            : claims.length === 0
            ? (
              <>
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">
                        Aucun sinistre en cours
                      </h2>
                      <p className="text-sm opacity-90">
                        Excellente nouvelle ! Vous n'avez aucun sinistre à
                        traiter.
                      </p>
                    </div>
                  </div>
                </div>

                {!showForm && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h2 className="font-bold text-gray-900 mb-4">
                      Comment déclarer un sinistre ?
                    </h2>
                    <div className="grid sm:grid-cols-3 gap-5">
                      {[
                        {
                          step: "1",
                          title: "Déclarez en ligne",
                          desc:
                            "Formulaire en 3 minutes depuis votre espace client",
                        },
                        {
                          step: "2",
                          title: "Suivi en temps réel",
                          desc:
                            "Expert missionné, expertise, garage : tout est visible ici",
                        },
                        {
                          step: "3",
                          title: "Indemnisation",
                          desc:
                            "Notifié dès la proposition et le versement de votre indemnité",
                        },
                      ].map(({ step, title, desc }) => (
                        <div key={step} className="flex gap-4">
                          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-yellow-700 text-sm">
                            {step}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm mb-0.5">
                              {title}
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
            : (
              <>
                {activeClaims.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      Sinistres en cours ({activeClaims.length})
                    </h2>
                    {activeClaims.map((c) => renderClaim(c, false))}
                  </div>
                )}
                {closedClaims.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold text-gray-500 flex items-center gap-2">
                      <CheckCircle size={15} className="text-gray-400" />
                      Historique ({closedClaims.length})
                    </h2>
                    {closedClaims.map((c) => renderClaim(c, true))}
                  </div>
                )}
              </>
            )}

          {company && claims.length > 0 && company.useful_links.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                {company.logo_url
                  ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="h-9 w-auto object-contain"
                    />
                  )
                  : (
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 size={18} className="text-blue-600" />
                    </div>
                  )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 text-sm">
                    Documents de votre assureur — {company.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {company.contract_number
                      ? (
                        <>
                          Contrat n°{" "}
                          <span className="font-medium text-gray-700">
                            {company.contract_number}
                          </span>
                        </>
                      )
                      : "Documents officiels mis à votre disposition"}
                  </p>
                </div>
              </div>
              <div className="p-5 grid sm:grid-cols-2 gap-3">
                {company.useful_links.map((link, idx) => {
                  const isClaimForm = link.type === "claim_form";
                  const Icon = isClaimForm ? FileText : ExternalLink;
                  const isExternal = /^https?:\/\//i.test(link.url);
                  return (
                    <a
                      key={idx}
                      href={link.url}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      download={!isExternal && /\.pdf($|\?)/i.test(link.url)
                        ? ""
                        : undefined}
                      className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${
                        isClaimForm
                          ? "border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-300"
                          : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isClaimForm
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            isClaimForm ? "text-yellow-900" : "text-gray-900"
                          }`}
                        >
                          {link.label}
                        </p>
                        {link.description && (
                          <p
                            className={`text-xs mt-0.5 leading-relaxed ${
                              isClaimForm ? "text-yellow-800" : "text-gray-500"
                            }`}
                          >
                            {link.description}
                          </p>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium mt-2 ${
                            isClaimForm ? "text-yellow-800" : "text-blue-600"
                          } group-hover:gap-1.5 transition-all`}
                        >
                          {isExternal
                            ? (
                              <>
                                Consulter <ExternalLink size={11} />
                              </>
                            )
                            : (
                              <>
                                Télécharger <Download size={11} />
                              </>
                            )}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">
                  Urgence sinistre ?
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  En cas d'accident grave, contactez notre assistance disponible
                  24h/24, 7j/7.
                </p>
                <a
                  href="tel:0180855786"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all"
                >
                  <Phone size={14} />
                  Assistance 24/7 — 01 80 85 57 86
                </a>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}
