import Container from '~/components/Container'
import { SITE, SOCIALS } from '~/consts'
import Logo from '../assets/logo.svg?react'

export default function Footer() {
  return (
    <footer className='relative bg-white dark:bg-black'>
      <div>
        <section className='py-5'>
          <Container size='md'>
            <div className='flex items-center justify-center sm:justify-end'>
              <button
                onClick={() => {
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                  })
                }}
                aria-label='Back to top of page'
                className='group flex w-fit items-center gap-1.5 rounded border border-black/15 p-1.5 text-sm transition-colors duration-300 ease-in-out hover:bg-black/5 dark:border-white/20 hover:dark:bg-white/10'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='rotate-90 stroke-current group-hover:stroke-black group-hover:dark:stroke-white'
                >
                  <line
                    x1='19'
                    y1='12'
                    x2='5'
                    y2='12'
                    className='translate-x-3 scale-x-0 transition-all duration-300 ease-in-out group-hover:translate-x-0 group-hover:scale-x-100'
                  ></line>
                  <polyline
                    points='12 19 5 12 12 5'
                    className='translate-x-1 transition-all duration-300 ease-in-out group-hover:translate-x-0'
                  ></polyline>
                </svg>
                <div className='w-full transition-colors duration-300 ease-in-out group-hover:text-black group-hover:dark:text-white'>
                  返回顶部
                </div>
              </button>
            </div>
          </Container>
        </section>

        <section className='overflow-hidden whitespace-nowrap border-t border-black/10 py-5 dark:border-white/25'>
          <Container size='md'>
            <div className='grid grid-cols-1 items-center gap-3 sm:grid-cols-2'>
              <div className='flex flex-col items-center sm:items-start'>
                <a
                  href='/'
                  className='flex w-fit gap-1 font-semibold text-current transition-colors duration-300 ease-in-out hover:text-black dark:hover:text-white'
                >
                  <Logo className={'h-auto w-20'} />
                </a>
              </div>
              <div className='flex items-center justify-center gap-2 sm:justify-end'>
                <span className='relative flex size-3'>
                  <span className='absolute inline-flex size-full animate-ping rounded-full bg-green-300'></span>
                  <span className='relative inline-flex size-3 rounded-full bg-green-500'></span>
                </span>
                <span>系统正常</span>
              </div>
            </div>
          </Container>
        </section>

        <section className='overflow-hidden whitespace-nowrap border-t border-black/10 py-5 dark:border-white/25'>
          <Container size='md'>
            <div className='grid h-full grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='order-2 flex flex-col items-center justify-center sm:order-1 sm:items-start'>
                <div className='mt-2 text-sm'> &copy; 2024 | All rights reserved </div>
              </div>

              <div className='order-1 flex justify-center sm:order-2 sm:justify-end'>
                <div className='flex flex-wrap items-center justify-center gap-1'>
                  {SOCIALS.filter((t) => t.HREF).map((SOCIAL, index) => (
                    <a
                      key={index}
                      href={SOCIAL.HREF}
                      target='_blank'
                      aria-label={`${SITE.TITLE} on ${SOCIAL.NAME}`}
                      className='blend group size-10 items-center justify-center rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/20'
                    >
                      <svg className='blend size-full fill-current group-hover:fill-black group-hover:dark:fill-white'>
                        <use href={`/social.svg#${SOCIAL.ICON}`} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>
      </div>
    </footer>
  )
}
