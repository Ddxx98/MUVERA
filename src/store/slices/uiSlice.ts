import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface UiState {
  isCartDrawerOpen: boolean;
  activeLocation: string;
}

const initialState: UiState = {
  isCartDrawerOpen: false,
  activeLocation: 'Bengaluru (Indiranagar Dark Store)',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCartDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isCartDrawerOpen = action.payload;
    },
    setActiveLocation: (state, action: PayloadAction<string>) => {
      state.activeLocation = action.payload;
    },
  },
});

export const { setCartDrawerOpen, setActiveLocation } = uiSlice.actions;

export const selectIsCartDrawerOpen = (state: RootState) => state.ui.isCartDrawerOpen;
export const selectActiveLocation = (state: RootState) => state.ui.activeLocation;

export default uiSlice.reducer;
