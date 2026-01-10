// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://ccamgr.github.io',
  base: '/vrcp',
  integrations: [
    starlight({
      title: 'VRCP',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/ccamgr/vrcp' }],
      sidebar: [
        // sidebar items here
        {
          label: 'Legals',
          items: [
            { label: '利用規約', link: '/terms-of-use/' },
            { label: 'プライバシーポリシー', link: '/privacy-policy/' },
          ],
        },
      ],
    }),
  ]
});
