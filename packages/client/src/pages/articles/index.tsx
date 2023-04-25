import { ArticleWithComments } from '@packages/client/src/components/Article'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function ArticlePage() {
  const router = useRouter()
  const { slug } = router.query

  const Back = () => <a href={'/feed'}>Back</a>

  if (!slug || Array.isArray(slug)) {
    return <Back />
  }

  return (
    <>
      <Head>
        <title>Realworld App!</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <Link href={'/'}>Início</Link>
        <ArticleWithComments slug={slug} />
        <Back />
      </main>
    </>
  )
}
