import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { muveraApi } from './api/muveraApi';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import uiReducer from './slices/uiSlice';
import reservationReducer from './slices/reservationSlice';

const rootReducer = combineReducers({
  [muveraApi.reducerPath]: muveraApi.reducer,
  cart: cartReducer,
  wishlist: wishlistReducer,
  ui: uiReducer,
  reservation: reservationReducer,
});

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(muveraApi.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];
