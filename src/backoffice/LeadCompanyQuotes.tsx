import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Modal, ModalFooter } from "../components/Modal";
import { Badge } from "../components/Badge";
import { Progress } from "../components/Progress";
import { SecureDocumentLink } from "../components/crm/SecureDocumentLink";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  description: string | null;
  logo_url?: string | null;
  is_mandatory?: boolean;
  is_active?: boolean;
  priority_order?: number;
}

interface CompanyQuote {
  id: string;
  lead_id: string;
  company_id: string;
  status: "pending" | "quote_submitted" | "refused" | "validated";
  quote_amount: number | null;
  monthly_price: number | null;
  coverage_type: "tiers" | "tiers_plus" | "tous_risques" | null;
  includes_immobilisation: boolean | null;
  includes_assistance_0km: boolean | null;
  includes_rc_pro: boolean | null;
  includes_depannage_remorquage: boolean | null;
  coverage_details: string | null;
  quote_file_url: string | null;
  refusal_reason: string | null;
  refusal_screenshot_url: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  quote_accepted_at: string | null;
  quote_refused_at: string | null;
  notes: string | null;
  company: InsuranceCompany;
}

interface RefusalReason {
  code: string;
  label: string;
  description: string | null;
}

interface CompanyDocument {
  id: string;
  document_name: string;
  is_mandatory?: boolean;
}
interface Props {
  leadId: string;
}

