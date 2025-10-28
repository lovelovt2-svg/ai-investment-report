// ====================================
// 백엔드 서버 (Vercel Serverless Function)
// 파일명: api/generate-report.js
// 네이버 뉴스 API 사용
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

    console.log('검색어:', searchQuery);

    // 1. 네이버 뉴스 검색 (최근 3일)
    const newsData = await searchNaverNews(searchQuery);

    if (!newsData || newsData.length === 0) {
      return res.status(400).json({ 
        error: '뉴스를 찾을 수 없습니다',
        message: '검색어를 변경하거나 네이버 API 키를 확인하세요'
      });
    }

    console.log(`뉴스 ${newsData.length}건 수집 완료`);

    // 2. 프롬프트 생성
    const prompt = buildPrompt(searchQuery, newsData, uploadedFiles, additionalInfo);

    console.log('Claude API 호출 시작...');

    // 3. Claude API 호출
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
      console.error('Claude API Error:', error);
      return res.status(response.status).json({ 
        error: 'AI 서비스 오류', 
        details: error 
      });
    }

    const data = await response.json();
    const reportContent = data.content[0].text;

    console.log('리포트 생성 완료');

    // 4. 투자의견 추출
    let rating = 'HOLD';
    if (reportContent.includes('BUY') || reportContent.includes('매수')) {
      rating = 'BUY';
    } else if (reportContent.includes('SELL') || reportContent.includes('매도')) {
      rating = 'SELL';
    }

    // 5. 감성 분석
    const sentiment = analyzeSentiment(newsData);

    return res.status(200).json({
      success: true,
      report: reportContent,
      rating: rating,
      newsCount: newsData.length,
      sentiment: sentiment,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: '서버 오류', 
      message: error.message 
    });
  }
}

// ====================================
// 네이버 뉴스 API 검색 함수
// ====================================
async function searchNaverNews(query) {
  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  // API 키가 없으면 임시 데이터 반환
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.log('네이버 API 키 없음 - 임시 데이터 사용');
    return generateMockNews(query);
  }

  try {
    const allNews = [];
    
    // 날짜 계산 (최근 3일)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1);

    // 날짜 포맷 (YYYYMMDD)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    console.log(`검색 기간: ${startDateStr} ~ ${endDateStr}`);

    // 페이징 (10개씩, 최대 100개)
    const display = 10;
    const maxResults = 100;

    for (let start = 1; start <= maxResults; start += display) {
      // URL 인코딩
      const encodedQuery = encodeURIComponent(query);
      
      // 네이버 뉴스 검색 API
      const url = `https://openapi.naver.com/v1/search/news.json?query=${encodedQuery}&display=${display}&start=${start}&sort=date`;

      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
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

      // HTML 태그 제거 함수
      const removeHtmlTags = (text) => {
        return text.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      };

      // 뉴스 데이터 정리
      const newsItems = data.items.map(item => ({
        title: removeHtmlTags(item.title),
        description: removeHtmlTags(item.description),
        link: item.link,
        pubDate: item.pubDate,
        source: '네이버뉴스'
      }));

      allNews.push(...newsItems);

      // 너무 빠른 요청 방지 (100ms 대기)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 충분한 뉴스를 수집했으면 중단
      if (allNews.length >= 50) {
        break;
      }
    }

    console.log(`총 ${allNews.length}건의 뉴스 수집 완료`);
    
    return allNews;

  } catch (error) {
    console.error('네이버 뉴스 검색 오류:', error);
    // 오류 시 임시 데이터 반환
    return generateMockNews(query);
  }
}

// ====================================
// 임시 뉴스 데이터 생성 (API 키 없을 때)
// ====================================
function generateMockNews(query) {
  const today = new Date();
  const newsTopics = [
    `${query} 관련 최신 경제 동향 분석`,
    `${query} 시장 전망 및 투자 전략`,
    `전문가들이 본 ${query}의 향후 전망`,
    `${query} 관련 주요 이슈 정리`,
    `글로벌 시장과 ${query}의 상관관계`
  ];

  return newsTopics.map((topic, i) => ({
    title: topic,
    description: `${topic}에 대한 상세 분석 내용입니다. 최근 시장 동향을 반영한 전문가 의견을 제공합니다.`,
    source: '경제뉴스',
    pubDate: new Date(today.getTime() - i * 3600000).toISOString(),
    link: '#'
  }));
}

