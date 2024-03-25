import type { CollectionEntry } from 'astro:content'
import { formatDate } from '~/utils'

type Props = {
  entry: CollectionEntry<'blog'> | CollectionEntry<'projects'>
  pill?: boolean
}

export default function ArrowCard({ entry, pill }: Props) {
  return (
    <a
      href={`/${entry.collection}/${entry.slug}`}
      className='group flex items-center gap-3 rounded-lg border border-black/15 p-4 transition-colors duration-300 ease-in-out hover:bg-black/5 dark:border-white/20 hover:dark:bg-white/10'
    >
      <div className='blend w-full group-hover:text-black group-hover:dark:text-white'>
        <div className='flex flex-wrap items-center gap-2'>
          {pill && (
            <div className='rounded-full border border-black/15 px-2 py-0.5 text-sm capitalize dark:border-white/25'>
              {entry.collection === 'blog' ? 'post' : 'project'}
            </div>
          )}
          <div className='text-sm uppercase'>{formatDate(entry.data.date)}</div>
        </div>
        <div className='mt-3 font-semibold text-black dark:text-white'>{entry.data.title}</div>

        <div className='line-clamp-2 text-sm'>{entry.data.summary}</div>
        <ul className='mt-2 flex flex-wrap gap-1'>
          {entry.data.tags.map(
            (
              tag: string, // this line has an error; Parameter 'tag' implicitly has an 'any' type.ts(7006)
              index,
            ) => (
              <li
                key={index}
                className='rounded bg-black/5 px-1 py-0.5 text-xs uppercase text-black/75 dark:bg-white/20 dark:text-white/75'
              >
                {tag}
              </li>
            ),
          )}
        </ul>
      </div>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        strokeWidth='2.5'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='stroke-current group-hover:stroke-black group-hover:dark:stroke-white'
      >
        <line
          x1='5'
          y1='12'
          x2='19'
          y2='12'
          className='translate-x-4 scale-x-0 transition-all duration-300 ease-in-out group-hover:translate-x-1 group-hover:scale-x-100'
        />
        <polyline
          points='12 5 19 12 12 19'
          className='translate-x-0 transition-all duration-300 ease-in-out group-hover:translate-x-1'
        />
      </svg>
    </a>
  )
}
