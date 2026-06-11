import rss from '@astrojs/rss';
import { sanityClient } from 'sanity:client';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await sanityClient.fetch(`*[_type == "post" && !draft]`);
  const sortedPosts = posts.sort((a: any, b: any) =>
    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
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
    items: sortedPosts.slice(0, 50).map((post: any) => ({
      title: post.title,
      pubDate: new Date(post.pubDate + 'T12:00:00'),
      description: post.description ?? '',
      link: `/${post.slug.current}/`,
      categories: post.tags ?? [],
      author: post.author ?? 'Amanda Keeley-Thurman',
      customData: post.heroImage
        ? `<enclosure url="${post.heroImage}" length="0" type="image/jpeg" />`
        : undefined,
    })),
  });
}
