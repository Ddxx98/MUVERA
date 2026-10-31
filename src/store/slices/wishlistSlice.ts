import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface WishlistState {
  productIds: string[];
}

const initialState: WishlistState = {
  productIds: [],
};

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    hydrateWishlist: (state, action: PayloadAction<string[]>) => {
      state.productIds = action.payload;
    },
    toggleWishlist: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.productIds.indexOf(id);
      if (index >= 0) {
        state.productIds.splice(index, 1);
      } else {
        state.productIds.push(id);
      }
    },
  },
});

export const { hydrateWishlist, toggleWishlist } = wishlistSlice.actions;

export const selectWishlistIds = (state: RootState) => state.wishlist.productIds;
export const selectWishlistCount = (state: RootState) => state.wishlist.productIds.length;
export const selectIsWishlisted = (productId: string) => (state: RootState) =>
  state.wishlist.productIds.includes(productId);

export default wishlistSlice.reducer;
