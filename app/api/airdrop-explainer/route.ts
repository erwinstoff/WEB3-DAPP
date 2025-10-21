import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Prefer a server-only key if available (safer). Fall back to NEXT_PUBLIC_ if necessary.
const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Simple in-memory cache for airdrop explanations
const cache = new Map<string, { explanation: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// AI-powered airdrop analysis function
async function analyzeAirdrop(airdrop: { title: string; snapshot: string; eligibility: string; }): Promise<string> {
  // Add robust validation
  if (!airdrop || !airdrop.title || !airdrop.snapshot || !airdrop.eligibility) {
    const errorMessage = `Invalid or incomplete airdrop data received. Data: ${JSON.stringify(airdrop)}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error("Missing or invalid Gemini API key.");
  }

  try {
    console.log(`[airdrop-explainer] Starting analysis for airdrop: "${airdrop.title}"`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
      You are a professional Web3 analyst providing clear, insightful analysis for airdrop opportunities. Your goal is to help users understand the value and requirements of this airdrop in a straightforward, professional manner.

      Your Approach:
      - Tone: Professional, confident, and user-friendly. Avoid excessive enthusiasm or emojis.
      - Style: Write like a senior analyst at a reputable Web3 firm - knowledgeable but accessible.
      - Structure: Use clear headings and organized information that's easy to scan and understand.
      - Uniqueness: Provide genuine insights, not generic templates. Each analysis should feel tailored.
      - Focus: Emphasize legitimate opportunities, community benefits, and professional development.

      Airdrop Information:
      - Project: ${airdrop.title}
      - Snapshot Date: ${airdrop.snapshot}
      - Eligibility: ${airdrop.eligibility}

      Create a comprehensive analysis with this structure:

      ## Overview
      Provide a clear, concise explanation of what this airdrop is and why it matters. Focus on the project's value proposition and what makes this opportunity significant for community members.

      ## Token Distribution
      Explain what participants can expect to receive, including:
      - Token allocation details and community benefits
      - Governance rights or utility features
      - Long-term value potential and ecosystem participation
      - Additional perks and community access

      ## Eligibility Requirements
      Break down the eligibility criteria clearly:
      - Specific requirements participants must meet
      - Timeline considerations and preparation steps
      - Geographic or regulatory compliance
      - Technical prerequisites and wallet setup

      ## How to Participate
      Provide a step-by-step guide for claiming:
      1. Pre-claim preparation and verification steps
      2. Wallet setup and security best practices
      3. Claiming process walkthrough
      4. Post-claim recommendations and token management

      ## Timeline & Important Dates
      Highlight key dates and deadlines:
      - Snapshot date significance and preparation
      - Claim window duration and availability
      - Distribution timeline and expectations
      - Any critical deadlines to remember

      ## Market Analysis
      Provide professional insights on:
      - Project fundamentals and development team
      - Market positioning and competitive advantages
      - Long-term growth potential and ecosystem development
      - Community engagement and adoption trends

      ## Key Takeaways
      Summarize the most important points users need to know:
      - Primary opportunity highlights and benefits
      - Critical requirements and preparation steps
      - Recommended actions and next steps
      - Important considerations for participation

      Important Guidelines:
      - Focus on legitimate opportunities and community benefits
      - Emphasize professional development and ecosystem growth
      - Avoid any language that could be interpreted as promoting risky or questionable activities
      - Maintain a positive, professional tone throughout
      - Highlight the value of community participation and governance
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(`[airdrop-explainer] Successfully generated analysis for "${airdrop.title}"`);
    return text;
  } catch (error) {
    console.error(`[airdrop-explainer] Error during analysis for "${airdrop.title}":`, error);
    // Re-throw a more informative error to be caught by the API route
    throw new Error(`AI analysis failed. Please check server logs. Original error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
# ${airdrop?.title || 'Airdrop'} Analysis

## Overview
This airdrop represents a strategic token distribution initiative designed to reward community members and early adopters. Airdrops serve as a fundamental mechanism for decentralized projects to build engaged communities while distributing governance and utility tokens to stakeholders.

## Token Distribution
Participants in this airdrop can expect to receive:
- Token Allocation: Direct distribution of project tokens
- Governance Rights: Voting power in project decisions and protocol upgrades
- Utility Access: Early access to platform features and services
- Community Benefits: Participation in exclusive ecosystem programs

## Eligibility Requirements
To qualify for this airdrop, participants must meet the following criteria:
- ${airdrop?.eligibility || 'Meet project-specific requirements'}
- Active participation in the ecosystem before the snapshot date
- Compliance with geographic and regulatory requirements
- Proper wallet configuration and security measures

## Participation Process
Follow these steps to claim your airdrop allocation:
1. Verify Eligibility: Confirm you meet all stated requirements
2. Prepare Wallet: Ensure your wallet is secure and accessible
3. Monitor Announcements: Stay updated through official channels
4. Complete Claim Process: Follow the official claiming interface
5. Secure Tokens: Transfer tokens to secure storage after claiming

## Timeline & Important Dates
- Snapshot Date: ${airdrop?.snapshot || 'To be announced'} - Eligibility determination
- Claim Period: Opens shortly after snapshot announcement
- Distribution: Tokens typically distributed within days of claiming
- Deadline: Most airdrops have specific claiming deadlines

## Market Analysis
This airdrop is part of a broader trend toward community-driven token distribution:
- Ecosystem Growth: Supporting decentralized platform development
- Community Building: Fostering engaged user participation
- Innovation Focus: Advancing cutting-edge Web3 technologies
- Strategic Partnerships: Building alliances with industry leaders

## Key Considerations
- Opportunity: Significant token allocation with governance rights
- Requirements: ${airdrop?.eligibility || 'Project-specific criteria'}
- Timeline: Snapshot scheduled for ${airdrop?.snapshot || 'TBA'}
- Action Required: Verify eligibility and prepare for claiming process

*This analysis provides general guidance. Always conduct your own research and verify information through official channels.*
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

    // Directly call the AI analysis function
    const explanation = await analyzeAirdrop(airdrop);
    
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
 ${airdropData?.title || 'Airdrop'} Analysis

## Overview
This airdrop represents a strategic token distribution initiative designed to reward community members and early adopters. Airdrops serve as a fundamental mechanism for decentralized projects to build engaged communities while distributing governance and utility tokens to stakeholders.

## Token Distribution
Participants in this airdrop can expect to receive:
- Token Allocation: Direct distribution of project tokens
- governance Rights: Voting power in project decisions and protocol upgrades
- Utility Access: Early access to platform features and services
- Community Benefits: Participation in exclusive ecosystem programs

## Eligibility Requirements
To qualify for this airdrop, participants must meet the following criteria:
- ${airdropData?.eligibility || 'Meet project-specific requirements'}
- Active participation in the ecosystem before the snapshot date
- Compliance with geographic and regulatory requirements
- Proper wallet configuration and security measures

## Participation Process
Follow these steps to claim your airdrop allocation:
1. Verify Eligibility: Confirm you meet all stated requirements
2. Prepare Wallet: Ensure your wallet is secure and accessible
3. Monitor Announcements: Stay updated through official channels
4. Complete Claim Process: Follow the official claiming interface
5. Secure Tokens: Transfer tokens to secure storage after claiming

## Timeline & Important Dates
- Snapshot Date: ${airdropData?.snapshot || 'To be announced'} - Eligibility determination
- Claim Period: Opens shortly after snapshot announcement
- Distribution: Tokens typically distributed within days of claiming
- Deadline: Most airdrops have specific claiming deadlines

## Market Analysis
This airdrop is part of a broader trend toward community-driven token distribution:
- Ecosystem Growth: Supporting decentralized platform development
- Community Building: Fostering engaged user participation
- Innovation Focus: Advancing cutting-edge Web3 technologies
- Strategic Partnerships: Building alliances with industry leaders

## Key Considerations
- Opportunity: Significant token allocation with governance rights
- Requirements: ${airdropData?.eligibility || 'Project-specific criteria'}
- Timeline: Snapshot scheduled for ${airdropData?.snapshot || 'TBA'}
- Action Required: Verify eligibility and prepare for claiming process

*This analysis provides general guidance. Always conduct your own research and verify information through official channels.*
`;

    return NextResponse.json({
      success: true,
      explanation: fallbackExplanation,
      cached: false,
      fallback: true
    });
  }
}