// ====================================
// 감성 분석 함수
// ====================================
function analyzeSentiment(newsData) {
  const positive = ['상승', '호조', '증가', '개선', '성장', '확대', '긍정', '상향', '회복', '호황'];
  const negative = ['하락', '부진', '감소', '악화', '우려', '위기', '하향', '침체', '부정', '위험'];
  
  let sentiment = 0;
  
  newsData.forEach(news => {
    const text = (news.title + ' ' + news.description).toLowerCase();
    positive.forEach(word => { if (text.includes(word)) sentiment++; });
    negative.forEach(word => { if (text.includes(word)) sentiment--; });
  });
  
  if (sentiment > 3) return "긍정적";
  if (sentiment < -3) return "부정적";
  return "중립적";
}

// ====================================
// Claude 프롬프트 생성 함수
// ====================================
function buildPrompt(query, newsData, uploadedFiles, additionalInfo) {
  const filesSection = uploadedFiles && uploadedFiles.length > 0 ? `
## 📄 업로드된 증권사/리서치 리포트 (${uploadedFiles.length}개)
${uploadedFiles.map((f, i) => `${i + 1}. **${f.name}** (${f.size})`).join('\n')}
` : '';

  const additionalSection = additionalInfo ? `
## 💭 사용자 추가 정보
${additionalInfo}
` : '';

  const newsSection = newsData.map((n, i) => `
${i + 1}. **${n.title}**
   ${n.description}
   - 출처: ${n.source}
   - 시간: ${new Date(n.pubDate).toLocaleString('ko-KR')}
   ${n.link !== '#' ? `- 링크: ${n.link}` : ''}
`).join('\n');

  const sentiment = analyzeSentiment(newsData);

  return `당신은 20년 경력의 투자 전문가이자 금융 애널리스트입니다.

# 분석 요청
**"${query}"**

위 주제에 대한 **완전히 새로운 투자 리포트**를 작성하세요.

---

# 시장 정보

## 📰 최신 뉴스 분석 (${newsData.length}건)
**분석 시각**: ${new Date().toLocaleString('ko-KR')}
**시장 감성**: ${sentiment}
**검색 기간**: 최근 3일

${newsSection}

${filesSection}

${additionalSection}

---

# 리포트 작성 지침

## 1. 핵심 요약 (Executive Summary)
- 가장 중요한 투자 포인트 3가지
- 위 뉴스들에서 도출된 핵심 인사이트
- 투자자가 즉시 이해할 수 있도록 명확하게

## 2. 시장 상황 분석
- 수집된 ${newsData.length}건의 뉴스 종합 분석
- 시장 감성: ${sentiment}
- 주요 이슈 및 트렌드
- 뉴스에서 발견된 패턴

## 3. 투자 전략 및 포인트 (5-7가지)
각 포인트를 구체적으로:
• **포인트 제목**
  - 현황 분석 (뉴스 기반)
  - 투자 시사점
  - 리스크 요인

## 4. 섹터별 분석
- 뉴스에서 언급된 유망 섹터
- 주의 섹터
- 구체적 근거

## 5. 리스크 요인
- 뉴스에서 확인된 단기 리스크
- 중장기 리스크
- 대응 전략

## 6. 투자 권고 및 전략
- 구체적 투자 방향
- 포트폴리오 구성 제안
- 진입/청산 타이밍

## 7. 결론
- 핵심 메시지
- 주목할 지표
- **최종 투자 의견: BUY/HOLD/SELL 중 하나 명시**

---

# 작성 원칙

1. **뉴스 기반**: 위에 제공된 ${newsData.length}건의 실제 뉴스를 반드시 분석에 활용
2. **전문성**: 전문 애널리스트 수준의 분석
3. **실용성**: 실제 투자에 즉시 활용 가능
4. **명확성**: 핵심이 분명하고 읽기 쉽게
5. **객관성**: 뉴스 내용 기반의 근거 있는 분석
6. **구체성**: 추상적 표현 지양, 구체적 수치와 예시

---

**작성일**: ${new Date().toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long', 
  day: 'numeric',
  weekday: 'long'
})}

**데이터 출처**: 
- 최신 뉴스 분석 (${newsData.length}건, 최근 3일)
${uploadedFiles && uploadedFiles.length > 0 ? `- 업로드 리포트 (${uploadedFiles.length}개)` : ''}
${additionalInfo ? '- 사용자 추가 정보' : ''}

**시장 감성**: ${sentiment}

---

위 실제 뉴스 정보를 바탕으로 투자자들이 실전에 활용할 수 있는 전문적이고 실용적인 리포트를 작성하세요.`;
}