import { z } from "zod";

export const BlogPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string().max(220),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().optional(),
  author: z.string().default("TaxiAssur"),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  status: z.enum(["draft", "published"]).default("published"),
  faq: z.array(z.object({
    q: z.string(),
    a: z.string(),
  })).optional(),
});

export const FaqEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published"]).default("published"),
});

export const ReviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  source: z.string().optional(),
  createdAt: z.string(),
  status: z.enum(["hidden", "published"]).default("published"),
});

export const OfferSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  benefits: z.array(z.string()).default([]),
  ctaLabel: z.string().default("Demander un devis"),
  updatedAt: z.string(),
  status: z.enum(["draft", "published"]).default("published"),
});

export const LeadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  status: z.enum(["taxi", "vtc", "rc-pro", "autre"]),
  city: z.string().min(2),
  immatriculation: z.string().optional(),
  honeypot: z.string().optional(),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type FaqEntry = z.infer<typeof FaqEntrySchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type Lead = z.infer<typeof LeadSchema>;

// Partnership & SEO Acquisition Schemas
export const ProspectSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  country: z.string().default('FR'),
  type: z.enum(['annuaire', 'asso', 'blog', 'fleet', 'garage', 'ecole', 'media']).default('annuaire'),
  contactPageUrl: z.string().url().optional(),
  publicEmail: z.string().email().optional(),
  source: z.enum(['CSE', 'directory', 'referral', 'manual']).default('CSE'),
  notes: z.string().optional(),
  discoveredAt: z.string(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  status: z.enum(['new', 'qualified', 'rejected', 'contacted', 'partner']).default('new'),
  domainRating: z.number().optional(),
  monthlyTraffic: z.number().optional(),
  tags: z.array(z.string()).default([])
});

export const ConsentSchema = z.object({
  id: z.string(),
  prospectId: z.string(),
  email: z.string().email(),
  lawfulBasis: z.enum(['legitimate_interest', 'consent']),
  collectedAt: z.string(),
  collectedBy: z.string(),
  purpose: z.enum(['partnership', 'newsletter', 'marketing']).default('partnership'),
  optOutUrl: z.string().url(),
  optedOutAt: z.string().optional(),
  retentionMonths: z.number().default(24),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

export const OutreachSchema = z.object({
  id: z.string(),
  prospectId: z.string(),
  templateId: z.string(),
  subject: z.string(),
  body: z.string(),
  recipientEmail: z.string().email(),
  sentAt: z.string().optional(),
  provider: z.enum(['SMTP', 'SendGrid', 'Mailjet']).default('SMTP'),
  status: z.enum(['scheduled', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'replied', 'optout']).default('scheduled'),
  replySummary: z.string().optional(),
  followUpAt: z.string().optional(),
  unsubscribeToken: z.string(),
  campaignId: z.string().optional(),
  variables: z.record(z.string()).default({})
});

export const DirectorySchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  allowed: z.boolean().default(true),
  submissionMode: z.enum(['manual', 'api']),
  requiresLogin: z.boolean().default(false),
  nofollowPolicy: z.enum(['allows', 'disallows', 'unknown']).default('unknown'),
  domainRating: z.number().optional(),
  monthlyTraffic: z.number().optional(),
  apiEndpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  fields: z.array(z.string()).default([]),
  category: z.string(),
  notes: z.string().optional(),
  lastUpdated: z.string(),
  submissionCount: z.number().default(0),
  approvalRate: z.number().optional()
});

export const BacklinkSchema = z.object({
  id: z.string(),
  sourceUrl: z.string().url(),
  targetUrl: z.string().url(),
  anchorText: z.string(),
  rel: z.enum(['dofollow', 'nofollow', 'sponsored', 'ugc']).default('dofollow'),
  context: z.string().optional(),
  discoveredAt: z.string(),
  lastCheckedAt: z.string().optional(),
  status: z.enum(['active', 'lost', 'pending', 'broken']).default('pending'),
  domainRating: z.number().optional(),
  trafficValue: z.number().optional(),
  prospectId: z.string().optional(),
  directoryId: z.string().optional()
});

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  templateId: z.string(),
  targetType: z.enum(['prospects', 'partners', 'custom']),
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'completed']).default('draft'),
  createdAt: z.string(),
  scheduledAt: z.string().optional(),
  completedAt: z.string().optional(),
  totalRecipients: z.number().default(0),
  sentCount: z.number().default(0),
  deliveredCount: z.number().default(0),
  openedCount: z.number().default(0),
  clickedCount: z.number().default(0),
  repliedCount: z.number().default(0),
  optoutCount: z.number().default(0),
  variables: z.record(z.string()).default({})
});

export type Prospect = z.infer<typeof ProspectSchema>;
export type Consent = z.infer<typeof ConsentSchema>;
export type Outreach = z.infer<typeof OutreachSchema>;
export type Directory = z.infer<typeof DirectorySchema>;
export type Backlink = z.infer<typeof BacklinkSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;