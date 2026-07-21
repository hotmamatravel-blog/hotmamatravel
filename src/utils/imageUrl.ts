import imageUrlBuilder from '@sanity/image-url';
import { sanityClient } from 'sanity:client';

const builder = imageUrlBuilder(sanityClient);

export function getImageUrl(source: any): string {
  if (!source) return '';
  
  // If it's already a string path or full URL (legacy WordPress posts)
  if (typeof source === 'string') {
    return source;
  }
  
  // If it is a Sanity image object (newly uploaded assets)
  if (source && (source.asset || source._type === 'image')) {
    try {
      return builder.image(source).auto('format').quality(80).url();
    } catch (e) {
      console.error('Error building Sanity image URL:', e);
      return '';
    }
  }
  
  return '';
}

export function getImageUrlWidth(source: any, width: number): string {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (source && (source.asset || source._type === 'image')) {
    try {
      return builder.image(source).width(width).auto('format').quality(80).url();
    } catch (e) {
      return '';
    }
  }
  return '';
}

export function getImageSrcSet(source: any): string {
  if (!source || typeof source === 'string') return '';
  if (source && (source.asset || source._type === 'image')) {
    try {
      return [400, 800, 1200]
        .map(w => `${builder.image(source).width(w).auto('format').quality(80).url()} ${w}w`)
        .join(', ');
    } catch (e) {
      return '';
    }
  }
  return '';
}
