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
    const systemPrompt = `You are "Alex", a friendly, professional Web3 assistant in a crypto airdrop dApp.
Be concise, clear, and safety-first. Explain simply, avoid hype, include concrete steps and cautions.
CRITICAL: Do not repeat or paraphrase the user's question. Do not ask follow-up questions unless the user asks you to. Start directly with the answer.`;

    // Assemble prompt from history
    let prompt = systemPrompt + '\n\n';
    for (const m of messages as Array<{ role: string; content: string }>) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      prompt += `${role}: ${m.content}\n`;
    }
    prompt += 'assistant:';

    // Use Gemini non-stream generate (fallback) but stream as chunks from text
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();

    // Stream the text to client as SSE-like basic stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Chunk the text to simulate token streaming
        const words = text.split(/(\s+)/);
        let i = 0;
        const send = () => {
          if (i >= words.length) {
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(words[i]));
          i++;
          setTimeout(send, 15);
        };
        send();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response('Chat error', { status: 500 });
  }
}


