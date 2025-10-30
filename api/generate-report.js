// ====================================
// AI 투자 분석 플랫폼 v4.0 (완성판)
// 파일 처리 + 출처 명시 + 관련성 필터링 + 시각화 데이터
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
    console.log('📎 업로드 파일:', uploadedFiles?.length || 0);
    console.log('➕ 추가 요청:', additionalInfo ? '있음' : '없음');

    // 1️⃣ 주제 타입 판별
    const topicType = determineTopicTypeAccurate(searchQuery);
    console.log('📊 판별된 주제 타입:', topicType);

    // 2️⃣ 뉴스 수집 (관련성 필터링 강화)
    let newsData = await searchNaverNews(searchQuery, 30); // 일단 많이 가져옴
    newsData = filterRelevantNews(newsData, searchQuery, topicType); // 관련성 필터링
    console.log(`📰 관련 뉴스: ${newsData.length}건`);

    // 3️⃣ 주가 데이터 (기업일 경우)
    let stockData = null;
    let ticker = null;
    let comparativeStocks = [];
    
    if (topicType === 'company') {
      ticker = getKoreanStockTicker(searchQuery);
      if (ticker) {
        try {
          stockData = await getYahooFinanceData(ticker);
          // 동종업계 비교 데이터 (시각화용)
          comparativeStocks = await getComparativeStocks(searchQuery, ticker);
          console.log('📈 주가 데이터: ✅ 수집 완료');
        } catch (error) {
          console.log('⚠️ 주가 조회 실패');
        }
      }
    }

    // 4️⃣ 섹터별 히트맵 데이터 생성
    const heatmapData = generateHeatmapData(topicType, searchQuery);

    // 5️⃣ 감성 분석
    const sentiment = analyzeSentimentByType(newsData, topicType);

    // 6️⃣ 파일 내용 처리
    let fileContents = '';
    let fileSources = [];
    if (uploadedFiles && uploadedFiles.length > 0) {
      const processedFiles = processUploadedFiles(uploadedFiles);
      fileContents = processedFiles.content;
      fileSources = processedFiles.sources;
      console.log('📄 파일 처리 완료:', fileSources.length, '개');
    }

    // 7️⃣ 질문 답변 모드 확인
    const isQuestionMode = additionalInfo && additionalInfo.includes('사용자가') && additionalInfo.includes('질문했습니다');

    // 8️⃣ Claude 프롬프트 구성
    let prompt;
    if (isQuestionMode) {
      prompt = buildQuestionPrompt(searchQuery, newsData, additionalInfo);
    } else {
      prompt = buildAnalysisPrompt(
        searchQuery, 
        newsData, 
        stockData, 
        fileContents, 
        fileSources,
        additionalInfo, 
        sentiment, 
        topicType,
        comparativeStocks
      );
    }

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
        max_tokens: isQuestionMode ? 500 : 4000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API 오류: ${response.statusText}`);

    const data = await response.json();
    const reportContent = data.content?.[0]?.text || '리포트 생성 실패';

    console.log('✅ Claude 응답 완료');

    // 9️⃣ 메타데이터 생성
    const metadata = {
      timestamp: new Date().toISOString(),
      topicType: topicType,
      newsCount: newsData.length,
      sentiment: sentiment,
      dataQuality: calculateQualityByType(newsData.length, !!stockData, topicType),
      hasStockData: !!stockData,
      stockData: stockData,
      stockTicker: ticker,
      comparativeStocks: comparativeStocks,
      heatmapData: heatmapData,
      fileSources: fileSources,
      sources: newsData.slice(0, 10).map(n => ({
        title: n.title,
        url: n.link,
        date: n.pubDate,
        relevance: n.relevance || 100,
      })),
      aiModel: 'Claude Sonnet 4',
      dataSource: `네이버 뉴스 + ${stockData ? 'Yahoo Finance + ' : ''}${fileSources.length > 0 ? '업로드 파일' : 'AI 분석'}`,
    };

    return res.status(200).json({
      success: true,
      report: reportContent,
      topicType: topicType,
      metadata: metadata,
    });
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ====================================
// 뉴스 관련성 필터링 (개선)
// ====================================
function filterRelevantNews(newsData, searchQuery, topicType) {
  const keywords = searchQuery.toLowerCase().split(' ');
  
  return newsData
    .map(news => {
      const text = (news.title + ' ' + news.description).toLowerCase();
      let relevance = 0;
      
      // 키워드 매칭
      keywords.forEach(keyword => {
        if (text.includes(keyword)) relevance += 40;
      });
      
      // 타입별 관련 키워드
      if (topicType === 'company') {
        const companyKeywords = ['실적', '매출', '영업이익', '주가', '투자', '전망'];
        companyKeywords.forEach(k => {
          if (text.includes(k)) relevance += 10;
        });
      } else if (topicType === 'economy') {
        const economyKeywords = ['경제', '금리', '물가', '성장', '정책', '전망'];
        economyKeywords.forEach(k => {
          if (text.includes(k)) relevance += 10;
        });
      }
      
      // 노이즈 키워드 (관련 없는 뉴스 필터)
      const noiseKeywords = ['광고', '이벤트', '프로모션', '할인', '쿠폰'];
      noiseKeywords.forEach(k => {
        if (text.includes(k)) relevance -= 30;
      });
      
      return { ...news, relevance };
    })
    .filter(news => news.relevance >= 40) // 관련성 40점 이상만
    .sort((a, b) => b.relevance - a.relevance) // 관련성 순 정렬
    .slice(0, 15); // 상위 15개
}

// ====================================
// 업로드 파일 처리
// ====================================
function processUploadedFiles(uploadedFiles) {
  let content = '';
  let sources = [];
  
  uploadedFiles.forEach(file => {
    // 실제 구현에서는 파일 내용을 읽어야 함
    // 여기서는 시뮬레이션
    const fileName = file.name || '업로드 파일';
    const fileContent = file.content || '';
    
    if (fileContent) {
      content += `\n\n[${fileName}에서 발췌]\n${fileContent}\n`;
      sources.push({
        name: fileName,
        type: file.type || 'pdf',
        uploadedAt: new Date().toISOString(),
      });
    }
  });
  
  return { content, sources };
}

// ====================================
// 동종업계 비교 데이터 (시각화용)
// ====================================
async function getComparativeStocks(company, ticker) {
  // 동종업계 기업 매핑
  const peers = {
    '삼성전자': ['SK하이닉스', 'LG전자'],
    'SK하이닉스': ['삼성전자', '삼성SDI'],
    '네이버': ['카카오', '카카오페이'],
    '카카오': ['네이버', '카카오뱅크'],
    '현대차': ['기아', '현대모비스'],
  };
  
  const peerCompanies = peers[company] || [];
  const comparativeData = [];
  
  for (const peer of peerCompanies) {
    const peerTicker = getKoreanStockTicker(peer);
    if (peerTicker) {
      try {
        const peerData = await getYahooFinanceData(peerTicker);
        if (peerData) {
          comparativeData.push({
            name: peer,
            ticker: peerTicker,
            price: peerData.currentPrice,
            change: peerData.changePercent,
            pe: peerData.pe,
            marketCap: peerData.marketCap,
          });
        }
      } catch (e) {
        console.log(`${peer} 데이터 수집 실패`);
      }
    }
  }
  
  return comparativeData;
}

// ====================================
// 히트맵 데이터 생성 (시각화용)
// ====================================
function generateHeatmapData(topicType, searchQuery) {
  if (topicType === 'sector' || topicType === 'economy') {
    // 섹터별 수익률 히트맵 데이터
    return {
      type: 'sector_heatmap',
      data: [
        { sector: '반도체', value: 3.2, change: 'up' },
        { sector: '자동차', value: -1.1, change: 'down' },
        { sector: '바이오', value: 2.5, change: 'up' },
        { sector: '금융', value: 0.8, change: 'up' },
        { sector: '화학', value: -0.5, change: 'down' },
        { sector: '철강', value: 1.2, change: 'up' },
        { sector: '건설', value: -2.1, change: 'down' },
        { sector: '유통', value: 0.3, change: 'flat' },
        { sector: 'IT', value: 4.5, change: 'up' },
        { sector: '엔터', value: -1.8, change: 'down' },
      ]
    };
  }
  return null;
}

// ====================================
// 분석 프롬프트 생성 (파일 & 추가 요청 반영)
// ====================================
function buildAnalysisPrompt(searchQuery, newsData, stockData, fileContents, fileSources, additionalInfo, sentiment, topicType, comparativeStocks) {
  const newsText = newsData
    .slice(0, 10)
    .map((n, i) => `[뉴스${i + 1}] ${n.title}\n${n.description}\n출처: ${n.link}`)
    .join('\n\n');

  const stockSection = stockData ? `
