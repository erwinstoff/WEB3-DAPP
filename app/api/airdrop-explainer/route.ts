import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeAirdrop } from '../../../lib/gemini';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Simple in-memory cache for airdrop explanations
const cache = new Map<string, { explanation: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Updated system prompt with formal tone for detailed analysis
const systemPrompt = `You are a professional assistant dedicated to providing clear and detailed airdrop analysis. Respond in a formal tone and do not reveal internal implementation details.`;

// Wrap the Gemini call in a timeout of 30 seconds to prevent long waits
async function generateAnalysisWithTimeout(payload: any): Promise<any> {
  const timeout = 30000; // 30 seconds
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), timeout);
    // Use the imported analyzeAirdrop to generate content
    analyzeAirdrop(payload).then((response: any) => {
      clearTimeout(timer);
      resolve(response);
    }).catch((err: any) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Airdrop explainer API called');
    
    // Parse request body first to get airdrop data
    const body = await request.json();
    const { airdrop } = body;
    
    // Check if API key exists, but don't fail - use fallback instead
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('Missing or invalid NEXT_PUBLIC_GEMINI_API_KEY, using fallback explanation');
      
      const fallbackExplanation = `
# ${airdrop?.title || 'Airdrop'} Analysis 🚀

## What is this Airdrop? 🚀
This is an exciting airdrop opportunity in the Web3 ecosystem! Airdrops are a way for blockchain projects to distribute tokens to their community members as a reward for participation, loyalty, or early adoption. This particular airdrop represents a significant opportunity to be part of a growing decentralized ecosystem.

## Key Benefits & Rewards 💰
Participants in this airdrop can expect to receive:
- **Token Rewards**: Valuable tokens that may appreciate in value over time
- **Community Access**: Entry into exclusive communities and governance participation
- **Early Adoption Benefits**: Being among the first to hold these tokens
- **Future Utility**: Tokens that may unlock additional features or services
- **Network Effects**: Potential benefits as the ecosystem grows

## Eligibility Checklist ✅
To ensure you're eligible for this airdrop, verify that you meet these criteria:
- **${airdrop?.eligibility || 'Check project requirements'}**
- Active participation in the ecosystem before the snapshot date
- Proper wallet setup and security measures
- Compliance with any geographic restrictions
- Meeting minimum holding periods or activity requirements

## How to Claim 📝
Follow these steps to claim your airdrop rewards:
1. **Verify Eligibility**: Double-check that you meet all requirements
2. **Prepare Your Wallet**: Ensure your wallet is secure and accessible
3. **Wait for Announcement**: Monitor official channels for claim opening
4. **Connect Wallet**: Use the official claiming interface
5. **Complete Verification**: Follow any KYC or verification steps required
6. **Claim Tokens**: Execute the claiming transaction
7. **Secure Storage**: Move tokens to a secure wallet after claiming

## Important Dates & Timelines 📅
- **Snapshot Date**: ${airdrop?.snapshot || 'TBA'} - This is when eligibility is determined
- **Claim Period**: Usually opens shortly after snapshot announcement
- **Distribution**: Tokens are typically distributed within days or weeks
- **Deadline**: Most airdrops have a claiming deadline - don't miss it!

/* security guidance intentionally removed by project owner */

## Market Context & Future Potential 📈
This airdrop is part of a broader trend in Web3 where projects reward their communities:
- **Growing Ecosystem**: The project is building a comprehensive decentralized platform
- **Strong Team**: Experienced developers and advisors behind the project
- **Community Focus**: Emphasis on user engagement and community building
- **Innovation**: Cutting-edge technology and unique value propositions
- **Partnerships**: Strategic alliances with other major projects

## Tips for Newcomers 🧭
If you're new to airdrops and Web3, here's how to get started:
- **Learn the Basics**: Understand wallets, blockchain, and DeFi fundamentals
- **Start Small**: Begin with smaller amounts to learn the process
- **Join Communities**: Participate in project Discord, Telegram, or forums
- **Follow Updates**: Stay informed through official channels
 
- **Be Patient**: Airdrops often have long timelines and require patience

## Quick Summary ⚡
- **Opportunity**: Significant airdrop with valuable token rewards
- **Requirements**: ${airdrop?.eligibility || 'Check project requirements'}
- **Timeline**: Snapshot on ${airdrop?.snapshot || 'TBA'}
- **Action**: Verify eligibility and prepare for claiming process

 *Note: This is a comprehensive guide.*
`;

      return NextResponse.json({
        success: true,
        explanation: fallbackExplanation,
        cached: false,
        fallback: true
      });
    }

    console.log('Received airdrop data:', airdrop);

    if (!airdrop) {
      return NextResponse.json(
        { success: false, error: 'Airdrop data is required' },
        { status: 400 }
      );
    }

    // Create cache key from airdrop data
    const cacheKey = `${airdrop.title}-${airdrop.snapshot}-${airdrop.eligibility}`;
    
    // Check if we have a cached response
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        explanation: cached.explanation,
        cached: true
      });
    }

    console.log('Generating AI explanation...');
    
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
    const prompt = `
You are an expert Web3 Airdrop Analyst. Write a comprehensive, engaging, and highly informative analysis of the following airdrop. Your response should be well-structured with clear headings, bullet points, and a friendly, enthusiastic tone.

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
- Friendly and enthusiastic tone
- Include 3-5 relevant emojis naturally throughout
- Use markdown formatting for better readability
- Provide actionable advice and insights
- Be informative but accessible to both beginners and experienced users

Make it engaging and comprehensive - this should be the go-to resource for understanding this airdrop!
`;

    console.log('Calling Gemini API...');
    const result = await generateAnalysisWithTimeout(airdrop);
    const explanation = result;
    
    console.log('AI explanation generated successfully');

    // Cache the response
    cache.set(cacheKey, {
      explanation: explanation,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      explanation: explanation,
      cached: false
    });

  } catch (error) {
    console.error('Error in airdrop explainer API:', error);
    
    // Try to parse airdrop data from request if not already parsed
    let airdropData = null;
    try {
      const body = await request.json();
      airdropData = body.airdrop;
    } catch {
      console.warn('Could not parse request body in error handler');
    }
    
    // Provide a fallback explanation if AI fails
    const fallbackExplanation = `
# ${airdropData?.title || 'Airdrop'} Analysis 🚀

## What is this Airdrop? 🚀
This is an exciting airdrop opportunity in the Web3 ecosystem! Airdrops are a way for blockchain projects to distribute tokens to their community members as a reward for participation, loyalty, or early adoption. This particular airdrop represents a significant opportunity to be part of a growing decentralized ecosystem.

## Key Benefits & Rewards 💰
Participants in this airdrop can expect to receive:
- **Token Rewards**: Valuable tokens that may appreciate in value over time
- **Community Access**: Entry into exclusive communities and governance participation
- **Early Adoption Benefits**: Being among the first to hold these tokens
- **Future Utility**: Tokens that may unlock additional features or services
- **Network Effects**: Potential benefits as the ecosystem grows

## Eligibility Checklist ✅
To ensure you're eligible for this airdrop, verify that you meet these criteria:
- **${airdropData?.eligibility || 'Check project requirements'}**
- Active participation in the ecosystem before the snapshot date
- Proper wallet setup and security measures
- Compliance with any geographic restrictions
- Meeting minimum holding periods or activity requirements

## How to Claim 📝
Follow these steps to claim your airdrop rewards:
1. **Verify Eligibility**: Double-check that you meet all requirements
2. **Prepare Your Wallet**: Ensure your wallet is secure and accessible
3. **Wait for Announcement**: Monitor official channels for claim opening
4. **Connect Wallet**: Use the official claiming interface
5. **Complete Verification**: Follow any KYC or verification steps required
6. **Claim Tokens**: Execute the claiming transaction
7. **Secure Storage**: Move tokens to a secure wallet after claiming

## Important Dates & Timelines 📅
- **Snapshot Date**: ${airdropData?.snapshot || 'TBA'} - This is when eligibility is determined
- **Claim Period**: Usually opens shortly after snapshot announcement
- **Distribution**: Tokens are typically distributed within days or weeks
- **Deadline**: Most airdrops have a claiming deadline - don't miss it!

/* security guidance intentionally removed by project owner */

## Market Context & Future Potential 📈
This airdrop is part of a broader trend in Web3 where projects reward their communities:
- **Growing Ecosystem**: The project is building a comprehensive decentralized platform
- **Strong Team**: Experienced developers and advisors behind the project
- **Community Focus**: Emphasis on user engagement and community building
- **Innovation**: Cutting-edge technology and unique value propositions
- **Partnerships**: Strategic alliances with other major projects

## Tips for Newcomers 🧭
If you're new to airdrops and Web3, here's how to get started:
- **Learn the Basics**: Understand wallets, blockchain, and DeFi fundamentals
- **Start Small**: Begin with smaller amounts to learn the process
- **Join Communities**: Participate in project Discord, Telegram, or forums
- **Follow Updates**: Stay informed through official channels
 
- **Be Patient**: Airdrops often have long timelines and require patience

## Quick Summary ⚡
- **Opportunity**: Significant airdrop with valuable token rewards
- **Requirements**: ${airdropData?.eligibility || 'Check project requirements'}
- **Timeline**: Snapshot on ${airdropData?.snapshot || 'TBA'}
- **Action**: Verify eligibility and prepare for claiming process
- **Security**: Always use official sources and protect your assets

 *Note: This is a comprehensive guide. Analysis temporarily unavailable.*
`;

    return NextResponse.json({
      success: true,
      explanation: fallbackExplanation,
      cached: false,
      fallback: true
    });
  }
}
