export interface SendEmailInput {
  to: string;
  name?: string;
  subject: string;
  html: string;
  text?: string;
  otp?: string;
  tags?: string[];
  templateParams?: Record<string, any>;
}

export interface CreateCampaignInput {
  name: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
  listIds?: number[];
  scheduledAt?: string;
  sendNow?: boolean;
}

export interface CampaignResult {
  success: boolean;
  campaignId?: number;
  message: string;
  raw?: any;
}

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<string>;
  createCampaign?(input: CreateCampaignInput): Promise<CampaignResult>;
}
