import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  type: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  runAt: Date;
  lockedUntil?: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, sparse: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    runAt: { type: Date, default: Date.now, index: true },
    lockedUntil: { type: Date, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String },
  },
  { timestamps: true }
);

// Compound index for efficient job polling
JobSchema.index({ status: 1, runAt: 1, lockedUntil: 1 });

export const JobModel =
  mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
