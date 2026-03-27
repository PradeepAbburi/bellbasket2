import { Store } from "@/types";

/**
 * Calculates whether a store is currently open based on its scheduled timings.
 * @param store The store object containing timings and autoClose settings.
 * @returns boolean True if the store is visually open, false if it should be closed.
 */
export const getStoreVisualStatus = (store: Store | any): boolean => {
  if (!store?.timings || !store?.autoClose) {
    return store?.isOpen ?? true;
  }

  try {
    const { open, close } = store.timings;
    if (!open || !close) return store.isOpen ?? true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // Handle overnight shifts (e.g., 22:00 to 02:00)
    if (openMinutes > closeMinutes) {
      return currentTime >= openMinutes || currentTime < closeMinutes;
    }

    return currentTime >= openMinutes && currentTime < closeMinutes;
  } catch (e) {
    console.error("Error calculating store visual status:", e);
    return store.isOpen ?? true;
  }
};
