import mongoose, { Schema, Document, Model } from 'mongoose';
import { Product as ProductType } from '../types';

export interface ProductDocument extends Document, Omit<ProductType, 'id'> {}

const VariantSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    colorHex: { type: String, default: '#0E0E10' },
    pricePaise: { type: Number, required: true },
    mrpPaise: { type: Number, required: true },
  },
  { _id: true }
);

const ProductSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    brand: { type: String, required: true, index: true },
    brandSlug: { type: String, required: true },
    category: { type: String, required: true, index: true },
    categorySlug: { type: String, required: true },
    categoryId: { type: String, index: true },
    description: { type: String, required: true },
    fabricDetails: { type: String },
    mrpPaise: { type: Number, required: true },
    sellingPricePaise: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
        order: { type: Number, default: 0 },
      },
    ],
    variants: [VariantSchema],
    isBlitzDrop: { type: Boolean, default: false },
    isDealOfTheHour: { type: Boolean, default: false },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

ProductSchema.index({ categoryId: 1, createdAt: -1 });

// Prevent re-compilation in development
export const ProductModel: Model<ProductDocument> =
  mongoose.models.Product || mongoose.model<ProductDocument>('Product', ProductSchema);
