import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { env } from '@/config/env';
import type { RootState } from '../index';

export interface ReservationState {
  timeRemainingSeconds: number;
  isActive: boolean;
}

const initialState: ReservationState = {
  timeRemainingSeconds: env.holdExpiryMinutes * 60,
  isActive: false,
};

export const reservationSlice = createSlice({
  name: 'reservation',
  initialState,
  reducers: {
    tickReservation: (state) => {
      if (state.timeRemainingSeconds <= 1) {
        state.timeRemainingSeconds = env.holdExpiryMinutes * 60; // reset/cycle
      } else {
        state.timeRemainingSeconds -= 1;
      }
    },
    resetReservation: (state, action: PayloadAction<number | undefined>) => {
      state.timeRemainingSeconds = action.payload ?? env.holdExpiryMinutes * 60;
    },
    setReservationActive: (state, action: PayloadAction<boolean>) => {
      state.isActive = action.payload;
      if (!action.payload) {
        state.timeRemainingSeconds = env.holdExpiryMinutes * 60;
      }
    },
  },
});

export const { tickReservation, resetReservation, setReservationActive } = reservationSlice.actions;

export const selectReservationTimeRemainingSeconds = (state: RootState) =>
  state.reservation.timeRemainingSeconds;
export const selectIsReservationActive = (state: RootState) =>
  state.reservation.isActive;

export default reservationSlice.reducer;
