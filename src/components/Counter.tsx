import { useState } from 'react'

function CounterButton() {
  const [count, setCount] = useState(0)

  const increment = () => setCount((t) => t + 1)

  return (
    <div className='flex items-center gap-4'>
      <button
        onClick={increment}
        className='blend border border-black/25 px-3 py-1 hover:bg-black/5 dark:border-white/25 dark:hover:bg-white/15'
      >
        Increment
      </button>
      <div>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </div>
    </div>
  )
}

export default CounterButton
