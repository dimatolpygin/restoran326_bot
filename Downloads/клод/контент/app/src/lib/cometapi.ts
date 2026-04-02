import { AIModel } from './types'

const COMETAPI_BASE = 'https://api.cometapi.com/v1'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CallOptions {
  max_tokens?: number
  response_format?: { type: 'json_object' | 'text' }
  temperature?: number
}

interface CompletionResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function callModel(
  model: AIModel,
  messages: Message[],
  opts: CallOptions = {}
): Promise<string> {
  const apiKey = process.env.COMETAPI_KEY
  if (!apiKey) throw new Error('COMETAPI_KEY not set')

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: opts.max_tokens ?? 2000,
    temperature: opts.temperature ?? 0.7,
  }

  if (opts.response_format) {
    body.response_format = opts.response_format
  }

  // Gemini models need thinking_budget: 0 to avoid thinking overhead
  if (model.startsWith('gemini')) {
    body.extra_body = { thinking_budget: 0 }
  }

  const res = await fetch(`${COMETAPI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CometAPI error ${res.status}: ${text}`)
  }

  const data: CompletionResponse = await res.json()
  return data.choices[0]?.message?.content ?? ''
}
