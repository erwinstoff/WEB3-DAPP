import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // Hardcoded fallback key per user request; can be overridden via env
  const newsApiKey = process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY || '2001ba9932144feb9f0c30cdf2f09ed4';

  // Fallback items if API key missing or fetch fails
  const fallback = [
    'Protocol X: Snapshot window opens next week 📅',
    'Reminder: Only use official claim links 🔐',
    'Community Q&A about eligibility this Friday 🧭',
    'Partner integration announced — more utility coming 🚀',
  ];

  // If API key is not set, use fallback/environment list
  if (!newsApiKey) {
    const envList = process.env.NEXT_PUBLIC_AIRDROP_NEWS;
    const items = envList ? envList.split(',').map(s => s.trim()).filter(Boolean) : fallback;
    return NextResponse.json({ items, updatedAt: new Date().toISOString(), source: 'env' });
  }

  // Helper: try multiple endpoints until one returns data
  const tryEndpoints = async (): Promise<{ items: string[]; source: string }> => {
    // NewsAPI routes only
    const queries = [
      `https://newsapi.org/v2/everything?q=(airdrop%20OR%20crypto%20OR%20token)&language=en&sortBy=publishedAt&pageSize=10`,
      `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=10`,
    ];
    for (const url of queries) {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: { 'X-Api-Key': newsApiKey },
        });
        if (!res.ok) continue;
        const json = await res.json();
        const articles = Array.isArray(json?.articles) ? json.articles : [];
        const items = articles.slice(0, 10).map((a: any) => {
          const title = typeof a?.title === 'string' ? a.title : '';
          const site = typeof a?.source?.name === 'string' ? a.source.name : '';
          return title ? (site ? `${title} • ${site}` : title) : '';
        }).filter(Boolean);
        if (items.length) return { items, source: 'newsapi' };
      } catch {}
    }
    return { items: fallback, source: 'fallback' };
  };

  const result = await tryEndpoints();
  return NextResponse.json({ items: result.items, updatedAt: new Date().toISOString(), source: result.source });
}


