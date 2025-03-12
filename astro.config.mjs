import react from '@astrojs/react'
import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers'
import compress from 'astro-compress'
import { defineConfig, passthroughImageService } from 'astro/config'
// import pagefind from 'astro-pagefind'
import { rehypeAccessibleEmojis } from 'rehype-accessible-emojis'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatax from 'rehype-katex'
import emoji from 'remark-emoji'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'
import svgr from 'vite-plugin-svgr'
import { remarkPostTime, remarkReadingTime } from './src/utils/remark.mjs'

// https://astro.build/config
export default defineConfig({
  site: 'https://minko-me.vercel.app',
  integrations: [
    mdx(),
    sitemap(),
    react(),
    tailwind({
      nesting: true,
    }),
    // pagefind(),
    compress({
      CSS: {
        csso: false,
        lightningcss: {
          minify: true,
        },
      },
      HTML: true,
      Image: false,
      JavaScript: true,
      SVG: false,
      Parser: {
        CSS: 'lightningcss',
      },
    }),
  ],
  prefetch: {
    defaultStrategy: 'tap',
  },
  markdown: {
    smartypants: true,
    gfm: true,
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'one-dark-pro',
      wrap: false,
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
        transformerMetaWordHighlight(),
        transformerMetaHighlight(),
        transformerMetaWordHighlight(),
        transformerNotationDiff(),
        transformerNotationErrorLevel(),
        transformerNotationFocus(),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
      ],
    },
    remarkPlugins: [remarkToc, emoji, remarkMath, remarkPostTime, remarkReadingTime],
    rehypePlugins: [
      rehypeAccessibleEmojis,
      [
        rehypeExternalLinks,
        {
          target: '_blank',
        },
      ],
      rehypeHeadingIds,
      remarkToc,
      rehypeKatax,
    ],
  },
  image: {
    service: passthroughImageService(),
  },
  vite: {
    ssr: {
      noExternal: ['@minko-fe/react-hook', 'react-use'],
    },
    plugins: [svgr()],
  },
})
