import mongoose, { Schema, Document, Model } from 'mongoose';

export type WebhookEventStatus =
  | 'received'
  | 'processing'
  | 'processed'
  | 'ignored_same_state'
  | 'informational'
  | 'rejected_stale'
  | 'rejected_invalid_transition'
  | 'unmapped'
  | 'unknown_awb'
  | 'direction_mismatch'
  | 'failed';

export interface IWebhookEvent extends Document {
  source: string;
  eventKey: string;
  payload: any;
  status: WebhookEventStatus;
  unmappedStatus?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    source: { type: String, required: true, default: 'shiprocket', index: true },
    eventKey: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: [
        'received',
        'processing',
        'processed',
        'ignored_same_state',
        'informational',
        'rejected_stale',
        'rejected_invalid_transition',
        'unmapped',
        'unknown_awb',
        'direction_mismatch',
        'failed',
      ],
      default: 'received',
      index: true,
    },
    unmappedStatus: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

WebhookEventSchema.index({ source: 1, eventKey: 1 }, { unique: true });
WebhookEventSchema.index({ status: 1, createdAt: -1 });

export const WebhookEventModel: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
