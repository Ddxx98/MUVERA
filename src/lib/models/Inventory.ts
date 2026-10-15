import mongoose, { Schema, Document, Model } from 'mongoose';
import { InventoryItem as InventoryItemType, StockMovement as StockMovementType } from '../types';

export interface InventoryDocument extends Document, Omit<InventoryItemType, 'variantId'> {
  variantId: string;
}

export interface StockMovementDocument extends Document, Omit<StockMovementType, 'id'> {}

const InventorySchema = new Schema(
  {
    variantId: { type: String, required: true, index: true },
    locationId: { type: String, required: true, index: true, default: 'loc_blr_ind_01' },
    sku: { type: String, required: true, index: true },
    onHand: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 3 },
  },
  { timestamps: true }
);

InventorySchema.index({ variantId: 1, locationId: 1 }, { unique: true });

const StockMovementSchema = new Schema(
  {
    variantId: { type: String, default: 'default', index: true },
    sku: { type: String, default: 'default' },
    locationId: { type: String, required: true },
    type: {
      type: String,
      enum: ['sale', 'reservation', 'release', 'receiving', 'damage', 'correction', 'return_restock'],
      required: true,
    },
    quantityDelta: { type: Number, required: true },
    previousOnHand: { type: Number, required: true },
    newOnHand: { type: Number, required: true },
    referenceId: { type: String, required: true },
    reason: { type: String },
    actor: { type: String, default: 'System' },
  },
  { timestamps: true }
);

export const InventoryModel: Model<InventoryDocument> =
  mongoose.models.Inventory || mongoose.model<InventoryDocument>('Inventory', InventorySchema);

export const StockMovementModel: Model<StockMovementDocument> =
  mongoose.models.StockMovement ||
  mongoose.model<StockMovementDocument>('StockMovement', StockMovementSchema);
