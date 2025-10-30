// ====================================
// AI 투자 분석 플랫폼 v3.0 (완전 개선)
// 정확한 주제 판별 + 타입별 맞춤 분석 + 속도 최적화
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

    // 1️⃣ 주제 타입 정확히 판별 (개선된 로직)
    const topicType = determineTopicTypeAccurate(searchQuery);
    console.log('📊 판별된 주제 타입:', topicType);

    // 2️⃣ 뉴스 수집 (15건으로 최적화 - 속도 개선)
    const newsData = await searchNaverNews(searchQuery, 15);
    console.log(`📰 수집된 뉴스: ${newsData.length}건`);

    // 3️⃣ 주가 데이터 (기업일 경우만)
    let stockData = null;
    let ticker = null;
    
    if (topicType === 'company') {
      ticker = getKoreanStockTicker(searchQuery);
      if (ticker) {
        try {
          stockData = await getYahooFinanceData(ticker);
          console.log('📈 주가 데이터:', stockData ? '✅ 수집 완료' : '⚠️ 데이터 없음');
        } catch (error) {
          console.log('⚠️ 주가 조회 실패, 뉴스로만 진행');
        }
      }
    }

    // 4️⃣ 감성 분석 (타입별로 다르게)
    const sentiment = analyzeSentimentByType(newsData, topicType);

    // 5️⃣ 데이터 품질 계산 (타입별 가중치 적용)
    const dataQuality = calculateQualityByType(newsData.length, !!stockData, topicType);

    // 6️⃣ Claude 프롬프트 구성 (v3.0 - 완전 타입별 분리)
    const prompt = buildPromptV3(searchQuery, newsData, stockData, uploadedFiles, additionalInfo, sentiment, topicType);

    console.log('🧠 Claude 요청 시작 (타입:', topicType, ')');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3500, // 속도 최적화
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API 오류: ${response.statusText}`);

    const data = await response.json();
    const reportContent = data.content?.[0]?.text || '리포트 생성 실패';

    console.log('✅ Claude 응답 완료');

    // 7️⃣ 타입별 메타데이터 생성
    const metadata = generateMetadataByType(topicType, newsData, stockData, ticker, sentiment, dataQuality);

    return res.status(200).json({
      success: true,
      report: reportContent,
      topicType: topicType, // 프론트엔드에서 사용할 수 있도록 전달
      metadata: metadata,
    });
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ====================================
// 개선된 주제 타입 판별 (정확도 대폭 향상)
// ====================================
function determineTopicTypeAccurate(query) {
  const q = query.toLowerCase();
  
  // 1. 명확한 경제 지표 키워드 (최우선)
  const economyIndicators = [
    '금리', '기준금리', '환율', 'gdp', '물가', '인플레', '인플레이션', 
    '경상수지', '무역수지', '실업률', '고용', '통화정책', '재정정책',
    '경제성장', '경제지표', '경기침체', '불황', '호황', '연준', 'fomc',
    '양적완화', '테이퍼링', '한국은행', '기재부', '재정', '국가채무'
  ];
  
  // 2. 산업/섹터 키워드
  const sectorKeywords = [
    '업종', '섹터', '산업', '시장', '업계', '분야', 
    '반도체 산업', '자동차 산업', '바이오 산업', '제약 산업',
    '금융 섹터', '테크 섹터', '헬스케어 섹터', '산업 동향',
    '시장 전망', '업종 분석', '섹터 분석'
  ];
  
  // 3. 기업명 (확장)
  const companyNames = [
    // 대기업
    '삼성전자', '삼성', 'SK하이닉스', '하이닉스', 'LG전자', 'LG화학', 'LG에너지',
    '현대차', '현대자동차', '기아', '현대모비스', '포스코', 'POSCO',
    '네이버', 'NAVER', '카카오', 'kakao', '쿠팡', 'coupang',
    'KB금융', '신한금융', '하나금융', '우리금융', '삼성생명', '한화',
    '롯데', '신세계', 'CJ', 'GS', '두산', '한진', '대한항공',
    // 중견기업
    '셀트리온', '삼성바이오', '카카오뱅크', '카카오페이', '토스',
    'SK바이오', 'SK이노베이션', 'LG이노텍', '삼성SDI', '엔씨소프트',
    '넷마블', '크래프톤', '펄어비스', '현대건설', '대우건설'
  ];
  
  // 4. 혼합 케이스 처리
  let hasEconomy = false;
  let hasSector = false;
  let hasCompany = false;
  
  // 경제 체크
  for (const word of economyIndicators) {
    if (q.includes(word)) {
      hasEconomy = true;
      break;
    }
  }
  
  // 섹터 체크
  for (const word of sectorKeywords) {
    if (q.includes(word)) {
      hasSector = true;
      break;
    }
  }
  
  // 기업 체크
  for (const company of companyNames) {
    if (q.includes(company.toLowerCase())) {
      hasCompany = true;
      break;
    }
  }
  
  // 우선순위 판별
  // 1. 경제 + 기업 = 기업 (예: "삼성전자 환율 영향")
  if (hasEconomy && hasCompany) return 'company';
  
  // 2. 섹터 + 기업 = 기업 (예: "삼성전자 반도체 섹터")
  if (hasSector && hasCompany) return 'company';
  
  // 3. 경제만 = 경제
  if (hasEconomy && !hasCompany) return 'economy';
  
  // 4. 섹터만 = 섹터
  if (hasSector && !hasCompany) return 'sector';
  
  // 5. 기업만 = 기업
  if (hasCompany) return 'company';
  
  // 6. 추가 패턴 분석
  // 트렌드, 전망 키워드
  if (/전망|동향|흐름|추세|트렌드|분석/.test(q)) {
    if (/경제|거시|매크로/.test(q)) return 'economy';
    if (/산업|업종|섹터|시장/.test(q)) return 'sector';
  }
  
  // 7. 기본값: 검색어 길이로 추측
  if (q.length < 10) return 'company'; // 짧으면 기업명일 확률 높음
  return 'sector'; // 긴 문장은 산업 분석일 확률
}

// ====================================
// 타입별 감성 분석
// ====================================
function analyzeSentimentByType(newsData, topicType) {
  const posWords = {
    company: ['상승', '호조', '성장', '개선', '확대', '긍정', '증가', '신고가', '흑자'],
    sector: ['성장', '확대', '호황', '활성화', '유망', '주목', '부상', '발전'],
    economy: ['회복', '성장', '안정', '개선', '확대', '상승', '호전', '증가']
  };
  
  const negWords = {
    company: ['하락', '부진', '감소', '약세', '위축', '부정', '악화', '적자', '우려'],
    sector: ['위축', '부진', '침체', '하락', '위기', '어려움', '불황', '감소'],
    economy: ['침체', '불황', '위기', '하락', '악화', '불안', '위축', '감소']
  };
  
  const pos = posWords[topicType] || posWords.company;
  const neg = negWords[topicType] || negWords.company;
  
  let p = 0, n = 0;
  newsData.forEach(news => {
    const txt = (news.title + news.description).toLowerCase();
    pos.forEach(w => { if (txt.includes(w)) p++; });
    neg.forEach(w => { if (txt.includes(w)) n++; });
  });
  
  if (p > n * 1.5) return '긍정적';
  if (n > p * 1.5) return '부정적';
  return '중립적';
}

// ====================================
// 타입별 데이터 품질 계산
// ====================================
function calculateQualityByType(newsCount, hasStock, topicType) {
  let base = 0;
  
  if (topicType === 'company') {
    base = Math.min(newsCount * 5, 70); // 기업은 뉴스가 중요
    const stockBonus = hasStock ? 20 : 0; // 주가 데이터 보너스
    return Math.min(base + stockBonus, 95);
  } else if (topicType === 'sector') {
    base = Math.min(newsCount * 4, 80); // 섹터는 뉴스 다양성 중요
    return Math.min(base + 5, 90);
  } else { // economy
    base = Math.min(newsCount * 3, 75); // 경제는 신뢰성 중요
    return Math.min(base + 10, 85);
  }
}

// ====================================
// 타입별 메타데이터 생성
// ====================================
function generateMetadataByType(topicType, newsData, stockData, ticker, sentiment, dataQuality) {
  const baseMetadata = {
    timestamp: new Date().toISOString(),
    topicType: topicType,
    newsCount: newsData.length,
    sentiment: sentiment,
    dataQuality: dataQuality,
    sources: newsData.slice(0, 10).map(n => ({
      title: n.title,
      url: n.link,
      date: n.pubDate,
    })),
    aiModel: 'Claude Sonnet 4',
  };
  
  // 기업일 경우 주가 데이터 추가
  if (topicType === 'company') {
    return {
      ...baseMetadata,
      hasStockData: !!stockData,
      stockData: stockData,
      stockTicker: ticker,
      dataSource: `네이버 뉴스 + ${stockData ? 'Yahoo Finance' : '뉴스 분석'}`,
    };
  }
  
  // 섹터/경제는 주가 데이터 없음
  return {
    ...baseMetadata,
    hasStockData: false,
    stockData: null,
    stockTicker: null,
    dataSource: '네이버 뉴스 + AI 분석',
  };
}

// ====================================
// 네이버 뉴스 API (변경 없음)
// ====================================
async function searchNaverNews(query, maxResults = 15) {
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
// Yahoo Finance API (개선)
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
        timeout: 3000 // 타임아웃 단축
      }
    );

    if (!res.ok) {
      console.log('⚠️ Yahoo Finance 실패:', res.status);
      return null;
    }

    const data = await res.json();
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
      dividendYield: stock.dividendYield || null,
      beta: stock.beta || null,
    };
  } catch (e) {
    console.error('Yahoo Finance 오류:', e.message);
    return null;
  }
}

// ====================================
// 한국 주식 티커 맵핑 (확장)
// ====================================
function getKoreanStockTicker(q) {
  const map = {
    '삼성전자': '005930.KS', '삼성': '005930.KS',
    'SK하이닉스': '000660.KS', '하이닉스': '000660.KS',
    'LG화학': '051910.KS', 'LG전자': '066570.KS', 'LG에너지': '373220.KS',
    '카카오': '035720.KS', 'NAVER': '035420.KS', '네이버': '035420.KS',
    '현대차': '005380.KS', '현대자동차': '005380.KS', '기아': '000270.KS',
    'KB금융': '105560.KS', '신한금융': '055550.KS', '하나금융': '086790.KS',
    '셀트리온': '068270.KS', '삼성바이오': '207940.KS',
    '포스코': '005490.KS', 'POSCO': '005490.KS',
    '현대모비스': '012330.KS', '삼성SDI': '006400.KS',
    '카카오뱅크': '323410.KS', '카카오페이': '377300.KS',
  };
  
  const qLower = q.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (qLower.includes(k.toLowerCase())) return v;
  }
  return null;
}

// 헬퍼 함수들
function removeHtml(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function getDummyNews(query) {
  return [
    { title: `${query} 최신 동향 분석`, description: '최근 시장 상황과 주요 이슈 정리', link: '#', pubDate: new Date().toISOString() },
    { title: `${query} 전문가 전망`, description: '애널리스트 의견 종합', link: '#', pubDate: new Date().toISOString() },
  ];
}

// ====================================
// Claude Prompt v3.0 (완전 타입별 분리)
// ====================================
function buildPromptV3(searchQuery, newsData, stockData, uploadedFiles, additionalInfo, sentiment, topicType) {
  const newsText = newsData
    .slice(0, 15)
    .map((n, i) => `[${i + 1}] ${n.title}\n${n.description}`)
    .join('\n\n');

  const baseRules = `
