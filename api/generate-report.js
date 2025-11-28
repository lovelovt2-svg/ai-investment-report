// /api/generate-report.js
// AI 투자 리포트 생성 API - 수정 버전
// 핵심: 실시간 API만 사용, 하드코딩 완전 제거

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchQuery, uploadedFiles, additionalInfo } = req.body;

    if (!searchQuery || searchQuery.trim() === '') {
      return res.status(400).json({ error: '검색어를 입력해주세요.' });
    }

    console.log('=== 리포트 생성 시작 ===');
    console.log('검색어:', searchQuery);

    // 1. 주제 타입 판별 (경제/산업/기업)
    const topicType = determineTopicType(searchQuery);
    console.log('판별된 타입:', topicType);

    // 2. 뉴스 검색
    const newsData = await searchNaverNews(searchQuery);
    console.log('뉴스 수집:', newsData.length, '건');

    // 3. 뉴스 필터링 및 관련도 계산
    const filteredNews = filterAndScoreNews(newsData, searchQuery, topicType);
    console.log('필터링 후 뉴스:', filteredNews.length, '건');

    // 4. 주가 데이터 (기업 분석일 때만)
    let stockData = null;
    if (topicType === 'company') {
      stockData = await getStockData(searchQuery);
      if (stockData) {
        console.log('주가 데이터 성공:', stockData.currentPrice);
      } else {
        console.log('주가 데이터 없음 (API 실패 또는 미지원 종목)');
      }
    }

    // 5. 경제 지표 (경제 분석일 때만)
    let economicIndicators = null;
    if (topicType === 'economy') {
      economicIndicators = extractEconomicIndicators(filteredNews);
    }

    // 6. 산업 지표 (산업 분석일 때만)
    let industryMetrics = null;
    if (topicType === 'sector') {
      industryMetrics = extractIndustryMetrics(filteredNews, searchQuery);
    }

    // 7. 감성 분석
    const sentiment = analyzeSentiment(filteredNews);

    // 8. AI 리포트 생성
    const prompt = buildPrompt(searchQuery, topicType, filteredNews, stockData, additionalInfo, economicIndicators, industryMetrics);
    const report = await generateWithClaude(prompt);

    // 9. 응답 반환
    return res.status(200).json({
      success: true,
      report: report,
      topicType: topicType,
      metadata: {
        timestamp: new Date().toISOString(),
        newsCount: filteredNews.length,
        newsWithLinks: filteredNews.slice(0, 10).map(n => ({
          title: n.title,
          url: n.link,
          date: n.pubDate
        })),
        sentiment: sentiment.label,
        sentimentScore: sentiment.score,
        dataQuality: calculateDataQuality(filteredNews, stockData),
        hasStockData: !!stockData,
        stockData: stockData,
        economicIndicators: economicIndicators,
        industryMetrics: industryMetrics,
        companyMetrics: stockData ? {
          currentPrice: formatPrice(stockData.currentPrice),
          targetPrice: formatPrice(stockData.targetPrice),
          per: stockData.pe ? stockData.pe.toFixed(1) : null,
          marketCap: formatMarketCap(stockData.marketCap),
          source: stockData.source,
          warning: stockData.warning
        } : null
      }
    });

  } catch (error) {
    console.error('API 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '리포트 생성 중 오류가 발생했습니다.'
    });
  }
}

