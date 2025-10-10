import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Simple in-memory cache for airdrop explanations
const cache = new Map<string, { explanation: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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

## Overview
This is an exciting airdrop opportunity in the Web3 ecosystem! Airdrops are a way for blockchain projects to distribute tokens to their community members.

## Key Details
- **Snapshot Date**: ${airdrop?.snapshot || 'TBA'}
- **Eligibility**: ${airdrop?.eligibility || 'Check project requirements'}

## What to Expect 💰
- Token rewards for eligible participants
- Potential for future value appreciation
- Community building opportunities

## How to Claim 📝
1. Ensure you meet the eligibility criteria
2. Hold the required tokens/participate in activities
3. Follow the official claiming process when it opens
4. Connect your wallet to the claiming interface

## Important Notes 📅
- Always verify official sources
- Be cautious of scams and fake claiming sites
- Keep your private keys secure
- Consider the project's long-term potential

## Disclaimer ⚠️
This information is for educational purposes only. Always do your own research and consult with financial advisors before making investment decisions.

*Note: AI analysis requires API key configuration. This is a general guide.*
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Lean prompt (no scam mentions), tuned for speed and readability
    const prompt = `
Write a structured, friendly, and engaging analysis of this upcoming airdrop. Use concise sections with short paragraphs and lists, add 2–4 tasteful emojis.

Airdrop Details:
- Title: ${airdrop.title}
- Snapshot Date: ${airdrop.snapshot}
- Eligibility Criteria: ${airdrop.eligibility}

Cover:
1) What the project is and why this airdrop matters 🚀
2) Rewards overview and value considerations 💰
3) Eligibility checklist and preparation ✅
4) Step-by-step claiming guide 📝
5) Timeline and reminders 📅
6) Ecosystem context and outlook 📈
7) Tips for new users to get started smoothly 🧭

End with a 3–4 bullet "Quick summary".
`;

    console.log('Calling Gemini API...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 896, temperature: 0.6 },
    });
    const response = await result.response;
    const explanation = response.text();
    
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

## Overview
This is an exciting airdrop opportunity in the Web3 ecosystem! Airdrops are a way for blockchain projects to distribute tokens to their community members.

## Key Details
- **Snapshot Date**: ${airdropData?.snapshot || 'TBA'}
- **Eligibility**: ${airdropData?.eligibility || 'Check project requirements'}

## What to Expect 💰
- Token rewards for eligible participants
- Potential for future value appreciation
- Community building opportunities

## How to Claim 📝
1. Ensure you meet the eligibility criteria
2. Hold the required tokens/participate in activities
3. Follow the official claiming process when it opens
4. Connect your wallet to the claiming interface

## Important Notes 📅
- Always verify official sources
- Be cautious of scams and fake claiming sites
- Keep your private keys secure
- Consider the project's long-term potential

## Disclaimer ⚠️
This information is for educational purposes only. Always do your own research and consult with financial advisors before making investment decisions.

*Note: AI analysis temporarily unavailable. This is a general guide.*
`;

    return NextResponse.json({
      success: true,
      explanation: fallbackExplanation,
      cached: false,
      fallback: true
    });
  }
}
