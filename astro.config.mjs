import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/static';
import react from '@astrojs/react';

// Remark plugin: adds loading="lazy" and decoding="async" to all Markdown <img> tags
// This is the correct way to do it in Astro — as a remark plugin, not rehype-attrs
function remarkLazyImages() {
  return (tree) => {
    tree.children?.forEach(function walk(node) {
      if (node.type === 'image') {
        node.data = node.data || {};
        node.data.hProperties = {
          ...node.data.hProperties,
          loading: 'lazy',
          decoding: 'async',
          width: node.data.hProperties?.width || '800',
          height: node.data.hProperties?.height || '600',
        };
      }
      node.children?.forEach(walk);
    });
  };
}

import sanity from '@sanity/astro';

export default defineConfig({
  site: 'https://hotmamatravel.com',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/disclosure-policy') && !page.includes('/preview') && !page.includes('/about') && !page.includes('/subscribe-hotmamatravel') && !page.includes('/work-with-us')
    }),
    sanity({
      projectId: 'ogxrlxz8',
      dataset: 'production',
      useCdn: true,
      studioBasePath: '/admin',
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
    // Correctly add loading=lazy to all inline images in Markdown content
    remarkPlugins: [remarkLazyImages],
  },
  image: {
    // Sharp processes images used via Astro's <Image /> component
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    domains: ['hotmamatravel.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'hotmamatravel.com' },
    ],
  },
  vite: {
    optimizeDeps: {
      exclude: ['@sanity/astro'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});
