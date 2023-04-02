import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiProperty,
  ApiResponseProperty,
  ApiTags,
} from '@nestjs/swagger'
import { ArticlesService } from './articles.service'
import { buildUrlToPath } from '../nest/url'
import { AuthIsOptional, JWTAuthGuard } from '../nest/jwt.guard'
import { validateModel } from '../nest/validation.utils'
import {
  createAuthorDTO,
  ProfileResponseDTO,
} from '../authors/authors.controller'
import { IsOptional, IsString, ValidateNested } from 'class-validator'
import {
  ApiModelProperty,
  ApiResponseModelProperty,
} from '@nestjs/swagger/dist/decorators/api-model-property.decorator'
import { Transform, Type } from 'class-transformer'
import { Pagination } from '../nest/pagination'
import { AuthorsService, Profile } from '../authors/authors.service'
import { ArticleFilters } from './articles.repository'
import { Article, Dated, Sluged, Tagged } from './articles.models'

export const articlesSwaggerOptions = {
  title: { example: 'How to train your dragon' },
  description: { example: 'Tips and tricks to train your dragon' },
  body: { example: 'Give it a lot a training and feed it with fish.' },
  slug: {
    name: 'slug',
    type: 'string',
    format: 'slug',
    description:
      'The article title written in slug format. Example: how-to-train-your-dragon',
  },
  tags: {
    example: ['dragons', 'training'],
    isArray: true,
    type: 'string',
  },
  createdAt: {
    example: new Date().toISOString(),
    description: "The article's creation date",
    type: 'date',
    format: 'date-time',
  },
  updatedAt: {
    example: new Date().toISOString(),
    description: "The article's last update date",
    type: 'date',
    format: 'date-time',
  },
  favorited: {
    example: true,
    description: 'Whether the article is favorited by the user',
    type: 'boolean',
  },
  favoritesCount: {
    example: 1,
    description: 'The number of favorites for the article',
    type: 'integer',
  },
}

export class CreateArticleDTO implements Article, Tagged {
  @ApiProperty(articlesSwaggerOptions.title)
  @IsString()
  title!: string

  @ApiProperty(articlesSwaggerOptions.description)
  @IsString()
  description!: string

  @ApiProperty(articlesSwaggerOptions.body)
  @IsString()
  body!: string

  @ApiProperty(articlesSwaggerOptions.tags)
  @IsString({ each: true })
  tags: string[] = []
}

export class CreateArticleBody {
  @ApiModelProperty({ type: CreateArticleDTO, required: true })
  @ValidateNested()
  @Type(() => CreateArticleDTO)
  article!: CreateArticleDTO
}

export class UpdateArticleDTO implements Partial<Article>, Partial<Tagged> {
  @ApiProperty({ ...articlesSwaggerOptions.title, required: false })
  @IsString()
  title?: string

  @ApiProperty({ ...articlesSwaggerOptions.description, required: false })
  @IsString()
  description?: string

  @ApiProperty({ ...articlesSwaggerOptions.body, required: false })
  @IsString()
  body?: string

  @ApiProperty({ ...articlesSwaggerOptions.tags, required: false })
  @IsString({ each: true })
  tags?: string[]
}

export class UpdateArticleBody {
  @ApiModelProperty({ type: UpdateArticleDTO })
  @ValidateNested()
  @Type(() => UpdateArticleDTO)
  article!: UpdateArticleDTO
}

export class ArticleFiltersDTO implements ArticleFilters {
  @ApiProperty({
    description: 'Comma separated list of tags',
    required: false,
    type: 'string',
  })
  @Transform(({ obj }) =>
    obj.tags
      ?.split(/[\s,-]+/)
      ?.map((tag) => tag.trim())
      ?.filter((tag) => tag.length > 0),
  )
  tags?: string[]

  @ApiProperty({
    description: 'Author username',
    required: false,
  })
  @IsString()
  @IsOptional()
  author?: string

  @ApiProperty({
    description: 'Filter by articles favorited by you (requires logging)',
    required: false,
  })
  @Transform(({ obj }) =>
    ['True', 'true', true, 'yes', 'Yes', 'y', 'Y'].includes(obj.favorited),
  )
  favorited: boolean = false

  toParams(): { [key: string]: string } {
    return {
      ...(this.tags ? { tags: this.tags.join(',') } : {}),
      ...(this.author ? { author: this.author } : {}),
      ...(this.favorited ? { favorited: this.favorited.toString() } : {}),
    }
  }
}

export class ArticleResponseDTO implements Article, Dated, Sluged {
  @ApiResponseProperty({ ...articlesSwaggerOptions.slug })
  slug!: string

  @ApiResponseProperty({ ...articlesSwaggerOptions.title })
  title!: string

  @ApiResponseProperty({ ...articlesSwaggerOptions.description })
  description!: string

  @ApiResponseProperty({ ...articlesSwaggerOptions.body })
  body!: string

  @ApiResponseProperty({ ...articlesSwaggerOptions.tags })
  tags!: string[]

  @ApiResponseProperty({ ...articlesSwaggerOptions.createdAt })
  createdAt!: Date

  @ApiResponseProperty({ ...articlesSwaggerOptions.updatedAt })
  updatedAt!: Date

  @ApiResponseProperty({ ...articlesSwaggerOptions.favorited })
  favorited?: boolean

  @ApiResponseProperty({ ...articlesSwaggerOptions.favoritesCount })
  favoritesCount?: number

  @ApiResponseModelProperty({ type: ProfileResponseDTO })
  author!: ProfileResponseDTO

  @ApiResponseProperty()
  links?: {
    [key: string]: string
  }
}

export class ArticleResponseBody {
  @ApiResponseModelProperty({ type: ArticleResponseDTO })
  article?: ArticleResponseDTO
}

