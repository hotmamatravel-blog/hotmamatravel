import { defineType, defineField } from 'sanity';

export const postType = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'pubDate',
      title: 'Publish Date',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'updatedDate',
      title: 'Updated Date',
      type: 'date',
    }),
    defineField({
      name: 'description',
      title: 'Description / Excerpt',
      type: 'text',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image Path',
      type: 'string',
    }),
    defineField({
      name: 'heroImageAlt',
      title: 'Hero Image Alt Text',
      type: 'string',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'draft',
      title: 'Draft',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'wpId',
      title: 'WordPress ID',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'wpSlug',
      title: 'WordPress Slug',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      initialValue: 'Amanda Keeley-Thurman',
    }),
    defineField({
      name: 'body',
      title: 'Body Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            }
          ]
        },
        // Raw HTML blocks from legacy WordPress/Gutenberg content
        {
          name: 'rawHtml',
          type: 'object',
          title: 'Legacy HTML Block',
          fields: [
            {
              name: 'html',
              type: 'text',
              title: 'HTML Code',
              description: 'This is a legacy WordPress/Gutenberg layout block. You can edit the raw HTML here, or delete this block and replace it with clean Sanity content.',
              rows: 8,
            }
          ],
          // Preview: show a human-readable label in the editor block list
          preview: {
            select: {
              html: 'html'
            },
            prepare({ html }: { html?: string }) {
              if (!html) return { title: 'Empty HTML Block' };

              // Detect common WP block types for a friendly label
              let label = 'Legacy HTML Block';
              if (html.includes('wp-block-columns')) label = '🗂 Legacy Layout: Two-Column Section';
              else if (html.includes('wp-block-button') || html.includes('ugb-button')) label = '🔗 Legacy Button';
              else if (html.includes('uagb-infobox')) label = '💡 Info Box (Vrbo / Did You Know)';
              else if (html.includes('wp-block-separator')) label = '〰 Separator / Divider';
              else if (html.includes('wp-block-group')) label = '📦 Legacy Block Group';
              else if (html.includes('wp-block-table')) label = '📋 Legacy Table';
              else if (html.includes('iframe')) label = '▶ Embedded Video / iFrame';
              else if (html.includes('pinterest')) label = '📌 Pinterest Embed';
              else if (html.includes('</div>')) label = '🧱 Legacy Layout Wrapper';

              // Show a truncated snippet of the visible text content
              const textContent = html
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 80);

              return {
                title: label,
                subtitle: textContent || html.substring(0, 80),
              };
            }
          }
        },
        {
          name: 'localImage',
          type: 'object',
          title: 'Local Image (Stored Locally)',
          fields: [
            {
              name: 'src',
              type: 'string',
              title: 'Image Path (e.g. /images/name.jpg)'
            },
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text'
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption (Optional)'
            },
            {
              name: 'href',
              type: 'string',
              title: 'Link URL (Optional)'
            }
          ],
          preview: {
            select: {
              title: 'alt',
              subtitle: 'src'
            },
            prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
              return {
                title: `🖼 ${title || 'Untitled Image'}`,
                subtitle: subtitle || 'No image path set'
              };
            }
          }
        }
      ],
    }),
  ],
});
