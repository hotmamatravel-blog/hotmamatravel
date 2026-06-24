import React from 'react';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { media } from 'sanity-plugin-media';
import { schemaTypes } from './schemaTypes';

// React component rendering the iframe preview pane
const PreviewPane = ({ document }: any) => {
  const { displayed } = document;
  const id = displayed?._id;

  if (!id) {
    return React.createElement(
      'div',
      { style: { padding: '2em', fontFamily: 'sans-serif', textAlign: 'center' } },
      'Please save the post first to see the preview.'
    );
  }

  // Determine site base URL dynamically
  const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4321'
    : ''; // Empty string enables relative routing inside Studio hosted on the same domain

  const previewUrl = `${baseUrl}/preview?id=${id}`;

  return React.createElement('iframe', {
    src: previewUrl,
    style: { width: '100%', height: '100%', border: 'none' }
  });
};

export default defineConfig({
  name: 'default',
  title: 'HotMamaTravel Admin',

  projectId: 'ogxrlxz8',
  dataset: 'production',

  plugins: [
    structureTool({
      defaultDocumentNode: (S, { schemaType }) => {
        if (schemaType === 'post') {
          return S.document().views([
            S.view.form(),
            S.view.component(PreviewPane).title('Preview'),
          ]);
        }
        return S.document().views([S.view.form()]);
      },
    }),
    media(),
  ],

  schema: {
    types: schemaTypes,
  },
});