export class ArticlesResponseBody {
  @ApiResponseModelProperty({ type: [ArticleResponseDTO] })
  articles?: ArticleResponseDTO[]

  @ApiResponseProperty()
  links?: {
    [key: string]: string
  }
}

@ApiTags('articles')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('articles')
export class ArticlesController {
  constructor(
    private articlesService: ArticlesService,
    private authorsService: AuthorsService,
  ) {}

  @ApiOkResponse({ type: ArticlesResponseBody })
  @AuthIsOptional()
  @Get('feed')
  async getFeed(
    @Req() req,
    @Query(validateModel()) pagination: Pagination,
  ): Promise<ArticlesResponseBody> {
    const view = this.articlesService.getView(
      req.user
        ? await this.authorsService.getUserAuthorProfile(req.user)
        : undefined,
    )
    const articles = await view.getFeed(pagination)
    return {
      articles: articles.map((article) =>
        createArticleDTO(req, article, article.author, undefined),
      ),
      links:
        articles.length > 0
          ? {
              next: buildUrlToPath(
                req,
                'articles/feed',
                pagination.getNextPage().toParams(),
              ),
            }
          : {},
    }
  }

  @ApiOkResponse({ type: ArticlesResponseBody })
  @AuthIsOptional()
  @Get()
  async getManyArticles(
    @Req() req,
    @Query(validateModel()) filters: ArticleFiltersDTO,
    @Query(validateModel()) pagination: Pagination,
  ): Promise<ArticlesResponseBody> {
    const view = this.articlesService.getView(
      req.user
        ? await this.authorsService.getUserAuthorProfile(req.user)
        : undefined,
    )
    const articles = await view.getArticlesByFilters(filters, pagination)
    return {
      articles: articles.map((article) =>
        createArticleDTO(req, article, article.author, undefined),
      ),
      links:
        articles.length > 0
          ? {
              next: buildUrlToPath(
                req,
                'articles',
                filters.toParams(),
                pagination.getNextPage().toParams(),
              ),
            }
          : {},
    }
  }

  @ApiOkResponse({ type: ArticleResponseBody })
  @Slug()
  @AuthIsOptional()
  @Get(':slug')
  async getArticle(
    @Req() req,
    @Param('slug') slug: string,
  ): Promise<ArticleResponseBody> {
    const view = this.articlesService.getView(
      req.user
        ? await this.authorsService.getUserAuthorProfile(req.user)
        : undefined,
    )
    const article = await view.getArticle(slug)
    return {
      article: createArticleDTO(req, article, article.author),
    }
  }

  @ApiCreatedResponse({ type: ArticleResponseBody })
  @HttpCode(HttpStatus.CREATED)
  @Slug()
  @Post(':slug/favorite')
  favoriteArticle(@Req() req, @Param() slug: string) {
    return undefined
  }

  @ApiNoContentResponse({ type: ArticleResponseBody })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Slug()
  @Delete(':slug/favorite')
  unfavoriteArticle(@Req() req, @Param() slug: string) {
    return undefined
  }

  @ApiCreatedResponse({ type: ArticleResponseBody })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createArticle(
    @Req() req,
    @Body(validateModel())
    body: CreateArticleBody,
  ) {
    const me = await this.authorsService.getUserAuthorProfile(req.user)
    const cms = this.articlesService.getCMS(me)
    const article = await cms.createArticle(body.article)
    return {
      article: createArticleDTO(req, article, me),
    }
  }

  @ApiOkResponse({ type: ArticleResponseBody })
  @HttpCode(HttpStatus.OK)
  @Slug()
  @Put(':slug')
  async updateArticle(
    @Req() req,
    @Param('slug') slug: string,
    @Body(validateModel())
    body: UpdateArticleBody,
  ) {
    const me = await this.authorsService.getUserAuthorProfile(req.user)
    const cms = this.articlesService.getCMS(me)
    const article = await cms.updateArticle(slug, body.article)
    return {
      article: createArticleDTO(req, article, me),
    }
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Slug()
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArticle(@Req() req, @Param('slug') slug: string) {
    const me = await this.authorsService.getUserAuthorProfile(req.user)
    const cms = this.articlesService.getCMS(me)
    await cms.deleteArticle(slug)
  }

  @ApiCreatedResponse({ type: ArticleResponseBody })
  @HttpCode(HttpStatus.CREATED)
  @Slug()
  @Post(':slug/publication')
  async publishArticle(@Req() req, @Param('slug') slug: string) {
    const me = await this.authorsService.getUserAuthorProfile(req.user)
    const cms = this.articlesService.getCMS(me)
    const article = await cms.publishArticle(slug)
    return {
      article: createArticleDTO(req, article, me),
    }
  }

  @ApiNoContentResponse({ type: ArticleResponseBody })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Slug()
  @Delete(':slug/publication')
  async unpublishArticle(@Req() req, @Param('slug') slug: string) {
    const me = await this.authorsService.getUserAuthorProfile(req.user)
    const cms = this.articlesService.getCMS(me)
    const article = await cms.unpublishArticle(slug)
    return {
      article: createArticleDTO(req, article, me),
    }
  }
}

function createArticleDTO(
  req,
  article: Article & Dated & Sluged & Tagged,
  author: Profile,
  favorited?: boolean,
) {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: article.body,
    ...(favorited !== undefined ? { favorited } : {}),
    tags: article.tags,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    author: createAuthorDTO(req, author),
    links: {
      self: buildUrlToPath(req, `articles/${article.slug}`),
      author: buildUrlToPath(req, `profiles/${author.username}`),
      comments: buildUrlToPath(req, `articles/${article.slug}/comments`),
    },
  } as const
}

export function Slug() {
  return applyDecorators(ApiParam(articlesSwaggerOptions.slug))
}
