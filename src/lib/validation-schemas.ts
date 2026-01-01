import { z } from 'zod';

const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
const siretRegex = /^\d{14}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const leadFormSchema = z.object({
  firstName: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, 'Le prénom ne peut contenir que des lettres'),

  lastName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, 'Le nom ne peut contenir que des lettres'),

  email: z.string()
    .email('Email invalide')
    .regex(emailRegex, 'Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères'),

  phone: z.string()
    .regex(phoneRegex, 'Numéro de téléphone français invalide')
    .transform(val => val.replace(/[\s.-]/g, '')),

  city: z.string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, 'La ville ne peut contenir que des lettres'),

  postalCode: z.string()
    .regex(/^\d{5}$/, 'Code postal invalide (5 chiffres requis)'),

  vehicleType: z.enum(['taxi', 'vtc', 'moto-taxi', 'ambulance'], {
    errorMap: () => ({ message: 'Type de véhicule invalide' }),
  }),

  siret: z.string()
    .regex(siretRegex, 'Numéro SIRET invalide (14 chiffres requis)')
    .optional()
    .or(z.literal('')),

  message: z.string()
    .max(1000, 'Le message ne peut pas dépasser 1000 caractères')
    .optional(),

  consentMarketing: z.boolean().optional(),

  captchaToken: z.string()
    .min(1, 'Vérification CAPTCHA requise')
    .optional(),
});

export const contactFormSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, 'Le nom ne peut contenir que des lettres'),

  email: z.string()
    .email('Email invalide')
    .regex(emailRegex, 'Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères'),

  phone: z.string()
    .regex(phoneRegex, 'Numéro de téléphone français invalide')
    .optional()
    .or(z.literal('')),

  subject: z.string()
    .min(5, 'Le sujet doit contenir au moins 5 caractères')
    .max(200, 'Le sujet ne peut pas dépasser 200 caractères'),

  message: z.string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères'),

  captchaToken: z.string()
    .min(1, 'Vérification CAPTCHA requise')
    .optional(),
});

export const newsletterSchema = z.object({
  email: z.string()
    .email('Email invalide')
    .regex(emailRegex, 'Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères'),

  consent: z.boolean()
    .refine(val => val === true, {
      message: 'Vous devez accepter de recevoir la newsletter',
    }),

  captchaToken: z.string()
    .min(1, 'Vérification CAPTCHA requise')
    .optional(),
});

export const quoteRequestSchema = z.object({
  vehicleInfo: z.object({
    brand: z.string().min(2, 'Marque requise'),
    model: z.string().min(2, 'Modèle requis'),
    year: z.number()
      .int()
      .min(1990, 'Année trop ancienne')
      .max(new Date().getFullYear() + 1, 'Année invalide'),
    registrationNumber: z.string()
      .regex(/^[A-Z]{2}-\d{3}-[A-Z]{2}$/, 'Format immatriculation invalide (ex: AB-123-CD)')
      .optional()
      .or(z.literal('')),
  }),

  driverInfo: z.object({
    licenseDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (format: YYYY-MM-DD)'),
    professionalLicenseNumber: z.string()
      .min(5, 'Numéro de licence professionnel requis'),
    yearsExperience: z.number()
      .int()
      .min(0)
      .max(50),
  }),

  coverageOptions: z.array(z.enum([
    'liability',
    'collision',
    'comprehensive',
    'uninsured_motorist',
    'personal_injury',
    'legal_protection',
  ])).min(1, 'Sélectionnez au moins une garantie'),
});

export const adminLoginSchema = z.object({
  email: z.string()
    .email('Email invalide')
    .regex(emailRegex, 'Format d\'email invalide'),

  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),

  totpCode: z.string()
    .regex(/^\d{6}$/, 'Code 2FA invalide (6 chiffres requis)')
    .optional(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type NewsletterData = z.infer<typeof newsletterSchema>;
export type QuoteRequestData = z.infer<typeof quoteRequestSchema>;
export type AdminLoginData = z.infer<typeof adminLoginSchema>;

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}
