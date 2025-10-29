// ================================================================================
// Investment Intelligence - 백엔드 서버 (완전판)
// 파일명: api/generate-report.js
// 기능: 네이버 뉴스 수집, Claude AI 분석, 차트 데이터 생성
// ================================================================================

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

    console.log('=== 분석 시작 ===');
    console.log('검색어:', searchQuery);

    // 1. 네이버 뉴스 검색
    let newsData = await searchNaverNews(searchQuery);

    // Fallback: 뉴스 수집 실패 시에도 계속 진행
    if (!newsData || newsData.length === 0) {
      console.log('⚠️ 네이버 API에서 뉴스를 가져올 수 없습니다');
      console.log('→ AI 자체 지식 기반으로 분석 진행');
      newsData = [];
    } else {
      console.log(`✅ 뉴스 ${newsData.length}건 수집 완료`);
    }

    // 2. 감성 분석
    const sentiment = analyzeSentiment(newsData);
    console.log('감성 분석:', sentiment);

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

    console.log('✅ 리포트 생성 완료');

    // 5. 투자 의견 추출
    const rating = extractRating(report);
    console.log('투자 의견:', rating);

    // 6. 응답
    return res.status(200).json({
      report: report,
      rating: rating,
      newsCount: Math.max(newsData.length, 0),
      sentiment: sentiment,
      newsList: newsData.slice(0, 10), // 최대 10개
      dataSource: newsData.length > 0 ? 'naver_news' : 'ai_knowledge',
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

// ================================================================================
// 네이버 뉴스 검색
// ================================================================================
async function searchNaverNews(query) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  // API 키 확인
  if (!clientId || !clientSecret) {
    console.error('❌ 네이버 API 키가 설정되지 않았습니다');
    console.log('환경 변수:');
    console.log('- NAVER_CLIENT_ID:', clientId ? '✅ 있음' : '❌ 없음');
    console.log('- NAVER_CLIENT_SECRET:', clientSecret ? '✅ 있음' : '❌ 없음');
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

      console.log(`  페이지 ${page} 검색 중... (${start}~${start + maxDisplay - 1})`);

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
        console.error(`  ❌ 페이지 ${page} 오류:`, response.status);
        
        // 첫 페이지 실패하면 중단
        if (page === 1) {
          console.error('  첫 페이지 실패 - 검색 중단');
          return [];
        }
        
        // 이후 페이지는 지금까지 수집한 것 반환
        console.log('  이후 페이지 건너뜀');
        break;
      }

      const data = await response.json();
      
      console.log(`  ✅ 페이지 ${page}: ${data.items?.length || 0}건`);

      if (!data.items || data.items.length === 0) {
        console.log('  더 이상 뉴스 없음');
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

      // 최근 7일 뉴스만 (너무 적으면 확장)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      allNews = allNews.filter(news => {
        const newsDate = new Date(news.pubDate);
        return newsDate >= sevenDaysAgo;
      });

      // API 속도 제한 고려 (100ms 대기)
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 충분한 뉴스 수집 시 중단
      if (allNews.length >= 50) {
        console.log('  충분한 뉴스 수집 - 검색 종료');
        break;
      }
    }

    console.log(`✅ 총 ${allNews.length}건 수집 완료`);
    return allNews;

  } catch (error) {
    console.error('❌ 네이버 API 검색 오류:', error.message);
    return [];
  }
}

// ================================================================================
// HTML 태그 제거
// ================================================================================
function removeHtmlTags(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// ================================================================================
// 감성 분석
// ================================================================================
function analyzeSentiment(newsData) {
  if (!newsData || newsData.length === 0) {
    return '중립';
  }

  const positiveWords = ['상승', '증가', '호재', '성장', '개선', '확대', '긍정', '상향', '강세', '급등'];
  const negativeWords = ['하락', '감소', '악재', '둔화', '우려', '하향', '부정', '리스크', '약세', '급락'];

  let positiveCount = 0;
  let negativeCount = 0;

  newsData.forEach(news => {
    const text = (news.title + ' ' + news.description).toLowerCase();
    
    positiveWords.forEach(word => {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      positiveCount += count;
    });
    
    negativeWords.forEach(word => {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      negativeCount += count;
    });
  });

  console.log(`  긍정 키워드: ${positiveCount}, 부정 키워드: ${negativeCount}`);

  if (positiveCount > negativeCount * 1.5) return '긍정적';
  if (negativeCount > positiveCount * 1.5) return '부정적';
  return '중립';
}

// ================================================================================
// 프롬프트 생성
// ================================================================================
function buildPrompt(searchQuery, newsData, uploadedFiles, additionalInfo, sentiment) {
  let prompt = '';

  if (newsData && newsData.length > 0) {
    // 뉴스 기반 분석
    const newsText = newsData.slice(0, 50).map((news, i) => 
      `[뉴스 ${i + 1}]\n제목: ${news.title}\n내용: ${news.description}\n발행일: ${news.pubDate}\n\n`
    ).join('');

    prompt = `당신은 전문 금융 애널리스트입니다.

다음 최신 뉴스 ${newsData.length}건을 분석하여 "${searchQuery}"에 대한 전문적인 투자 리포트를 작성하세요.

=== 최신 뉴스 데이터 ===
${newsText}

=== 리포트 구조 ===

# ${searchQuery} 투자 분석 리포트

## 요약
3줄로 핵심 투자 포인트 요약

## 시장 현황
위 뉴스를 바탕으로 현재 시장 상황 분석

## 주요 이슈
뉴스에서 나타난 핵심 이슈 3가지

## 투자 전망
- 단기 (1-3개월)
- 중기 (6-12개월)

## 리스크 요인
주의해야 할 리스크

## 투자 의견
**최종 의견: BUY / HOLD / SELL 중 하나 명시**

---

**작성 원칙:**
1. 제공된 ${newsData.length}건의 실제 뉴스를 분석에 활용
2. 전문가 수준의 분석
3. 실용적이고 명확한 표현
4. 뉴스 기반의 근거 있는 분석

**시장 감성**: ${sentiment}`;

  } else {
    // AI 지식 기반 분석
    prompt = `당신은 전문 금융 애널리스트입니다.

"${searchQuery}"에 대한 투자 분석 리포트를 작성하세요.

**참고**: 최신 뉴스 데이터를 확보하지 못했습니다. 
AI의 학습된 지식과 일반적인 시장 분석 원칙을 바탕으로 작성해주세요.

=== 리포트 구조 ===

# ${searchQuery} 투자 분석 리포트

## 요약
핵심 투자 포인트

## 시장 현황
일반적인 시장 상황 분석

## 주요 고려사항
투자 시 고려해야 할 요소들

## 투자 전망
- 단기 전망
- 중기 전망

## 리스크 요인
주의사항

## 투자 의견
**최종 의견: BUY / HOLD / SELL 중 하나 명시**

---

**참고**: 본 분석은 최신 뉴스 데이터 없이 작성되었으므로, 
실제 투자 시 최신 정보를 별도로 확인하시기 바랍니다.`;
  }

  if (additionalInfo) {
    prompt += `\n\n=== 추가 고려사항 ===\n${additionalInfo}`;
  }

  return prompt;
}

// ================================================================================
// 투자 의견 추출
// ================================================================================
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
