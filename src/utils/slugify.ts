// src/utils/slugify.ts

export function slugifyTag(text: string): string {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  
  // Strip "hot-" prefix unless it's "hot-road-trips" or "hot-tips"
  if (slug.startsWith('hot-') && slug !== 'hot-road-trips' && slug !== 'hot-tips') {
    slug = slug.substring(4);
  }

  // Standardizations
  if (slug === 'family-travels') slug = 'family-travel';

  return slug;
}
