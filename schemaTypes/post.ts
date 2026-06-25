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
      title: 'Hero Image',
      type: 'image',
      options: {
        hotspot: true,
      },
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
      options: {
        list: [
          { title: "Best Breweries For Families", value: "Best Breweries For Families" },
          { title: "Best Family Glamping and RVing", value: "Best Family Glamping and RVing" },
          { title: "Disney Travel", value: "Disney Travel" },
          { title: "Family Hotels", value: "Family Hotels" },
          { title: "Family Travel", value: "Family Travel" },
          { title: "Family Travel Uncensored", value: "Family Travel Uncensored" },
          { title: "Family-Friendly Haunted Hotels", value: "Family-Friendly Haunted Hotels" },
          { title: "Family-Friendly Wineries", value: "Family-Friendly Wineries" },
          { title: "Guest Blog", value: "Guest Blog" },
          { title: "Haunted Places", value: "Haunted Places" },
          { title: "Holiday Travel", value: "Holiday Travel" },
          { title: "Hot Alabama", value: "Hot Alabama" },
          { title: "Hot Arizona", value: "Hot Arizona" },
          { title: "Hot California", value: "Hot California" },
          { title: "Hot Canada", value: "Hot Canada" },
          { title: "Hot Caribbean", value: "Hot Caribbean" },
          { title: "Hot Colorado", value: "Hot Colorado" },
          { title: "Hot Europe", value: "Hot Europe" },
          { title: "Hot Family Travels", value: "Hot Family Travels" },
          { title: "Hot Florida", value: "Hot Florida" },
          { title: "Hot Georgia", value: "Hot Georgia" },
          { title: "Hot Las Vegas", value: "Hot Las Vegas" },
          { title: "Hot Maryland", value: "Hot Maryland" },
          { title: "Hot Massachusetts", value: "Hot Massachusetts" },
          { title: "Hot Mexico", value: "Hot Mexico" },
          { title: "Hot New York", value: "Hot New York" },
          { title: "Hot Pennsylvania", value: "Hot Pennsylvania" },
          { title: "Hot Road Trips", value: "Hot Road Trips" },
          { title: "Hot South Carolina", value: "Hot South Carolina" },
          { title: "Hot Tennessee", value: "Hot Tennessee" },
          { title: "Hot Texas", value: "Hot Texas" },
          { title: "Hot Tips", value: "Hot Tips" },
          { title: "Hot United States", value: "Hot United States" },
          { title: "Partnership", value: "Partnership" }
        ],
      }
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ 
        type: 'string',
        options: {
          list: [
            { title: "Best Breweries For Families", value: "Best Breweries For Families" },
            { title: "Best Family Glamping and RVing", value: "Best Family Glamping and RVing" },
            { title: "Disney Travel", value: "Disney Travel" },
            { title: "Family Hotels", value: "Family Hotels" },
            { title: "Family Travel Uncensored", value: "Family Travel Uncensored" },
            { title: "Family-Friendly Haunted Hotels", value: "Family-Friendly Haunted Hotels" },
            { title: "Family-Friendly Wineries", value: "Family-Friendly Wineries" },
            { title: "Featured", value: "Featured" },
            { title: "Guest Blog", value: "Guest Blog" },
            { title: "Haunted Places", value: "Haunted Places" },
            { title: "Holiday Travel", value: "Holiday Travel" },
            { title: "Hot Alabama", value: "Hot Alabama" },
            { title: "Hot Arizona", value: "Hot Arizona" },
            { title: "Hot California", value: "Hot California" },
            { title: "Hot Canada", value: "Hot Canada" },
            { title: "Hot Caribbean", value: "Hot Caribbean" },
            { title: "Hot Colorado", value: "Hot Colorado" },
            { title: "Hot Connecticut", value: "Hot Connecticut" },
            { title: "Hot Europe", value: "Hot Europe" },
            { title: "Hot Family Travels", value: "Hot Family Travels" },
            { title: "Hot Florida", value: "Hot Florida" },
            { title: "Hot Georgia", value: "Hot Georgia" },
            { title: "Hot Illinois", value: "Hot Illinois" },
            { title: "Hot Kentucky", value: "Hot Kentucky" },
            { title: "Hot Las Vegas", value: "Hot Las Vegas" },
            { title: "Hot Louisiana", value: "Hot Louisiana" },
            { title: "Hot Maryland", value: "Hot Maryland" },
            { title: "Hot Massachusetts", value: "Hot Massachusetts" },
            { title: "Hot Mexico", value: "Hot Mexico" },
            { title: "Hot Minnesota", value: "Hot Minnesota" },
            { title: "Hot Montana", value: "Hot Montana" },
            { title: "Hot Nebraska", value: "Hot Nebraska" },
            { title: "Hot Nevada", value: "Hot Nevada" },
            { title: "Hot New Jersey", value: "Hot New Jersey" },
            { title: "Hot New Mexico", value: "Hot New Mexico" },
            { title: "Hot New York", value: "Hot New York" },
            { title: "Hot North Carolina", value: "Hot North Carolina" },
            { title: "Hot Orange County", value: "Hot Orange County" },
            { title: "Hot Oregon", value: "Hot Oregon" },
            { title: "Hot Pennsylvania", value: "Hot Pennsylvania" },
            { title: "Hot Road Trips", value: "Hot Road Trips" },
            { title: "Hot South Carolina", value: "Hot South Carolina" },
            { title: "Hot St. Pete Beach", value: "Hot St. Pete Beach" },
            { title: "Hot Tennessee", value: "Hot Tennessee" },
            { title: "Hot Texas", value: "Hot Texas" },
            { title: "Hot Tips", value: "Hot Tips" },
            { title: "Hot United States", value: "Hot United States" },
            { title: "Hot Utah", value: "Hot Utah" },
            { title: "Hot Washington DC", value: "Hot Washington DC" },
            { title: "Partnership", value: "Partnership" }
          ]
        }
      }],
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
            },
            {
              name: 'pinDescription',
              type: 'text',
              title: 'Pinterest Pin Description (Optional)'
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
        },
        {
          name: 'pinterestPin',
          type: 'object',
          title: '📌 Pinterest Pin Image',
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
              name: 'href',
              type: 'string',
              title: 'Link URL (Optional)',
              description: 'Link back to the blog post, e.g. /vancouver-with-kids/'
            },
            {
              name: 'pinDescription',
              type: 'text',
              title: 'Pinterest Pin Description',
              description: 'The description search engines and Pinterest will show when saved.'
            }
          ],
          preview: {
            select: {
              title: 'alt',
              subtitle: 'src'
            },
            prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
              return {
                title: `📌 Pinterest Pin: ${title || 'Untitled'}`,
                subtitle: subtitle || 'No image path set'
              };
            }
          }
        }
      ],
    }),
  ],
});