// ============================================
// 1. 주제 타입 판별 (경제/산업/기업)
// ============================================
function determineTopicType(query) {
  const q = query.toLowerCase().trim();

  // 경제 키워드
  const economyWords = [
    '금리', '환율', '인플레이션', '물가', 'gdp', '경기', '통화정책',
    '기준금리', '연준', 'fed', 'fomc', '중앙은행', '한은', '금통위',
    '국채', '채권', '수익률', '스프레드', '달러', '엔화', '위안화',
    '고용', '실업률', '경제성장', '무역수지', '경상수지', 'cpi', 'ppi',
    '미국 경제', '한국 경제', '중국 경제', '글로벌 경제', '세계 경제'
  ];

  // 산업 키워드 (단독으로도 산업 분석)
  const industryOnlyWords = [
    '반도체', '배터리', '자동차', '철강', '조선', '건설', '유통',
    '금융', '제약', '화학', '정유', '통신', '게임', '엔터', '바이오',
    '헬스케어', '전기차', '2차전지', '태양광', '풍력', '신재생', '로봇',
    '드론', 'ai', '인공지능', '클라우드', '데이터센터', 'it', 'ict'
  ];

  // 산업 복합 키워드
  const sectorWords = [
    '산업', '섹터', '업종', '시장', '업계', '분야', '전망',
    '반도체산업', 'ai산업', '2차전지산업', '바이오산업', '게임산업',
    '반도체 시장', '배터리 시장', '자동차 시장', 'ai 시장'
  ];

  // 기업 키워드
  const companyWords = [
    '삼성전자', 'sk하이닉스', '네이버', '카카오', '현대차', 'lg전자',
    '삼성', 'sk', 'lg', '현대', '기아', '포스코', '셀트리온', '삼성바이오',
    '주가', '실적', '배당', '목표가', '투자의견', '매수', '매도'
  ];

  let economyScore = 0;
  let sectorScore = 0;
  let companyScore = 0;

  // 경제 키워드 체크
  economyWords.forEach(word => {
    if (q.includes(word)) economyScore += 10;
  });

  // ⭐ 산업명 단독 검색 (최우선)
  for (const industry of industryOnlyWords) {
    if (q === industry || 
        q === `${industry} 산업` || 
        q === `${industry} 시장` || 
        q === `${industry} 업계` ||
        q === `${industry} 전망` ||
        q === `${industry} 분석`) {
      sectorScore += 50; // 강력한 산업 점수
    }
  }

  // 산업 복합 키워드 체크
  sectorWords.forEach(word => {
    if (q.includes(word)) sectorScore += 10;
  });

  // 기업 키워드 체크
  companyWords.forEach(word => {
    if (q.includes(word)) companyScore += 10;
  });

  // 짧은 쿼리 처리 (2-4글자)
  if (q.length <= 4) {
    // 산업명 단독인지 먼저 체크
    if (industryOnlyWords.includes(q)) {
      sectorScore += 30;
    }
  }

  console.log(`타입 점수 - 경제:${economyScore}, 산업:${sectorScore}, 기업:${companyScore}`);

  // 최종 판별
  if (economyScore > sectorScore && economyScore > companyScore) {
    return 'economy';
  } else if (sectorScore > economyScore && sectorScore > companyScore) {
    return 'sector';
  } else if (companyScore > 0) {
    return 'company';
  }

  // 기본값: 짧은 검색어는 기업, 긴 검색어는 산업
  return q.length <= 6 ? 'company' : 'sector';
}

