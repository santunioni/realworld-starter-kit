import type { AppRouter } from '@packages/server'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { HeadersEsque } from '@trpc/client/dist/internals/types'
import axios, { AxiosResponse, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios'
import { Article, ArticleSearchFields, UserDriver } from './UserDriver'
import { UserRestDriver } from './UserRestDriver'

function convertAxiosHeadersToTrpcHeaders(headers?: RawAxiosResponseHeaders | AxiosResponseHeaders): HeadersEsque {
  const trpcMap = Object.entries(headers ?? {}).reduce((acc, [key, value]) => {
    value && acc.set(key, String(value))
    return acc
  }, new Map<string, string>())
  return {
    get: key => trpcMap.get(key) ?? null,
    set: (key, value) => trpcMap.set(key, value),
    append: (key, value) => trpcMap.set(key, value),
    has: key => trpcMap.has(key),
    delete: key => trpcMap.delete(key),
    forEach: callback => trpcMap.forEach(callback),
  }
}

function convertAxiosResponseToFetchResponse(response: AxiosResponse) {
  const ok = response.status < 500
  return {
    ok,
    status: response.status,
    statusText: response.statusText,
    headers: convertAxiosHeadersToTrpcHeaders(response.headers),
    json: () => Promise.resolve(response.data),
    clone: () => convertAxiosResponseToFetchResponse(response),
    url: response.config.url ?? '',
    redirected: false,
    type: ok ? 'basic' : 'error',
  } as const
}

export class UserTrpcDriver implements UserDriver {
  private authorization: undefined | string = undefined

  private readonly restClient = new UserRestDriver()

  private trpc = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        fetch: async (input, init) => {
          const response = await axios.request({
            url: input.toString(),
            method: init?.method,
            data: init?.body,
            headers: init?.headers
              ? Object.entries(init.headers).reduce((acc, [key, value]) => {
                  acc[key] = value
                  return acc
                }, {} as Record<string, any>)
              : undefined,
          })
          return convertAxiosResponseToFetchResponse(response)
        }, // Required because the default fetch implementation is only available on browsers.
        url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/trpc`,
        headers: () => {
          return {
            'Content-Type': 'application/json',
            Authorization: this.authorization,
          }
        },
      }),
    ],
  })

  async login(username: string) {
    const token = await this.restClient.login(username)
    this.authorization = `Bearer ${token}`
  }

  async follow(username: string) {
    await this.trpc.profiles.follow.mutate({ username })
  }

  async unfollow(username: string) {
    await this.trpc.profiles.unfollow.mutate({ username })
  }

  async writeArticle(article: Article) {
    const response = await this.trpc.articles.create.mutate({ article })
    return response.article.slug
  }

  async deleteArticle(slug: string) {
    await this.trpc.articles.delete.mutate({ slug })
  }

  async shouldFindArticleBy(filters: ArticleSearchFields, slug: string) {
    const articles = await this.trpc.articles.getMany.query({
      filters,
    })
    expect(articles.articles.map(v => v.slug)).toContainEqual(slug)
  }

  async shouldNotFindArticleBy(filters: ArticleSearchFields, slug: string) {
    const articles = await this.trpc.articles.getMany.query({
      filters,
    })
    expect(articles.articles.map(v => v.slug)).not.toContainEqual(slug)
  }

  async publishArticle(slug: string) {
    await this.trpc.articles.publish.mutate({ slug })
  }

  async unpublishArticle(slug: string) {
    await this.trpc.articles.unpublish.mutate({ slug })
  }

  async commentOnArticle(slug: string, body: string) {
    await this.trpc.comments.add.mutate({ slug, comment: { body } })
  }

  async shouldSeeTheArticleInTheFeed(slug: string) {
    const feed = await this.trpc.articles.getFeed.query({})
    expect(feed.articles.map(v => v.slug)).toContainEqual(slug)
  }

  async shouldNotSeeTheArticleInTheFeed(slug: string) {
    const feed = await this.trpc.articles.getFeed.query({})
    expect(feed.articles.map(v => v.slug)).not.toContainEqual(slug)
  }

  async shouldFindTheArticle(slug: string) {
    const response = await this.trpc.articles.getOne.query({
      slug,
    })
    expect(response.article.slug).toEqual(slug)
  }

  async shouldNotFindTheArticle(slug: string) {
    await expect(this.trpc.articles.getOne.query({ slug })).rejects.toThrow(/404/)
  }

  async shouldSeeCommentFrom(slug: string, username: string) {
    const response = await this.trpc.comments.getMany.query({
      slug,
    })
    expect(response.comments.map(v => v.author.username)).toContainEqual(username)
  }
}
