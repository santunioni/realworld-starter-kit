import { Injectable } from '@nestjs/common'
import { AuthorEntity } from '../../persistence/author.entity'
import { AuthorAlreadyExists, AuthorNotFound } from './exceptions'
import { Account, Profile, ProfileFields } from './models'

@Injectable()
export class AuthorsService {
  async createForAccount(
    account: Account,
    fields: ProfileFields,
  ): Promise<Profile> {
    return await AuthorEntity.create({
      ...fields,
      accountId: account.id,
    })
      .save()
      .catch((err) => {
        console.log(err)
        throw new AuthorAlreadyExists(fields.username)
      })
  }

  async getByUsername(username: string): Promise<AuthorEntity> {
    const profile = await AuthorEntity.findOne({
      where: { username: username },
    })
    if (!profile) {
      throw new AuthorNotFound(
        `I can't find a profile with username ${username}`,
      )
    }
    return profile
  }

  async getByAccount(account: Account): Promise<AuthorEntity> {
    const profile = await AuthorEntity.createQueryBuilder('profile')
      .select()
      .where({ accountId: account.id })
      .getOne()
    if (!profile) {
      throw new AuthorNotFound(
        `I can't find a profile with accountId ${account.id}`,
      )
    }
    return profile
  }

  async updateByAccount(
    account: Account,
    fields: ProfileFields,
  ): Promise<AuthorEntity> {
    const profile = await this.getByAccount(account)
    return await profile.loadData(fields).save()
  }
}
