import { ContentManagementSystem } from '../../main/domain/articles/cms.service'
import { ArticleNotFound } from '../../main/domain/articles/exceptions'
import { Article, Author, Sluged } from '../../main/domain/articles/models'
import { AuthorsService } from '../../main/domain/authors/service'
import { getTestDataSource } from '../utils'

const exampleArticle: Sluged<Article> = {
  title: 'How to train your dragon?',
  description: "You should train your dragon before it's too late",
  body: 'Feed it with fish',
  tags: ['dragons', 'friendship'],
  slug: 'how-to-train-your-dragon',
}

const testDataSource = getTestDataSource()

beforeEach(() => {
  return testDataSource.initialize()
})

afterEach(() => {
  return testDataSource.destroy()
})

describe('Content Management System', () => {
  let cms: ContentManagementSystem
  let author: Author

  beforeEach(async () => {
    author = await new AuthorsService().createForAccount(
      { id: 1 },
      { username: 'john-doe' },
    )
    cms = new ContentManagementSystem(author)
  })

  it("should let author change it's own article", async () => {
    // Arange
    await cms.createArticle(exampleArticle)

    // Act
    const article = await cms.updateArticle(exampleArticle.slug, {
      body: 'Other body',
    })

    // Assert
    expect(article).toMatchObject({
      title: exampleArticle.title,
      body: 'Other body',
    })
  })

  it('should not let another author change the article', async () => {
    // Arange
    await cms.createArticle(exampleArticle)

    // Arrange
    const cmsForOtherAuthor = new ContentManagementSystem({ id: 2 })

    // Act - Assert
    await expect(() =>
      cmsForOtherAuthor.updateArticle(exampleArticle.slug, {
        title: 'Other title',
      }),
    ).rejects.toThrow(ArticleNotFound)
  })
})
