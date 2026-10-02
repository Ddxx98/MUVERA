import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AuthTokenDocument extends Document {
  userId: string;
  email: string;
  type: 'email_verify' | 'password_reset';
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  requestIp?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuthTokenSchema = new Schema<AuthTokenDocument>(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    type: {
      type: String,
      enum: ['email_verify', 'password_reset'],
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null, index: true },
    requestIp: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// TTL index to automatically purge expired tokens after 2 days
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 172800 });

export const AuthTokenModel: Model<AuthTokenDocument> =
  mongoose.models.AuthToken || mongoose.model<AuthTokenDocument>('AuthToken', AuthTokenSchema);
