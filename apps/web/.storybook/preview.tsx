import type { Preview } from '@storybook/nextjs-vite'
import { useEffect } from 'react';
import '../app/globals.css';

/**
 * Relic's light preference, as a toolbar switch: review any story in Daylight
 * or Lamplit (the low-light world for dim rooms). "System" follows the OS, as
 * the app does by default.
 */
const preview: Preview = {
  globalTypes: {
    light: {
      description: 'Relic light preference',
      toolbar: {
        title: 'Light',
        icon: 'mirror',
        items: [
          { value: 'system', title: 'Use system setting' },
          { value: 'daylight', title: 'Daylight' },
          { value: 'lamplit', title: 'Lamplit · for dim rooms' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { light: 'system' },
  decorators: [
    (Story, context) => {
      const light = context.globals.light as string | undefined;
      useEffect(() => {
        const root = document.documentElement;
        if (!light || light === 'system') delete root.dataset.relicLight;
        else root.dataset.relicLight = light;
      }, [light]);
      return <Story />;
    },
  ],
  parameters: {
    a11y: { test: 'error' },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;
