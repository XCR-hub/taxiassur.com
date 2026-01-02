/**
 * API Client centralisé pour tous les appels API
 * Gère automatiquement les erreurs, le parsing JSON et le logging
 */

import { logger } from './logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Effectue un appel API avec gestion d'erreur robuste
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      },
    });

    const text = await response.text();

    if (!response.ok) {
      logger.error('Erreur HTTP API:', {
        url,
        status: response.status,
        statusText: response.statusText,
        body: text.substring(0, 500),
      });

      if (response.status === 404) {
        throw new ApiError(
          'Service non disponible (404). Veuillez contacter le support.',
          404,
          { url, body: text }
        );
      }

      if (response.status >= 500) {
        throw new ApiError(
          'Erreur serveur. Veuillez réessayer dans quelques instants.',
          response.status,
          { url, body: text }
        );
      }

      if (response.status === 400) {
        try {
          const errorData = JSON.parse(text);
          throw new ApiError(
            errorData.error || 'Données invalides',
            400,
            errorData.details
          );
        } catch (parseError) {
          throw new ApiError(
            'Requête invalide',
            400,
            { body: text }
          );
        }
      }

      throw new ApiError(
        `Erreur ${response.status}. Veuillez réessayer.`,
        response.status,
        { body: text }
      );
    }

    if (!text || text.trim() === '') {
      logger.warn('Réponse vide de l\'API:', { url });
      return { success: true, data: undefined as T };
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      logger.error('Erreur parsing JSON:', {
        url,
        text: text.substring(0, 500),
        error: parseError,
      });

      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new ApiError(
          'Le serveur a retourné du HTML au lieu de JSON. Veuillez contacter le support.',
          response.status,
          { body: text.substring(0, 200) }
        );
      }

      throw new ApiError(
        'Réponse serveur invalide. Veuillez contacter le support.',
        response.status,
        { body: text.substring(0, 200) }
      );
    }

    if (data.success === false || data.ok === false) {
      return {
        success: false,
        error: data.error || 'Erreur inconnue',
        details: data.details,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Erreur réseau API:', { url, error });

    throw new ApiError(
      error instanceof Error ? error.message : 'Erreur de connexion. Veuillez réessayer.',
      undefined,
      { originalError: error }
    );
  }
}

/**
 * POST vers l'API lead.php
 */
export async function submitLead(data: {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  immatriculation?: string;
}): Promise<ApiResponse> {
  return apiCall('/api/lead.php', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * POST vers l'API newsletter.php
 */
export async function subscribeNewsletter(email: string): Promise<ApiResponse> {
  return apiCall('/api/newsletter.php', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Gestion d'erreur helper pour affichage utilisateur
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur est survenue. Veuillez réessayer.';
}

/**
 * Helper pour vérifier si une erreur est une erreur API
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
