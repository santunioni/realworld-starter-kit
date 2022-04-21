import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthIsOptional, JWTAuthGuard } from '../../utils/jwt.guard'
import { AccountType } from '../../utils/jwt.strategy'
import { validateModel } from '../../utils/validation.utils'
import { ProfilesService } from '../profiles.service'
import {
  CreateProfileDTO,
  OtherProfileResponse,
  OwnProfileResponse,
  ProfileResponsePayload,
  UpdateProfileDTO,
} from './profiles.dto'

@ApiTags('profiles')
@UseGuards(JWTAuthGuard)
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(private service: ProfilesService) {}

  @Get('me')
  async getCurrent(
    @Req() req: { user: AccountType },
  ): Promise<ProfileResponsePayload<OwnProfileResponse>> {
    const me = await this.service.getProfileOrFail({ account: req.user })
    return {
      profile: { ...me.createSnapshot(), email: req.user.email },
    }
  }

  @Post()
  async create(
    @Req() req: { user: AccountType },
    @Body('profile', validateModel()) profile: CreateProfileDTO,
  ): Promise<ProfileResponsePayload<OwnProfileResponse>> {
    const me = await this.service.createForAccount(req.user, profile)
    return {
      profile: { ...me.createSnapshot(), email: req.user.email },
    }
  }

  @Put()
  async update(
    @Req() req: { user: AccountType },
    @Body('profile', validateModel()) profile: CreateProfileDTO,
  ): Promise<ProfileResponsePayload<OwnProfileResponse>> {
    const me = await this.service.getProfileOrFail({ account: req.user })
    await me.loadSnapshot(profile)
    return {
      profile: { ...me.createSnapshot(), email: req.user.email },
    }
  }

  @Patch()
  async partialUpdate(
    @Req() req: { user: AccountType },
    @Body('profile', validateModel()) profile: UpdateProfileDTO,
  ): Promise<ProfileResponsePayload<OwnProfileResponse>> {
    const me = await this.service.getProfileOrFail({ account: req.user })
    await me.loadPartialSnapshot(profile)
    return {
      profile: { ...me.createSnapshot(), email: req.user.email },
    }
  }

  @Post(':username/follow')
  async followProfile(
    @Req() req: { user: AccountType },
    @Param() username: string,
  ): Promise<ProfileResponsePayload<OtherProfileResponse>> {
    const me = await this.service.getProfileOrFail({ account: req.user })
    const user = await this.service.getProfileOrFail({ username: username })
    await me.follow(user)
    return {
      profile: { ...user.createSnapshot(), following: true },
    }
  }

  @Delete(':username/follow')
  async unfollowProfile(
    @Req() req: { user: AccountType },
    @Param() username: string,
  ): Promise<ProfileResponsePayload<OtherProfileResponse>> {
    const me = await this.service.getProfileOrFail({ account: req.user })
    const user = await this.service.getProfileOrFail({ username: username })
    await me.unfollow(user)
    return {
      profile: { ...user.createSnapshot(), following: false },
    }
  }

  @AuthIsOptional()
  @Get(':username')
  async getProfile(
    @Req() req: { user: AccountType },
    @Param() username: string,
  ): Promise<ProfileResponsePayload<OtherProfileResponse>> {
    const user = await this.service.getProfileOrFail({ username: username })
    const profileResponse: OtherProfileResponse = user.createSnapshot()
    if (!!req.user) {
      const me = await this.service.getProfile({ account: req.user })
      if (!!me) {
        profileResponse.following = await me.following(user)
      }
    }
    return { profile: profileResponse }
  }
}