[핵심 규칙]
- 한국어로 작성
- Markdown 형식 (##, ###)
- 3500 tokens 이하
- 반복 금지
- 뉴스 기반 분석
- 현재 감성: ${sentiment}
${additionalInfo ? `- 추가 요구: ${additionalInfo}` : ''}
`;

  // ====== 기업 분석 프롬프트 ======
  if (topicType === 'company') {
    const stockInfo = stockData ? `
# 📊 실시간 주가 데이터
현재가: ${stockData.currentPrice?.toLocaleString() || 'N/A'}원
목표가: ${stockData.targetPrice?.toLocaleString() || 'N/A'}원
52주 최고: ${stockData.high52Week?.toLocaleString() || 'N/A'}원
52주 최저: ${stockData.low52Week?.toLocaleString() || 'N/A'}원
PER: ${stockData.pe?.toFixed(1) || 'N/A'}배
EPS: ${stockData.eps?.toFixed(0) || 'N/A'}원
시가총액: ${stockData.marketCap ? (stockData.marketCap / 1e12).toFixed(2) + '조원' : 'N/A'}
거래량: ${stockData.volume?.toLocaleString() || 'N/A'}
전일 종가 대비: ${stockData.changePercent?.toFixed(2) || 'N/A'}%
` : '';

    return `
당신은 한국 증권사 수석 애널리스트입니다. "${searchQuery}" 기업 투자 리포트를 작성하세요.
${baseRules}

${stockInfo}

# 뉴스 데이터 (${newsData.length}건)
${newsText}

[작성 형식]

## 1. 요약
[3-4문장 핵심 요약, 산문체로 작성]

## 2. 핵심 투자 포인트
- [구체적 투자 포인트 1]
- [구체적 투자 포인트 2]
- [구체적 투자 포인트 3]

## 3. SWOT 분석
### 강점 (Strengths)
- [실제 강점 1]
- [실제 강점 2]

### 약점 (Weaknesses)
- [실제 약점 1]
- [실제 약점 2]

### 기회 (Opportunities)
- [실제 기회 1]
- [실제 기회 2]

### 위협 (Threats)
- [실제 위협 1]
- [실제 위협 2]

## 4. 리스크 요인
- [구체적 리스크 1]
- [구체적 리스크 2]
- [구체적 리스크 3]

## 5. 투자 의견
투자 등급: [BUY/HOLD/SELL 중 하나만]
목표 주가: ${stockData?.targetPrice ? stockData.targetPrice.toLocaleString() + '원' : '[뉴스 기반 추정]원'}
현재 주가: ${stockData?.currentPrice ? stockData.currentPrice.toLocaleString() + '원' : '[최근 시세]원'}
투자 기간: 12개월
투자 근거: [2-3문장 명확한 근거]

## 6. 투자자 관점
[이 기업에 대한 투자 전략과 주의사항 3-4문장]
`;
  }

  // ====== 경제 분석 프롬프트 ======
  if (topicType === 'economy') {
    return `
당신은 거시경제 전문 이코노미스트입니다. "${searchQuery}" 경제 분석 리포트를 작성하세요.
${baseRules}

# 뉴스 데이터 (${newsData.length}건)
${newsText}

[작성 형식]

## 1. 요약
[경제 상황 핵심 요약 3-4문장, 산문체]

## 2. 핵심 경제 지표
- GDP 성장률: [예상치 또는 현재치]
- 물가상승률: [예상치 또는 현재치]
- 기준금리: [현재 및 전망]
- 환율: [현재 수준 및 전망]
- 실업률: [현재 및 전망]

## 3. 현재 경제 상황
### 주요 동향
- [경제 동향 1]
- [경제 동향 2]

### 정책 이슈
- [정책 이슈 1]
- [정책 이슈 2]

### 글로벌 영향
- [글로벌 요인 1]
- [글로벌 요인 2]

## 4. 경제 리스크 요인
- [경제 리스크 1]
- [경제 리스크 2]
- [경제 리스크 3]

## 5. 경제 전망
경제 전망: [긍정적/중립적/부정적]
전망 기간: 6-12개월
성장률 전망: [구체적 수치 또는 범위]
주요 변수: [2-3가지 핵심 변수]

## 6. 투자자 시사점
[경제 상황이 투자에 미치는 영향과 전략 3-4문장]
`;
  }

  // ====== 산업/섹터 분석 프롬프트 ======
  if (topicType === 'sector') {
    return `
당신은 산업 분석 전문가입니다. "${searchQuery}" 산업/섹터 분석 리포트를 작성하세요.
${baseRules}

# 뉴스 데이터 (${newsData.length}건)
${newsText}

[작성 형식]

## 1. 요약
[산업 현황 핵심 요약 3-4문장, 산문체]

## 2. 핵심 산업 트렌드
- [주요 트렌드 1]
- [주요 트렌드 2]
- [주요 트렌드 3]

## 3. 산업 구조 및 현황
### 시장 규모 및 성장성
- [시장 규모 현황]
- [성장률 및 전망]

### 주요 기업 동향
- [선도 기업 동향]
- [경쟁 구도 변화]

### 기술/규제 변화
- [기술 혁신 동향]
- [규제 환경 변화]

## 4. 산업 리스크
- [산업 리스크 1]
- [산업 리스크 2]
- [산업 리스크 3]

## 5. 산업 전망
산업 전망: [긍정적/중립적/부정적]
전망 기간: 12개월
성장률 전망: [구체적 수치 또는 범위]
투자 매력도: [높음/중간/낮음]
투자 포인트: [2-3문장 핵심 포인트]

## 6. 투자 전략
[이 산업 투자 시 고려사항과 전략 3-4문장]
`;
  }

  // 기본값 (fallback)
  return buildPromptV3(searchQuery, newsData, stockData, uploadedFiles, additionalInfo, sentiment, 'company');
}
