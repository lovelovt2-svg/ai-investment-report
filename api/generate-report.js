// ====================================
// AI 투자 분석 플랫폼 v2.4 (최종 개선)
// 원본 v2.3 + 하드코딩 제거 + 안정성 강화
// ====================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { searchQuery, uploadedFiles, additionalInfo } = req.body;

    console.log('🔍 검색어:', searchQuery);

    // 1️⃣ 뉴스 수집 (20건으로 축소 - 속도 개선)
    const newsData = await searchNaverNews(searchQuery, 20);
    console.log(`📰 수집된 뉴스: ${newsData.length}건`);

    // 2️⃣ 주가 데이터 (기업일 경우만, 실패해도 계속)
    const ticker = getKoreanStockTicker(searchQuery);
    let stockData = null;
    
    if (ticker) {
      try {
        stockData = await getYahooFinanceData(ticker);
        console.log('📈 주가:', stockData ? '✅' : '⚠️');
      } catch (error) {
        console.log('⚠️ 주가 조회 실패, 뉴스로 진행');
      }
    }

    // 3️⃣ 감성 분석
    const sentiment = analyzeSentiment(newsData);

    // 4️⃣ 주제 타입 판별 (개선된 로직)
    const topicType = determineTopicType(searchQuery);
    console.log('📊 주제 타입:', topicType);

    // 5️⃣ Claude 프롬프트 구성 (v2.4 - 완전 분리)
    const prompt = buildPrompt(searchQuery, newsData, stockData, uploadedFiles, additionalInfo, sentiment, topicType);

    console.log('🧠 Claude 요청 시작');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000, // 속도 개선
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API 오류: ${response.statusText}`);

    const data = await response.json();
    const reportContent = data.content?.[0]?.text || '리포트 생성 실패';

    console.log('✅ Claude 응답 완료');

    return res.status(200).json({
      success: true,
      report: reportContent,
      metadata: {
        timestamp: new Date().toISOString(),
        topicType: topicType, // 추가!
        newsCount: newsData.length,
        sentiment,
        hasStockData: !!stockData,
        stockData: stockData, // 주가 데이터 포함
        stockTicker: ticker,
        aiModel: 'Claude Sonnet 4',
        dataQuality: calculateQuality(newsData.length, !!stockData), // 동적 계산
        dataSource: `네이버 뉴스 + ${stockData ? 'Yahoo Finance' : '뉴스만'} + Claude`,
        sources: newsData.slice(0, 10).map(n => ({
          title: n.title,
          url: n.link,
          date: n.pubDate,
        })),
      },
    });
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ====================================
// 주제 타입 판별 (정확도 강화)
// ====================================
function determineTopicType(query) {
  const q = query.toLowerCase();
  
  // 경제 키워드 (최우선)
  const economyWords = ['경제', '금리', '환율', 'gdp', '물가', '인플레', '성장률', '경기', '실업', '통화'];
  
  // 산업 키워드
  const sectorWords = ['산업', '업종', '섹터', '시장', '업계'];
  
  // 기업 키워드
  const companyWords = ['전자', '바이오', '제약', '은행', '카드', '반도체', '자동차', '화학', '철강', '삼성', 'lg', 'sk', '현대', '네이버', '카카오'];

  // 경제 체크 (기업명 함께 있으면 기업 우선)
  for (const word of economyWords) {
    if (q.includes(word)) {
      let hasCompany = false;
      for (const comp of companyWords) {
        if (q.includes(comp)) {
          hasCompany = true;
          break;
        }
      }
      if (!hasCompany) return 'economy';
    }
  }

  // 산업 체크
  for (const word of sectorWords) {
    if (q.includes(word)) return 'sector';
  }

  // 기업 체크
  for (const word of companyWords) {
    if (q.includes(word)) return 'company';
  }

  return 'economy'; // 기본값
}

// ====================================
// 네이버 뉴스 API
// ====================================
async function searchNaverNews(query, maxResults = 20) {
  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn('⚠️ 네이버 API 키 없음. 더미 데이터 반환.');
    return getDummyNews(query);
  }

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${maxResults}&sort=date`,
      { headers: { 'X-Naver-Client-Id': CLIENT_ID, 'X-Naver-Client-Secret': CLIENT_SECRET } }
    );

    if (!res.ok) throw new Error(`네이버 API 오류: ${res.statusText}`);
    const data = await res.json();

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return data.items
      .map(n => ({
        title: removeHtml(n.title),
        description: removeHtml(n.description),
        link: n.link,
        pubDate: n.pubDate,
      }))
      .filter(n => new Date(n.pubDate) >= threeDaysAgo)
      .slice(0, maxResults);
  } catch (err) {
    console.error('네이버 뉴스 수집 실패:', err);
    return getDummyNews(query);
  }
}

