import { Module, Scope } from '@nestjs/common'
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface'
import { DataSource } from 'typeorm'
import { ArticlesService } from '../../domain/articles/articles.service'
import { ProfilesService } from '../../domain/profiles/service'
import { ArticleEntity } from '../../persistence/article.entity'
import { ArticlesController } from '../controllers/articles.controller'
import { CommentsController } from '../controllers/comments.controller'
import { DATASOURCE_PROVIDER } from '../providers/database.providers'
import { ProfilesModule } from './profiles.module'

const ArticlesServiceProvider: Provider = {
  provide: ArticlesService,
  useFactory: (dataSource: DataSource, profilesService: ProfilesService) =>
    new ArticlesService(
      dataSource.getRepository(ArticleEntity),
      profilesService,
    ),
  inject: [DATASOURCE_PROVIDER, ProfilesService],
  scope: Scope.DEFAULT,
}

@Module({
  imports: [ProfilesModule],
  controllers: [ArticlesController, CommentsController],
  providers: [ArticlesServiceProvider],
  exports: [ArticlesService],
})
export class ArticlesModule {}
