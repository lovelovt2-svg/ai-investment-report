// ====================================
// 최종 완성 백엔드
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

    // 1. 주제 타입 판별 (최우선!)
    const topicType = determineTopicType(searchQuery);
    console.log('📊 주제 타입:', topicType);

    // 2. 네이버 뉴스 (20건만 - 속도 개선)
    const newsData = await searchNaverNews(searchQuery, 20);
    console.log('📰 뉴스:', newsData.length, '건');

    // 3. Yahoo Finance (기업만)
    let stockData = null;
    if (topicType === 'company') {
      const ticker = getKoreanStockTicker(searchQuery);
      if (ticker) {
        stockData = await getYahooFinanceData(ticker);
        console.log('📈 주가:', stockData ? '성공' : '실패');
      }
    }

    // 4. 감성 분석
    const sentiment = analyzeSentiment(newsData);

    // 5. 프롬프트 생성 (주제별 완전 분리)
    const prompt = buildStrictPrompt(searchQuery, newsData, stockData, topicType, sentiment, additionalInfo);

    console.log('🤖 Claude 호출 시작');

    // 6. Claude API (max_tokens 축소 - 속도 개선)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000, // 8000 → 4000 (속도 2배)
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) throw new Error(`Claude API 오류: ${response.status}`);

    const data = await response.json();
    const reportContent = data.content[0].text;

    console.log('✅ 리포트 완성');

    // 7. 응답 (메타데이터 포함)
    return res.status(200).json({
      success: true,
      report: reportContent,
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

// ====================================
// 주제 타입 판별 (정확도 강화)
// ====================================
function determineTopicType(query) {
  const q = query.toLowerCase();

  // 경제 키워드 (최우선)
  const economyWords = ['경제', '금리', '환율', 'gdp', '물가', '인플레', '성장률', '경기', '실업', '통화', '재정', '세계경제', '경제전망', '경제성장'];
  
  // 산업 키워드
  const sectorWords = ['산업', '업종', '섹터', '시장', '업계'];
  
  // 기업 키워드
  const companyWords = ['전자', '바이오', '제약', '은행', '카드', '반도체', '자동차', '화학', '철강', '식품', '삼성', 'lg', 'sk', '현대', '네이버', '카카오', '셀트리온', '포스코'];

  // 경제 체크
  for (const word of economyWords) {
    if (q.includes(word)) {
      // 기업명이 함께 있으면 기업으로
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
// 엄격한 프롬프트 (주제별 완전 분리)
// ====================================
function buildStrictPrompt(query, news, stock, type, sentiment, additional) {
  const newsText = news.map((n, i) => `[${i+1}] ${n.title}\n${n.description}`).join('\n\n');

  // 주가 데이터
  let stockSection = '';
  if (stock && type === 'company') {
    stockSection = `\n# 📊 실시간 주가 데이터\n현재가: ${stock.currentPrice?.toLocaleString() || 'N/A'}원\n${stock.targetPrice ? `목표가: ${stock.targetPrice.toLocaleString()}원\n` : ''}${stock.pe ? `PER: ${stock.pe.toFixed(1)}배\n` : ''}${stock.marketCap ? `시총: ${(stock.marketCap/1e12).toFixed(1)}조원\n` : ''}`;
  }

  const commonHeader = `# 뉴스 (${news.length}건)\n${newsText}${stockSection}\n감성: ${sentiment}\n${additional ? `\n추가정보: ${additional}\n` : ''}`;

  // === 경제 분석 ===
  if (type === 'economy') {
    return `당신은 경제 전문가입니다. "${query}"를 분석하세요.

${commonHeader}

⚠️ 절대 규칙:
1. SWOT 분석 금지
2. BUY/HOLD/SELL 금지
3. 목표주가 금지
4. 특정 기업 최소화

## 1. 요약 (3-4문장, 산문체)

## 2. 핵심 경제 지표
- GDP 성장률: [%]
- 물가상승률: [%]
- 기준금리: [%]
- 기타 지표

## 3. 경제 상황 분석
### 현재 상황
- 점 1
- 점 2

### 주요 정책
- 점 1
- 점 2

### 향후 전망 (6-12개월)
- 점 1
- 점 2

## 4. 경제 리스크
- 리스크 1
- 리스크 2
- 리스크 3

## 5. 경제 전망 요약
경제 전망: 긍정적/중립적/부정적
전망 기간: 6-12개월
투자자 영향: [2-3문장]

## 6. 투자자 관점
[3문장]`;
  }

  // === 산업 분석 ===
  else if (type === 'sector') {
    return `당신은 산업 전문가입니다. "${query}"를 분석하세요.

${commonHeader}

⚠️ 절대 규칙:
1. SWOT 분석 금지
2. BUY/HOLD/SELL 금지
3. 목표주가 금지
4. 산업 전체 관점 유지

## 1. 요약 (3-4문장, 산문체)

## 2. 핵심 트렌드
- 트렌드 1
- 트렌드 2
- 트렌드 3

## 3. 산업 분석
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
[3문장]`;
  }

  // === 기업 분석 ===
  else {
    return `당신은 증권 애널리스트입니다. "${query}"를 분석하세요.

${commonHeader}

## 1. 요약 (3-4문장, 산문체)

## 2. 핵심 포인트
- 포인트 1
- 포인트 2
- 포인트 3

## 3. SWOT 분석
### 강점
- 점 1
- 점 2

### 약점
- 점 1
- 점 2

### 기회
- 점 1
- 점 2

### 위협
- 점 1
- 점 2

## 4. 리스크 요인
- 리스크 1
- 리스크 2
- 리스크 3

## 5. 투자 의견
투자 등급: BUY/HOLD/SELL
목표 주가: ${stock?.targetPrice ? stock.targetPrice.toLocaleString() + '원' : '[추정]원'}
현재 주가: ${stock?.currentPrice ? stock.currentPrice.toLocaleString() + '원' : '[추정]원'}
투자 기간: 12개월
근거: [2문장]

## 6. 투자자 관점
[3문장]`;
  }
}

// ====================================
// Yahoo Finance (응답 구조 보정)
// ====================================
async function getYahooFinanceData(ticker) {
  if (!process.env.RAPIDAPI_KEY) return null;

  try {
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
    
    // 응답 구조 보정 (중요!)
    const stock = data.body?.[0] || data.body?.quote || data.body || null;
    if (!stock) return null;

    return {
      currentPrice: stock.regularMarketPrice || stock.price || null,
      targetPrice: stock.targetMeanPrice || null,
      pe: stock.trailingPE || stock.pe || null,
      marketCap: stock.marketCap || null,
      volume: stock.regularMarketVolume || stock.volume || null
    };
  } catch (error) {
    console.error('Yahoo Finance 오류:', error.message);
    return null;
  }
}

// ====================================
// 티커 매핑
// ====================================
function getKoreanStockTicker(query) {
  const map = {
    '삼성전자': '005930.KS', '삼성': '005930.KS',
    'SK하이닉스': '000660.KS', '하이닉스': '000660.KS',
    '네이버': '035420.KS', 'NAVER': '035420.KS',
    '카카오': '035720.KS',
    '현대차': '005380.KS', '현대자동차': '005380.KS',
    'LG전자': '066570.KS', 'LG화학': '051910.KS',
    '포스코': '005490.KS',
    '삼성바이오': '207940.KS',
    '셀트리온': '068270.KS',
    '기아': '000270.KS'
  };

  for (const [key, val] of Object.entries(map)) {
    if (query.includes(key)) return val;
  }
  return null;
}

// ====================================
// 네이버 뉴스
// ====================================
async function searchNaverNews(query, max = 20) {
  const ID = process.env.NAVER_CLIENT_ID;
  const SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!ID || !SECRET) return getDummyNews(query);

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${max}&sort=date`,
      { headers: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET } }
    );

    if (!res.ok) throw new Error(`네이버 API: ${res.status}`);

    const data = await res.json();
    const threeDaysAgo = new Date(Date.now() - 3*24*60*60*1000);

    return (data.items || [])
      .filter(item => new Date(item.pubDate) >= threeDaysAgo)
      .map(item => ({
        title: clean(item.title),
        description: clean(item.description),
        pubDate: item.pubDate
      }))
      .slice(0, max);
  } catch (error) {
    console.error('네이버 API 오류:', error);
    return getDummyNews(query);
  }
}

function clean(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function getDummyNews(query) {
  return [{ title: `${query} 관련 뉴스`, description: '분석 자료', pubDate: new Date().toISOString() }];
}

// ====================================
// 감성 분석
// ====================================
function analyzeSentiment(news) {
  const pos = ['상승', '호조', '증가', '개선', '성장', '긍정'];
  const neg = ['하락', '부진', '감소', '악화', '위축', '부정'];
  
  let p = 0, n = 0;
  news.forEach(item => {
    const text = item.title + item.description;
    pos.forEach(w => { if (text.includes(w)) p++; });
    neg.forEach(w => { if (text.includes(w)) n++; });
  });
  
  if (p > n * 1.5) return '긍정적';
  if (n > p * 1.5) return '부정적';
  return '중립적';
}

// ====================================
// 품질 계산 (동적)
// ====================================
function calculateQuality(newsCount, hasStock) {
  const base = Math.min(newsCount * 4, 80);
  const stockBonus = hasStock ? 10 : 0;
  return Math.min(base + stockBonus, 95);
}
