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
        // We will define custom block types for items like Raw HTML (for Gutenberg styles and buttons)
        {
          name: 'rawHtml',
          type: 'object',
          title: 'Raw HTML',
          fields: [
            {
              name: 'html',
              type: 'text',
              title: 'HTML Code'
            }
          ]
        }
      ],
    }),
  ],
});
