import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response('Missing API key', { status: 500 });
    }

    const { messages } = await req.json();
    // Build airdrop context from env
    const ctxLines: string[] = [];
    const ctxRaw = process.env.NEXT_PUBLIC_AIRDROP_CONTEXT;
    if (ctxRaw) ctxLines.push(ctxRaw);
    const kv = (
      [
        ['Name', process.env.NEXT_PUBLIC_AIRDROP_NAME],
        ['Token', process.env.NEXT_PUBLIC_AIRDROP_TOKEN],
        ['Snapshot', process.env.NEXT_PUBLIC_AIRDROP_SNAPSHOT],
        ['Eligibility', process.env.NEXT_PUBLIC_AIRDROP_ELIGIBILITY],
        ['Rewards', process.env.NEXT_PUBLIC_AIRDROP_REWARDS],
        ['ClaimSteps', process.env.NEXT_PUBLIC_AIRDROP_CLAIM_STEPS],
        ['Docs', process.env.NEXT_PUBLIC_AIRDROP_DOCS_URL],
        ['Support', process.env.NEXT_PUBLIC_CONTACT_URL],
      ] as const
    ).filter(([, v]) => !!v) as Array<[string, string]>;
    if (kv.length) {
      ctxLines.push('Structured Airdrop Facts:');
      for (const [k, v] of kv) ctxLines.push(`- ${k}: ${v}`);
    }
    const airdropContext = ctxLines.length ? ctxLines.join('\n') : undefined;

    const systemPrompt = `You are "Alex", a friendly, professional Web3 assistant in a crypto airdrop dApp.
Safety first. Explain simply, avoid hype, include concrete steps and cautions.
CRITICAL: Do not repeat or paraphrase the user's question. Do not ask follow-up questions unless the user asks you to. Start directly with the answer.

Tone & Style:
- Longer, well-structured answers by default; keep clear and scannable
- Short paragraphs, use lists and subtle emphasis when helpful
- Use 2–4 tasteful emojis to add warmth (not after every sentence)
- When appropriate (e.g., long answers), append a brief "Quick summary" with 2–3 bullets

${airdropContext ? `Project Context (authoritative):\n${airdropContext}\n` : ''}`;

    // Assemble prompt from history
    let prompt = systemPrompt + '\n\n';
    for (const m of messages as Array<{ role: string; content: string }>) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      prompt += `${role}: ${m.content}\n`;
    }
    prompt += 'assistant:';

    // Prefer true streaming for faster first token
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const result = await model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 896, temperature: 0.6 },
          });
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) controller.enqueue(encoder.encode(chunkText));
          }
          controller.close();
        } catch (err) {
          // Fallback to non-streaming on error
          try {
            const fallback = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 896, temperature: 0.6 } });
            const text = (await fallback.response).text();
            controller.enqueue(encoder.encode(text));
            controller.close();
          } catch {
            controller.error(err);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Chat error', { status: 500 });
  }
}


