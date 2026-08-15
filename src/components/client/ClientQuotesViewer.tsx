import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard as Edit3,
  Download,
  Eye,
  FileText,
  Info,
  Loader2,
  Printer,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "@/lib/toast";
import { downloadSecureDocument, viewSecureDocument } from "@/lib/secure-document-url";

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

interface SollyAzarOptions {
  amenagements: boolean;
  assistance_sans_franchise: boolean;
  bagages_marchandises: boolean;
  effets_personnels: boolean;
  equipements_pro: boolean;
  equipements_pro_niveau: 1 | 2 | 3;
  indemnisation_valeur_achat: boolean;
  indemnites_journalieres: boolean;
  indemnites_journalieres_niveau: 1 | 2;
  protection_juridique: boolean;
  protection_conducteur_niveau2: boolean;
}

const DEFAULT_SOLLY_OPTIONS: SollyAzarOptions = {
  amenagements: false,
  assistance_sans_franchise: false,
  bagages_marchandises: false,
  effets_personnels: false,
  equipements_pro: false,
  equipements_pro_niveau: 1,
  indemnisation_valeur_achat: false,
  indemnites_journalieres: false,
  indemnites_journalieres_niveau: 1,
  protection_juridique: false,
  protection_conducteur_niveau2: false,
};

const SOLLY_OPTION_LABELS: {
  key: keyof SollyAzarOptions;
  label: string;
  hasLevel?: 2 | 3;
  info?: string;
}[] = [
  {
    key: "amenagements",
    label: "Aménagements du véhicule",
    info:
      "Étend les garanties dommages aux aménagements et équipements intérieurs fixes nécessaires à l'activité.",
  },
  {
    key: "assistance_sans_franchise",
    label:
      "Assistance sans franchise kilométrique avec véhicule de remplacement à usage privé",
  },
  {
    key: "bagages_marchandises",
    label: "Bagages et marchandises transportées jusqu'à 5 000 €",
    info:
      "Étend les garanties dommages aux bagages et marchandises transportés appartenant aux passagers.",
  },
  {
    key: "effets_personnels",
    label: "Effets et objets personnels du conducteur",
  },
  {
    key: "equipements_pro",
    label: "Equipements professionnels",
    hasLevel: 3,
    info:
      "Couvre les équipements obligatoires (taximètre, TPE, navigation, radio, lumineux).\nNiveau 1 : jusqu'à 600 €\nNiveau 2 : jusqu'à 1 000 €\nNiveau 3 : jusqu'à 1 500 €",
  },
  {
    key: "indemnisation_valeur_achat",
    label: "Indemnisation en valeur d'achat et/ou en valeur majorée",
  },
  {
    key: "indemnites_journalieres",
    label: "Indemnités journalières en cas d'immobilisation ou véhicule relais",
    hasLevel: 2,
    info: "Niveau 1 : 75 € / jour\nNiveau 2 : 150 € / jour",
  },
  { key: "protection_juridique", label: "Protection juridique" },
  {
    key: "protection_conducteur_niveau2",
    label: "Protection du conducteur de niveau 2 jusqu'à 500 000 €",
  },
];

interface Quote {
  id: string;
  company_id: string;
  company_code?: string;
  company_name?: string;
  company_logo_url?: string | null;
  quote_file_url: string;
  quote_amount?: number;
  monthly_price?: number;
  coverage_type?: string;
  includes_immobilisation?: boolean;
  includes_assistance_0km?: boolean;
  includes_rc_pro?: boolean;
  includes_depannage_remorquage?: boolean;
  coverage_details?: string;
  enrollment_fee?: number;
  quote_options?: Record<string, unknown> | null;
  status: string;
  submitted_at?: string;
  last_sent_at?: string;
  created_at: string;
  rc_pro_addon?: boolean;
  rc_pro_addon_annual?: number | null;
  rc_pro_addon_monthly?: number | null;
  rc_pro_addon_file_url?: string | null;
  rc_pro_addon_company_name?: string | null;
}

interface Props {
  token?: string;
  supabaseClient?: SupabaseClient;
}

