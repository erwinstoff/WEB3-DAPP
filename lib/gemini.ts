import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI (only used for chat functions)
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface AirdropDetails {
  title: string;
  snapshot: string;
  eligibility: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// AI-powered airdrop analysis
export async function analyzeAirdrop(airdrop: AirdropDetails): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = `
You are an expert Web3 Airdrop Analyst. Write a comprehensive, engaging, and highly informative analysis of the following airdrop. Your response should be well-structured with clear headings, bullet points, and a professional, analytical tone.

MANDATE: Conclude every response with a "Quick Summary" section consisting of 2-3 concise bullet points that state the most important actions or takeaways for the user.

Airdrop Details:
- Title: ${airdrop.title}
- Snapshot Date: ${airdrop.snapshot}
- Eligibility Criteria: ${airdrop.eligibility}

Please cover the following topics in your analysis:
1. **What is this Airdrop?** 🚀 Explain the project behind the airdrop and why it's a significant opportunity in the Web3 space.
2. **Key Benefits & Rewards** 💰 Detail what users can expect to receive and the potential value or utility of these rewards.
3. **Eligibility Checklist** ✅ Provide a clear, step-by-step guide on how users can confirm their eligibility.
4. **How to Claim** 📝 Outline the exact process for claiming the airdrop, including any necessary actions or platforms.
5. **Important Dates & Timelines** 📅 Highlight critical dates like snapshot, claim period, and distribution.
6. **Market Context & Future Potential** 📈 Briefly discuss the project's position in the market and its long-term outlook.
8. **Tips for Newcomers** 🧭 Provide friendly advice for users new to airdrops or the Web3 space.
9. **Quick Summary** ⚡ Conclude with a brief, impactful summary of the airdrop's main points.

Your response should be:
- Long and detailed (aim for 800-1200 words)
- Well-structured with clear headings and bullet points
- Professional and analytical tone
- Include 3-5 relevant emojis naturally throughout
- Use markdown formatting for better readability
- Provide actionable advice and insights
- Be informative but accessible to both beginners and experienced users

Make it engaging and comprehensive - this should be the go-to resource for understanding this airdrop!
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing airdrop:', error);
    return 'Sorry, I encountered an error while analyzing this airdrop. Please try again later.';
  }
}

// AI chat assistant for general Web3 questions
export async function chatWithAI(message: string, chatHistory: ChatMessage[] = []): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
  // Updated system prompt for professional and neutral tone without exposing internal AI identity
  const systemPrompt = `You are a professional assistant dedicated to providing detailed explanations and interactive support. Respond in a formal tone and avoid any self-references that reveal internal implementation details.`;

    // Build conversation context
    let conversationContext = systemPrompt + '\n\n';
    
    // Add chat history
    chatHistory.forEach(msg => {
      conversationContext += `${msg.role}: ${msg.content}\n`;
    });
    
    conversationContext += `user: ${message}\nassistant:`;

    const result = await model.generateContent(conversationContext);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in AI chat:', error);
    return 'Sorry, I encountered an error. Please try again later.';
  }
}

// Streaming chat client: calls our /api/chat route and yields partial tokens
export async function chatWithAIStream(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Chat stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value));
  }
}

// Gas optimization suggestions
export async function getGasOptimizationSuggestions(chainId: number, transactionType: string): Promise<string> {
  try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
    const chainNames: Record<number, string> = {
      1: 'Ethereum Mainnet',
      42161: 'Arbitrum',
      11155111: 'Sepolia Testnet'
    };
    
    const chainName = chainNames[chainId] || 'Unknown Network';
    
    const prompt = `
You are a blockchain transaction optimization expert. Provide gas fee optimization advice for:

Network: ${chainName} (Chain ID: ${chainId})
Transaction Type: ${transactionType}

Please provide:
1. Current network conditions and gas price trends
2. Optimal gas price recommendations
3. Best times to transact (if applicable)
4. Alternative networks or layer 2 solutions
5. Cost-saving strategies
6. Risk considerations

Keep the advice practical and actionable for users.
`;

      const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error getting gas optimization:', error);
    return 'Sorry, I couldn\'t provide gas optimization advice at this time.';
  }
}
