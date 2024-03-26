import { getCollection } from 'astro:content'
import ArrowCard from '~/components/ArrowCard'
import { SOCIALS } from '~/consts'

const posts = (await getCollection('blog'))
  .filter((post) => !post.data.draft)
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, 3)

const projects = (await getCollection('projects'))
  .filter((project) => !project.data.draft)
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, 3)

export default function Index() {
  return (
    <>
      {/* <!-- Light Mode: Particles --> */}
      <div className='absolute inset-0 block dark:hidden'>
        <div id='particles1' className='fixed inset-0'></div>
        <div id='particles2' className='fixed inset-0'></div>
        <div id='particles3' className='fixed inset-0'></div>
      </div>

      {/* <!-- Dark Theme: Stars --> */}
      <div className='absolute inset-0 hidden bg-black dark:block'>
        <div id='stars1' className='fixed inset-0'></div>
        <div id='stars2' className='fixed inset-0'></div>
        <div id='stars3' className='fixed inset-0'></div>
      </div>

      <script src={`/js/bg.js`}></script>

      {/* <!-- HERO --> */}
      <section className='relative h-screen w-full'>
        <div id='planetcont' className='animate absolute inset-0 top-1/4 overflow-hidden'>
          <div
            id='crescent'
            className='absolute left-1/2 top-0 aspect-square min-h-[100vh] w-[250vw] -translate-x-1/2 rounded-full bg-gradient-to-b from-black/25 from-0% to-transparent to-5% p-[1px] dark:from-white/75'
          >
            <div
              id='planet'
              className='flex size-full justify-center overflow-hidden rounded-full bg-white p-[1px] dark:bg-black'
            >
              <div id='blur' className='h-20 w-full rounded-full bg-neutral-900/25 blur-3xl dark:bg-white/25'></div>
            </div>
          </div>
        </div>
        <div className='animate absolute flex size-full items-center justify-center'>
          <div className='relative flex size-full items-center justify-center'>
            <div className='relative p-5 text-center'>
              <p className='animated mb-1 text-lg font-semibold opacity-75 md:text-xl lg:text-2xl'>你好，我是 Minko</p>

              <p className='animated text-2xl font-bold uppercase text-black md:text-3xl lg:text-4xl dark:text-white'>
                Building something cool
              </p>
              <p className='animated text-sm opacity-75 md:text-base lg:text-lg'></p>

              <div className='animated mt-5 flex flex-wrap justify-center gap-4'>
                <a
                  href='/blog'
                  className='blend flex items-center truncate rounded bg-black px-4 py-2 text-xs text-white hover:opacity-75 md:text-sm lg:text-base dark:bg-white dark:text-black'
                >
                  查看文章
                </a>
                <a
                  href='/projects'
                  className='blend truncate rounded border border-black/25 px-4 py-2 text-xs hover:bg-black/5 md:text-sm lg:text-base dark:border-white/25 hover:dark:bg-white/15'
                >
                  查看项目
                </a>
                <img
                  src='https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=20&duration=3000&pause=100&center=true&color=149ECA&vCenter=true&random=true&width=432&lines=Nodejs;React;Typescript;Nextjs;Vite;antd;VSCode;Postcss;I18n;Rust;Astro'
                  alt='Skill'
                  className={'absolute bottom-0 w-full translate-y-[100%]'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className='relative bg-white dark:bg-black'>
        <div className='mx-auto max-w-screen-sm space-y-24 p-5 pb-16'>
          <section className='animate'>
            <article>
              <p>
                热爱生活，坚持每天运动
                <b> 1 </b>
                小时 ，目标是2024年体重到115斤
              </p>
              <p>热爱工作，2024年要卷个痛快，为前途奋斗</p>
              <p>热爱编程，专注于效率工具开发</p>
              <p>热爱开源，我的成长来自于开源，我也将把我的成长反哺给开源社区</p>
              <p>喜欢分享、讲述一些技术上或者生活上的心得。更乐意倾听别人的想法和输出</p>
              <p>
                喜欢透明、欢乐、热爱分享的工作氛围。都说一个人可能走得更远，一群人可以走得更久，但长久的秘诀是心之所向皆为一处
              </p>
              <p>讨厌心机，也讨厌算计</p>
              <p>希望能找到志同道合的朋友，一起成长一起进步</p>
              <p>
                <b>
                  <i className={'text-lg'}>「知之为知之，不知为不知，是知也」</i>
                </b>
              </p>
            </article>
          </section>
          {/* <!-- Blog Preview Section --> */}
          <section className='animate'>
            <div className='space-y-4'>
              <div className='flex justify-between'>
                <p className='font-semibold text-black dark:text-white'> 最近文章 </p>
                <a
                  href='/blog'
                  className='blend group col-span-3 flex w-fit items-center gap-1 text-black underline decoration-black/25 decoration-[.5px] underline-offset-2 hover:decoration-black dark:text-white dark:decoration-white/50 dark:hover:decoration-white'
                >
                  <span className='blend text-black/75 group-hover:text-black dark:text-white/75 group-hover:dark:text-white'>
                    全部文章
                  </span>
                </a>
              </div>
              <ul className='space-y-4'>
                {posts.map((post, index) => (
                  <li key={index}>
                    <ArrowCard entry={post} />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* <!-- Project Preview Section --> */}
          <section className='animate'>
            <div className='space-y-4'>
              <div className='flex justify-between'>
                <p className='font-semibold text-black dark:text-white'> 最近项目 </p>
                <a
                  href='/projects'
                  className='blend group col-span-3 flex w-fit items-center gap-1 text-black underline decoration-black/25 decoration-[.5px] underline-offset-2 hover:decoration-black dark:text-white dark:decoration-white/50 dark:hover:decoration-white'
                >
                  <span className='blend text-black/75 group-hover:text-black dark:text-white/75 group-hover:dark:text-white'>
                    所有项目
                  </span>
                </a>
              </div>
              <ul className='space-y-4'>
                {projects.map((project, index) => (
                  <li key={index}>
                    <ArrowCard entry={project} />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* <!-- Contact Section --> */}
          <section className='animate'>
            <div>
              <p className='font-semibold text-black dark:text-white'> 联系方式 </p>
              <div className='mt-4 flex flex-col gap-y-2'>
                {SOCIALS.map((social, index) => (
                  <div key={index} className={'grid auto-cols-min grid-cols-4'}>
                    <div className='col-span-1 flex items-center gap-1'>
                      <span className='truncate whitespace-nowrap'>{social.NAME}</span>
                    </div>
                    <div className='col-span-3 truncate'>
                      <a
                        href={social.HREF}
                        onClick={(e) => {
                          if (!social.HREF) {
                            e.preventDefault()
                          }
                        }}
                        target={social.HREF ? '_blank' : '_self'}
                        className='blend group col-span-3 flex w-fit items-center gap-1 text-black underline decoration-black/25 decoration-[.5px] underline-offset-2 hover:decoration-black dark:text-white dark:decoration-white/50 dark:hover:decoration-white'
                      >
                        <span className='blend text-black/75 group-hover:text-black dark:text-white/75 group-hover:dark:text-white'>
                          {social.TEXT}
                        </span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
