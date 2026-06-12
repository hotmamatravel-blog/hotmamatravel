import { defineType, defineField } from 'sanity';

export const affiliateLinkType = defineType({
  name: 'affiliateLink',
  title: 'Affiliate Redirect Link',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Cloaked Slug (e.g. majestic-garden-hotel-anaheim)',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'destUrl',
      title: 'Destination URL (Affiliate link)',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'slug',
      subtitle: 'destUrl',
    },
    prepare({ title, subtitle }) {
      return {
        title: `/go/${title}`,
        subtitle: subtitle,
      };
    },
  },
});