interface CompanyDocument {
  id: string;
  company_id: string;
  document_name: string;
  document_type: string | null;
  file_url: string;
  description: string | null;
}

export default function ClientQuotesViewer({ token, supabaseClient }: Props) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [companyDocs, setCompanyDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [refusing, setRefusing] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [showRefuseModal, setShowRefuseModal] = useState<string | null>(null);
  const [refusalReason, setRefusalReason] = useState("");
  const [modifyingQuoteId, setModifyingQuoteId] = useState<string | null>(null);
  const [modifyOptions, setModifyOptions] = useState<SollyAzarOptions>(
    DEFAULT_SOLLY_OPTIONS,
  );
  const [modifyMessage, setModifyMessage] = useState("");
  const [submittingModification, setSubmittingModification] = useState(false);
  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  const openQuoteDocument = async (
    path: string,
    fileName: string,
    download = false,
  ) => {
    if (!token) {
      toast.error("Votre session prospect a expiré. Rechargez la page.");
      return;
    }
    try {
      const options = { path, bucket: "contract-documents", accessToken: token, fileName };
      if (download) await downloadSecureDocument(options);
      else await viewSecureDocument(options);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d’ouvrir ce document",
      );
    }
  };

  const openModificationModal = (quote: Quote) => {
    const current =
      (quote.quote_options as Partial<SollyAzarOptions> | null | undefined) ||
      null;
    setModifyOptions({ ...DEFAULT_SOLLY_OPTIONS, ...(current || {}) });
    setModifyMessage("");
    setOpenInfoKey(null);
    setModifyingQuoteId(quote.id);
  };

  const submitModificationRequest = async () => {
    if (!supabaseClient || !token || !modifyingQuoteId) {
      toast.error("Erreur de configuration. Veuillez recharger la page.");
      return;
    }
    setSubmittingModification(true);
    try {
      const { data, error } = await supabaseClient.rpc(
        "request_quote_modification_by_token",
        {
          p_token: token,
          p_quote_id: modifyingQuoteId,
          p_requested_options: modifyOptions,
          p_message: modifyMessage,
        },
      );
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Erreur lors de la soumission");
      }
      toast.success(
        `Votre demande de modification a été envoyée à notre équipe${
          data.company_name ? ` pour ${data.company_name}` : ""
        }. Un commercial vous recontactera très prochainement.`,
      );
      setModifyingQuoteId(null);
      setModifyMessage("");
    } catch (err) {
      console.error("Error submitting modification request:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Erreur inconnue";
      toast.error(`Erreur lors de l'envoi de votre demande: ${errorMessage}`);
    } finally {
      setSubmittingModification(false);
    }
  };

  const handleValidateQuote = async (quoteId: string, companyName: string) => {
    if (!supabaseClient || !token) {
      toast.error("❌ Erreur de configuration. Veuillez recharger la page.");
      return;
    }

    setValidating(quoteId);
    try {
      // Utiliser la fonction RPC sécurisée pour valider le devis
      const { data, error } = await supabaseClient.rpc(
        "validate_quote_by_token",
        {
          p_quote_id: quoteId,
          p_token: token,
        },
      );

      if (error) {
        console.error("Error calling validate_quote_by_token:", error);
        throw error;
      }

      // Vérifier le résultat de la fonction
      if (!data?.success) {
        throw new Error(data?.error || "Erreur lors de la validation");
      }

      // Recharger les données
      await loadData();

      toast.success(
        `✅ Devis ${
          data.company_name || companyName
        } validé avec succès !\n\nNotre équipe a été notifiée et va vous recontacter très prochainement pour finaliser votre souscription.`,
      );

      // Fermer le modal de confirmation
      setShowConfirmModal(null);
    } catch (error) {
      console.error("Error validating quote:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Erreur inconnue";
      toast.error(
        `❌ Erreur lors de la validation du devis: ${errorMessage}\n\nVeuillez réessayer ou nous contacter.`,
      );
    } finally {
      setValidating(null);
    }
  };

  const handleRefuseQuote = async (quoteId: string, companyName: string) => {
    if (!supabaseClient || !token) {
      toast.error("❌ Erreur de configuration. Veuillez recharger la page.");
      return;
    }

    setRefusing(quoteId);
    try {
      // Utiliser la fonction RPC sécurisée pour refuser le devis
      const { data, error } = await supabaseClient.rpc(
        "refuse_quote_by_token",
        {
          p_quote_id: quoteId,
          p_token: token,
          p_reason: refusalReason || null,
        },
      );

      if (error) {
        console.error("Error calling refuse_quote_by_token:", error);
        throw error;
      }

      // Vérifier le résultat de la fonction
      if (!data?.success) {
        throw new Error(data?.error || "Erreur lors du refus");
      }

      // Recharger les données
      await loadData();

      toast.info(
        `Devis ${
          data.company_name || companyName
        } refusé.\n\nVous pouvez toujours consulter les autres devis disponibles.`,
      );

      // Fermer le modal et réinitialiser
      setShowRefuseModal(null);
      setRefusalReason("");
    } catch (error) {
      console.error("Error refusing quote:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Erreur inconnue";
      toast.error(
        `❌ Erreur lors du refus du devis: ${errorMessage}\n\nVeuillez réessayer ou nous contacter.`,
      );
    } finally {
      setRefusing(null);
    }
  };

  const loadData = async () => {
    if (!supabaseClient) return;

    try {
      setLoading(true);

      if (!token) throw new Error("Jeton prospect manquant");
      const { data, error } = await supabaseClient.rpc(
        "get_lead_quotes_by_token",
        { p_token: token },
      );
      if (error) throw error;
      const quotesData: Quote[] = data || [];
      setQuotes(quotesData);
      const companyMap = new Map<string, InsuranceCompany>();
      for (const quote of quotesData) {
        if (!companyMap.has(quote.company_id)) {
          companyMap.set(quote.company_id, {
            id: quote.company_id,
            code: quote.company_code || "",
            name: quote.company_name || "Compagnie",
            logo_url: quote.company_logo_url || null,
            contact_phone: null,
            contact_email: null,
          });
        }
      }
      setCompanies([...companyMap.values()]);
      const { data: docsData, error: docsError } = await supabaseClient.rpc(
        "get_company_documents_by_token",
        {
          p_token: token,
          p_filter: "quote",
        },
      );
      if (docsError) throw docsError;
      setCompanyDocs(docsData || []);
    } catch (error) {
      console.error("Erreur chargement devis:", error);
    } finally {
      setLoading(false);
    }
  };

  // Grouper les devis par compagnie
  const quotesByCompany = quotes.reduce((acc, quote) => {
    if (!acc[quote.company_id]) {
      acc[quote.company_id] = [];
    }
    acc[quote.company_id].push(quote);
    return acc;
  }, {} as Record<string, Quote[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500">
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
        <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="font-bold text-xl text-white mb-2">
          Aucun devis disponible
        </h3>
        <p className="text-gray-400">
          Vos documents sont en cours de traitement. Vous recevrez une
          notification dès qu'un devis sera disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-bold text-green-400">Vos devis sont prêts!</h4>
          <p className="text-sm text-gray-300 mt-1">
            {quotes.length} devis{" "}
            {quotes.length > 1 ? "sont disponibles" : "est disponible"} de{" "}
            {Object.keys(quotesByCompany).length}{" "}
            compagnie{Object.keys(quotesByCompany).length > 1 ? "s" : ""}.
            Consultez-les, téléchargez-les et contactez-nous pour souscrire.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {companies.map((company) => {
          const companyQuotes = quotesByCompany[company.id] || [];
          if (companyQuotes.length === 0) return null;

          // Statut global de la compagnie : prend le statut du dernier devis (priorité validated > refused > pending)
          const hasValidated = companyQuotes.some((q) =>
            q.status === "validated"
          );
          const hasRefused = companyQuotes.some((q) => q.status === "refused");
          const companyStatus: "validated" | "refused" | "pending" =
            hasValidated
              ? "validated"
              : hasRefused
              ? "refused"
              : "pending";

          const statusStyles = {
            pending: {
              border: "border-amber-400/60 hover:border-amber-300",
              bg:
                "bg-gradient-to-br from-amber-500/5 via-gray-800/40 to-gray-800/40",
              ring: "ring-1 ring-amber-400/30",
              badgeBg: "bg-amber-500/15 border-amber-400/50 text-amber-200",
              badgeIcon: <Clock className="w-4 h-4" />,
              badgeLabel: "En attente de votre décision",
            },
            validated: {
              border: "border-green-400/60 hover:border-green-300",
              bg:
                "bg-gradient-to-br from-green-500/5 via-gray-800/40 to-gray-800/40",
              ring: "ring-1 ring-green-400/30",
              badgeBg: "bg-green-500/15 border-green-400/50 text-green-200",
              badgeIcon: <ThumbsUp className="w-4 h-4" />,
              badgeLabel: "Devis validé par vos soins",
            },
            refused: {
              border: "border-red-400/60 hover:border-red-300",
              bg:
                "bg-gradient-to-br from-red-500/5 via-gray-800/40 to-gray-800/40",
              ring: "ring-1 ring-red-400/30",
              badgeBg: "bg-red-500/15 border-red-400/50 text-red-200",
              badgeIcon: <ThumbsDown className="w-4 h-4" />,
              badgeLabel: "Devis refusé",
            },
          }[companyStatus];

          const companyAttachedDocs = companyDocs.filter((d) =>
            d.company_id === company.id
          );

          return (
            <div
              key={company.id}
              className={`${statusStyles.bg} border ${statusStyles.border} ${statusStyles.ring} rounded-xl p-6 transition-all shadow-lg`}
            >
              <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-4">
                  {company.logo_url
                    ? (
                      <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center flex-shrink-0 shadow-md">
                        <img
                          src={company.logo_url}
                          alt={`Logo ${company.name}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )
                    : company.name.toLowerCase().includes("simple") ||
                        company.code === "PLUS_SIMPLE"
                    ? (
                      <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center flex-shrink-0 shadow-md">
                        <img
                          src="/logo_plu_simple.png"
                          alt="Logo +Simple"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )
                    : <Building2 className="w-12 h-12 text-amber-500" />}
                  <div>
                    <h4 className="font-bold text-2xl text-white">
                      {company.name}
                    </h4>
                    <p className="text-sm text-gray-300 mt-1">
                      {companyQuotes.length}{" "}
                      devis disponible{companyQuotes.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold ${statusStyles.badgeBg}`}
                >
                  {statusStyles.badgeIcon}
                  {statusStyles.badgeLabel}
                </div>
              </div>

              <div className="space-y-4">
                {companyQuotes.map((quote) => {
                  const filePath = quote.quote_file_url;
                  const fileName = filePath.split("/").pop()?.split("?")[0] ||
                    "Devis.pdf";

                  return (
                    <div
                      key={quote.id}
                      className="bg-gray-900/50 border border-gray-700 rounded-lg p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-lg mb-1 truncate">
                              {decodeURIComponent(fileName)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {quote.submitted_at
                                ? (
                                  <>
                                    Uploadé le {new Date(quote.submitted_at)
                                      .toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                      })}
                                  </>
                                )
                                : (
                                  <>
                                    Créé le {new Date(quote.created_at)
                                      .toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                      })}
                                  </>
                                )}
                            </p>
                            {quote.last_sent_at && (
                              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Email envoyé le {new Date(quote.last_sent_at)
                                  .toLocaleDateString("fr-FR")}
                              </p>
                            )}
                          </div>
                        </div>
                        {quote.quote_amount && (
                          <div className="text-right ml-4 bg-amber-500/10 border border-amber-400/40 rounded-lg px-4 py-2">
                            <div className="text-3xl font-bold text-amber-300 leading-tight">
                              {(quote.quote_amount / 12).toFixed(2)} €
                              <span className="text-base font-semibold text-amber-200 ml-1">
                                /mois
                              </span>
                            </div>
                            <div className="text-xs text-gray-300 mt-1">
                              soit {quote.quote_amount.toFixed(2)} € par an
                            </div>
                          </div>
                        )}
                      </div>

                      {(() => {
                        const isSollyAzar =
                          (company.name || "").toLowerCase().includes(
                            "solly",
                          ) || company.code === "SOLLY_AZAR";
                        const opts = (quote.quote_options as
                          | Partial<SollyAzarOptions>
                          | null
                          | undefined) || null;
                        const hasGenericGuarantees =
                          quote.includes_immobilisation ||
                          quote.includes_assistance_0km ||
                          quote.includes_rc_pro ||
                          quote.includes_depannage_remorquage;
                        const hasEnrollmentFee = quote.enrollment_fee != null &&
                          Number(quote.enrollment_fee) > 0;
                        const hasOptions = isSollyAzar && opts &&
                          Object.keys(opts).length > 0;
                        if (
                          !hasGenericGuarantees && !hasOptions &&
                          !hasEnrollmentFee && !quote.coverage_details
                        ) return null;
                        return (
                          <div className="mb-4 bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3">
                            {quote.coverage_type && (
                              <div className="text-sm">
                                <span className="text-gray-400">Formule :</span>
                                <span className="font-semibold text-amber-200 capitalize">
                                  {quote.coverage_type === "tiers"
                                    ? "Tiers"
                                    : quote.coverage_type === "tiers_plus"
                                    ? "Tiers Plus"
                                    : "Tous Risques"}
                                </span>
                              </div>
                            )}
                            {hasGenericGuarantees && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
                                  Garanties incluses
                                </p>
                                <ul className="grid sm:grid-cols-2 gap-1.5 text-sm text-gray-200">
                                  {quote.includes_immobilisation && (
                                    <li className="flex items-center gap-2">
                                      <Check className="w-4 h-4 text-green-400" />
                                      {" "}
                                      Indemnisation immobilisation
                                    </li>
                                  )}
                                  {quote.includes_assistance_0km && (
                                    <li className="flex items-center gap-2">
                                      <Check className="w-4 h-4 text-green-400" />
                                      {" "}
                                      Assistance 0 km
                                    </li>
                                  )}
                                  {quote.includes_rc_pro && (
                                    <li className="flex items-center gap-2">
                                      <Check className="w-4 h-4 text-green-400" />
                                      {" "}
                                      Responsabilité Civile Pro
                                    </li>
                                  )}
                                  {quote.includes_depannage_remorquage && (
                                    <li className="flex items-center gap-2">
                                      <Check className="w-4 h-4 text-green-400" />
                                      {" "}
                                      Dépannage et remorquage
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            {hasOptions && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
                                  Options Solly Azar
                                </p>
                                <ul className="space-y-1 text-sm text-gray-200">
                                  {SOLLY_OPTION_LABELS.filter((o) =>
                                    opts && opts[o.key]
                                  ).map((o) => (
                                    <li
                                      key={o.key}
                                      className="flex items-start gap-2"
                                    >
                                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                      <span>
                                        {o.label}
                                        {o.hasLevel === 3 &&
                                          opts?.equipements_pro_niveau !=
                                            null &&
                                          o.key === "equipements_pro" && (
                                          <span className="ml-2 text-xs text-amber-200">
                                            (Niveau {opts
                                              .equipements_pro_niveau as number})
                                          </span>
                                        )}
                                        {o.hasLevel === 2 &&
                                          opts
                                              ?.indemnites_journalieres_niveau !=
                                            null &&
                                          o.key === "indemnites_journalieres" &&
                                          (
                                            <span className="ml-2 text-xs text-amber-200">
                                              (Niveau {opts
                                                .indemnites_journalieres_niveau as number}
                                              {" "}
                                              - {(opts
                                                  .indemnites_journalieres_niveau as number) ===
                                                  1
                                                ? "75"
                                                : "150"} €/jour)
                                            </span>
                                          )}
                                      </span>
                                    </li>
                                  ))}
                                  {SOLLY_OPTION_LABELS.every((o) =>
                                    !opts || !opts[o.key]
                                  ) && (
                                    <li className="text-gray-400 italic">
                                      Aucune option additionnelle
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            {hasEnrollmentFee && (
                              <div className="text-sm">
                                <span className="text-gray-400">
                                  Frais d'adhésion :
                                </span>
                                <span className="font-semibold text-white">
                                  {Number(quote.enrollment_fee).toFixed(2)} €
                                </span>
                              </div>
                            )}
                            {quote.coverage_details && (
                              <div className="text-sm">
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                                  Détails complémentaires
                                </p>
                                <p className="text-gray-200 whitespace-pre-line">
                                  {quote.coverage_details}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {quote.rc_pro_addon && (
                        <div className="mb-4 rounded-lg border-2 border-amber-400/60 bg-amber-500/10 p-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-amber-300" />
                              </div>
                              <div>
                                <p className="text-white font-bold text-sm">
                                  Option complémentaire : RC Pro{" "}
                                  {quote.rc_pro_addon_company_name ||
                                    "Swisslife"}
                                </p>
                                <p className="text-amber-100 text-xs mt-1 leading-relaxed max-w-md">
                                  La Responsabilité Civile Professionnelle n'est
                                  pas incluse dans ce contrat. Nous vous
                                  proposons en complément cette couverture
                                  indispensable.
                                </p>
                              </div>
                            </div>
                            {quote.rc_pro_addon_annual != null && (
                              <div className="bg-amber-500/15 border border-amber-400/50 rounded-lg px-3 py-2 text-right">
                                <div className="text-xl font-bold text-amber-200 leading-tight">
                                  {quote.rc_pro_addon_monthly != null
                                    ? Number(quote.rc_pro_addon_monthly)
                                      .toFixed(2)
                                    : (Number(quote.rc_pro_addon_annual) / 12)
                                      .toFixed(2)} €
                                  <span className="text-xs font-semibold text-amber-100 ml-1">
                                    /mois
                                  </span>
                                </div>
                                <div className="text-[10px] text-amber-100 mt-0.5">
                                  soit{" "}
                                  {Number(quote.rc_pro_addon_annual).toFixed(2)}
                                  {" "}
                                  € / an
                                </div>
                              </div>
                            )}
                          </div>
                          {quote.rc_pro_addon_file_url && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openQuoteDocument(
                                    quote.rc_pro_addon_file_url!,
                                    "Devis-RC-Pro.pdf",
                                  )}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Consulter le devis RC Pro
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openQuoteDocument(
                                    quote.rc_pro_addon_file_url!,
                                    "Devis-RC-Pro.pdf",
                                    true,
                                  )}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg text-xs transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Télécharger
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openQuoteDocument(filePath, fileName)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black font-semibold rounded-lg transition-all text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Consulter
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openQuoteDocument(filePath, fileName, true)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </button>

                        <button
                          type="button"
                          onClick={() => openQuoteDocument(filePath, fileName)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimer
                        </button>

                        {quote.status !== "validated" &&
                          quote.status !== "refused" &&
                          ((company.name || "").toLowerCase().includes(
                            "solly",
                          ) || company.code === "SOLLY_AZAR") && (
                          <button
                            onClick={() => openModificationModal(quote)}
                            disabled={refusing !== null || validating !== null}
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600/20 border border-amber-500 hover:bg-amber-600/30 text-amber-200 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                          >
                            <Edit3 className="w-4 h-4" />
                            Demander une modification
                          </button>
                        )}

                        {/* Boutons Valider et Refuser */}
                        {quote.status !== "validated" &&
                          quote.status !== "refused" && (
                          <>
                            <button
                              onClick={() => setShowRefuseModal(quote.id)}
                              disabled={refusing !== null ||
                                validating !== null}
                              className={`flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                ((company.name || "").toLowerCase().includes(
                                    "solly",
                                  ) || company.code === "SOLLY_AZAR")
                                  ? ""
                                  : "ml-auto"
                              }`}
                            >
                              <X className="w-4 h-4" />
                              Refuser
                            </button>
                            <button
                              onClick={() => setShowConfirmModal(quote.id)}
                              disabled={validating !== null ||
                                refusing !== null}
                              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-4 h-4" />
                              Valider ce devis
                            </button>
                          </>
                        )}

                        {quote.status === "validated" && (
                          <div className="flex items-center gap-2 px-5 py-2.5 bg-green-600/20 border border-green-500 text-green-400 font-bold rounded-lg text-sm ml-auto">
                            <CheckCircle2 className="w-4 h-4" />
                            Devis validé
                          </div>
                        )}

                        {quote.status === "refused" && (
                          <div className="flex items-center gap-2 px-5 py-2.5 bg-red-600/20 border border-red-500 text-red-400 font-semibold rounded-lg text-sm ml-auto">
                            <X className="w-4 h-4" />
                            Devis refusé
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {companyAttachedDocs.length > 0 && (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <h5 className="text-sm font-bold text-amber-200 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documents contractuels {company.name}
                  </h5>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {companyAttachedDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 bg-gray-900/60 border border-gray-700 hover:border-amber-400/60 rounded-lg transition-colors group"
                      >
                        <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-amber-200">
                            {doc.document_name}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-gray-400 truncate">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-amber-300 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {companyStatus === "pending" && (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <p className="text-sm text-gray-200 leading-relaxed">
                    Pour souscrire à cette offre,{" "}
                    <span className="font-semibold text-green-300">
                      validez ce devis
                    </span>{" "}
                    grâce au bouton vert ci-dessus, ou{" "}
                    <span className="font-semibold text-red-300">
                      refusez-le
                    </span>{" "}
                    si l'offre ne vous convient pas.
                  </p>
                </div>
              )}
              {companyStatus === "validated" && (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <p className="text-sm text-green-200 leading-relaxed">
                    Merci ! Vous avez validé ce devis. Notre équipe vous
                    recontactera très prochainement pour finaliser votre
                    souscription.
                  </p>
                </div>
              )}
              {companyStatus === "refused" && (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <p className="text-sm text-red-200 leading-relaxed">
                    Vous avez refusé ce devis. Vous pouvez consulter les autres
                    offres disponibles ou contacter notre équipe pour étudier
                    d'autres solutions.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mt-6">
        <h4 className="font-bold text-white mb-2">
          Besoin d'aide pour choisir ?
        </h4>
        <p className="text-gray-300 mb-4">
          Notre équipe est là pour vous accompagner et répondre à toutes vos
          questions.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="tel:0180855786"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            <span className="text-xl">📞</span>
            01 80 85 57 86
          </a>
          <a
            href="mailto:team@taxiassur.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
          >
            <span className="text-xl">✉️</span>
            team@taxiassur.com
          </a>
        </div>
      </div>

      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Valider ce devis ?
              </h3>
              <p className="text-gray-400">
                Vous êtes sur le point de valider ce devis. Notre équipe sera
                notifiée et vous recontactera pour finaliser votre souscription.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const quote = quotes.find((q) => q.id === showConfirmModal);
                  const company = companies.find((c) =>
                    c.id === quote?.company_id
                  );
                  if (quote && company) {
                    handleValidateQuote(quote.id, company.name);
                  }
                }}
                disabled={validating !== null}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating
                  ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validation en cours...
                    </>
                  )
                  : (
                    <>
                      <Check className="w-5 h-5" />
                      Oui, valider ce devis
                    </>
                  )}
              </button>

              <button
                onClick={() => setShowConfirmModal(null)}
                disabled={validating !== null}
                className="w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de demande de modification (Solly Azar) */}
      {modifyingQuoteId && (() => {
        const quote = quotes.find((q) => q.id === modifyingQuoteId);
        const company = quote
          ? companies.find((c) => c.id === quote.company_id)
          : null;
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full my-8">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Demander une modification
                  </h3>
                  <p className="text-sm text-gray-400">
                    {company?.name || "Devis"}{" "}
                    — Cochez ou décochez les options souhaitées. Notre équipe
                    recevra votre demande et vous proposera un devis ajusté.
                  </p>
                </div>
                <button
                  onClick={() => setModifyingQuoteId(null)}
                  disabled={submittingModification}
                  className="text-gray-400 hover:text-white p-1 rounded transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 space-y-1 mb-4">
                {SOLLY_OPTION_LABELS.map((opt) => {
                  const checked = modifyOptions[opt.key] as boolean;
                  const infoOpen = openInfoKey === opt.key;
                  return (
                    <div key={opt.key}>
                      <label
                        className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-md transition-colors ${
                          checked
                            ? "bg-amber-500/15 hover:bg-amber-500/20"
                            : "hover:bg-gray-700/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setModifyOptions({
                              ...modifyOptions,
                              [opt.key]: e.target.checked,
                            })}
                          className="w-4 h-4 rounded border-gray-400 bg-gray-700 text-amber-500 focus:ring-amber-400"
                        />
                        <span
                          className={`text-sm flex-1 ${
                            checked ? "text-white font-medium" : "text-gray-100"
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.info && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setOpenInfoKey(
                                infoOpen ? null : (opt.key as string),
                              );
                            }}
                            className="text-amber-300 hover:text-amber-200 flex-shrink-0"
                            title="Plus d'informations"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </label>

                      {infoOpen && opt.info && (
                        <div className="mx-2.5 mb-2 p-3 rounded-md bg-amber-500/10 border border-amber-400/40 text-xs text-amber-50 whitespace-pre-line leading-relaxed">
                          {opt.info}
                        </div>
                      )}

                      {checked && opt.hasLevel === 3 && (
                        <div className="ml-9 mb-2 flex items-center gap-2 text-xs text-gray-200">
                          <span>Niveau souhaité :</span>
                          {[1, 2, 3].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                setModifyOptions({
                                  ...modifyOptions,
                                  equipements_pro_niveau: n as 1 | 2 | 3,
                                })}
                              className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${
                                modifyOptions.equipements_pro_niveau === n
                                  ? "bg-amber-500/30 border-amber-400 text-white"
                                  : "bg-gray-700/60 border-gray-600 text-gray-200 hover:bg-gray-700"
                              }`}
                            >
                              Niveau {n}
                            </button>
                          ))}
                        </div>
                      )}

                      {checked && opt.hasLevel === 2 && (
                        <div className="ml-9 mb-2 flex items-center gap-2 text-xs text-gray-200">
                          <span>Niveau souhaité :</span>
                          {[1, 2].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                setModifyOptions({
                                  ...modifyOptions,
                                  indemnites_journalieres_niveau: n as 1 | 2,
                                })}
                              className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${
                                modifyOptions.indemnites_journalieres_niveau ===
                                    n
                                  ? "bg-amber-500/30 border-amber-400 text-white"
                                  : "bg-gray-700/60 border-gray-600 text-gray-200 hover:bg-gray-700"
                              }`}
                            >
                              Niveau {n} ({n === 1 ? "75" : "150"} €/jour)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mb-5">
                <label className="block text-gray-100 text-sm font-semibold mb-2">
                  Message complémentaire (optionnel)
                </label>
                <textarea
                  value={modifyMessage}
                  onChange={(e) => setModifyMessage(e.target.value)}
                  placeholder="Précisez ici toute autre demande (budget, franchise, garanties spécifiques...)"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={submitModificationRequest}
                  disabled={submittingModification}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingModification
                    ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Envoi en cours...
                      </>
                    )
                    : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer la demande
                      </>
                    )}
                </button>
                <button
                  onClick={() => setModifyingQuoteId(null)}
                  disabled={submittingModification}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de refus */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Refuser ce devis ?
              </h3>
              <p className="text-gray-300">
                Vous pouvez indiquer la raison du refus (optionnel) pour nous
                aider à mieux vous servir.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <textarea
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder="Raison du refus (optionnel)"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const quote = quotes.find((q) => q.id === showRefuseModal);
                  const company = companies.find((c) =>
                    c.id === quote?.company_id
                  );
                  if (quote && company) {
                    handleRefuseQuote(quote.id, company.name);
                  }
                }}
                disabled={refusing !== null}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refusing
                  ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Refus en cours...
                    </>
                  )
                  : (
                    <>
                      <X className="w-5 h-5" />
                      Confirmer le refus
                    </>
                  )}
              </button>

              <button
                onClick={() => {
                  setShowRefuseModal(null);
                  setRefusalReason("");
                }}
                disabled={refusing !== null}
                className="w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
