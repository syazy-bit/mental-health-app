/**
 * Domain and API TypeScript definitions for the mental health support frontend.
 * Matches backend schemas from M1-M6.
 */

export interface SessionResponse {
  id: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string | null;
  model?: string | null;
  isCrisis?: boolean;
}

export interface ChatMessageRequest {
  session_id: string;
  message: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface ChatMessageResponse {
  session_id: string;
  message_index: number;
  risk_level: 'NORMAL' | 'MODERATE' | 'HIGH_RISK';
  category: string;
  response: string;
  is_crisis: boolean;
  language: string;
  provider?: string | null;
  model?: string | null;
}

export type InstrumentType = 'PHQ9' | 'GAD7';

export interface ScreeningRequest {
  session_id: string;
  instrument: InstrumentType;
  responses: number[];
}

export interface ScreeningSafetyInfo {
  safety_state: 'NO_SAFETY_SIGNAL' | 'POSITIVE_SAFETY_SCREEN' | 'HIGH_RISK_AFTER_SAFETY_FOLLOWUP';
  risk_level: 'NORMAL' | 'MODERATE' | 'HIGH_RISK';
  requires_followup: boolean;
  supportive_guidance: string;
  safety_resources: string[];
}

export interface ScreeningResponse {
  id: string;
  session_id: string;
  instrument: string;
  total_score: number;
  severity: string;
  safety_flag: boolean;
  item9_score?: number | null;
  safety_info?: ScreeningSafetyInfo | null;
  created_at: string;
}

export type FollowUpAction = 'ESCALATE_CRISIS' | 'SUPPORTIVE_CARE';

export interface ScreeningFollowUpRequest {
  session_id: string;
  screening_id: string;
  action: FollowUpAction;
}

export interface ScreeningFollowUpResponse {
  screening_id: string;
  action: string;
  new_safety_state: string;
  new_risk_level: string;
  supportive_guidance: string;
  safety_resources: string[];
}

export interface CrisisResource {
  name: string;
  number: string;
  description: string;
  hours: string;
  telLink: string;
  category: 'general' | 'specialized' | 'emergency';
}
