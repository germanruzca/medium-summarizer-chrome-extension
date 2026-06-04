
const SYSTEM_PROMPT = `You are an expert technical writer and content analyst.
Summarize the given article using EXACTLY this markdown structure:

# [Article Title]

## 🎯 TL;DR
One clear sentence capturing the entire article's purpose.

## 📌 Key Points
- Point 1
- Point 2
- Point 3
- Point 4
- Point 5

## 💡 Main Insights
2-3 paragraphs explaining the most important ideas in depth.

## 🛠️ Practical Takeaways
Concrete actionable things the reader can apply immediately.

## ⚠️ Limitations or Counterpoints
Any caveats, criticism or alternative perspectives mentioned.

## 🔗 Worth Reading If...
- You are interested in X
- You work with Y
- You want to learn Z

---
*Summarized by Claude AI • model: claude-sonnet-4-6*`;

export interface SummarizeResult {
  summary: string;
  inputTokens: number;
  outputTokens: number;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
  error?: { message: string };
}

async function callClaude(text: string, apiKey: string): Promise<ClaudeResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Summarize this article:\n\n${text}`,
        },
      ],
    }),
  });

  const data = (await response.json()) as ClaudeResponse;

  if (!response.ok) {
    const msg = data.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 401) throw new Error('AUTH_ERROR');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status >= 500) throw new Error('SERVER_ERROR');
    throw new Error(`Claude API error: ${msg}`);
  }

  return data;
}

export async function summarize(
  articleText: string,
  apiKey: string,
  onProgress?: (status: string) => void
): Promise<SummarizeResult> {
  onProgress?.('Summarizing...');
  const data = await callClaude(articleText, apiKey);
  return {
    summary: data.content[0]?.text ?? '',
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
  };
}
