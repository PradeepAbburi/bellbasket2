export const getCurrencySymbol = (country?: string, address?: string): string => {
  const cleanCountry = (country || '').toLowerCase().trim();
  const cleanAddress = (address || '').toLowerCase().trim();

  // US, Australia, & Singapore Dollar ($)
  if (
    cleanCountry === 'us' || 
    cleanCountry === 'usa' || 
    cleanCountry.includes('united states') || 
    cleanCountry === 'au' || 
    cleanCountry === 'aus' || 
    cleanCountry.includes('australia') || 
    cleanCountry === 'sg' || 
    cleanCountry === 'singapore' || 
    cleanCountry.includes('singapore') || 
    cleanAddress.includes(' usa') || 
    cleanAddress.endsWith(', usa') || 
    cleanAddress.includes('united states') || 
    cleanAddress.includes('australia') || 
    cleanAddress.includes('singapore') || 
    cleanAddress.includes(', au,') || 
    cleanAddress.includes(', sg,') || 
    cleanAddress.endsWith(', au') || 
    cleanAddress.endsWith(', sg')
  ) {
    return '$';
  }

  // UK Pound (£)
  if (
    cleanCountry === 'uk' || 
    cleanCountry === 'gb' || 
    cleanCountry === 'united kingdom' || 
    cleanAddress.includes(' united kingdom') || 
    cleanAddress.endsWith(', uk') || 
    cleanAddress.includes('united kingdom') || 
    cleanAddress.includes(', uk,')
  ) {
    return '£';
  }

  // Euro (€)
  if (
    cleanCountry === 'eu' || 
    cleanCountry.includes('europe') || 
    cleanCountry === 'germany' || 
    cleanCountry === 'france' || 
    cleanCountry === 'italy' || 
    cleanCountry === 'spain'
  ) {
    return '€';
  }

  // Japanese Yen (¥)
  if (
    cleanCountry === 'jp' || 
    cleanCountry === 'japan' || 
    cleanCountry.includes('japan') || 
    cleanAddress.includes('japan') || 
    cleanAddress.includes(', jp,') || 
    cleanAddress.endsWith(', jp')
  ) {
    return '¥';
  }

  // Korean Won (₩)
  if (
    cleanCountry === 'kr' || 
    cleanCountry === 'korea' || 
    cleanCountry.includes('korea') || 
    cleanAddress.includes('korea') || 
    cleanAddress.includes(', kr,') || 
    cleanAddress.endsWith(', kr')
  ) {
    return '₩';
  }

  // Thai Baht (฿)
  if (
    cleanCountry === 'th' || 
    cleanCountry === 'thailand' || 
    cleanCountry.includes('thailand') || 
    cleanAddress.includes('thailand') || 
    cleanAddress.includes(', th,') || 
    cleanAddress.endsWith(', th')
  ) {
    return '฿';
  }

  // Vietnamese Dong (₫)
  if (
    cleanCountry === 'vn' || 
    cleanCountry === 'vietnam' || 
    cleanCountry.includes('vietnam') || 
    cleanAddress.includes('vietnam') || 
    cleanAddress.includes(', vn,') || 
    cleanAddress.endsWith(', vn')
  ) {
    return '₫';
  }

  // Bangladesh Taka (৳)
  if (
    cleanCountry === 'bd' || 
    cleanCountry === 'bangladesh' || 
    cleanCountry.includes('bangladesh') || 
    cleanAddress.includes('bangladesh') || 
    cleanAddress.includes(', bd,') || 
    cleanAddress.endsWith(', bd')
  ) {
    return '৳';
  }

  // South Asian Rupees (₨) for Pakistan, Sri Lanka, Nepal
  if (
    cleanCountry === 'pk' || 
    cleanCountry === 'pakistan' || 
    cleanCountry === 'lk' || 
    cleanCountry === 'sri lanka' || 
    cleanCountry === 'np' || 
    cleanCountry === 'nepal' || 
    cleanCountry.includes('pakistan') || 
    cleanCountry.includes('sri lanka') || 
    cleanCountry.includes('nepal') || 
    cleanAddress.includes('pakistan') || 
    cleanAddress.includes('sri lanka') || 
    cleanAddress.includes('nepal') || 
    cleanAddress.includes(', pk,') || 
    cleanAddress.includes(', lk,') || 
    cleanAddress.includes(', np,') || 
    cleanAddress.endsWith(', pk') || 
    cleanAddress.endsWith(', lk') || 
    cleanAddress.endsWith(', np')
  ) {
    return '₨';
  }

  // Default to Rupees (₹) for India/others
  return '₹';
};
