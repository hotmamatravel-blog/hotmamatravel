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
      return builder.image(source).url();
    } catch (e) {
      console.error('Error building Sanity image URL:', e);
      return '';
    }
  }
  
  return '';
}
