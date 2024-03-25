import type { CollectionEntry } from 'astro:content'
import { useDebounceEffect } from '@minko-fe/react-hook'
import Fuse from 'fuse.js'
import { useState } from 'react'
import ArrowCard from '~/components/ArrowCard'

type Props = {
  data: CollectionEntry<'blog'>[]
}

export default function Search({ data }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CollectionEntry<'blog'>[]>([])

  const fuse = new Fuse(data, {
    keys: ['slug', 'data.title', 'data.summary', 'data.tags'],
    includeMatches: true,
    minMatchCharLength: 2,
    threshold: 0.4,
  })

  useDebounceEffect(() => {
    if (query.length < 2) {
      setResults([])
    } else {
      setResults(fuse.search(query).map((result) => result.item))
    }
  }, [query])

  return (
    <div className='flex flex-col'>
      <div className='relative'>
        <input
          name='search'
          type='text'
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          autoComplete='off'
          spellCheck={false}
          placeholder='请输入关键词'
          className='w-full rounded border border-black/10 bg-black/5 px-2.5 py-1.5 pl-10 text-black outline-none focus:border-black dark:border-white/20 dark:bg-white/15 dark:text-white focus:dark:border-white'
        />
        <svg className='absolute left-1.5 top-1/2 size-6 -translate-y-1/2 stroke-current'>
          <use href={`/ui.svg#search`} />
        </svg>
      </div>
      {query.length >= 2 && results.length >= 1 && (
        <div className='mt-12'>
          <div className='mb-2 text-sm uppercase'>
            找到 {results.length} 个结果： {`'${query}'`}
          </div>
          <ul className='flex flex-col gap-3'>
            {results.map((result, index) => (
              <li key={index}>
                <ArrowCard entry={result} pill={true} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
