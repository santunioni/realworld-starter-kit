import { ArticleNotFound } from '../views/views.exceptions'
import { Author } from '../views/views.models'
import { UserNotAllowedToChangeArticle } from './cms.exceptions'
import { EditableArticle } from './cms.models'
import { CMSPersistence } from './cms.persistence'

/**
The ContentManagementSystem is responsible for letting only the authors
 change the content.
**/
export class ContentManagementSystem {
  constructor(private persistence: CMSPersistence, private user: Author) {}

  async getArticle(slug: string): Promise<EditableArticle> {
    const article = await this.persistence.getArticle(slug)
    if (!article) {
      throw new ArticleNotFound(slug)
    }
    if (article.getAuthorID() !== this.user.getAuthorID()) {
      throw new UserNotAllowedToChangeArticle(this.user, article)
    }
    return article
  }

  createNewEditor = () => this.persistence.createNewEditor(this.user)
}
