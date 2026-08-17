/**
 * API client for interacting with the FastAPI backend.
 * Provides typed, error-handled requests for sessions, chat, and screenings.
 */

import {
  ChatMessageRequest,
  ChatMessageResponse,
  ScreeningFollowUpRequest,
  ScreeningFollowUpResponse,
  ScreeningRequest,
  ScreeningResponse,
  SessionResponse,
} from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let retryAfter: number | undefined;

      if (response.status === 429) {
        const retryHeader = response.headers.get('Retry-After');
        if (retryHeader) {
          retryAfter = parseInt(retryHeader, 10);
        }
      }

      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // use default status message if body is not JSON
      }

      throw new ApiError(response.status, errorMessage, retryAfter);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Network error or backend is unavailable'
    );
  }
}

/**
 * Creates a new anonymous session.
 */
export async function createSession(language = 'en'): Promise<SessionResponse> {
  return request<SessionResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ language }),
  });
}

/**
 * Retrieves an existing anonymous session.
 */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  return request<SessionResponse>(`/api/sessions/${sessionId}`);
}

/**
 * Sends a message to the AI emotional support chat endpoint.
 */
export async function sendChatMessage(
  payload: ChatMessageRequest
): Promise<ChatMessageResponse> {
  return request<ChatMessageResponse>('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Submits a completed PHQ-9 or GAD-7 screening.
 */
export async function submitScreening(
  payload: ScreeningRequest
): Promise<ScreeningResponse> {
  return request<ScreeningResponse>('/api/screenings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Submits a safety follow-up action for a PHQ-9 positive Item 9 screening.
 */
export async function submitFollowup(
  payload: ScreeningFollowUpRequest
): Promise<ScreeningFollowUpResponse> {
  return request<ScreeningFollowUpResponse>('/api/screenings/followup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
