import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { media } from 'sanity-plugin-media';
import { schemaTypes } from './schemaTypes';

export default defineConfig({
  name: 'default',
  title: 'HotMamaTravel Admin',

  projectId: 'ogxrlxz8',
  dataset: 'production',

  plugins: [structureTool(), media()],

  schema: {
    types: schemaTypes,
  },
});

