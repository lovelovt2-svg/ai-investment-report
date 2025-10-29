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

  return `당신은 전문 증권 애널리스트입니다. 아래 최신 뉴스를 바탕으로 전문적인 투자 리포트를 작성해주세요.

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

다음 구조로 전문적인 투자 리포트를 작성하세요:

## 1. 요약 (Executive Summary)
- 핵심 투자 포인트 3가지
- 투자 의견 (BUY/HOLD/SELL)
- 목표가 (구체적 금액)

## 2. 산업 분석
- 현재 업황
- 주요 트렌드
- 시장 전망

## 3. 기업 분석 (해당 시)
- 경쟁력
- 재무 상황
- 성장 동력

## 4. SWOT 분석
- Strengths (강점)
- Weaknesses (약점)
- Opportunities (기회)
- Threats (위협)

## 5. 리스크 요인
- 주요 리스크 3-5가지

## 6. 투자 의견
- 투자 등급 및 근거
- 목표주가
- 투자 기간

---

**작성 원칙:**
1. 위에 제공된 ${newsData.length}건의 실제 뉴스를 반드시 분석에 활용
2. 전문 애널리스트 수준의 분석
3. 실제 투자에 즉시 활용 가능한 실용성
4. 핵심이 분명하고 읽기 쉽게
5. 객관적이고 근거 있는 분석
6. 구체적 수치와 예시 제시

**데이터 출처:**
- 최신 뉴스 분석 (${newsData.length}건, 최근 3일)
- 시장 감성: ${sentiment}

위 실제 뉴스 정보를 바탕으로 투자자들이 실전에 활용할 수 있는 전문적이고 실용적인 리포트를 작성하세요.`;
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
