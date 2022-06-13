import { join } from 'path'
import { DataSource } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

export const entities = [join(__dirname, '**', '*.entity.{ts,js}')]

function getLocalDataSource(): DataSource {
  return new DataSource({
    type: 'sqlite',
    database: 'local.sqlite3',
    entities: entities,
    synchronize: true,
    namingStrategy: new SnakeNamingStrategy(),
  })
}

export function getRemoteDataSource(dbUrl: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: dbUrl,
    entities: entities,
    namingStrategy: new SnakeNamingStrategy(),
  })
}

export function getDataSource(): DataSource {
  if (!process.env.DB_URL) {
    return getLocalDataSource()
  } else {
    return getRemoteDataSource(process.env.DB_URL)
  }
}
