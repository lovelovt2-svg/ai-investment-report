// ====================================
// 백엔드 서버 (Vercel Serverless Function)
// 파일명: api/generate-report.js
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

    // 1. Google News 검색 (실제 구현)
    const newsData = await fetchGoogleNews(searchQuery);

    // 2. 프롬프트 생성
    const prompt = buildPrompt(searchQuery, newsData, uploadedFiles, additionalInfo);

    // 3. Claude API 호출 (당신의 API 키 사용!)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Vercel 환경 변수에 저장
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

    // 4. 투자의견 추출
    let rating = 'HOLD';
    if (reportContent.includes('BUY') || reportContent.includes('매수')) {
      rating = 'BUY';
    } else if (reportContent.includes('SELL') || reportContent.includes('매도')) {
      rating = 'SELL';
    }

    return res.status(200).json({
      success: true,
      report: reportContent,
      rating: rating,
      newsCount: newsData.length,
      sentiment: newsData.sentiment,
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

// Google News 검색 함수
async function fetchGoogleNews(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;
    
    // CORS 우회 프록시
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    // XML 파싱 (간단한 정규식 사용)
    const xmlContent = data.contents;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
    const linkRegex = /<link>(.*?)<\/link>/g;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/g;
    
    const titles = [...xmlContent.matchAll(titleRegex)].map(m => m[1]);
    const links = [...xmlContent.matchAll(linkRegex)].map(m => m[1]);
    const dates = [...xmlContent.matchAll(pubDateRegex)].map(m => m[1]);
    
    const news = [];
    for (let i = 1; i < Math.min(titles.length, 11); i++) { // 첫 번째는 피드 제목이므로 스킵
      news.push({
        title: titles[i],
        link: links[i],
        pubDate: dates[i - 1],
        source: 'Google News'
      });
    }
    
    // 감성 분석
    const positive = ['상승', '호조', '증가', '개선', '성장', '급등', '강세', '확대'];
    const negative = ['하락', '부진', '감소', '악화', '급락', '약세', '축소', '우려'];
    
    let sentiment = 0;
    news.forEach(n => {
      positive.forEach(word => { if (n.title.includes(word)) sentiment++; });
      negative.forEach(word => { if (n.title.includes(word)) sentiment--; });
    });
    
    const sentimentText = sentiment > 2 ? "매우 긍정적" : 
                         sentiment > 0 ? "긍정적" :
                         sentiment < -2 ? "매우 부정적" :
                         sentiment < 0 ? "부정적" : "중립적";
    
    news.sentiment = sentimentText;
    return news;
    
  } catch (error) {
    console.error('News fetch error:', error);
    return [];
  }
}

// 프롬프트 생성 함수
function buildPrompt(query, newsData, uploadedFiles, additionalInfo) {
  const filesSection = uploadedFiles && uploadedFiles.length > 0 ? `
## 📄 업로드된 증권사/리서치 리포트 (${uploadedFiles.length}개)
${uploadedFiles.map((f, i) => `${i + 1}. **${f.name}** (${f.size})`).join('\n')}

**중요**: 위 리포트들의 전문가 인사이트를 분석에 반영하세요.
` : '';

  const additionalSection = additionalInfo ? `
## 💭 사용자 추가 정보
${additionalInfo}
` : '';

  return `당신은 20년 경력의 투자 전문가이자 금융 애널리스트입니다.

# 분석 요청
**"${query}"**

위 주제에 대한 **완전히 새로운 투자 리포트**를 작성하세요.

---

# 실시간 수집 데이터 (정확한 정보)

## 📰 Google News 실시간 검색 결과 (${newsData.length}건)
**수집 시각**: ${new Date().toLocaleString('ko-KR')}
**시장 감성**: ${newsData.sentiment}

${newsData.map((n, i) => `
${i + 1}. **${n.title}**
   - 출처: ${n.source}
   - 시간: ${n.pubDate}
`).join('\n')}

${filesSection}

${additionalSection}

---

# 리포트 작성 지침

## 1. 핵심 요약 (3-5문장)
- 가장 중요한 포인트를 명확하게
- 투자자가 즉시 이해할 수 있도록

## 2. 시장 상황 분석
- 실시간 뉴스 기반 현재 상황
- 시장 감성: ${newsData.sentiment}
- 주요 이슈 및 트렌드

## 3. 핵심 투자 포인트 (5-7가지)
각 포인트를 구체적으로:
• **포인트 제목**
  - 현황: 구체적 설명
  - 근거: 뉴스 및 데이터
  - 시사점: 투자 전략

## 4. 리스크 요인
- 단기 리스크
- 중장기 리스크
- 대응 전략

## 5. 투자 전략 및 권고
- 구체적인 투자 방향
- 포트폴리오 구성 제안
- 타이밍 전략

## 6. 결론 및 향후 전망
- 핵심 메시지 재강조
- 주목할 지표/이벤트
- 최종 투자 의견

---

# 작성 원칙

1. **정확성**: 실제 수집된 뉴스 데이터 정확히 반영
2. **최신성**: 실시간 정보 기반 분석
3. **실용성**: 실제 투자에 활용 가능
4. **전문성**: 전문 애널리스트 수준
5. **명확성**: 핵심이 분명하고 읽기 쉽게

---

**작성일**: ${new Date().toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long', 
  day: 'numeric',
  weekday: 'long'
})}

**데이터 출처**: 
- Google News 실시간 검색 (${newsData.length}건)
${uploadedFiles && uploadedFiles.length > 0 ? `- 업로드 리포트 (${uploadedFiles.length}개)` : ''}
${additionalInfo ? '- 사용자 추가 정보' : ''}

**시장 감성**: ${newsData.sentiment}

---

위 실시간 정보를 바탕으로 완전히 새로운, 실전 투자에 활용 가능한 리포트를 작성하세요.`;
}