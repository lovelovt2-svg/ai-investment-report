// ====================================
// 백엔드 서버 (Vercel Serverless Function)
// 파일명: api/generate-report.js
// 네이버 뉴스 API 직접 호출 (개선 버전)
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

    if (newsData.length === 0) {
      console.log('⚠️ 뉴스 0건 - 검색어를 확인하세요');
    }

    // 2. 감성 분석
    const sentiment = analyzeSentiment(newsData);
    console.log('감성 분석 결과:', sentiment);

    // 3. 프롬프트 생성
    const prompt = buildPrompt(searchQuery, newsData, uploadedFiles, additionalInfo, sentiment);

    console.log('=== Claude API 호출 ===');

    // 4. Claude AI 분석
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API 오류:', errorData);
      throw new Error(`Claude API 오류: ${response.status}`);
    }

    const data = await response.json();
    const report = data.content[0].text;

    console.log('리포트 생성 완료');

    // 5. 투자 의견 추출
    const rating = extractRating(report);
    console.log('투자 의견:', rating);

    // 6. 응답
    return res.status(200).json({
      report: report,
      rating: rating,
      newsCount: newsData.length,
      sentiment: sentiment,
      success: true
    });

  } catch (error) {
    console.error('=== 오류 발생 ===');
    console.error(error);
    return res.status(500).json({ 
      error: error.message,
      details: '서버 로그를 확인하세요'
    });
  }
}

