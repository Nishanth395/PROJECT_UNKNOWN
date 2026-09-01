export interface ExtractionResult {
  category: string;
  skills: string[];
  urgency: string;
  confidence: number;
  reasoning?: string;
  extracted_skills: string[];
}

export interface ExtractionResponse {
  request_id: string;
  category: string;
  skills: string[];
  urgency: string;
  confidence: number;
  provider: string;
  model: string;
}
