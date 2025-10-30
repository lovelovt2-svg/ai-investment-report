// ====================================
// 최종 안전 버전 - 주가 없어도 완벽!
// 파일명: api/generate-report.js
// ====================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { searchQuery, additionalInfo } = req.body;

    console.log('🔍 검색어:', searchQuery);

    const topicType = determineTopicType(searchQuery);
    console.log('📊 주제 타입:', topicType);

    const newsData = await searchNaverNews(searchQuery, 20);
    console.log('📰 뉴스:', newsData.length, '건');

    // 주가는 시도만 하고 실패해도 계속!
    let stockData = null;
    if (topicType === 'company') {
      stockData = await tryGetStockData(searchQuery);
      console.log('📈 주가:', stockData ? '✅' : '⚠️ (뉴스로 진행)');
    }

    const sentiment = analyzeSentiment(newsData);
    const prompt = buildStrictPrompt(searchQuery, newsData, stockData, topicType, sentiment, additionalInfo);

    console.log('🤖 Claude 호출');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) throw new Error(`Claude: ${response.status}`);

    const data = await response.json();

    return res.status(200).json({
      success: true,
      report: data.content[0].text,
      metadata: {
        topicType: topicType,
        newsCount: newsData.length,
        sentiment: sentiment,
        hasStockData: !!stockData,
        stockData: stockData,
        timestamp: new Date().toISOString(),
        dataQuality: calculateQuality(newsData.length, !!stockData),
        sources: newsData.slice(0, 5).map(n => ({
          title: n.title,
          date: n.pubDate
        }))
      }
    });

  } catch (error) {
    console.error('❌ 오류:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// 주가 조회 시도 (여러 API 시도)
async function tryGetStockData(query) {
  const ticker = getKoreanStockTicker(query);
  if (!ticker || !process.env.RAPIDAPI_KEY) return null;

  // 1. YH Finance 시도
  try {
    const data = await getYHFinanceData(ticker);
    if (data) return data;
  } catch (error) {
    console.log('YH Finance 실패:', error.message);
  }

  // 2. Yahoo Finance15 시도
  try {
    const data = await getYahooFinance15Data(ticker);
    if (data) return data;
  } catch (error) {
    console.log('Yahoo Finance15 실패:', error.message);
  }

  // 모두 실패해도 null 반환 (계속 진행)
  return null;
}

// YH Finance API
async function getYHFinanceData(ticker) {
  const response = await fetch(
    `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${ticker}`,
    {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
      },
      timeout: 5000
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const price = data.price || {};
  const summaryDetail = data.summaryDetail || {};
  const financialData = data.financialData || {};

  return {
    currentPrice: price.regularMarketPrice?.raw || null,
    targetPrice: financialData.targetMeanPrice?.raw || null,
    pe: summaryDetail.trailingPE?.raw || null,
    marketCap: price.marketCap?.raw || null
  };
}

// Yahoo Finance15 API
async function getYahooFinance15Data(ticker) {
  const response = await fetch(
    `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes?ticker=${ticker}`,
    {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
      },
      timeout: 5000
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const stock = data.body?.[0] || data.body?.quote || data.body || null;
  if (!stock) return null;

  return {
    currentPrice: stock.regularMarketPrice || stock.price || null,
    targetPrice: stock.targetMeanPrice || null,
    pe: stock.trailingPE || stock.pe || null,
    marketCap: stock.marketCap || null
  };
}

function determineTopicType(query) {
  const q = query.toLowerCase();
  const economy = ['경제', '금리', '환율', 'gdp', '물가', '인플', '성장률', '경기'];
  const sector = ['산업', '업종', '섹터', '시장'];
  const company = ['전자', '바이오', '제약', '은행', '반도체', '자동차', '삼성', 'lg', 'sk'];

  for (const w of economy) {
    if (q.includes(w)) {
      let hasComp = false;
      for (const c of company) if (q.includes(c)) { hasComp = true; break; }
      if (!hasComp) return 'economy';
    }
  }
  for (const w of sector) if (q.includes(w)) return 'sector';
  for (const w of company) if (q.includes(w)) return 'company';
  return 'economy';
}

function buildStrictPrompt(query, news, stock, type, sentiment, additional) {
  const newsText = news.map((n, i) => `[${i+1}] ${n.title}\n${n.description}`).join('\n\n');
  let stockSection = '';
  if (stock && type === 'company') {
    stockSection = `\n# 📊 주가\n현재가: ${stock.currentPrice?.toLocaleString() || 'N/A'}원\n${stock.targetPrice ? `목표가: ${stock.targetPrice.toLocaleString()}원\n` : ''}${stock.pe ? `PER: ${stock.pe.toFixed(1)}배\n` : ''}`;
  }
  const header = `# 뉴스 (${news.length}건)\n${newsText}${stockSection}\n감성: ${sentiment}\n${additional ? `\n추가: ${additional}\n` : ''}`;

  if (type === 'economy') {
    return `경제 전문가 "${query}" 분석.\n\n${header}\n\n⚠️ SWOT/BUY/목표주가 금지\n\n## 1. 요약 (3-4문장)\n## 2. 핵심 지표\n- GDP: [%]\n- 물가: [%]\n- 금리: [%]\n## 3. 경제 상황\n### 현황\n- 점 1\n- 점 2\n### 정책\n- 점 1\n- 점 2\n### 전망\n- 점 1\n- 점 2\n## 4. 경제 리스크\n- 리스크 1\n- 리스크 2\n- 리스크 3\n## 5. 전망 요약\n전망: 긍정/중립/부정\n기간: 6-12개월\n영향: [2-3문장]\n## 6. 투자자 관점\n[3문장]`;
  }
  else if (type === 'sector') {
    return `산업 전문가 "${query}" 분석.\n\n${header}\n\n⚠️ SWOT/BUY/목표주가 금지\n\n## 1. 요약 (3-4문장)\n## 2. 핵심 트렌드\n- 트렌드 1\n- 트렌드 2\n- 트렌드 3\n## 3. 산업 분석\n### 현황\n- 점 1\n- 점 2\n### 기업\n- 점 1\n- 점 2\n### 성장\n- 점 1\n- 점 2\n## 4. 산업 리스크\n- 리스크 1\n- 리스크 2\n- 리스크 3\n## 5. 산업 전망\n전망: 긍정/중립/부정\n기간: 12개월\n매력도: [2-3문장]\n## 6. 투자자 관점\n[3문장]`;
  }
  else {
    const priceInfo = stock?.currentPrice ? `${stock.currentPrice.toLocaleString()}원` : '[추정]원';
    const targetInfo = stock?.targetPrice ? `${stock.targetPrice.toLocaleString()}원` : '[추정]원';
    return `증권 애널리스트 "${query}" 분석.\n\n${header}\n\n## 1. 요약 (3-4문장)\n## 2. 핵심 포인트\n- 포인트 1\n- 포인트 2\n- 포인트 3\n## 3. SWOT\n### 강점\n- 점 1\n- 점 2\n### 약점\n- 점 1\n- 점 2\n### 기회\n- 점 1\n- 점 2\n### 위협\n- 점 1\n- 점 2\n## 4. 리스크\n- 리스크 1\n- 리스크 2\n- 리스크 3\n## 5. 투자 의견\n등급: BUY/HOLD/SELL\n목표가: ${targetInfo}\n현재가: ${priceInfo}\n기간: 12개월\n근거: [2문장]\n## 6. 투자자 관점\n[3문장]`;
  }
}

function getKoreanStockTicker(query) {
  const map = {
    '삼성전자': '005930.KS', '삼성': '005930.KS',
    'SK하이닉스': '000660.KS', '하이닉스': '000660.KS',
    '네이버': '035420.KS', '카카오': '035720.KS',
    '현대차': '005380.KS', 'LG전자': '066570.KS',
    '셀트리온': '068270.KS'
  };
  for (const [k, v] of Object.entries(map)) if (query.includes(k)) return v;
  return null;
}

async function searchNaverNews(query, max = 20) {
  const ID = process.env.NAVER_CLIENT_ID;
  const SECRET = process.env.NAVER_CLIENT_SECRET;
  if (!ID || !SECRET) return [{ title: `${query} 뉴스`, description: '분석', pubDate: new Date().toISOString() }];
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${max}&sort=date`,
      { headers: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET } }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const threeDays = new Date(Date.now() - 3*24*60*60*1000);
    return (data.items || [])
      .filter(i => new Date(i.pubDate) >= threeDays)
      .map(i => ({ title: clean(i.title), description: clean(i.description), pubDate: i.pubDate }))
      .slice(0, max);
  } catch (error) {
    return [{ title: `${query} 뉴스`, description: '분석', pubDate: new Date().toISOString() }];
  }
}

function clean(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function analyzeSentiment(news) {
  const pos = ['상승', '호조', '증가', '개선', '성장'];
  const neg = ['하락', '부진', '감소', '악화', '위축'];
  let p = 0, n = 0;
  news.forEach(i => {
    const t = i.title + i.description;
    pos.forEach(w => { if (t.includes(w)) p++; });
    neg.forEach(w => { if (t.includes(w)) n++; });
  });
  if (p > n * 1.5) return '긍정적';
  if (n > p * 1.5) return '부정적';
  return '중립적';
}

function calculateQuality(newsCount, hasStock) {
  const base = Math.min(newsCount * 4, 80);
  const bonus = hasStock ? 10 : 0;
  return Math.min(base + bonus, 95);
}
