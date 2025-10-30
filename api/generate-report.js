// ====================================
// 백엔드 서버 (Vercel Serverless Function)
// 파일명: api/generate-report.js
// 네이버 뉴스 API + Yahoo Finance API + Claude AI
// ====================================

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchQuery, uploadedFiles, additionalInfo } = req.body;

    console.log('=== 검색 시작 ===');
    console.log('검색어:', searchQuery);

    // 1. 네이버 뉴스 검색
    const newsData = await searchNaverNews(searchQuery);
    console.log('수집된 뉴스:', newsData.length, '건');

    // 2. Yahoo Finance 데이터 (기업 분석 시)
    let stockData = null;
    const ticker = getKoreanStockTicker(searchQuery);
    if (ticker) {
      console.log('주가 데이터 조회:', ticker);
      stockData = await getYahooFinanceData(ticker);
    }

    // 3. 감성 분석
    const sentiment = analyzeSentiment(newsData);
    console.log('감성 분석 결과:', sentiment);

    // 4. 프롬프트 생성
    const prompt = buildPrompt(searchQuery, newsData, stockData, uploadedFiles, additionalInfo, sentiment);

    console.log('=== Claude API 호출 ===');

    // 5. Claude API 호출
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API 오류:', error);
      throw new Error(`Claude API 오류: ${response.status}`);
    }

    const data = await response.json();
    const reportContent = data.content[0].text;

    console.log('=== 리포트 생성 완료 ===');

    // 6. 응답 반환
    return res.status(200).json({
      success: true,
      report: reportContent,
      metadata: {
        newsCount: newsData.length,
        sentiment: sentiment,
        hasStockData: stockData !== null,
        stockTicker: ticker || null,
        timestamp: new Date().toISOString(),
        dataSource: `네이버 뉴스 ${newsData.length}건${stockData ? ' + Yahoo Finance 주가 데이터' : ''} + Claude AI 분석`,
        aiModel: 'Claude Sonnet 4',
        sources: newsData.slice(0, 10).map(n => ({
          title: n.title,
          pubDate: n.pubDate,
          link: n.link
        }))
      }
    });

  } catch (error) {
    console.error('오류 발생:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ====================================
// Yahoo Finance API
// ====================================
async function getYahooFinanceData(ticker) {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

  if (!RAPIDAPI_KEY) {
    console.log('RapidAPI 키 없음 - 주가 데이터 스킵');
    return null;
  }

  try {
    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes?ticker=${ticker}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
        }
      }
    );

    if (!response.ok) {
      console.error(`Yahoo Finance API 오류: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.body || data.body.length === 0) {
      console.log('주가 데이터 없음');
      return null;
    }

    const stock = data.body[0];

    return {
      currentPrice: stock.regularMarketPrice || null,
      targetPrice: stock.targetMeanPrice || null,
      high52Week: stock.fiftyTwoWeekHigh || null,
      low52Week: stock.fiftyTwoWeekLow || null,
      pe: stock.trailingPE || null,
      eps: stock.epsTrailingTwelveMonths || null,
      marketCap: stock.marketCap || null,
      volume: stock.regularMarketVolume || null,
      previousClose: stock.regularMarketPreviousClose || null,
      changePercent: stock.regularMarketChangePercent || null
    };
  } catch (error) {
    console.error('Yahoo Finance API 오류:', error);
    return null;
  }
}

// ====================================
// 한국 주식 티커 매핑
// ====================================
function getKoreanStockTicker(searchQuery) {
  const stockMap = {
    '삼성전자': '005930.KS',
    '삼성': '005930.KS',
    'SK하이닉스': '000660.KS',
    '하이닉스': '000660.KS',
    'NAVER': '035420.KS',
    '네이버': '035420.KS',
    '카카오': '035720.KS',
    '현대차': '005380.KS',
    '현대자동차': '005380.KS',
    'LG전자': '066570.KS',
    'LG화학': '051910.KS',
    '포스코': '005490.KS',
    '삼성바이오로직스': '207940.KS',
    '셀트리온': '068270.KS',
    '기아': '000270.KS',
    '신한지주': '055550.KS',
    'KB금융': '105560.KS',
    '하나금융지주': '086790.KS',
    '삼성물산': '028260.KS',
    '삼성SDI': '006400.KS',
    'LG': '003550.KS',
    'SK': '034730.KS',
    '현대모비스': '012330.KS',
    '기업은행': '024110.KS',
    '우리금융지주': '316140.KS'
  };

  for (const [keyword, ticker] of Object.entries(stockMap)) {
    if (searchQuery.includes(keyword)) {
      return ticker;
    }
  }

  return null;
}

// ====================================
// 네이버 뉴스 검색 함수
// ====================================
async function searchNaverNews(query) {
  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log('네이버 API 키 없음 - 더미 데이터 사용');
    return getDummyNews(query);
  }

  try {
    const allNews = [];
    const display = 100;
    const sort = 'date';

    const response = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`,
      {
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET
        }
      }
    );

    if (!response.ok) {
      throw new Error(`네이버 API 오류: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      data.items.forEach(item => {
        const pubDate = new Date(item.pubDate);
        if (pubDate >= threeDaysAgo) {
          allNews.push({
            title: removeHtmlTags(item.title),
            description: removeHtmlTags(item.description),
            link: item.link,
            pubDate: item.pubDate
          });
        }
      });
    }

    console.log(`최근 3일 뉴스: ${allNews.length}건`);
    return allNews;

  } catch (error) {
    console.error('네이버 API 오류:', error);
    return getDummyNews(query);
  }
}

// ====================================
// HTML 태그 제거
// ====================================
function removeHtmlTags(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// ====================================
// 감성 분석
// ====================================
function analyzeSentiment(newsData) {
  const positiveWords = ['상승', '호조', '증가', '개선', '성장', '긍정', '돌파', '확대', '강세'];
  const negativeWords = ['하락', '부진', '감소', '악화', '위축', '부정', '하락', '축소', '약세'];

  let positiveCount = 0;
  let negativeCount = 0;

  newsData.forEach(news => {
    const text = news.title + ' ' + news.description;
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
  });

  if (positiveCount > negativeCount * 1.5) return '긍정적';
  if (negativeCount > positiveCount * 1.5) return '부정적';
  return '중립적';
}

// ====================================
// 프롬프트 생성 - 주제별 완전 분리 + 주가 데이터 통합
// ====================================
function buildPrompt(searchQuery, newsData, stockData, uploadedFiles, additionalInfo, sentiment) {
  const newsText = newsData.slice(0, 50).map((news, i) => 
    `[${i + 1}] ${news.title}\n   ${news.description}\n   발행일: ${news.pubDate}`
  ).join('\n\n');

  // 주가 데이터 섹션
  let stockDataSection = '';
  if (stockData && stockData.currentPrice) {
    const upside = stockData.targetPrice && stockData.currentPrice 
      ? ((stockData.targetPrice - stockData.currentPrice) / stockData.currentPrice * 100).toFixed(1)
      : null;

    stockDataSection = `

# 실시간 주가 데이터 (Yahoo Finance)
현재가: ${stockData.currentPrice.toLocaleString()}원
${stockData.previousClose ? `이전 종가: ${stockData.previousClose.toLocaleString()}원` : ''}
${stockData.changePercent ? `등락률: ${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%` : ''}
${stockData.high52Week ? `52주 최고가: ${stockData.high52Week.toLocaleString()}원` : ''}
${stockData.low52Week ? `52주 최저가: ${stockData.low52Week.toLocaleString()}원` : ''}
${stockData.volume ? `거래량: ${stockData.volume.toLocaleString()}주` : ''}
${stockData.pe ? `PER: ${stockData.pe.toFixed(2)}배` : ''}
${stockData.eps ? `EPS: ${stockData.eps.toLocaleString()}원` : ''}
${stockData.marketCap ? `시가총액: ${(stockData.marketCap / 1000000000000).toFixed(2)}조원` : ''}
${stockData.targetPrice ? `애널리스트 평균 목표가: ${stockData.targetPrice.toLocaleString()}원 (상승여력: ${upside > 0 ? '+' : ''}${upside}%)` : ''}

**중요: 위 실시간 주가 데이터를 투자 의견에 반드시 반영하세요!**
`;
  }

  // 검색 주제 분석
  const isCompany = /전자|바이오|제약|은행|카드|보험|증권|통신|반도체|자동차|항공|해운|건설|화학|철강|식품|엔터/i.test(searchQuery);
  const isEconomy = /경제|금리|환율|경기|gdp|실업|물가|인플레이션|성장률|전망|예측|경상수지|무역|재정|통화정책/i.test(searchQuery);
  const isSector = /산업|시장|업종|섹터|트렌드/i.test(searchQuery);

  console.log('주제 타입:', isCompany ? 'company' : isEconomy ? 'economy' : isSector ? 'sector' : 'general');

  // ===== 1. 기업 분석 (주가 데이터 포함) =====
  if (isCompany) {
    return `당신은 전문 증권 애널리스트입니다. "${searchQuery}"에 대한 투자 리포트를 작성하세요.

# 최신 뉴스 (${newsData.length}건)
${newsText}
${stockDataSection}
# 시장 감성: ${sentiment}
${additionalInfo ? `\n# 추가 정보\n${additionalInfo}` : ''}

---

다음 구조로 작성하세요:

## 1. 요약
"${searchQuery}"의 현재 상황과 투자 관점을 3-5문장으로 작성하세요. (산문체)

## 2. 핵심 투자 포인트
- [포인트 1]
- [포인트 2]
- [포인트 3]
- [포인트 4]

## 3. SWOT 분석
### 강점
- [강점 1]
- [강점 2]
- [강점 3]

### 약점
- [약점 1]
- [약점 2]

### 기회
- [기회 1]
- [기회 2]
- [기회 3]

### 위협
- [위협 1]
- [위협 2]

## 4. 리스크 요인
- [리스크 1]
- [리스크 2]
- [리스크 3]
- [리스크 4]

## 5. 투자 의견
투자 등급: BUY / HOLD / SELL 중 명확히 선택
목표 주가: ${stockData?.targetPrice ? `${stockData.targetPrice.toLocaleString()}원 (Yahoo Finance 기준)` : '[뉴스 기반 추정]원'}
현재 주가: ${stockData?.currentPrice ? `${stockData.currentPrice.toLocaleString()}원` : '[뉴스 기반]원'}
투자 기간: 12개월
투자 근거: [1-2문장]

## 6. 투자자 관점
개인 투자자를 위한 조언을 3-4문장으로 작성하세요.

---
**중요:** 
- 위 뉴스 ${newsData.length}건을 반드시 분석
${stockData ? '- 실시간 주가 데이터를 투자 의견에 반영' : ''}
- "${searchQuery}"에만 집중`;
  }

  // ===== 2. 경제 전망 =====
  else if (isEconomy) {
    return `당신은 경제 전문 애널리스트입니다. "${searchQuery}"에 대한 경제 분석 리포트를 작성하세요.

# 최신 뉴스 (${newsData.length}건)
${newsText}

# 시장 감성: ${sentiment}
${additionalInfo ? `\n# 추가 정보\n${additionalInfo}` : ''}

---

다음 구조로 작성하세요:

## 1. 요약
"${searchQuery}"에 대한 현재 경제 상황과 전망을 3-5문장으로 작성하세요. (산문체)

## 2. 핵심 경제 지표
- [지표 1: 예: GDP 성장률]
- [지표 2: 예: 물가상승률]
- [지표 3: 예: 기준금리]
- [지표 4: 예: 실업률]

## 3. 경제 상황 분석
### 현재 경제 상황
- [현황 1]
- [현황 2]
- [현황 3]

### 주요 정책 및 이슈
- [정책/이슈 1]
- [정책/이슈 2]
- [정책/이슈 3]

### 향후 전망 (6-12개월)
- [전망 1]
- [전망 2]
- [전망 3]

## 4. 경제 리스크
- [리스크 1]
- [리스크 2]
- [리스크 3]
- [리스크 4]

## 5. 경제 전망 요약
전망: 긍정적 / 중립적 / 부정적
전망 기간: 6-12개월
투자자 영향: [경제 전망이 투자자에게 미치는 영향 2-3문장]

## 6. 투자자 관점
경제 전망에 따른 투자 전략을 3-4문장으로 작성하세요.

---
**중요:** 위 뉴스 ${newsData.length}건을 분석하고, "${searchQuery}"에만 집중하세요. 특정 기업 언급 금지.`;
  }

  // ===== 3. 산업/섹터 분석 =====
  else if (isSector) {
    return `당신은 산업 전문 애널리스트입니다. "${searchQuery}"에 대한 산업 분석 리포트를 작성하세요.

# 최신 뉴스 (${newsData.length}건)
${newsText}

# 시장 감성: ${sentiment}
${additionalInfo ? `\n# 추가 정보\n${additionalInfo}` : ''}

---

다음 구조로 작성하세요:

## 1. 요약
"${searchQuery}"의 현재 산업 상황과 트렌드를 3-5문장으로 작성하세요. (산문체)

## 2. 핵심 산업 트렌드
- [트렌드 1]
- [트렌드 2]
- [트렌드 3]
- [트렌드 4]

## 3. 산업 분석
### 현재 산업 현황
- [현황 1]
- [현황 2]
- [현황 3]

### 주요 기업 동향
- [기업/동향 1]
- [기업/동향 2]
- [기업/동향 3]

### 성장 동력
- [성장 동력 1]
- [성장 동력 2]
- [성장 동력 3]

## 4. 산업 리스크
- [리스크 1]
- [리스크 2]
- [리스크 3]
- [리스크 4]

## 5. 산업 전망
산업 전망: 긍정적 / 중립적 / 부정적
전망 기간: 12개월
투자 매력도: [산업 투자 매력도 2-3문장]

## 6. 투자자 관점
이 산업의 투자 기회와 주의사항을 3-4문장으로 작성하세요.

---
**중요:** 위 뉴스 ${newsData.length}건을 분석하고, "${searchQuery}"에만 집중하세요.`;
  }

  // ===== 기본 (일반) =====
  else {
    return `당신은 전문 애널리스트입니다. "${searchQuery}"에 대한 분석 리포트를 작성하세요.

# 최신 뉴스 (${newsData.length}건)
${newsText}

# 시장 감성: ${sentiment}
${additionalInfo ? `\n# 추가 정보\n${additionalInfo}` : ''}

---

위 뉴스를 바탕으로 "${searchQuery}"에 대한 전문적인 분석 리포트를 작성하세요.`;
  }
}

// ====================================
// 임시 데이터 (API 키 없을 때)
// ====================================
function getDummyNews(query) {
  return [
    {
      title: `${query} 관련 최신 동향 분석`,
      description: '최근 시장 상황을 종합적으로 분석한 결과입니다.',
      link: '#',
      pubDate: new Date().toISOString()
    },
    {
      title: `${query} 투자 전망`,
      description: '전문가들의 의견을 종합한 투자 전망입니다.',
      link: '#',
      pubDate: new Date().toISOString()
    }
  ];
}
