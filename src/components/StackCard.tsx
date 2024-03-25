type Props = {
  text: string
  icon: string
  href: string
}

export default function StackCard(props: Props) {
  const { text, icon, href } = props

  return (
    <div>
      <a
        href={href}
        target='_blank'
        className='blend group flex w-fit items-center gap-2 rounded border border-neutral-200 px-3 py-2 hover:bg-neutral-100 dark:border-neutral-700 hover:dark:bg-neutral-800'
      >
        <svg height={20} width={20}>
          <use href={`/stack.svg#${icon}`}></use>
        </svg>
        <span className='blend text-sm capitalize text-neutral-500 group-hover:text-black dark:text-neutral-400 group-hover:dark:text-white'>
          {text}
        </span>
      </a>
    </div>
  )
}
