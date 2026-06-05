// src/pages/rss.xml.ts — RSS Feed
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const STATIC_PAGES = ['about', 'contact', 'disclosure-policy', 'privacy-policy', 'destinations', 'destinations-3'];
  const posts = await getCollection('blog', ({ data, slug }) => !data.draft && !STATIC_PAGES.includes(slug));
  const sortedPosts = posts.sort((a, b) =>
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: 'HotMamaTravel — Family Travel with a Twist',
    description: 'Real family travel tips, hotel reviews, and destination guides from Southern California mom Amanda Keeley-Thurman.',
    site: context.site ?? 'https://hotmamatravel.com',
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
    customData: `
      <language>en-us</language>
      <atom:link href="https://hotmamatravel.com/rss.xml" rel="self" type="application/rss+xml" />
      <copyright>© ${new Date().getFullYear()} HotMamaTravel. All rights reserved.</copyright>
      <managingEditor>amanda@hotmamatravel.com (Amanda Keeley-Thurman)</managingEditor>
      <webMaster>amanda@hotmamatravel.com (Amanda Keeley-Thurman)</webMaster>
      <image>
        <url>https://hotmamatravel.com/images/hmt-logo.png</url>
        <title>HotMamaTravel</title>
        <link>https://hotmamatravel.com</link>
      </image>
    `,
    items: sortedPosts.slice(0, 50).map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description ?? '',
      link: `/${post.slug}/`,
      categories: post.data.tags ?? [],
      author: post.data.author ?? 'Amanda Keeley-Thurman',
      customData: post.data.heroImage
        ? `<enclosure url="${post.data.heroImage}" length="0" type="image/jpeg" />`
        : undefined,
    })),
  });
}