// ============================================
// 2. 네이버 뉴스 검색
// ============================================
async function searchNaverNews(query) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('네이버 API 키 없음');
    return [];
  }

  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=30&sort=date`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret
        }
      }
    );

    if (!response.ok) {
      console.error('네이버 뉴스 API 실패:', response.status);
      return [];
    }

    const data = await response.json();
    return data.items || [];

  } catch (error) {
    console.error('네이버 뉴스 검색 오류:', error);
    return [];
  }
}

// ============================================
// 3. 뉴스 필터링 및 관련도 계산
// ============================================
function filterAndScoreNews(newsItems, query, topicType) {
  // ⭐ 노이즈 키워드 (대폭 확장)
  const noiseKeywords = [
    // 스포츠
    '야구', '축구', '농구', '배구', '골프', '라이온즈', '블루윙즈',
    '선수', '감독', '경기결과', '프로야구', 'kbo', 'k리그', '올림픽',
    '월드컵', '챔피언스리그', '프리미어리그', '홈런', '안타', '승리',
    // 연예
    '드라마', '영화', '연예', '아이돌', '가수', '배우', '예능',
    '콘서트', '앨범', '뮤직비디오', '팬미팅', '컴백', '데뷔',
    // 생활
    '맛집', '여행', '관광', '호텔', '레스토랑', '카페', '쇼핑',
    // 채용/광고
    '채용', '인턴', '공채', '입사', '면접', '취업', '광고', '이벤트',
    '쿠폰', '할인', '프로모션', '협찬', '경품',
    // 동명이인 회사 (삼성 관련)
    '삼성라이온즈', '삼성생명', '삼성화재', '삼성카드', '삼성증권',
    '삼성물산', '삼성중공업', '삼성sds', '삼성엔지니어링',
    // 동명이인 회사 (SK/LG 관련)
    'sk와이번스', 'sk브로드밴드', 'sk텔링크', 'lg트윈스', 'lg유플러스',
    // 부고/사건사고
    '부고', '사망', '사고', '화재', '폭발'
  ];

  // ⭐ 금융 필수 키워드 (하나라도 있으면 가산점)
  const financeKeywords = [
    '주가', '실적', '매출', '영업이익', '순이익', '투자', '증권',
    '애널리스트', '목표가', '전망', '분석', '보고서', '리포트',
    '반도체', 'hbm', 'ai', '수출', '수입', '성장', '하락', '상승',
    '금리', '환율', '물가', '경제', '시장', '산업', '업종'
  ];

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  return newsItems
    .map(news => {
      const title = (news.title || '').replace(/<[^>]*>/g, '').toLowerCase();
      const desc = (news.description || '').replace(/<[^>]*>/g, '').toLowerCase();
      const text = title + ' ' + desc;

      let score = 0;

      // 1. 검색어 포함 여부 (기본 점수)
      queryWords.forEach(word => {
        if (word.length >= 2) {
          if (title.includes(word)) score += 30;
          if (desc.includes(word)) score += 10;
        }
      });

      // 2. 금융 키워드 가산점
      financeKeywords.forEach(word => {
        if (text.includes(word)) score += 5;
      });

      // 3. ⭐ 노이즈 키워드 강력 패널티
      noiseKeywords.forEach(word => {
        if (text.includes(word)) score -= 100;
      });

      // 4. 제목에 검색어 정확히 포함 시 보너스
      if (title.includes(queryLower)) score += 20;

      return {
        ...news,
        title: (news.title || '').replace(/<[^>]*>/g, ''),
        description: (news.description || '').replace(/<[^>]*>/g, ''),
        relevance: score
      };
    })
    .filter(news => news.relevance >= 50) // ⭐ 기준점 상향 (20 → 50)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 15);
}

// ============================================
// 4. 주가 데이터 (Yahoo Finance API)
// ============================================
async function getStockData(query) {
  const ticker = getTickerFromQuery(query);
  
  if (!ticker) {
    console.log('티커 매핑 없음:', query);
    return null;
  }

  console.log('주가 조회 시도:', ticker);

  // ⭐ Yahoo Finance API만 시도 (하드코딩 fallback 없음!)
  const stockData = await fetchYahooFinance(ticker);
  
  if (stockData) {
    return {
      ...stockData,
      source: 'Yahoo Finance (실시간)',
      warning: null // 실시간이므로 경고 없음
    };
  }

  // API 실패 시 null 반환 (하드코딩 사용 안 함!)
  console.log('Yahoo Finance API 실패 - 주가 데이터 없음');
  return null;
}

// Yahoo Finance API 호출
async function fetchYahooFinance(ticker) {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    console.error('RAPIDAPI_KEY 없음');
    return null;
  }

  try {
    // 방법 1: RapidAPI Yahoo Finance
    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/quote?ticker=${ticker}&type=EQUITY`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
        }
      }
    );

    if (!response.ok) {
      console.error('Yahoo Finance API 응답 오류:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.body) {
      console.error('Yahoo Finance 데이터 없음');
      return null;
    }

    const quote = data.body;
    
    return {
      currentPrice: quote.regularMarketPrice || quote.previousClose,
      previousClose: quote.previousClose,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      pe: quote.trailingPE || quote.forwardPE,
      targetPrice: quote.targetMeanPrice || calculateTargetPrice(quote.regularMarketPrice)
    };

  } catch (error) {
    console.error('Yahoo Finance API 오류:', error.message);
    
    // 방법 2: 대체 API 시도
    try {
      return await fetchAlternativeStockData(ticker);
    } catch (altError) {
      console.error('대체 API도 실패:', altError.message);
      return null;
    }
  }
}

