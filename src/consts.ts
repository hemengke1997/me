import type { Links, Page, Site, Socials } from '~/types'

// Global
export const SITE: Site = {
  TITLE: `Minko`,
  DESCRIPTION: `Welcome to minko's blog.`,
  AUTHOR: 'Minko (hemengke1997)',
}

// Work Page
export const WORK: Page = {
  TITLE: 'Work',
  DESCRIPTION: 'Places I have worked.',
}

// Blog Page
export const BLOG: Page = {
  TITLE: '文章',
  DESCRIPTION: 'Writing on topics I am passionate about.',
}

// Projects Page
export const PROJECTS: Page = {
  TITLE: '项目',
  DESCRIPTION: 'Recent projects I have worked on.',
}

// Search Page
export const SEARCH: Page = {
  TITLE: '查找',
  DESCRIPTION: 'Search all posts and projects by keyword.',
}

// Links
export const LINKS: Links = [
  {
    TEXT: '主页',
    HREF: '/',
  },
  // {
  //   TEXT: 'Work',
  //   HREF: '/work',
  // },
  {
    TEXT: '文章',
    HREF: '/blog',
  },
  // TODO
  // {
  //   TEXT: '项目',
  //   HREF: '/projects',
  // },
]

// Socials
export const SOCIALS: Socials = [
  {
    NAME: 'Github',
    ICON: 'github',
    TEXT: 'hemengke1997',
    HREF: 'https://github.com/hemengke1997',
  },
  {
    NAME: 'wechat',
    ICON: 'wechat',
    TEXT: '23536175',
    HREF: '',
  },
  {
    NAME: 'Email',
    ICON: 'email',
    TEXT: '23536175@qq.com',
    HREF: 'mailto:23536175@qq.com',
  },
]