// ====================================
// 네이버 뉴스 검색 (직접 호출)
// ====================================
async function searchNaverNews(query) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  // API 키 확인
  if (!clientId || !clientSecret) {
    console.error('❌ 네이버 API 키가 없습니다!');
    console.log('환경 변수 확인:');
    console.log('NAVER_CLIENT_ID:', clientId ? '있음' : '없음');
    console.log('NAVER_CLIENT_SECRET:', clientSecret ? '있음' : '없음');
    return [];
  }

  console.log('✅ 네이버 API 키 확인됨');

  let allNews = [];

  try {
    // 최대 100개까지 수집 (10개씩 10페이지)
    const maxDisplay = 10;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page++) {
      const start = (page - 1) * maxDisplay + 1;

      console.log(`페이지 ${page} 검색 중... (${start}~${start + maxDisplay - 1})`);

      const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${maxDisplay}&start=${start}&sort=date`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`네이버 API 오류 (페이지 ${page}):`, response.status, errorText);
        
        // 첫 페이지 실패하면 중단
        if (page === 1) {
          console.error('첫 페이지 실패 - 검색 중단');
          break;
        }
        
        // 이후 페이지는 건너뛰기
        console.log('이후 페이지 건너뜀');
        break;
      }

      const data = await response.json();
      
      console.log(`페이지 ${page} 결과: ${data.items?.length || 0}건`);

      if (!data.items || data.items.length === 0) {
        console.log('더 이상 뉴스 없음');
        break;
      }

      // HTML 태그 제거 및 데이터 정리
      const cleanedNews = data.items.map(item => ({
        title: removeHtmlTags(item.title),
        description: removeHtmlTags(item.description),
        link: item.link,
        pubDate: item.pubDate,
        originallink: item.originallink
      }));

      allNews.push(...cleanedNews);

      // 최근 3일 뉴스만 (선택 사항)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      allNews = allNews.filter(news => {
        const newsDate = new Date(news.pubDate);
        return newsDate >= threeDaysAgo;
      });

      // API 속도 제한 고려 (100ms 대기)
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`총 ${allNews.length}건 수집 완료`);
    return allNews;

  } catch (error) {
    console.error('네이버 API 검색 오류:', error);
    return [];
  }
}

// ====================================
// HTML 태그 제거
// ====================================
function removeHtmlTags(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')  // HTML 태그 제거
    .replace(/&quot;/g, '"')   // &quot; → "
    .replace(/&amp;/g, '&')    // &amp; → &
    .replace(/&lt;/g, '<')     // &lt; → <
    .replace(/&gt;/g, '>')     // &gt; → >
    .replace(/&#39;/g, "'")    // &#39; → '
    .trim();
}

// ====================================
// 감성 분석
// ====================================
function analyzeSentiment(newsData) {
  if (!newsData || newsData.length === 0) {
    return '중립';
  }

  const positiveWords = ['상승', '증가', '호재', '성장', '개선', '확대', '긍정', '상향'];
  const negativeWords = ['하락', '감소', '악재', '둔화', '우려', '하향', '부정', '리스크'];

  let positiveCount = 0;
  let negativeCount = 0;

  newsData.forEach(news => {
    const text = (news.title + ' ' + news.description).toLowerCase();
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
  });

  console.log('긍정 키워드:', positiveCount, '부정 키워드:', negativeCount);

  if (positiveCount > negativeCount * 1.3) return '긍정적';
  if (negativeCount > positiveCount * 1.3) return '부정적';
  return '중립';
}

// ====================================
// 프롬프트 생성
// ====================================
function buildPrompt(searchQuery, newsData, uploadedFiles, additionalInfo, sentiment) {
  let prompt = '';

  // 뉴스 데이터가 있을 때
  if (newsData && newsData.length > 0) {
    const newsText = newsData.map((news, i) => 
      `[뉴스 ${i + 1}]\n제목: ${news.title}\n내용: ${news.description}\n발행일: ${news.pubDate}\n\n`
    ).join('');

    prompt = `당신은 전문 금융 애널리스트입니다.

다음 최신 뉴스 ${newsData.length}건을 분석하여 "${searchQuery}"에 대한 전문적인 투자 리포트를 작성하세요.

=== 최신 뉴스 ===
${newsText}

=== 리포트 구조 ===

# ${searchQuery} 투자 분석 리포트

## 1. 요약
핵심 투자 포인트 3가지를 간결하게

## 2. 시장 현황 분석
위 뉴스를 바탕으로 현재 시장 상황 분석

## 3. 주요 이슈
뉴스에서 나타난 주요 이슈 3가지

## 4. 투자 전망
- 단기 전망 (1-3개월)
- 중기 전망 (6-12개월)

## 5. 리스크 요인
주의해야 할 리스크 요인

## 6. 투자 의견
**최종 의견: BUY / HOLD / SELL 중 하나를 명시**

---

**작성 원칙:**
1. 위에 제공된 ${newsData.length}건의 실제 뉴스를 반드시 분석에 활용
2. 전문 애널리스트 수준의 분석
3. 실제 투자에 즉시 활용 가능
4. 핵심이 분명하고 읽기 쉽게
5. 뉴스 내용 기반의 근거 있는 분석

**시장 감성**: ${sentiment}

위 뉴스를 바탕으로 전문적이고 실용적인 리포트를 작성하세요.`;

  } else {
    // 뉴스가 없을 때
    prompt = `당신은 전문 금융 애널리스트입니다.

"${searchQuery}"에 대한 투자 분석 리포트를 작성하세요.

(참고: 최신 뉴스 데이터가 없어 일반적인 분석을 제공합니다)

=== 리포트 구조 ===

# ${searchQuery} 투자 분석 리포트

## 1. 요약
핵심 투자 포인트 3가지

## 2. 시장 현황 분석
현재 시장 상황 분석

## 3. 주요 이슈
주목할 만한 이슈

## 4. 투자 전망
- 단기 전망
- 중기 전망

## 5. 리스크 요인
주의해야 할 리스크

## 6. 투자 의견
**최종 의견: BUY / HOLD / SELL 중 하나를 명시**

---

전문적이고 실용적인 리포트를 작성하세요.`;
  }

  // 추가 정보가 있으면
  if (additionalInfo) {
    prompt += `\n\n=== 추가 고려사항 ===\n${additionalInfo}`;
  }

  return prompt;
}

// ====================================
// 투자 의견 추출
// ====================================
function extractRating(report) {
  const reportLower = report.toLowerCase();
  
  if (reportLower.includes('buy') || reportLower.includes('매수')) {
    return 'BUY';
  }
  if (reportLower.includes('sell') || reportLower.includes('매도')) {
    return 'SELL';
  }
  return 'HOLD';
}