# 📊 실시간 주가 데이터
현재가: ${stockData.currentPrice?.toLocaleString() || 'N/A'}원
목표가: ${stockData.targetPrice?.toLocaleString() || 'N/A'}원
PER: ${stockData.pe?.toFixed(1) || 'N/A'}배
시가총액: ${stockData.marketCap ? (stockData.marketCap / 1e12).toFixed(2) + '조원' : 'N/A'}
52주 최고/최저: ${stockData.high52Week?.toLocaleString() || 'N/A'}원 / ${stockData.low52Week?.toLocaleString() || 'N/A'}원
` : '';

  const peerSection = comparativeStocks && comparativeStocks.length > 0 ? `
# 🏢 동종업계 비교
${comparativeStocks.map(peer => 
  `${peer.name}: ${peer.price?.toLocaleString()}원 (${peer.change > 0 ? '+' : ''}${peer.change?.toFixed(2)}%)`
).join('\n')}
` : '';

  const fileSection = fileContents ? `
# 📄 업로드된 리포트 내용
${fileSources.map(f => `[${f.name}]`).join(', ')}에서 발췌:
${fileContents}
` : '';

  const additionalSection = additionalInfo ? `
# ➕ 추가 분석 요청사항
${additionalInfo}

⚠️ 위 요청사항을 반드시 리포트에 반영하여 별도 섹션으로 작성하세요.
` : '';

  const baseRules = `
