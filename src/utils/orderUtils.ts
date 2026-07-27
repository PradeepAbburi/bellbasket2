export const isOrderOrBookingActive = (item: any): boolean => {
  if (!item) return false;
  if (item.status !== 'completed' && item.status !== 'rejected' && item.status !== 'cancelled') return true;
  const now = Date.now();
  if (item.status === 'completed') {
    const completedAt = item.completedAt ? new Date(item.completedAt).getTime() : 0;
    return completedAt > 0 && (now - completedAt) < 30000;
  }
  if (item.status === 'rejected' || item.status === 'cancelled') {
    const cancelTime = item.cancelledAt 
      ? new Date(item.cancelledAt).getTime() 
      : (item.rejectedAt ? new Date(item.rejectedAt).getTime() : 0);
    return cancelTime > 0 && (now - cancelTime) < 30000;
  }
  return false;
};
