import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Tag,
  TrendingUp,
  MessageSquare,
  FileText,
  CreditCard,
  Bot,
  ArrowRight,
  Edit,
  Save,
  X
} from 'lucide-react';
import { pipelineService, CRMLead, PIPELINE_STATUSES } from '@/lib/crm-pipeline';
import { aiGovernanceService } from '@/lib/crm-ai-governance';
import { channelEngineService } from '@/lib/crm-channel-engine';
import { productionService } from '@/lib/crm-production';
import { retentionService } from '@/lib/crm-retention';
import { TimelineEvent } from '@/components/crm/TimelineEvent';
import { AIDecisionCard } from '@/components/crm/AIDecisionCard';
import { DocumentChecklist } from '@/components/crm/DocumentChecklist';
import { RetentionScore } from '@/components/crm/RetentionScore';
import BackButton from './BackButton';
import LostLeadRecontactModal from './LostLeadRecontactModal';

const CRMLeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [aiDecisions, setAiDecisions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [retentionScore, setRetentionScore] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'documents' | 'ia' | 'retention'>('timeline');
  const [editing, setEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [showRecontactModal, setShowRecontactModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<any>(null);

  useEffect(() => {
    if (leadId) loadLeadData(leadId);
  }, [leadId]);

  const loadLeadData = async (leadId: string) => {
    setLoading(true);
    console.log('Loading lead data for:', leadId);
    try {
      const [
        leadData,
        timelineData,
        decisionsData,
        docsData,
        scoreData
      ] = await Promise.all([
        pipelineService.getLead(leadId),
        pipelineService.getTimeline(leadId),
        aiGovernanceService.getDecisions(leadId),
        productionService.getDocuments(leadId),
        retentionService.getRetentionScore(leadId)
      ]);

      console.log('Lead data loaded:', leadData);
      console.log('Timeline:', timelineData);
      console.log('Decisions:', decisionsData);
      console.log('Documents:', docsData);
      console.log('Retention score:', scoreData);

      setLead(leadData);
      setTimeline(timelineData);
      setAiDecisions(decisionsData);
      setDocuments(docsData);
      setRetentionScore(scoreData);
      setEditedNotes(leadData.notes || '');
    } catch (error) {
      console.error('Failed to load lead:', error);
      console.error('Error details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!lead) return;

    if (newStatus === 'LOST_RECONTACT_SCHEDULED') {
      setPendingStatusChange(newStatus);
      setShowRecontactModal(true);
      return;
    }

    try {
      await pipelineService.updateLeadStatus(lead.id, newStatus);
      await loadLeadData(lead.id);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleRecontactConfirm = async (date: string, reason: string) => {
    if (!lead || !pendingStatusChange) return;

    try {
      await pipelineService.updateLeadStatus(
        lead.id,
        pendingStatusChange,
        reason,
        undefined,
        date
      );
      setShowRecontactModal(false);
      setPendingStatusChange(null);
      await loadLeadData(lead.id);
    } catch (error) {
      console.error('Failed to schedule recontact:', error);
    }
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    setEditing(false);
  };

  const availableTransitions = lead ? pipelineService.getAvailableTransitions(lead.status) : [];

  if (loading || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-48 bg-gray-200 rounded-xl mb-6"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 h-96 bg-gray-200 rounded-xl"></div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = PIPELINE_STATUSES[lead.status];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <BackButton to="/backoffice/crm-killer/pipeline" label="Retour au pipeline" showHomeIcon={false} />
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
                {statusInfo.icon}
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{lead.full_name}</h1>
                <div className="flex items-center gap-4 text-blue-100">
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    {lead.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    {lead.phone}
                  </div>
                  {lead.city && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      {lead.city}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-lg mb-2">
                <div className="text-sm text-blue-100">Statut</div>
                <div className="font-bold">{statusInfo.label}</div>
              </div>
              {lead.quality_score && (
                <div className="text-2xl font-bold">{lead.quality_score}% qualité</div>
              )}
            </div>
          </div>

          {availableTransitions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-blue-100">Actions:</span>
              {availableTransitions.map((transition) => (
                <button
                  key={transition.to}
                  onClick={() => handleStatusChange(transition.to)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {transition.label}
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Créé le</div>
            <div className="font-bold text-gray-900">
              {new Date(lead.created_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
          {lead.last_contact && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Dernier contact</div>
              <div className="font-bold text-gray-900">
                {new Date(lead.last_contact).toLocaleDateString('fr-FR')}
              </div>
            </div>
          )}
          {lead.next_followup && (
            <div className="bg-white rounded-xl border-2 border-yellow-300 p-4">
              <div className="text-sm text-yellow-600 mb-1">Prochain suivi</div>
              <div className="font-bold text-yellow-900">
                {new Date(lead.next_followup).toLocaleDateString('fr-FR')}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={24} />
                  Notes
                </h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      className="text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
                    >
                      <Save size={16} />
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditedNotes(lead.notes || '');
                      }}
                      className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
                    >
                      <X size={16} />
                      Annuler
                    </button>
                  </div>
                )}
              </div>
              {editing ? (
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ajoutez des notes..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {lead.notes || 'Aucune note'}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6 border-b">
                {(['timeline', 'documents', 'ia', 'retention'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                      activeTab === tab
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-600 border-transparent hover:text-gray-900'
                    }`}
                  >
                    {tab === 'timeline' && 'Timeline'}
                    {tab === 'documents' && 'Documents'}
                    {tab === 'ia' && 'IA Décisions'}
                    {tab === 'retention' && 'Rétention'}
                  </button>
                ))}
              </div>

              <div>
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {timeline.map((event, index) => (
                      <TimelineEvent
                        key={event.id}
                        event={event}
                        isLast={index === timeline.length - 1}
                      />
                    ))}
                  </div>
                )}

                {activeTab === 'documents' && (
                  <DocumentChecklist documents={documents} />
                )}

                {activeTab === 'ia' && (
                  <div className="space-y-4">
                    {aiDecisions.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        Aucune décision IA pour ce lead
                      </div>
                    ) : (
                      aiDecisions.map((decision) => (
                        <AIDecisionCard
                          key={decision.id}
                          decision={decision}
                          onApprove={async () => {
                            await aiGovernanceService.approveDecision(decision.id, 'admin');
                            await loadLeadData(lead.id);
                          }}
                          onReject={async () => {
                            await aiGovernanceService.rejectDecision(decision.id);
                            await loadLeadData(lead.id);
                          }}
                        />
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'retention' && retentionScore && (
                  <RetentionScore score={retentionScore} />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {retentionScore && (
              <RetentionScore score={retentionScore} compact />
            )}

            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Actions Rapides</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <Mail size={16} />
                  Envoyer Email
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  <MessageSquare size={16} />
                  Envoyer SMS
                </button>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                  <Bot size={16} />
                  Convoquer Council IA
                </button>
              </div>
            </div>

            {lead.tags && lead.tags.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag size={20} />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRecontactModal && (
        <LostLeadRecontactModal
          leadName={lead.full_name}
          onConfirm={handleRecontactConfirm}
          onCancel={() => {
            setShowRecontactModal(false);
            setPendingStatusChange(null);
          }}
        />
      )}
    </div>
  );
};

export default CRMLeadDetail;
