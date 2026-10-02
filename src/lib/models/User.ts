import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserAddress {
  fullName: string;
  phone: string;
  street: string;
  apartment?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: string;
  addresses: UserAddress[];
  loyaltyTier: 'VIP Gold' | 'Streetwear Insider' | 'Club Member';
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    apartment: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'customer', index: true },
    addresses: [AddressSchema],
    loyaltyTier: {
      type: String,
      enum: ['VIP Gold', 'Streetwear Insider', 'Club Member'],
      default: 'Club Member',
    },
  },
  { timestamps: true }
);

export const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
