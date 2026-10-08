import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CategoryDocument extends Document {
  name: string;
  slug: string;
  image?: string;
  description?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

const CategorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String },
    description: { type: String },
    order: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const CategoryModel: Model<CategoryDocument> =
  mongoose.models.Category || mongoose.model<CategoryDocument>('Category', CategorySchema);
