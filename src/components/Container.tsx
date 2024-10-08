import { type PropsWithChildren } from 'react'
import { mergeClass } from '~/utils'

type Props = {
  size: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export default function Container(props: PropsWithChildren<Props>) {
  const { size, children } = props
  return (
    <div
      className={mergeClass(
        'mx-auto h-full w-full px-5',
        size === 'sm' && 'max-w-screen-sm',
        size === 'md' && 'max-w-screen-md',
        size === 'lg' && 'max-w-screen-lg',
        size === 'xl' && 'max-w-screen-xl',
        size === '2xl' && 'max-w-screen-2xl',
      )}
    >
      {children}
    </div>
  )
}
