import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  code: string;
  name: string;
  type: 'dark_store' | 'warehouse' | 'retail';
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  serviceablePincodes: string[];
  expressEnabled: boolean;
  active: boolean;
}

const LocationSchema = new Schema<ILocation>(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['dark_store', 'warehouse', 'retail'],
      default: 'dark_store',
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    serviceablePincodes: [{ type: String }],
    expressEnabled: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const LocationModel =
  mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);