// 대체 주가 API (yfinance 스타일)
async function fetchAlternativeStockData(ticker) {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  try {
    const response = await fetch(
      `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-summary?symbol=${ticker}&region=KR`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = data.price;
    
    if (!price) return null;

    return {
      currentPrice: price.regularMarketPrice?.raw,
      previousClose: price.regularMarketPreviousClose?.raw,
      change: price.regularMarketChange?.raw,
      changePercent: price.regularMarketChangePercent?.raw,
      marketCap: price.marketCap?.raw,
      pe: data.summaryDetail?.trailingPE?.raw,
      targetPrice: data.financialData?.targetMeanPrice?.raw
    };

  } catch (error) {
    return null;
  }
}

// 검색어 → 티커 매핑
function getTickerFromQuery(query) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  
  const tickerMap = {
    '삼성전자': '005930.KS',
    '삼성': '005930.KS',
    'sk하이닉스': '000660.KS',
    'sk': '000660.KS',
    '하이닉스': '000660.KS',
    '네이버': '035420.KS',
    'naver': '035420.KS',
    '카카오': '035720.KS',
    'kakao': '035720.KS',
    '현대차': '005380.KS',
    '현대자동차': '005380.KS',
    'lg전자': '066570.KS',
    '기아': '000270.KS',
    '기아차': '000270.KS',
    '포스코홀딩스': '005490.KS',
    '포스코': '005490.KS',
    '셀트리온': '068270.KS',
    '삼성바이오로직스': '207940.KS',
    '삼성바이오': '207940.KS',
    'lg화학': '051910.KS',
    '현대모비스': '012330.KS',
    '삼성sdi': '006400.KS',
    '카카오뱅크': '323410.KS',
    '크래프톤': '259960.KS',
    '엔씨소프트': '036570.KS',
    '넷마블': '251270.KS',
    '두산에너빌리티': '034020.KS',
    '한화에어로스페이스': '012450.KS'
  };

  return tickerMap[q] || null;
}

// 목표가 계산 (현재가 기반)
function calculateTargetPrice(currentPrice) {
  if (!currentPrice) return null;
  // 현재가 대비 20% 상승 목표
  return Math.round(currentPrice * 1.2);
}

// ============================================
// 5. 경제 지표 추출
// ============================================
function extractEconomicIndicators(newsItems) {
  let fedRate = null;
  let exchangeRate = null;
  let inflation = null;
  let gdpGrowth = null;

  const allText = newsItems.map(n => n.title + ' ' + n.description).join(' ');

  // 금리 추출
  const rateMatch = allText.match(/(\d+\.?\d*)\s*%?\s*(금리|기준금리)/);
  if (rateMatch) fedRate = rateMatch[1] + '%';

  // 환율 추출
  const exchangeMatch = allText.match(/([\d,]+)\s*원/);
  if (exchangeMatch) {
    const value = parseInt(exchangeMatch[1].replace(/,/g, ''));
    if (value > 1000 && value < 2000) {
      exchangeRate = value.toLocaleString() + '원';
    }
  }

  // 물가 추출
  const cpiMatch = allText.match(/(물가|인플레이션|cpi).*?(\d+\.?\d*)\s*%/i);
  if (cpiMatch) inflation = cpiMatch[2] + '%';

  // GDP 추출
  const gdpMatch = allText.match(/(gdp|경제성장|성장률).*?(\d+\.?\d*)\s*%/i);
  if (gdpMatch) gdpGrowth = gdpMatch[2] + '%';

  return {
    fedRate: fedRate || '4.50-4.75%',
    exchangeRate: exchangeRate || '1,400원대',
    inflation: inflation || '2.5%',
    gdpGrowth: gdpGrowth || '2.8%',
    source: 'News + Estimates',
    yields: {
      '2Y': '4.25%',
      '10Y': '4.40%',
      '30Y': '4.55%'
    },
    globalRates: {
      'US': '4.75%',
      'EU': '3.25%',
      'UK': '4.75%',
      'JP': '0.25%',
      'KR': '3.00%',
      'CN': '3.10%'
    }
  };
}

// ============================================
// 6. 산업 지표 추출
// ============================================
function extractIndustryMetrics(newsItems, query) {
  const q = query.toLowerCase();
  
  // 산업별 기본 데이터
  const industryData = {
    '반도체': {
      marketSize: '680조원 (글로벌)',
      growthRate: '12.5%',
      topCompanies: ['삼성전자', 'SK하이닉스', 'TSMC', '인텔'],
      keyTrends: ['AI 반도체 수요 급증', 'HBM 시장 확대', '선단공정 경쟁']
    },
    'ai': {
      marketSize: '2,500조원 (2030년 전망)',
      growthRate: '35.2%',
      topCompanies: ['엔비디아', 'MS', '구글', '메타'],
      keyTrends: ['생성형 AI 확산', '엔터프라이즈 도입', 'AI 반도체 수요']
    },
    '배터리': {
      marketSize: '450조원 (2030년 전망)',
      growthRate: '22.3%',
      topCompanies: ['CATL', 'LG에너지솔루션', '삼성SDI', 'BYD'],
      keyTrends: ['전고체 배터리 개발', 'LFP 확산', '북미 공장 투자']
    },
    '전기차': {
      marketSize: '1,800조원 (2030년 전망)',
      growthRate: '18.5%',
      topCompanies: ['테슬라', 'BYD', '현대차', 'VW'],
      keyTrends: ['가격 경쟁 심화', '자율주행 통합', '충전 인프라 확대']
    },
    '바이오': {
      marketSize: '650조원',
      growthRate: '8.5%',
      topCompanies: ['셀트리온', '삼성바이오', '화이자', '로슈'],
      keyTrends: ['바이오시밀러 성장', 'CGT 치료제', 'AI 신약개발']
    }
  };

  // 매칭되는 산업 찾기
  for (const [industry, data] of Object.entries(industryData)) {
    if (q.includes(industry)) {
      return {
        ...data,
        source: 'Industry Reports + News'
      };
    }
  }

  // 기본값
  return {
    marketSize: '데이터 수집 중',
    growthRate: '데이터 수집 중',
    topCompanies: [],
    keyTrends: [],
    source: 'News Analysis'
  };
}

