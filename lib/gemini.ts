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
    const response = await fetch('/api/airdrop-explainer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ airdrop }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze airdrop');
    }

    return data.explanation;
  } catch (error) {
    console.error('Error analyzing airdrop:', error);
    return 'Sorry, I encountered an error while analyzing this airdrop. Please try again later.';
  }
}

// AI chat assistant for general Web3 questions
export async function chatWithAI(message: string, chatHistory: ChatMessage[] = []): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const systemPrompt = `You are a helpful AI assistant specializing in Web3, cryptocurrency, and blockchain technology. You're integrated into a Web3 airdrop application. 

Your role is to:
- Answer questions about cryptocurrency, DeFi, and Web3
- Help users understand airdrops and token claiming processes
- Provide guidance on wallet connections and transactions
- Explain blockchain concepts in simple terms
- Offer security advice for crypto users

Be friendly, professional, and informative. If you don't know something, say so. Always prioritize user security and best practices.`;

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
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
