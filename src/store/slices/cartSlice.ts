import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, Product, Variant, Coupon } from '@/lib/types';
import { SiteSettingsData } from '@/lib/models/SiteSettings';
import type { RootState } from '../index';

export interface CartState {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  siteSettings: SiteSettingsData | null;
}

const initialState: CartState = {
  items: [],
  appliedCoupon: null,
  siteSettings: null,
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    hydrateCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
    },
    setSiteSettings: (state, action: PayloadAction<SiteSettingsData | null>) => {
      state.siteSettings = action.payload;
    },
    addToCart: (
      state,
      action: PayloadAction<{ product: Product; variant: Variant; quantity?: number }>
    ) => {
      const { product, variant, quantity = 1 } = action.payload;
      const vId =
        variant.id ||
        (variant as any)._id?.toString() ||
        `${product.id}_${variant.size}_${variant.sku || 'std'}`;

      const existingIndex = state.items.findIndex((i) => i.variantId === vId);
      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
      } else {
        const newItem: CartItem = {
          productId: product.id,
          variantId: vId,
          sku: variant.sku,
          title: product.title,
          brand: product.brand,
          size: variant.size,
          color: variant.color,
          image: product.images?.[0]?.url || '',
          sellingPricePaise: variant.pricePaise,
          mrpPaise: variant.mrpPaise,
          quantity,
        };
        state.items.push(newItem);
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.variantId !== action.payload);
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ variantId: string; delta: number }>
    ) => {
      const { variantId, delta } = action.payload;
      const item = state.items.find((i) => i.variantId === variantId);
      if (item) {
        const newQty = item.quantity + delta;
        if (newQty > 0) {
          item.quantity = newQty;
        } else {
          state.items = state.items.filter((i) => i.variantId !== variantId);
        }
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.appliedCoupon = null;
    },
    applyCoupon: (state, action: PayloadAction<Coupon>) => {
      state.appliedCoupon = action.payload;
    },
    removeCoupon: (state) => {
      state.appliedCoupon = null;
    },
  },
});

export const {
  hydrateCart,
  setSiteSettings,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  applyCoupon,
  removeCoupon,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartCount = (state: RootState) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotalPaise = (state: RootState) =>
  state.cart.items.reduce((sum, item) => sum + item.sellingPricePaise * item.quantity, 0);

export const selectAppliedCoupon = (state: RootState) => state.cart.appliedCoupon;

export const selectDiscountPaise = (state: RootState) => {
  const coupon = state.cart.appliedCoupon;
  if (!coupon) return 0;
  const subtotal = selectCartSubtotalPaise(state);
  if (subtotal < coupon.minOrderValuePaise) return 0;

  if (coupon.discountType === 'percentage') {
    const discount = Math.round((subtotal * coupon.value) / 100);
    return coupon.maxDiscountPaise ? Math.min(discount, coupon.maxDiscountPaise) : discount;
  }
  return Math.min(coupon.value, subtotal);
};

export const selectDeliveryFeePaise = (state: RootState) => {
  const subtotal = selectCartSubtotalPaise(state);
  if (subtotal === 0) return 0;

  const siteSettings = state.cart.siteSettings;
  const threshold = siteSettings ? siteSettings.freeShippingThresholdPaise : 0;
  const fee = siteSettings ? siteSettings.expressDeliveryFeePaise : 0;

  if (threshold <= 0 || subtotal >= threshold) {
    return 0;
  }
  return fee;
};

export const selectGrandTotalPaise = (state: RootState) => {
  const subtotal = selectCartSubtotalPaise(state);
  const discount = selectDiscountPaise(state);
  const delivery = selectDeliveryFeePaise(state);
  return Math.max(0, subtotal - discount + delivery);
};

export default cartSlice.reducer;
