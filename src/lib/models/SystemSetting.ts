import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemSetting extends Document {
  key: string;
  value: any;
  expiresAt?: Date | number;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const SystemSettingModel: Model<ISystemSetting> =
  mongoose.models.SystemSetting || mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