export default function LeadCompanyQuotes({ leadId }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [quotes, setQuotes] = useState<CompanyQuote[]>([]);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [refusalReasons, setRefusalReasons] = useState<RefusalReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<CompanyQuote | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isRefusalModalOpen, setIsRefusalModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allMandatoryProcessed, setAllMandatoryProcessed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [quoteFormData, setQuoteFormData] = useState({
    quote_amount: "",
    monthly_price: "",
    quote_file_url: "",
    coverage_type: "" as "" | "tiers" | "tiers_plus" | "tous_risques",
    includes_immobilisation: false,
    includes_assistance_0km: true,
    includes_rc_pro: true,
    includes_depannage_remorquage: true,
    coverage_details: "",
    notes: "",
  });

  const [refusalFormData, setRefusalFormData] = useState({
    refusal_reason_code: "",
    refusal_reason: "",
    refusal_screenshot_url: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
    loadRefusalReasons();
    // Reload only when the selected lead changes; loaders are intentionally local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const loadData = async () => {
    try {
      const [leadRes, quotesRes, companiesRes] = await Promise.all([
        supabase.from("crm_leads").select("*").eq("id", leadId).maybeSingle(),
        supabase
          .from("lead_company_quotes")
          .select(`
            *,
            company:insurance_companies!lead_company_quotes_company_id_fkey(*)
          `)
          .eq("lead_id", leadId)
          .order("created_at", { ascending: true }),
        supabase
          .from("insurance_companies")
          .select("*")
          .eq("is_mandatory", true)
          .eq("is_active", true)
          .order("priority_order", { ascending: true }),
      ]);

      if (leadRes.error && leadRes.error.code !== "PGRST116") {
        console.error("Erreur chargement lead:", leadRes.error);
      }

      if (leadRes.data) {
        setLead({
          id: leadRes.data.id,
          name:
            `${leadRes.data.first_name || ""} ${leadRes.data.last_name || ""}`
              .trim() || leadRes.data.email,
          email: leadRes.data.email,
          phone: leadRes.data.phone,
          city: leadRes.data.city || "",
        });
      }

      if (quotesRes.error) throw quotesRes.error;
      if (companiesRes.error) throw companiesRes.error;

      let currentQuotes = quotesRes.data || [];
      const mandatoryCompanies = companiesRes.data || [];
      const existingCompanyIds = new Set(
        currentQuotes.map((q: CompanyQuote) => q.company_id),
      );
      const missingCompanies = mandatoryCompanies.filter((c) =>
        !existingCompanyIds.has(c.id)
      );

      if (missingCompanies.length > 0) {
        const rowsToInsert = missingCompanies.map((c) => ({
          lead_id: leadId,
          company_id: c.id,
          status: "pending",
        }));
        const { error: insertError } = await supabase
          .from("lead_company_quotes")
          .insert(rowsToInsert);
        if (insertError) {
          console.error(
            "Erreur création lignes compagnies obligatoires:",
            insertError,
          );
        } else {
          const { data: refreshed, error: refreshError } = await supabase
            .from("lead_company_quotes")
            .select(
              `*, company:insurance_companies!lead_company_quotes_company_id_fkey(*)`,
            )
            .eq("lead_id", leadId)
            .order("created_at", { ascending: true });
          if (!refreshError && refreshed) currentQuotes = refreshed;
        }
      }

      setQuotes(currentQuotes);

      const mandatoryCheckRes = await supabase.rpc(
        "check_all_mandatory_companies_processed",
        { p_lead_id: leadId },
      );
      setAllMandatoryProcessed(mandatoryCheckRes.data || false);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRefusalReasons = async () => {
    try {
      const { data, error } = await supabase
        .from("company_quote_refusal_reasons")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setRefusalReasons(data || []);
    } catch (error) {
      console.error("Erreur chargement motifs refus:", error);
    }
  };

  const loadCompanyDocuments = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("send_with_quote", true);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Erreur chargement documents:", error);
    }
  };

  const handleSubmitQuote = (quote: CompanyQuote) => {
    setSelectedQuote(quote);
    loadCompanyDocuments(quote.company_id);
    const q = quote as CompanyQuote & {
      monthly_price?: number | null;
      coverage_type?: string | null;
      includes_immobilisation?: boolean | null;
      includes_assistance_0km?: boolean | null;
      includes_rc_pro?: boolean | null;
      includes_depannage_remorquage?: boolean | null;
      coverage_details?: string | null;
    };
    const companyNameLower = quote.company?.name?.toLowerCase() || "";
    const isGenerali = companyNameLower.includes("generali");
    setQuoteFormData({
      quote_amount: quote.quote_amount?.toString() || "",
      monthly_price: q.monthly_price?.toString() || "",
      quote_file_url: quote.quote_file_url || "",
      coverage_type:
        (q.coverage_type as "tiers" | "tiers_plus" | "tous_risques") || "",
      includes_immobilisation: q.includes_immobilisation ?? false,
      includes_assistance_0km: q.includes_assistance_0km ?? true,
      includes_rc_pro: q.includes_rc_pro ?? !isGenerali,
      includes_depannage_remorquage: q.includes_depannage_remorquage ?? true,
      coverage_details: q.coverage_details || "",
      notes: quote.notes || "",
    });
    setIsQuoteModalOpen(true);
  };

  const handleSubmitRefusal = (quote: CompanyQuote) => {
    setSelectedQuote(quote);
    setRefusalFormData({
      refusal_reason_code: "",
      refusal_reason: quote.refusal_reason || "",
      refusal_screenshot_url: quote.refusal_screenshot_url || "",
      notes: quote.notes || "",
    });
    setIsRefusalModalOpen(true);
  };

  const saveQuote = async () => {
    if (!selectedQuote || !quoteFormData.quote_file_url) {
      toast.warning("Veuillez uploader le devis");
      return;
    }
    if (!quoteFormData.coverage_type) {
      toast.warning("Veuillez sélectionner le type de couverture");
      return;
    }
    if (!quoteFormData.quote_amount) {
      toast.warning("Veuillez indiquer le prix annuel");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const annualPrice = parseFloat(quoteFormData.quote_amount) || null;
      const monthlyPriceParsed = parseFloat(quoteFormData.monthly_price);
      const monthlyPrice = !isNaN(monthlyPriceParsed) && monthlyPriceParsed > 0
        ? monthlyPriceParsed
        : (annualPrice ? Math.round((annualPrice / 12) * 100) / 100 : null);

      const { error } = await supabase
        .from("lead_company_quotes")
        .update({
          status: "quote_submitted",
          quote_amount: annualPrice,
          monthly_price: monthlyPrice,
          quote_file_url: quoteFormData.quote_file_url,
          coverage_type: quoteFormData.coverage_type,
          includes_immobilisation: quoteFormData.includes_immobilisation,
          includes_assistance_0km: quoteFormData.includes_assistance_0km,
          includes_rc_pro: quoteFormData.includes_rc_pro,
          includes_depannage_remorquage:
            quoteFormData.includes_depannage_remorquage,
          coverage_details: quoteFormData.coverage_details || null,
          notes: quoteFormData.notes,
          submitted_by: user?.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", selectedQuote.id);

      if (error) throw error;

      await loadData();
      setIsQuoteModalOpen(false);
      toast.success("Devis soumis avec succès !");
    } catch (error) {
      console.error("Erreur soumission devis:", error);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSaving(false);
    }
  };

  const saveRefusal = async () => {
    if (!selectedQuote || !refusalFormData.refusal_reason_code) {
      toast.warning("Veuillez sélectionner le motif de refus");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const selectedReason = refusalReasons.find((r) =>
        r.code === refusalFormData.refusal_reason_code
      );
      const fullRefusalReason = selectedReason
        ? `${selectedReason.label}${
          refusalFormData.notes ? ` - ${refusalFormData.notes}` : ""
        }`
        : refusalFormData.notes;

      const { error } = await supabase
        .from("lead_company_quotes")
        .update({
          status: "refused",
          refusal_reason: fullRefusalReason,
          refusal_screenshot_url: refusalFormData.refusal_screenshot_url,
          notes: refusalFormData.notes,
          submitted_by: user?.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", selectedQuote.id);

      if (error) throw error;

      await loadData();
      setIsRefusalModalOpen(false);
      toast.success("Refus enregistré avec succès !");
    } catch (error) {
      console.error("Erreur enregistrement refus:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>
            En attente
          </Badge>
        );
      case "quote_submitted":
        return (
          <Badge variant="info" icon={<FileText className="w-3 h-3" />}>
            Devis soumis
          </Badge>
        );
      case "refused":
        return (
          <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>
            Refusé
          </Badge>
        );
      case "validated":
        return (
          <Badge variant="success" icon={<CheckCircle className="w-3 h-3" />}>
            Validé
          </Badge>
        );
      default:
        return null;
    }
  };

  const calculateProgress = () => {
    const mandatoryQuotes = quotes.filter((q) => q.company?.is_mandatory);
    const total = mandatoryQuotes.length;
    const processed =
      mandatoryQuotes.filter((q) => q.status !== "pending").length;
    return total > 0 ? (processed / total) * 100 : 0;
  };

  const copyProspectSpaceLink = async () => {
    if (!lead?.access_token) {
      toast.info("Token d'accès non disponible pour ce prospect");
      return;
    }
    const link =
      `${window.location.origin}/espace-prospect/${lead.access_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error("Error copying link:", err);
      toast.error("Erreur lors de la copie du lien");
    }
  };

  const sendProspectAccessEmail = async () => {
    if (!lead || !leadId) return;

    if (!lead.access_token) {
      toast.info("Token d'accès non disponible pour ce prospect");
      return;
    }

    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke(
        "send-email-universal",
        {
          body: {
            to: lead.email,
            subject: "Accès à votre espace prospect TaxiAssur",
            template: "prospect_access",
            variables: {
              first_name: lead.name.split(" ")[0] || "Prospect",
              last_name: lead.name.split(" ").slice(1).join(" ") || "",
              access_link:
                `${window.location.origin}/espace-prospect/${lead.access_token}`,
            },
          },
        },
      );

      if (error) throw error;
      toast.success("✅ Email d'accès espace prospect envoyé avec succès !");
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("❌ Erreur lors de l'envoi de l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <div className="text-white">Chargement...</div>;
  }

  if (!lead) {
    return <div className="text-red-500">Lead introuvable</div>;
  }

  const progress = calculateProgress();
  const mandatoryQuotesList = quotes.filter((q) => q.company?.is_mandatory);
  const mandatoryProcessedCount =
    mandatoryQuotesList.filter((q) => q.status !== "pending").length;
  const allProcessed = allMandatoryProcessed &&
    mandatoryQuotesList.length > 0 &&
    mandatoryProcessedCount === mandatoryQuotesList.length;

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Validation Compagnies
            </h2>
            <p className="text-gray-400 mb-3">
              {lead.name} - {lead.email}
            </p>

            {/* Boutons d'accès espace prospect */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={copyProspectSpaceLink}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  linkCopied
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                title="Copier le lien d'accès à l'espace prospect"
              >
                {linkCopied
                  ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Lien copié !
                    </>
                  )
                  : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copier lien espace prospect
                    </>
                  )}
              </button>

              <button
                onClick={sendProspectAccessEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all disabled:opacity-50"
                title="Envoyer l'accès espace prospect par email"
              >
                {sendingEmail
                  ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  )
                  : (
                    <>
                      <Mail className="h-4 w-4" />
                      Envoyer accès espace prospect
                    </>
                  )}
              </button>

              <a
                href="/espace-client"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-all"
                title="Ouvrir la connexion sécurisée de l'espace client"
              >
                <ExternalLink className="h-4 w-4" />
                Connexion client
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {allProcessed && (
              <Badge
                variant="success"
                icon={<CheckCircle className="w-4 h-4" />}
                size="lg"
              >
                Toutes les compagnies traitées
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Progression</span>
            <span>
              {mandatoryProcessedCount} / {mandatoryQuotesList.length}
            </span>
          </div>
          <Progress
            value={progress}
            variant={allProcessed ? "success" : "info"}
            size="lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className={`
              bg-gray-900 rounded-xl border p-6
              ${
              quote.status === "pending"
                ? "border-yellow-500/30"
                : "border-gray-800"
            }
              ${quote.status === "validated" ? "border-green-500/30" : ""}
              ${quote.status === "refused" ? "border-red-500/30" : ""}
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {quote.company.logo_url
                    ? (
                      <img
                        src={quote.company.logo_url}
                        alt={`Logo ${quote.company.name}`}
                        className="w-10 h-10 object-contain"
                      />
                    )
                    : <Building2 className="w-8 h-8 text-gray-600" />}
                  <h3 className="text-xl font-bold text-white">
                    {quote.company.name}
                  </h3>
                  {getStatusBadge(quote.status)}
                </div>
                {quote.company.description && (
                  <p className="text-gray-400 text-sm">
                    {quote.company.description}
                  </p>
                )}
              </div>
            </div>

            {quote.status === "pending" && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmitQuote(quote)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Soumettre un devis
                </button>
                <button
                  onClick={() => handleSubmitRefusal(quote)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Déclarer un refus
                </button>
              </div>
            )}

            {quote.status === "quote_submitted" && (
              <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  {quote.quote_amount && (
                    <div>
                      <div className="text-gray-400 text-sm">Montant</div>
                      <div className="text-white font-bold text-lg">
                        {quote.quote_amount} €
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-400 text-sm">Soumis le</div>
                    <div className="text-white">
                      {new Date(quote.submitted_at!).toLocaleDateString(
                        "fr-FR",
                      )}
                    </div>
                  </div>
                </div>
                {quote.quote_file_url && (
                  <SecureDocumentLink
                    filePath={quote.quote_file_url}
                    source="crm_lead_documents"
                    bucket="contract-documents"
                    fileName="Devis.pdf"
                    showText
                    customText="Voir le devis"
                    className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400"
                    iconSize={16}
                  />
                )}
                {quote.notes && (
                  <div className="mt-3 text-gray-400 text-sm">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    {quote.notes}
                  </div>
                )}
              </div>
            )}

            {quote.status === "refused" && (
              <div className="bg-red-950/20 rounded-lg p-4 border border-red-800/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">
                      {quote.quote_refused_at
                        ? "Refusé par le prospect"
                        : "Motif du refus"}
                    </div>
                    {quote.quote_refused_at && (
                      <div className="text-gray-400 text-sm mb-2">
                        Le {new Date(quote.quote_refused_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </div>
                    )}
                    {quote.refusal_reason && (
                      <div className="text-gray-300 mb-2">
                        <span className="text-gray-400 text-sm">Raison :</span>
                        {quote.refusal_reason}
                      </div>
                    )}
                    {quote.refusal_screenshot_url && (
                      <a
                        href={quote.refusal_screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 mt-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir la capture d'écran
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {quote.status === "validated" && (
              <div className="bg-green-950/20 rounded-lg p-4 border border-green-800/30">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">
                      {quote.quote_accepted_at
                        ? "Validé par le prospect"
                        : "Devis validé"}
                    </div>
                    {quote.quote_accepted_at && (
                      <div className="text-gray-400 text-sm">
                        Le{" "}
                        {new Date(quote.quote_accepted_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </div>
                    )}
                    {quote.quote_amount && (
                      <div className="text-green-400 font-bold text-lg mt-2">
                        Montant : {quote.quote_amount} € / an
                      </div>
                    )}
                    {quote.quote_file_url && (
                      <SecureDocumentLink
                        filePath={quote.quote_file_url}
                        source="crm_lead_documents"
                        bucket="contract-documents"
                        fileName="Devis-valide.pdf"
                        showText
                        customText="Voir le devis validé"
                        className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 mt-2"
                        iconSize={16}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        title={`Soumettre un devis - ${selectedQuote?.company.name}`}
        size="lg"
      >
        <div className="space-y-5">
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-400/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-50 leading-relaxed">
                <strong className="text-white">Important :</strong>{" "}
                Vous devez uploader le devis de la compagnie. Les documents
                obligatoires seront automatiquement joints lors de l'envoi au
                client.
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-600">
              <h4 className="text-white font-semibold mb-3 text-sm">
                Documents qui seront envoyés avec le devis ({documents.length})
              </h4>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 text-sm text-gray-100"
                  >
                    <FileText className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <span>{doc.document_name}</span>
                    {doc.is_mandatory && (
                      <Badge variant="warning" size="sm">Obligatoire</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              Type de couverture *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  value: "tiers",
                  label: "Tiers",
                  desc: "Responsabilité civile",
                },
                {
                  value: "tiers_plus",
                  label: "Tiers + BDG",
                  desc: "Bris de glace, incendie, vol",
                },
                {
                  value: "tous_risques",
                  label: "Tous risques",
                  desc: "Couverture complète",
                },
              ].map((opt) => {
                const active = quoteFormData.coverage_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setQuoteFormData({
                        ...quoteFormData,
                        coverage_type: opt.value as
                          | "tiers"
                          | "tiers_plus"
                          | "tous_risques",
                      })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      active
                        ? "border-blue-400 bg-blue-500/20 shadow-md shadow-blue-500/10"
                        : "border-gray-600 bg-gray-700/60 hover:border-blue-400/60 hover:bg-gray-700"
                    }`}
                  >
                    <p
                      className={`font-semibold text-sm ${
                        active ? "text-white" : "text-gray-50"
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        active ? "text-blue-100" : "text-gray-300"
                      }`}
                    >
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-100 text-sm font-semibold mb-2">
                Prix annuel (€) *
              </label>
              <input
                type="number"
                step="0.01"
                value={quoteFormData.quote_amount}
                onChange={(e) => {
                  const annual = e.target.value;
                  const annualNum = parseFloat(annual);
                  setQuoteFormData({
                    ...quoteFormData,
                    quote_amount: annual,
                    monthly_price: !isNaN(annualNum) && annualNum > 0
                      ? (Math.round((annualNum / 12) * 100) / 100).toString()
                      : quoteFormData.monthly_price,
                  });
                }}
                className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                placeholder="1250.00"
              />
            </div>
            <div>
              <label className="block text-gray-100 text-sm font-semibold mb-2">
                Prix mensuel (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={quoteFormData.monthly_price}
                onChange={(e) =>
                  setQuoteFormData({
                    ...quoteFormData,
                    monthly_price: e.target.value,
                  })}
                className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                placeholder="Auto-calculé"
              />
              <p className="text-gray-300 text-xs mt-1.5">
                Calculé automatiquement si vide
              </p>
            </div>
          </div>

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              Garanties incluses
            </label>
            <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 space-y-1">
              {[
                {
                  key: "includes_immobilisation" as const,
                  label: "Indemnisation suite à immobilisation du véhicule",
                },
                {
                  key: "includes_assistance_0km" as const,
                  label: "Assistance 0 km",
                },
                {
                  key: "includes_rc_pro" as const,
                  label: "Responsabilité Civile Professionnelle (RC Pro)",
                },
                {
                  key: "includes_depannage_remorquage" as const,
                  label: "Dépannage et remorquage",
                },
              ].map((g) => {
                const checked = quoteFormData[g.key];
                return (
                  <label
                    key={g.key}
                    className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-md transition-colors ${
                      checked
                        ? "bg-blue-500/15 hover:bg-blue-500/20"
                        : "hover:bg-gray-700/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setQuoteFormData({
                          ...quoteFormData,
                          [g.key]: e.target.checked,
                        })}
                      className="w-4 h-4 rounded border-gray-400 bg-gray-700 text-blue-500 focus:ring-blue-400 focus:ring-offset-gray-900"
                    />
                    <span
                      className={`text-sm ${
                        checked ? "text-white font-medium" : "text-gray-100"
                      }`}
                    >
                      {g.label}
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedQuote?.company?.name?.toLowerCase().includes("generali") &&
              (
                <p className="text-amber-300 text-xs mt-2 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Generali n'inclut pas la RC Pro par défaut
                </p>
              )}
          </div>

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              Détails complémentaires sur les garanties
            </label>
            <textarea
              value={quoteFormData.coverage_details}
              onChange={(e) =>
                setQuoteFormData({
                  ...quoteFormData,
                  coverage_details: e.target.value,
                })}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
              rows={2}
              placeholder="Franchise, plafonds, exclusions particulières... (visible par le prospect)"
            />
          </div>

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              URL du devis *
            </label>
            <input
              type="url"
              value={quoteFormData.quote_file_url}
              onChange={(e) =>
                setQuoteFormData({
                  ...quoteFormData,
                  quote_file_url: e.target.value,
                })}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
              placeholder="https://..."
              required
            />
            <p className="text-gray-300 text-xs mt-1.5">
              Uploadez le devis sur votre stockage et collez l'URL ici
            </p>
          </div>

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              Notes internes
            </label>
            <textarea
              value={quoteFormData.notes}
              onChange={(e) =>
                setQuoteFormData({ ...quoteFormData, notes: e.target.value })}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
              rows={3}
              placeholder="Notes pour l'équipe..."
            />
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setIsQuoteModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={saveQuote}
            disabled={saving || !quoteFormData.quote_file_url}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {saving ? "Envoi..." : "Soumettre le devis"}
          </button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isRefusalModalOpen}
        onClose={() => setIsRefusalModalOpen(false)}
        title={`Declarer un refus - ${selectedQuote?.company.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-400/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0 mt-1" />
              <div className="text-sm text-red-50">
                Selectionnez le motif de refus de la compagnie. Une capture
                d'ecran du refus est recommandee pour la tracabilite.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              Motif du refus *
            </label>
            <select
              value={refusalFormData.refusal_reason_code}
              onChange={(e) =>
                setRefusalFormData({
                  ...refusalFormData,
                  refusal_reason_code: e.target.value,
                })}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/30"
              required
            >
              <option value="">-- Selectionnez un motif --</option>
              {refusalReasons.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.label}
                </option>
              ))}
            </select>
            {refusalFormData.refusal_reason_code && (
              <p className="text-gray-300 text-sm mt-2">
                {refusalReasons.find((r) =>
                  r.code === refusalFormData.refusal_reason_code
                )?.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              Capture d'ecran du refus (recommande)
            </label>
            <input
              type="url"
              value={refusalFormData.refusal_screenshot_url}
              onChange={(e) =>
                setRefusalFormData({
                  ...refusalFormData,
                  refusal_screenshot_url: e.target.value,
                })}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/30"
              placeholder="https://..."
            />
            <p className="text-gray-300 text-xs mt-1">
              Uploadez la capture d'ecran et collez l'URL ici
            </p>
          </div>

          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">
              Details complementaires
            </label>
            <textarea
              value={refusalFormData.notes}
              onChange={(e) =>
                setRefusalFormData({
                  ...refusalFormData,
                  notes: e.target.value,
                })}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/30"
              rows={2}
              placeholder="Informations supplementaires sur le refus..."
            />
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setIsRefusalModalOpen(false)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg border border-gray-500"
          >
            Annuler
          </button>
          <button
            onClick={saveRefusal}
            disabled={saving || !refusalFormData.refusal_reason_code}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 shadow-md"
          >
            <XCircle className="w-4 h-4" />
            {saving ? "Enregistrement..." : "Enregistrer le refus"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