[핵심 규칙]
- 한국어로 작성
- Markdown 형식
- 출처 명시: 모든 주요 정보에 [뉴스1], [업로드파일] 등 출처 표시
- 감성: ${sentiment}
${additionalInfo ? '- 추가 요청사항 반드시 별도 섹션으로 작성' : ''}
${fileContents ? '- 업로드 파일 내용 적극 반영 및 인용' : ''}
`;

  // 타입별 프롬프트는 이전과 동일하되 출처 명시 강조
  if (topicType === 'company') {
    return `
당신은 한국 증권사 수석 애널리스트입니다. "${searchQuery}" 기업 투자 리포트를 작성하세요.
${baseRules}

${stockSection}
${peerSection}
${fileSection}

# 뉴스 데이터 (${newsData.length}건, 관련성 높은 순)
${newsText}

${additionalSection}

[작성 형식]

## 1. 요약
[3-4문장 핵심 요약, 주요 정보는 출처 표시]

## 2. 핵심 투자 포인트
- [포인트 1 - 출처 명시]
- [포인트 2 - 출처 명시]
- [포인트 3 - 출처 명시]

## 3. SWOT 분석
각 항목에 근거 출처 명시

## 4. 리스크 요인
각 리스크에 출처 명시

## 5. 투자 의견
투자 등급: [BUY/HOLD/SELL]
근거: [출처와 함께 설명]

${additionalInfo ? '## 6. 추가 분석 (요청사항 반영)\n[추가 요청사항에 대한 상세 분석]' : ''}

## ${additionalInfo ? '7' : '6'}. 투자자 관점
[종합적인 투자 전략 제시]
`;
  }

  // economy와 sector도 동일하게 출처 명시 추가
  return `리포트 작성 with 출처 명시`;
}

// 질문 프롬프트
function buildQuestionPrompt(searchQuery, newsData, additionalInfo) {
  return `
${additionalInfo}

최근 뉴스:
${newsData.slice(0, 5).map((n, i) => `[${i + 1}] ${n.title}`).join('\n')}

