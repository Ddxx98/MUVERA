import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemLock extends Document {
  _id: any;
  owner: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SystemLockSchema = new Schema<ISystemLock>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, _id: false }
);

export const SystemLockModel: Model<ISystemLock> =
  mongoose.models.SystemLock || mongoose.model<ISystemLock>('SystemLock', SystemLockSchema);
