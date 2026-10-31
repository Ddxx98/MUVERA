'use client';

import React, { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makeStore, AppStore } from './index';
import { hydrateCart } from './slices/cartSlice';
import { hydrateWishlist } from './slices/wishlistSlice';
import { tickReservation, setReservationActive } from './slices/reservationSlice';
import { CartItem } from '@/lib/types';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore>();

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    if (!storeRef.current) return;
    const store = storeRef.current;

    // Enable refetchOnFocus/refetchOnReconnect behaviors for RTK Query
    const unsubscribeListeners = setupListeners(store.dispatch);

    // Initial hydration from localStorage
    try {
      const savedCart = localStorage.getItem('muvera_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map((item: any) => ({
            ...item,
            variantId:
              item.variantId ||
              item._id?.toString() ||
              `${item.productId}_${item.size}_${item.sku || 'std'}`,
          }));
          store.dispatch(hydrateCart(sanitized));
        }
      }

      const savedWishlist = localStorage.getItem('muvera_wishlist');
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((id) => id !== 'prod_muv_01' && id !== 'prod_sni_02');
          store.dispatch(hydrateWishlist(cleaned));
        }
      }
    } catch {
      // Ignore during SSR or storage restrictions
    }

    // Subscribe to state changes to persist cart & wishlist to localStorage
    let prevCartItems = store.getState().cart.items;
    let prevWishlistIds = store.getState().wishlist.productIds;

    const unsubscribeStore = store.subscribe(() => {
      const state = store.getState();

      if (state.cart.items !== prevCartItems) {
        prevCartItems = state.cart.items;
        try {
          localStorage.setItem('muvera_cart', JSON.stringify(state.cart.items));
        } catch {}

        // Update reservation active status based on cart contents
        const hasItems = state.cart.items.length > 0;
        if (state.reservation.isActive !== hasItems) {
          store.dispatch(setReservationActive(hasItems));
        }
      }

      if (state.wishlist.productIds !== prevWishlistIds) {
        prevWishlistIds = state.wishlist.productIds;
        try {
          localStorage.setItem('muvera_wishlist', JSON.stringify(state.wishlist.productIds));
        } catch {}
      }
    });

    // 1-second isolated reservation ticker
    const timer = setInterval(() => {
      const state = store.getState();
      if (state.reservation.isActive) {
        store.dispatch(tickReservation());
      }
    }, 1000);

    return () => {
      unsubscribeListeners();
      unsubscribeStore();
      clearInterval(timer);
    };
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
