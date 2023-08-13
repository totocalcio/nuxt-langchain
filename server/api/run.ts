import { PrismaVectorStore } from 'langchain/vectorstores/prisma'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PrismaClient, Prisma, Document } from '@prisma/client'

export default defineEventHandler(async (event: any) => {
  const db = new PrismaClient()
  /**
   1. モデルDocumentでPrismaVectorStoreの新しいインスタンスを作成する。
   2. PrismaVectorStore.withModel`メソッドは、新しい型 `PrismaVectorStore<Document>` を返す。
   3. `PrismaVectorStore.create` メソッドは2つの引数を取る：
     - 最初の引数は VectorStore インターフェースを実装したクラスのインスタンスである（この場合は OpenAIEmbeddings）。
     - 2番目の引数は、以下のプロパティを持つ設定オブジェクト：
       - prisma: PrismaClientのインスタンス。
       - tableName: ベクトル列を含むテーブルの名前 (この場合は `Document`)
       - vectorColumnName: ベクトルを含むカラムの名前 (この場合は `vector`)
       - columns: ベクトルを作成する際に使用する列の名前を含むオブジェクト (この場合は `id` と `content`)
       - filter: ベクトルストアに追加するモデルを取得するためのフィルタを含むオブジェクト (この場合は `{ content: { equals: 'default' } }`)
   4. PrismaVectorStore.create`メソッドは `PrismaVectorStore<Document>` の新しいインスタンスを返す。
   */
  const vectorStore = PrismaVectorStore.withModel<Document>(db).create(
    new OpenAIEmbeddings(),
    {
      prisma: Prisma,
      tableName: 'Document',
      vectorColumnName: 'vector',
      columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn,
      },
    },
  )

  const texts = ['Hello world', 'Bye bye', "What's this?"]
  // vectorStore.addModels`メソッドはモデルの配列を受け取り、voidに解決されるPromiseを返す。
  await vectorStore.addModels(
    // db.$transaction`メソッドは、PrismaClient呼び出しの配列を受け取り、PrismaClient呼び出しの結果の配列に解決されるPromiseを返す。
    await db.$transaction(
      // db.document.create`メソッドはオブジェクトを受け取り、モデルを解決するPromiseを返す。
      texts.map((content) => db.document.create({ data: { content } })),
    ),
  )
  // `vectorStore.similaritySearch` メソッドはクエリ文字列と数値を受け取り、`SimilarityResult` の配列を解決する Promise を返す。
  const resultOne = await vectorStore.similaritySearch('Hello world', 1)
  console.log(resultOne)

  // create an instance with default filter
  const vectorStore2 = PrismaVectorStore.withModel<Document>(db).create(
    new OpenAIEmbeddings(),
    {
      prisma: Prisma,
      tableName: 'Document',
      vectorColumnName: 'vector',
      columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn,
      },
      filter: {
        content: {
          equals: 'default',
        },
      },
    },
  )

  await vectorStore2.addModels(
    await db.$transaction(
      texts.map((content) => db.document.create({ data: { content } })),
    ),
  )

  // Use the default filter a.k.a {"content": "default"}
  const resultTwo = await vectorStore.similaritySearch('Hello world', 1)
  console.log(resultTwo)

  // Override the local filter
  // `vectorStore.similaritySearchWithScore` メソッドはクエリストリング、数値、フィルタを受け取り、 `SimilarityResultWithScore`s の配列に解決する Promise を返す。
  const resultThree = await vectorStore.similaritySearchWithScore(
    'Hello world',
    1,
    { content: { equals: 'different_content' } },
  )
  console.log(resultThree)
})
