import type { StorybookConfig } from '@storybook/nextjs-vite';
import { fileURLToPath } from 'node:url';

const config: StorybookConfig = {
  async viteFinal(config) {
    const existing = config.resolve?.alias ?? [];
    const aliases = Array.isArray(existing) ? existing : Object.entries(existing).map(([find, replacement]) => ({ find, replacement }));
    config.resolve = { ...config.resolve, alias: [{ find: '@/app/entity-actions', replacement: fileURLToPath(new URL('../app/__mocks__/actions.ts', import.meta.url)) }, { find: '@/app/actions', replacement: fileURLToPath(new URL('../app/__mocks__/actions.ts', import.meta.url)) }, ...aliases] };
    return config;
  },
  staticDirs: ["../public"],
  "stories": [
    "../{stories,components}/**/*.mdx",
    "../{stories,components}/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/nextjs-vite"
};
export default config;
