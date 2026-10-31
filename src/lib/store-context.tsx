'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import ReduxStoreProvider from '@/store/StoreProvider';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addToCart as addToCartAction,
  removeFromCart as removeFromCartAction,
  updateQuantity as updateQuantityAction,
  clearCart as clearCartAction,
  applyCoupon as applyCouponAction,
  removeCoupon as removeCouponAction,
  setSiteSettings,
  selectCartItems,
  selectAppliedCoupon,
  selectCartSubtotalPaise,
  selectDiscountPaise,
  selectDeliveryFeePaise,
  selectGrandTotalPaise,
} from '@/store/slices/cartSlice';
import {
  toggleWishlist as toggleWishlistAction,
  selectWishlistIds,
} from '@/store/slices/wishlistSlice';
import {
  setCartDrawerOpen as setCartDrawerOpenAction,
  setActiveLocation as setActiveLocationAction,
  selectIsCartDrawerOpen,
  selectActiveLocation,
} from '@/store/slices/uiSlice';
import { selectReservationTimeRemainingSeconds } from '@/store/slices/reservationSlice';
import { CartItem, Product, Variant, Coupon } from './types';
import { SiteSettingsData } from './models/SiteSettings';

interface StoreContextType {
  cart: CartItem[];
  wishlist: string[];
  activeLocation: string;
  isCartDrawerOpen: boolean;
  appliedCoupon: Coupon | null;
  reservationTimeRemainingSeconds: number;
  siteSettings: SiteSettingsData | null;
  addToCart: (product: Product, variant: Variant, quantity?: number) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, delta: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  setActiveLocation: (loc: string) => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  getCartSubtotalPaise: () => number;
  getDiscountPaise: () => number;
  getDeliveryFeePaise: () => number;
  getGrandTotalPaise: () => number;
}

const StoreContext = createContext<StoreContextType | null>(null);

/**
 * Dedicated hook for stock hold reservation countdown.
 * Components subscribing to this hook only re-render when the seconds tick,
 * completely isolating the timer from other store components.
 */
export function useReservationTimer() {
  return useAppSelector(selectReservationTimeRemainingSeconds);
}

function StoreBridge({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: SiteSettingsData | null;
}) {
  const dispatch = useAppDispatch();

  const cart = useAppSelector(selectCartItems);
  const wishlist = useAppSelector(selectWishlistIds);
  const activeLocation = useAppSelector(selectActiveLocation);
  const isCartDrawerOpen = useAppSelector(selectIsCartDrawerOpen);
  const appliedCoupon = useAppSelector(selectAppliedCoupon);
  const subtotalPaise = useAppSelector(selectCartSubtotalPaise);
  const discountPaise = useAppSelector(selectDiscountPaise);
  const deliveryFeePaise = useAppSelector(selectDeliveryFeePaise);
  const grandTotalPaise = useAppSelector(selectGrandTotalPaise);

  useEffect(() => {
    if (initialSettings) {
      dispatch(setSiteSettings(initialSettings));
    }
  }, [initialSettings, dispatch]);

  const addToCart = useCallback(
    (product: Product, variant: Variant, quantity = 1) => {
      dispatch(addToCartAction({ product, variant, quantity }));
      dispatch(setCartDrawerOpenAction(true));
    },
    [dispatch]
  );

  const removeFromCart = useCallback(
    (variantId: string) => {
      dispatch(removeFromCartAction(variantId));
    },
    [dispatch]
  );

  const updateQuantity = useCallback(
    (variantId: string, delta: number) => {
      dispatch(updateQuantityAction({ variantId, delta }));
    },
    [dispatch]
  );

  const clearCart = useCallback(() => {
    dispatch(clearCartAction());
  }, [dispatch]);

  const toggleWishlist = useCallback(
    (productId: string) => {
      dispatch(toggleWishlistAction(productId));
    },
    [dispatch]
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const setIsCartDrawerOpen = useCallback(
    (open: boolean) => {
      dispatch(setCartDrawerOpenAction(open));
    },
    [dispatch]
  );

  const setActiveLocation = useCallback(
    (loc: string) => {
      dispatch(setActiveLocationAction(loc));
    },
    [dispatch]
  );

  const applyCoupon = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      const trimmed = code.trim().toUpperCase();
      try {
        const res = await fetch(`/api/coupons?code=${trimmed}`);
        const data = await res.json();
        if (data.coupon) {
          if (subtotalPaise < data.coupon.minOrderValuePaise) {
            return {
              success: false,
              message: `Minimum cart value of ₹${data.coupon.minOrderValuePaise / 100} required for this coupon.`,
            };
          }
          dispatch(applyCouponAction(data.coupon));
          return { success: true, message: `Coupon ${trimmed} applied successfully!` };
        }
        return { success: false, message: 'Invalid or expired coupon code.' };
      } catch {
        if (trimmed === 'WELCOME10') {
          const coupon: Coupon = {
            code: 'WELCOME10',
            discountType: 'percentage',
            value: 10,
            minOrderValuePaise: 99900,
            maxDiscountPaise: 50000,
            expiresAt: '2027-12-31',
            usageCount: 0,
            active: true,
          };
          dispatch(applyCouponAction(coupon));
          return { success: true, message: 'Coupon WELCOME10 applied (10% off)!' };
        }
        return { success: false, message: 'Could not apply coupon.' };
      }
    },
    [dispatch, subtotalPaise]
  );

  const removeCoupon = useCallback(() => {
    dispatch(removeCouponAction());
  }, [dispatch]);

  const getCartSubtotalPaise = useCallback(() => subtotalPaise, [subtotalPaise]);
  const getDiscountPaise = useCallback(() => discountPaise, [discountPaise]);
  const getDeliveryFeePaise = useCallback(() => deliveryFeePaise, [deliveryFeePaise]);
  const getGrandTotalPaise = useCallback(() => grandTotalPaise, [grandTotalPaise]);

  const value: StoreContextType = {
    cart,
    wishlist,
    activeLocation,
    isCartDrawerOpen,
    appliedCoupon,
    reservationTimeRemainingSeconds: 900,
    siteSettings: initialSettings || null,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleWishlist,
    isWishlisted,
    setIsCartDrawerOpen,
    setActiveLocation,
    applyCoupon,
    removeCoupon,
    getCartSubtotalPaise,
    getDiscountPaise,
    getDeliveryFeePaise,
    getGrandTotalPaise,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function StoreProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: SiteSettingsData | null;
}) {
  return (
    <ReduxStoreProvider>
      <StoreBridge initialSettings={initialSettings}>{children}</StoreBridge>
    </ReduxStoreProvider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