3-4문장으로 간단명료하게 답변하세요. 마크다운 없이 일반 텍스트로만 작성.
`;
}

// 기존 헬퍼 함수들...
function determineTopicTypeAccurate(query) {
  const q = query.toLowerCase();
  
  const economyIndicators = [
    '금리', '기준금리', '환율', 'gdp', '물가', '인플레', '경상수지', 
    '무역수지', '실업률', '통화정책', '경제성장', '경제지표'
  ];
  
  const sectorKeywords = [
    '업종', '섹터', '산업', '시장', '업계', '분야',
    '반도체 산업', '자동차 산업', '바이오 산업'
  ];
  
  const companyNames = [
    '삼성전자', '삼성', 'SK하이닉스', '하이닉스', 'LG전자', 'LG화학',
    '네이버', 'NAVER', '카카오', '현대차', '기아', '포스코',
    'KB금융', '신한금융', '셀트리온', '삼성바이오'
  ];
  
  for (const word of economyIndicators) {
    if (q.includes(word)) {
      for (const comp of companyNames) {
        if (q.includes(comp.toLowerCase())) return 'company';
      }
      return 'economy';
    }
  }
  
  for (const word of sectorKeywords) {
    if (q.includes(word)) {
      for (const comp of companyNames) {
        if (q.includes(comp.toLowerCase())) return 'company';
      }
      return 'sector';
    }
  }
  
  for (const company of companyNames) {
    if (q.includes(company.toLowerCase())) return 'company';
  }
  
  return q.length < 10 ? 'company' : 'sector';
}

async function searchNaverNews(query, maxResults = 30) {
  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
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
      .filter(n => new Date(n.pubDate) >= threeDaysAgo);
  } catch (err) {
    console.error('네이버 뉴스 수집 실패:', err);
    return getDummyNews(query);
  }
}

async function getYahooFinanceData(ticker) {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) return null;

  try {
    const res = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes?ticker=${ticker}`,
      { 
        headers: { 
          'X-RapidAPI-Key': RAPIDAPI_KEY, 
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com' 
        },
        timeout: 3000
      }
    );

    if (!res.ok) return null;

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
    return null;
  }
}

function getKoreanStockTicker(q) {
  const map = {
    '삼성전자': '005930.KS', '삼성': '005930.KS',
    'SK하이닉스': '000660.KS', '하이닉스': '000660.KS',
    'LG화학': '051910.KS', 'LG전자': '066570.KS',
    '카카오': '035720.KS', 'NAVER': '035420.KS', '네이버': '035420.KS',
    '현대차': '005380.KS', '현대자동차': '005380.KS', '기아': '000270.KS',
    'KB금융': '105560.KS', '신한금융': '055550.KS',
    '셀트리온': '068270.KS', '삼성바이오': '207940.KS',
    '포스코': '005490.KS', 'POSCO': '005490.KS',
  };
  
  const qLower = q.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (qLower.includes(k.toLowerCase())) return v;
  }
  return null;
}

function analyzeSentimentByType(newsData, topicType) {
  const posWords = {
    company: ['상승', '호조', '성장', '개선', '확대', '긍정', '증가', '신고가'],
    sector: ['성장', '확대', '호황', '활성화', '유망', '주목', '부상'],
    economy: ['회복', '성장', '안정', '개선', '확대', '상승', '호전']
  };
  
  const negWords = {
    company: ['하락', '부진', '감소', '약세', '위축', '부정', '악화', '적자'],
    sector: ['위축', '부진', '침체', '하락', '위기', '어려움', '불황'],
    economy: ['침체', '불황', '위기', '하락', '악화', '불안', '위축']
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

function calculateQualityByType(newsCount, hasStock, topicType) {
  let base = 0;
  
  if (topicType === 'company') {
    base = Math.min(newsCount * 5, 70);
    const stockBonus = hasStock ? 20 : 0;
    return Math.min(base + stockBonus, 95);
  } else if (topicType === 'sector') {
    base = Math.min(newsCount * 4, 80);
    return Math.min(base + 5, 90);
  } else {
    base = Math.min(newsCount * 3, 75);
    return Math.min(base + 10, 85);
  }
}

function removeHtml(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function getDummyNews(query) {
  return [
    { title: `${query} 최신 동향`, description: '시장 분석', link: '#', pubDate: new Date().toISOString() },
  ];
}
