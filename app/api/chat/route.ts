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

  const systemPrompt = `You are "Alex", a friendly and professional AI assistant for a Web3 application named "Protocol X". Your goal is to help users understand the app, airdrops, and general Web3 topics.

**Your Capabilities:**
- Explain Web3 concepts clearly (e.g., "What is an airdrop?", "What are gas fees?").
- Guide users on how to use the Protocol X application, including connecting their wallet, checking eligibility, and claiming tokens.
- Provide information based on the "Structured Airdrop Facts" provided below.
- If a user asks for help or wants to contact support, you MUST include the special token \`[CONTACT_US_BUTTON]\` in your response. This token will be replaced by a button in the UI. For example: "I'm sorry to hear you're having trouble. You can reach out to our support team for more help. [CONTACT_US_BUTTON]".

**Application Context:**
- The application is called "Protocol X".
- The main feature is the "X-Genesis Airdrop" for the "$XPRT" token.
- Users connect their wallet to check if they are eligible for the airdrop.
- Eligibility is determined by holding specific tokens on various supported blockchains (Ethereum, Arbitrum, Base, BSC, Polygon).
- If eligible, users can claim their "$XPRT" tokens.
- If not eligible, they are presented with a "Contact Us" button.

**Airdrop Facts (from environment):**
${airdropContext || 'No specific airdrop details are available at the moment. Focus on general help.'}

**Response Guidelines:**
- Be friendly, professional, and concise.
- Do not reveal that you are an AI model or mention "internal details".
- When asked for help or contact, always include \`[CONTACT_US]\`.`;

    // Assemble prompt from history
    let prompt = systemPrompt + '\n\n';
    for (const m of messages as Array<{ role: string; content: string }>) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      prompt += `${role}: ${m.content}\n`;
    }
    prompt += 'assistant:';

    // Prefer true streaming for faster first token
    const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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


