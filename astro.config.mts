import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import {
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
} from '@shikijs/transformers'
import { defineConfig, passthroughImageService } from 'astro/config'
import remarkToc from 'remark-toc'

// https://astro.build/config
export default defineConfig({
  site: 'https://hemengke1997.github.io',
  base: '/me',
  output: 'static',
  integrations: [mdx(), sitemap(), react(), tailwind({ nesting: true })],
  markdown: {
    smartypants: true,
    gfm: true,
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'one-dark-pro',
      wrap: true,
      transformers: [transformerNotationDiff(), transformerNotationHighlight(), transformerMetaWordHighlight()],
    },
    remarkPlugins: [remarkToc],
    rehypePlugins: [rehypeHeadingIds],
  },
  image: {
    service: passthroughImageService(),
  },
  vite: {
    ssr: {
      noExternal: ['@minko-fe/react-hook', 'react-use'],
    },
  },
})
