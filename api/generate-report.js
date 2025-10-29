// ====================================
// 백엔드 서버 (Vercel Serverless Function)
// 파일명: api/generate-report.js
// 네이버 뉴스 API + Claude AI
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

    // 2. 감성 분석
    const sentiment = analyzeSentiment(newsData);
    console.log('감성 분석 결과:', sentiment);

    // 3. 프롬프트 생성
    const prompt = buildPrompt(searchQuery, newsData, uploadedFiles, additionalInfo, sentiment);

    console.log('=== Claude API 호출 ===');

    // 4. Claude API 호출
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

    // 5. 응답 반환
    return res.status(200).json({
      success: true,
      report: reportContent,
      metadata: {
        newsCount: newsData.length,
        sentiment: sentiment,
        timestamp: new Date().toISOString(),
        dataSource: `네이버 뉴스 API (${newsData.length}건) + Claude AI 분석`,
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
// 네이버 뉴스 검색 함수
// ====================================
async function searchNaverNews(query) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('⚠️ 네이버 API 키 없음 - 임시 데이터 사용');
    return getDummyNews(query);
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = threeDaysAgo.toISOString().split('T')[0].replace(/-/g, '');

    let allNews = [];
    const maxPages = 10; // 최대 100개 뉴스 수집

    for (let page = 1; page <= maxPages; page++) {
      const start = (page - 1) * 10 + 1;
      const url = `https://openapi.naver.com/v1/search/news.json?query=${encodedQuery}&display=10&start=${start}&sort=date`;

      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret
        }
      });

      if (!response.ok) {
        console.error('네이버 API 오류:', response.status);
        break;
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        break;
      }

      // HTML 태그 제거 및 날짜 필터링
      const processedNews = data.items
        .map(item => ({
          title: removeHtmlTags(item.title),
          description: removeHtmlTags(item.description),
          link: item.link,
          pubDate: item.pubDate
        }))
        .filter(item => {
          const pubDate = new Date(item.pubDate);
          return pubDate >= threeDaysAgo;
        });

      allNews = [...allNews, ...processedNews];

      // 100ms 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ 네이버 뉴스 ${allNews.length}건 수집 완료`);
    return allNews;

  } catch (error) {
    console.error('네이버 API 오류:', error);
    return getDummyNews(query);
  }
}

// ====================================
// HTML 태그 제거 함수
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
// 감성 분석 함수
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
// 프롬프트 생성 함수
// ====================================
function buildPrompt(searchQuery, newsData, uploadedFiles, additionalInfo, sentiment) {
  const newsText = newsData.slice(0, 50).map((news, i) => 
    `[${i + 1}] ${news.title}\n   ${news.description}\n   발행일: ${news.pubDate}`
  ).join('\n\n');

  // 검색 주제 분석
  const isCompany = /전자|바이오|제약|은행|카드|반도체|자동차|항공|해운|건설/i.test(searchQuery);
  const isEconomy = /경제|금리|환율|경기|GDP|실업|물가|인플레이션/i.test(searchQuery);
  const isSector = /산업|시장|업종|섹터/i.test(searchQuery);

  let specificGuidelines = '';
  
  if (isCompany) {
    specificGuidelines = `
## 기업 분석 포함 필수:
- 현재 주가 (실제 뉴스에서 확인)
- 목표 주가 (애널리스트 전망 기준)
- 투자 의견: BUY/HOLD/SELL 중 명확히 선택
- 상승 여력 또는 하락 리스크
- 투자 기간: 6개월 또는 12개월`;
  } else if (isEconomy) {
    specificGuidelines = `
## 경제 전망 포함 필수:
- 현재 경제 상황 요약
- 주요 경제 지표 분석
- 향후 6개월 전망
- 투자자들에게 미치는 영향
- 대응 전략`;
  } else if (isSector) {
    specificGuidelines = `
## 산업/섹터 분석 포함 필수:
- 산업 현황 및 트렌드
- 주요 기업들 동향
- 시장 전망
- 투자 기회 및 리스크`;
  }

  return `당신은 전문 증권 애널리스트입니다. 아래 최신 뉴스를 바탕으로 "${searchQuery}"에 대한 전문적인 투자 리포트를 작성해주세요.

# 검색 주제
${searchQuery}

# 최신 뉴스 (최근 3일, ${newsData.length}건)
${newsText}

# 시장 감성
${sentiment}

${uploadedFiles && uploadedFiles.length > 0 ? `\n# 업로드된 리포트\n${uploadedFiles.map(f => `- ${f.name}`).join('\n')}` : ''}

${additionalInfo ? `\n# 추가 정보\n${additionalInfo}` : ''}

---

# 리포트 작성 가이드

반드시 다음 구조로 **"${searchQuery}"에 특화된** 전문적인 투자 리포트를 작성하세요:

## 1. 요약 (Executive Summary)
- "${searchQuery}"에 대한 현재 상황을 3-5문장으로 요약
- 위 뉴스에서 확인된 실제 정보 기반
- 리스트가 아닌 산문체로 작성

## 2. 핵심 투자 포인트
다음 형식으로 4가지 작성:
- [포인트 1]
- [포인트 2]
- [포인트 3]
- [포인트 4]

${specificGuidelines}

## 3. SWOT 분석
### 강점 (Strengths)
- [강점 1]
- [강점 2]
- [강점 3]

### 약점 (Weaknesses)
- [약점 1]
- [약점 2]
- [약점 3]

### 기회 (Opportunities)
- [기회 1]
- [기회 2]
- [기회 3]

### 위협 (Threats)
- [위협 1]
- [위협 2]
- [위협 3]

## 4. 리스크 요인
- [리스크 1]
- [리스크 2]
- [리스크 3]
- [리스크 4]
- [리스크 5]

## 5. 투자 의견
**투자 등급:** BUY / HOLD / SELL 중 하나 명시
${isCompany ? '**목표 주가:** [구체적 금액]원\n**현재 주가:** [구체적 금액]원' : ''}
**투자 기간:** 6개월 또는 12개월
**근거:** [투자 의견의 근거 설명]

## 6. 투자자 관점
"${searchQuery}"에 투자하려는 개인 투자자를 위한 실용적인 조언과 전망을 3-4문장으로 작성

---

**중요 작성 원칙:**
1. ✅ 위에 제공된 ${newsData.length}건의 **실제 뉴스 내용을 반드시 분석에 활용**
2. ✅ "${searchQuery}"에 **직접적으로 관련된 내용만** 작성 (다른 주제 언급 금지)
3. ✅ 뉴스에서 언급된 **실제 수치와 데이터** 인용
4. ✅ ${isCompany ? '기업명, 주가, 목표가는 실제 뉴스에서 확인된 정보만 사용' : ''}
5. ✅ 전문 애널리스트 수준의 분석
6. ✅ 실제 투자에 즉시 활용 가능한 실용성
7. ✅ 객관적이고 근거 있는 분석

**금지사항:**
❌ 뉴스에 없는 내용 추측하지 말 것
❌ "${searchQuery}"와 무관한 다른 기업/주제 언급 금지
❌ 애매한 표현 금지 (구체적 수치와 근거 필수)

위 실제 뉴스 정보를 바탕으로 **"${searchQuery}"에 특화된** 투자자들이 실전에 활용할 수 있는 전문적이고 실용적인 리포트를 작성하세요.`;
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
