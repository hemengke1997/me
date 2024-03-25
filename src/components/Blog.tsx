import type { CollectionEntry } from 'astro:content'
import { useEffect, useState } from 'react'
import ArrowCard from '~/components/ArrowCard'
import { mergeClass } from '~/utils'

type Props = {
  tags: string[]
  data: CollectionEntry<'blog'>[]
}

export default function Blog({ data, tags }: Props) {
  const [filter, setFilter] = useState(new Set<string>())
  const [posts, setPosts] = useState<CollectionEntry<'blog'>[]>([])

  useEffect(() => {
    setPosts(
      data.filter((entry) =>
        Array.from(filter).every((value) =>
          entry?.data.tags.some((tag: string) => tag.toLowerCase() === String(value).toLowerCase()),
        ),
      ),
    )
  }, [filter])

  function toggleTag(tag: string) {
    setFilter((prev) => new Set(prev.has(tag) ? [...prev].filter((t) => t !== tag) : [...prev, tag]))
  }

  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-3'>
      <div className='col-span-3 sm:col-span-1'>
        <div className='sticky top-24'>
          <div className='mb-2 text-sm font-semibold uppercase text-black dark:text-white'>筛选</div>
          <ul className='flex flex-wrap gap-1.5 sm:flex-col'>
            {tags.map((tag, index) => (
              <li key={index}>
                <button
                  onClick={() => toggleTag(tag)}
                  className={mergeClass(
                    'w-full px-2 py-1 rounded',
                    'whitespace-nowrap overflow-hidden overflow-ellipsis',
                    'flex gap-2 items-center',
                    'bg-black/5 dark:bg-white/10',
                    'hover:bg-black/10 hover:dark:bg-white/15',
                    'transition-colors duration-300 ease-in-out',
                    filter.has(tag) && 'text-black dark:text-white',
                  )}
                >
                  <svg
                    className={mergeClass(
                      'size-5 fill-black/50 dark:fill-white/50',
                      'transition-colors duration-300 ease-in-out',
                      filter.has(tag) && 'fill-black dark:fill-white',
                    )}
                  >
                    <use href={`/me/ui.svg#square`} className={mergeClass(!filter.has(tag) ? 'block' : 'hidden')} />
                    <use
                      href={`/me/ui.svg#square-check`}
                      className={mergeClass(filter.has(tag) ? 'block' : 'hidden')}
                    />
                  </svg>
                  {tag}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className='col-span-3 sm:col-span-2'>
        <div className='flex flex-col'>
          <div className='mb-2 text-sm uppercase'>
            总共 {data.length} 篇文章，筛选后 {posts.length} 篇
          </div>
          <ul className='flex flex-col gap-3'>
            {posts.map((post, index) => (
              <li key={index}>
                <ArrowCard entry={post} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
