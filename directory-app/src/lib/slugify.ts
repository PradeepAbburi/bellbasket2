export function generateBaseSlug(name: string, city: string): string {
  const sanitize = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove all non-word chars (except spaces and dashes)
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with a single dash
      .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
  };

  const nameSlug = sanitize(name);
  const citySlug = sanitize(city);

  return `${nameSlug}-${citySlug}`;
}

export function generateUniqueSlug(baseSlug: string, count: number): string {
  if (count === 0) return baseSlug;
  return `${baseSlug}-${count + 1}`;
}