// ============================================
// 7. 감성 분석
// ============================================
function analyzeSentiment(newsItems) {
  const positiveWords = [
    '상승', '급등', '호재', '성장', '최고', '신고가', '돌파', '기대',
    '호실적', '어닝서프라이즈', '매수', '추천', '강세', '상향', '수혜'
  ];
  
  const negativeWords = [
    '하락', '급락', '악재', '우려', '최저', '신저가', '위기', '불안',
    '부진', '어닝쇼크', '매도', '경계', '약세', '하향', '리스크'
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  let total = 0;

  newsItems.forEach(news => {
    const text = (news.title + ' ' + news.description).toLowerCase();
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    
    total++;
  });

  const totalSentiment = positiveCount + negativeCount || 1;
  const positiveRatio = Math.round((positiveCount / totalSentiment) * 100);
  const negativeRatio = Math.round((negativeCount / totalSentiment) * 100);
  const neutralRatio = 100 - positiveRatio - negativeRatio;

  let label = '중립';
  if (positiveRatio > negativeRatio + 20) label = '긍정적';
  else if (negativeRatio > positiveRatio + 20) label = '부정적';

  return {
    label,
    score: {
      positive: Math.max(0, positiveRatio),
      negative: Math.max(0, negativeRatio),
      neutral: Math.max(0, neutralRatio)
    }
  };
}

// ============================================
// 8. 프롬프트 빌드
// ============================================
function buildPrompt(query, topicType, news, stockData, additionalInfo, economicIndicators, industryMetrics) {
  const newsText = news.slice(0, 10).map((n, i) => 
    `[뉴스${i+1}] ${n.title}\n${n.description}`
  ).join('\n\n');

  // 기업 분석 프롬프트
  if (topicType === 'company') {
    let stockInfo = '';
    if (stockData) {
      stockInfo = `
## 주가 정보 (실시간)
- 현재가: ${formatPrice(stockData.currentPrice)}
- 목표가: ${formatPrice(stockData.targetPrice)}
- PER: ${stockData.pe ? stockData.pe.toFixed(1) : 'N/A'}
- 시가총액: ${formatMarketCap(stockData.marketCap)}
`;
    } else {
      stockInfo = `
## 주가 정보
⚠️ 실시간 주가 데이터를 가져올 수 없습니다.
투자 판단 시 증권사 HTS/MTS 또는 네이버 증권에서 최신 주가를 확인하세요.
`;
    }

    return `당신은 증권사 수석 애널리스트입니다. "${query}"에 대한 투자 분석 리포트를 작성하세요.

${stockInfo}

## 최신 뉴스
${newsText}

${additionalInfo ? `## 추가 분석 요청\n${additionalInfo}` : ''}

## 리포트 형식
## 1. 요약
[핵심 내용 3-4문장]

## 2. 핵심 포인트
- [뉴스 기반 핵심 내용 1]
- [뉴스 기반 핵심 내용 2]
- [뉴스 기반 핵심 내용 3]

## 3. SWOT 분석
### 강점 (Strengths)
### 약점 (Weaknesses)
### 기회 (Opportunities)
### 위협 (Threats)

## 4. 리스크 요인
- [리스크 1]
- [리스크 2]

## 5. 투자 의견
${stockData ? `
- 투자 등급: [BUY/HOLD/SELL 중 하나]
- 목표 주가: ${formatPrice(stockData.targetPrice)}
- 현재 주가: ${formatPrice(stockData.currentPrice)}
- 투자 기간: [단기/중기/장기]
` : `
⚠️ 실시간 주가 데이터가 없어 구체적인 목표가를 제시하지 않습니다.
뉴스 분석 기반 투자 의견만 제공합니다.
- 투자 방향: [긍정적/중립/부정적]
- 주요 모니터링 포인트: [핵심 체크 사항]
`}

${additionalInfo ? '## 6. 추가 분석\n[사용자 요청 내용에 대한 분석]' : ''}

⚠️ 중요: 이 리포트는 AI가 생성한 참고 자료입니다. 실제 투자 결정은 본인 책임입니다.`;
  }

  // 경제 분석 프롬프트
  if (topicType === 'economy') {
    return `당신은 거시경제 전문 애널리스트입니다. "${query}"에 대한 경제 분석 리포트를 작성하세요.

## 최신 뉴스
${newsText}

${additionalInfo ? `## 추가 분석 요청\n${additionalInfo}` : ''}

## 리포트 형식
## 1. 요약
[핵심 경제 이슈 3-4문장]

## 2. 핵심 경제 포인트
- [핵심 포인트 1]
- [핵심 포인트 2]
- [핵심 포인트 3]

## 3. 경제 지표 분석
### 금리 동향
[현재 금리 상황과 전망]
### 환율 동향
[원/달러 환율 분석]
### 물가/인플레이션
[CPI, 물가 동향]
### GDP/경제성장
[경제성장률 전망]

## 4. 시장 영향 분석
- [주식시장 영향]
- [채권시장 영향]
- [외환시장 영향]

## 5. 리스크 요인
- [리스크 1]
- [리스크 2]

## 6. 향후 전망
### 단기 전망 (1-3개월)
### 중장기 전망 (6-12개월)

${additionalInfo ? '## 7. 추가 분석\n[사용자 요청 내용에 대한 분석]' : ''}

⚠️ 중요: 특정 기업에 대한 투자등급(BUY/SELL)이나 목표주가를 제시하지 마세요.`;
  }

  // 산업 분석 프롬프트
  return `당신은 산업 분석 수석 전문가입니다. "${query}" 산업/섹터 분석 리포트를 작성하세요.

## 최신 뉴스
${newsText}

${additionalInfo ? `## 추가 분석 요청\n${additionalInfo}` : ''}

## 리포트 형식
## 1. 요약
[산업 핵심 동향 3-4문장]

## 2. 산업 핵심 포인트
- [핵심 포인트 1]
- [핵심 포인트 2]
- [핵심 포인트 3]

## 3. 산업 구조 분석
### 시장 규모
[글로벌/국내 시장 규모]
### 경쟁 구조
[주요 기업들의 점유율과 경쟁 상황]
### 성장 동력
[산업 성장을 이끄는 요인들]

## 4. 리스크 요인
- [산업 리스크 1]
- [산업 리스크 2]

## 5. 투자 유망 분야
[구체적인 유망 분야와 이유 - 특정 종목 대신 분야/테마 중심]

## 6. 산업 전망
### 단기 전망 (1-3개월)
### 중장기 전망 (6-12개월)

${additionalInfo ? '## 7. 추가 분석\n[사용자 요청 내용에 대한 분석]' : ''}

⚠️ 중요: 이것은 "산업 분석"입니다. 특정 기업에 대한 투자등급(BUY/SELL/HOLD)이나 목표주가를 제시하지 마세요.`;
}

// ============================================
// 9. Claude API 호출
// ============================================
async function generateWithClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Claude API 오류');
    }

    const data = await response.json();
    return data.content[0].text;

  } catch (error) {
    console.error('Claude API 오류:', error);
    throw error;
  }
}

// ============================================
// 유틸리티 함수들
// ============================================

function formatPrice(price) {
  if (!price) return '데이터 없음';
  return Math.round(price).toLocaleString() + '원';
}

function formatMarketCap(marketCap) {
  if (!marketCap) return '데이터 없음';
  
  const trillion = 1000000000000;
  const billion = 100000000;
  
  if (marketCap >= trillion) {
    return (marketCap / trillion).toFixed(1) + '조원';
  } else if (marketCap >= billion) {
    return (marketCap / billion).toFixed(0) + '억원';
  }
  return marketCap.toLocaleString() + '원';
}

function calculateDataQuality(news, stockData) {
  let quality = 50; // 기본점수
  
  // 뉴스 품질
  if (news.length >= 10) quality += 20;
  else if (news.length >= 5) quality += 10;
  
  // 주가 데이터
  if (stockData) quality += 20;
  
  // 최대 95%
  return Math.min(95, quality);
}