// ====================================
// Yahoo Finance API (에러 안전성 강화)
// ====================================
async function getYahooFinanceData(ticker) {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    console.log('⚠️ RAPIDAPI_KEY 없음');
    return null;
  }

  try {
    const res = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes?ticker=${ticker}`,
      { 
        headers: { 
          'X-RapidAPI-Key': RAPIDAPI_KEY, 
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com' 
        },
        timeout: 5000
      }
    );

    if (!res.ok) {
      console.log('⚠️ Yahoo Finance 실패:', res.status);
      return null;
    }

    const data = await res.json();
    
    // 응답 구조 보정 (중요!)
    const stock = data.body?.[0] || data.body?.quote || data.body || null;
    if (!stock) return null;

    return {
      currentPrice: stock.regularMarketPrice || stock.price || null,
      targetPrice: stock.targetMeanPrice || null,
      high52Week: stock.fiftyTwoWeekHigh || null,
      low52Week: stock.fiftyTwoWeekLow || null,
      pe: stock.trailingPE || null,
      eps: stock.epsTrailingTwelveMonths || null,
      marketCap: stock.marketCap || null,
      volume: stock.regularMarketVolume || null,
      previousClose: stock.regularMarketPreviousClose || null,
      changePercent: stock.regularMarketChangePercent || null,
    };
  } catch (e) {
    console.error('Yahoo Finance 오류:', e.message);
    return null;
  }
}

// ====================================
// 헬퍼 함수들
// ====================================
function removeHtml(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function getDummyNews(query) {
  return [
    { title: `${query} 시장 분석`, description: '최근 시장 흐름과 주요 변수 분석', link: '#', pubDate: new Date().toISOString() },
    { title: `${query} 투자 전망`, description: '전문가 의견에 따른 투자 관점 정리', link: '#', pubDate: new Date().toISOString() },
  ];
}

function analyzeSentiment(newsData) {
  const pos = ['상승', '호조', '성장', '개선', '확대', '긍정', '증가'];
  const neg = ['하락', '부진', '감소', '약세', '위축', '부정', '악화'];
  let p = 0, n = 0;
  newsData.forEach(news => {
    const txt = news.title + news.description;
    pos.forEach(w => { if (txt.includes(w)) p++; });
    neg.forEach(w => { if (txt.includes(w)) n++; });
  });
  if (p > n * 1.5) return '긍정적';
  if (n > p * 1.5) return '부정적';
  return '중립적';
}

function getKoreanStockTicker(q) {
  const map = {
    '삼성전자': '005930.KS', '삼성': '005930.KS',
    'SK하이닉스': '000660.KS', '하이닉스': '000660.KS',
    '카카오': '035720.KS', 
    'NAVER': '035420.KS', '네이버': '035420.KS',
    '현대차': '005380.KS', '현대자동차': '005380.KS',
    'LG화학': '051910.KS', 'LG전자': '066570.KS',
    '기아': '000270.KS',
    'KB금융': '105560.KS',
    '셀트리온': '068270.KS',
    '포스코': '005490.KS',
  };
  for (const [k, v] of Object.entries(map)) if (q.includes(k)) return v;
  return null;
}

function calculateQuality(newsCount, hasStock) {
  const base = Math.min(newsCount * 4, 80);
  const stockBonus = hasStock ? 10 : 0;
  return Math.min(base + stockBonus, 95);
}

// ====================================
// Claude Prompt v2.4 (완전 분리 구조)
// ====================================
function buildPrompt(searchQuery, newsData, stockData, uploadedFiles, additionalInfo, sentiment, topicType) {
  const newsText = newsData
    .slice(0, 20) // 20건으로 축소
    .map((n, i) => `[${i + 1}] ${n.title}\n${n.description}`)
    .join('\n\n');

  const stockSection = stockData
    ? `
# 📊 실시간 주가 데이터
현재가: ${stockData.currentPrice?.toLocaleString() || 'N/A'}원
목표가: ${stockData.targetPrice?.toLocaleString() || 'N/A'}원
PER: ${stockData.pe?.toFixed(1) || '-'}배
EPS: ${stockData.eps || '-'}
시총: ${stockData.marketCap ? (stockData.marketCap / 1e12).toFixed(2) + '조원' : '-'}
52주 최고: ${stockData.high52Week?.toLocaleString() || '-'}원
52주 최저: ${stockData.low52Week?.toLocaleString() || '-'}원
`
    : '';

  const baseRules = `
[출력 규칙]
- Markdown 형태 (##, ### 사용)
- 반복 문장 금지
- 4000 tokens 이하
- 뉴스 기반 작성
- 감성: ${sentiment} 반영
${additionalInfo ? `- 추가 요구사항: ${additionalInfo}` : ''}
`;

  // 경제 분석
  if (topicType === 'economy') {
    return `
당신은 거시경제 이코노미스트입니다. "${searchQuery}" 주제의 경제 리포트를 작성하세요.
${baseRules}

# 뉴스 데이터 (${newsData.length}건)
${newsText}

⚠️ 중요: SWOT 분석 금지, BUY/HOLD/SELL 금지, 목표주가 금지

## 1. 요약 (3-4문장, 산문체)

## 2. 핵심 경제 지표
- GDP 성장률:
- 물가상승률:
- 기준금리:

## 3. 현재 경제 상황
### 주요 동향
- 점 1
- 점 2

### 정책/이슈
- 점 1
- 점 2

### 향후 전망 (6-12개월)
- 점 1
- 점 2

## 4. 경제 리스크 요인
- 리스크 1
- 리스크 2
- 리스크 3

## 5. 전망 요약
경제 전망: 긍정적/중립적/부정적
전망 기간: 6-12개월
투자자 영향: [2-3문장]

## 6. 투자자 관점
[3-4문장]
`;
  }

  // 산업 분석
  if (topicType === 'sector') {
    return `
당신은 산업 애널리스트입니다. "${searchQuery}" 산업의 분석 리포트를 작성하세요.
${baseRules}

# 뉴스 데이터 (${newsData.length}건)
${newsText}

⚠️ 중요: SWOT 분석 금지, BUY/HOLD/SELL 금지, 목표주가 금지

## 1. 요약 (3-4문장, 산문체)

## 2. 핵심 산업 트렌드
- 트렌드 1
- 트렌드 2
- 트렌드 3

## 3. 산업 구조 및 성장 동력
### 시장 현황
- 점 1
- 점 2

### 주요 기업 동향
- 점 1
- 점 2

### 성장 동력
- 점 1
- 점 2

## 4. 산업 리스크
- 리스크 1
- 리스크 2
- 리스크 3

## 5. 산업 전망
산업 전망: 긍정적/중립적/부정적
전망 기간: 12개월
투자 매력도: [2-3문장]

## 6. 투자자 관점
[3-4문장]
`;
  }

  // 기업 분석
  const priceInfo = stockData?.currentPrice 
    ? `${stockData.currentPrice.toLocaleString()}원` 
    : '[뉴스 기반 추정]원';
  
  const targetInfo = stockData?.targetPrice 
    ? `${stockData.targetPrice.toLocaleString()}원` 
    : '[추정]원';

  return `
당신은 증권사 애널리스트입니다. "${searchQuery}" 기업의 투자 리포트를 작성하세요.
${baseRules}

${stockSection}

# 뉴스 데이터 (${newsData.length}건)
${newsText}

## 1. 요약 (3-4문장, 산문체)

## 2. 핵심 투자 포인트
- 포인트 1
- 포인트 2
- 포인트 3

## 3. SWOT 분석
### 강점 (Strengths)
- 강점 1
- 강점 2

### 약점 (Weaknesses)
- 약점 1
- 약점 2

### 기회 (Opportunities)
- 기회 1
- 기회 2

### 위협 (Threats)
- 위협 1
- 위협 2

## 4. 리스크 요인
- 리스크 1
- 리스크 2
- 리스크 3

## 5. 투자 의견
투자 등급: BUY/HOLD/SELL 중 선택
목표 주가: ${targetInfo}
현재 주가: ${priceInfo}
투자 기간: 12개월
투자 근거: [2-3문장으로 명확하게]

## 6. 투자자 관점
[3-4문장]
`;
}
