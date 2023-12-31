import { LangChainStream, Message, streamToResponse } from 'ai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { AIMessage, HumanMessage } from 'langchain/schema'

export const runtime = 'edge'

export default defineEventHandler(async (event: any) => {
  // Extract the `prompt` from the body of the request
  const { messages } = await readBody(event)

  const { stream, handlers } = LangChainStream()

  const openaiApiKey = process.env.OPENAI_API_KEY || ''
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not set in the environment')
  } else {
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      streaming: true
    })

    llm
      .call(
        (messages as Message[]).map(message =>
          message.role === 'user'
            ? new HumanMessage(message.content)
            : new AIMessage(message.content)
        ),
        {},
        [handlers]
      )
      // eslint-disable-next-line no-console
      .catch(console.error)

    return streamToResponse(stream, event.node.res)
  }
})
