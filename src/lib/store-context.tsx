'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Variant, Coupon } from './types';
import { env } from '@/config/env';

interface StoreContextType {
  cart: CartItem[];
  wishlist: string[]; // product IDs
  activeLocation: string;
  isCartDrawerOpen: boolean;
  appliedCoupon: Coupon | null;
  reservationTimeRemainingSeconds: number;
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

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>(['prod_muv_01', 'prod_sni_02']);
  const [activeLocation, setActiveLocation] = useState<string>(env.defaultLocation);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [reservationTimeRemainingSeconds, setReservationTimeRemainingSeconds] = useState(env.holdExpiryMinutes * 60);

  // Load persisted state from localStorage if available
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('muvera_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedWishlist = localStorage.getItem('muvera_wishlist');
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch {
      // Ignore in SSR
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('muvera_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('muvera_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  // Reservation countdown timer when cart is not empty
  useEffect(() => {
    if (cart.length === 0) {
      setReservationTimeRemainingSeconds(env.holdExpiryMinutes * 60);
      return;
    }

    const timer = setInterval(() => {
      setReservationTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          return env.holdExpiryMinutes * 60; // reset/cycle
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cart.length]);

  const addToCart = (product: Product, variant: Variant, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variantId === variant.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }

      const newItem: CartItem = {
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        title: product.title,
        brand: product.brand,
        size: variant.size,
        color: variant.color,
        image: product.images[0]?.url || '',
        sellingPricePaise: variant.pricePaise,
        mrpPaise: variant.mrpPaise,
        quantity,
      };
      return [...prev, newItem];
    });
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const isWishlisted = (productId: string) => wishlist.includes(productId);

  const getCartSubtotalPaise = () => {
    return cart.reduce((sum, item) => sum + item.sellingPricePaise * item.quantity, 0);
  };

  const getDiscountPaise = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getCartSubtotalPaise();
    if (subtotal < appliedCoupon.minOrderValuePaise) return 0;

    if (appliedCoupon.discountType === 'percentage') {
      const discount = Math.round((subtotal * appliedCoupon.value) / 100);
      return appliedCoupon.maxDiscountPaise ? Math.min(discount, appliedCoupon.maxDiscountPaise) : discount;
    } else {
      return Math.min(appliedCoupon.value, subtotal);
    }
  };

  const getDeliveryFeePaise = () => {
    const subtotal = getCartSubtotalPaise();
    if (subtotal === 0 || subtotal >= env.freeShippingThresholdPaise) {
      return 0;
    }
    return env.expressDeliveryFeePaise;
  };

  const getGrandTotalPaise = () => {
    const subtotal = getCartSubtotalPaise();
    if (subtotal === 0) return 0;
    const discount = getDiscountPaise();
    const delivery = getDeliveryFeePaise();
    return Math.max(0, subtotal - discount + delivery);
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = code.trim().toUpperCase();
    try {
      const res = await fetch(`/api/coupons?code=${trimmed}`);
      const data = await res.json();
      if (data.coupon) {
        const subtotal = getCartSubtotalPaise();
        if (subtotal < data.coupon.minOrderValuePaise) {
          return {
            success: false,
            message: `Minimum cart value of ₹${data.coupon.minOrderValuePaise / 100} required for this coupon.`,
          };
        }
        setAppliedCoupon(data.coupon);
        return { success: true, message: `Coupon ${trimmed} applied successfully!` };
      }
      return { success: false, message: 'Invalid or expired coupon code.' };
    } catch {
      // Offline fallback
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
        setAppliedCoupon(coupon);
        return { success: true, message: 'Coupon WELCOME10 applied (10% off)!' };
      }
      return { success: false, message: 'Could not apply coupon.' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        activeLocation,
        isCartDrawerOpen,
        appliedCoupon,
        reservationTimeRemainingSeconds,
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
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
