import type { CollectionEntry } from 'astro:content'
import { useEffect, useState } from 'react'
import ArrowCard from '~/components/ArrowCard'
import { mergeClass } from '~/utils'

type Props = {
  tags: string[]
  data: CollectionEntry<'projects'>[]
}

export default function Projects({ data, tags }: Props) {
  const [filter, setFilter] = useState(new Set<string>())
  const [projects, setProjects] = useState<CollectionEntry<'projects'>[]>([])

  useEffect(() => {
    setProjects(
      data.filter((entry) =>
        Array.from(filter).every((value) =>
          (entry as any).data.tags.some((tag: string) => tag.toLowerCase() === String(value).toLowerCase()),
        ),
      ),
    )
  }, [filter])

  function toggleTag(tag: string) {
    if (filter.has(tag)) {
      setFilter(new Set())
      return
    }
    setFilter(new Set([tag]))
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
                    'w-full rounded px-2 py-1',
                    'overflow-hidden overflow-ellipsis whitespace-nowrap',
                    'flex items-center gap-2',
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
                    <use href={`/ui.svg#square`} className={mergeClass(!filter.has(tag) ? 'block' : 'hidden')} />
                    <use href={`/ui.svg#square-check`} className={mergeClass(filter.has(tag) ? 'block' : 'hidden')} />
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
            总共 {data.length} 个项目，筛选后 {projects.length} 个
          </div>
          <ul className='flex flex-col gap-3'>
            {projects.map((project, index) => (
              <li key={index}>
                <ArrowCard entry={project} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
