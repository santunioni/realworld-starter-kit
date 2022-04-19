import { PartialType } from '@nestjs/mapped-types'
import { ApiResponseProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { ProfileResponseDTO } from '../../../profiles/nest/profiles.dto'

export class CreateArticleDTO {
  @IsString()
  @MaxLength(80)
  title: string

  @IsString()
  @MaxLength(500)
  description: string

  @IsString()
  body: string

  @IsString({ each: true })
  tagList?: string[] = []
}

export class ArticleFilters {
  @IsString()
  @IsOptional()
  tag?: string

  @IsString()
  @IsOptional()
  author?: string

  @IsString()
  @IsOptional()
  favorited?: string
}

export class UpdateArticleDTO extends PartialType(CreateArticleDTO) {}

export class ArticleResponseDTO extends CreateArticleDTO {
  @ApiResponseProperty()
  slug: string
  @ApiResponseProperty() updatedAt: Date
  @ApiResponseProperty() createdAt: Date
  @ApiResponseProperty() favorited?: boolean
  @ApiResponseProperty() favoritesCount: number
  @ApiResponseProperty() author: ProfileResponseDTO
}

export class ArticleResponsePayload {
  @ApiResponseProperty() article: ArticleResponseDTO
}

export class ArticlesResponsePayload {
  @ApiResponseProperty() articles: ArticleResponseDTO[]
}
