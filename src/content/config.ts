import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // Core post fields — match WordPress export frontmatter
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),

    // Hero image
    heroImage: z.string().optional(), // URL string from WP or local path
    heroImageAlt: z.string().optional(),

    // Taxonomy
    category: z.string().optional().default('Family Travel'),
    tags: z.array(z.string()).optional().default([]),

    // SEO overrides
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    canonicalUrl: z.string().url().optional(),

    // Post state
    draft: z.boolean().optional().default(false),
    featured: z.boolean().optional().default(false),

    // Original WordPress data (preserved for reference)
    wpId: z.number().optional(),
    wpSlug: z.string().optional(),

    // Author
    author: z.string().optional().default('Amanda Keeley-Thurman'),
  }),
});

export const collections = { blog };
