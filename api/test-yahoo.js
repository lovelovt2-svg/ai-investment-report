// ====================================
// API 테스트 페이지
// 파일명: api/test-yahoo.js
// ====================================

export default async function handler(req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // 1. 환경 변수 확인
  results.env = {
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY ? '✅ 있음' : '❌ 없음',
    RAPIDAPI_KEY_LENGTH: process.env.RAPIDAPI_KEY?.length || 0,
    NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID ? '✅ 있음' : '❌ 없음',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✅ 있음' : '❌ 없음'
  };

  // 2. Yahoo Finance 테스트 (삼성전자)
  if (process.env.RAPIDAPI_KEY) {
    try {
      console.log('🔍 Yahoo Finance 테스트 시작...');
      
      const response = await fetch(
        'https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes?ticker=005930.KS',
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
          }
        }
      );

      console.log('📡 응답 상태:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 응답 데이터:', JSON.stringify(data).substring(0, 200));
        
        // 응답 구조 확인
        const stock = data.body?.[0] || data.body?.quote || data.body || null;
        
        results.tests.yahooFinance = {
          status: '✅ 성공',
          statusCode: response.status,
          hasBody: !!data.body,
          bodyType: Array.isArray(data.body) ? 'array' : typeof data.body,
          bodyKeys: data.body ? Object.keys(data.body).slice(0, 10) : [],
          stockData: stock ? {
            currentPrice: stock.regularMarketPrice || stock.price || null,
            targetPrice: stock.targetMeanPrice || null,
            pe: stock.trailingPE || stock.pe || null,
            marketCap: stock.marketCap || null
          } : null,
          rawSample: JSON.stringify(data).substring(0, 500)
        };
      } else {
        const errorText = await response.text();
        results.tests.yahooFinance = {
          status: '❌ 실패',
          statusCode: response.status,
          error: errorText.substring(0, 200)
        };
      }
    } catch (error) {
      results.tests.yahooFinance = {
        status: '❌ 에러',
        error: error.message
      };
    }
  } else {
    results.tests.yahooFinance = {
      status: '⚠️ API 키 없음'
    };
  }

  // 3. 네이버 뉴스 테스트
  if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    try {
      const response = await fetch(
        'https://openapi.naver.com/v1/search/news.json?query=삼성전자&display=3',
        {
          headers: {
            'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        results.tests.naverNews = {
          status: '✅ 성공',
          newsCount: data.items?.length || 0,
          sample: data.items?.[0]?.title || 'N/A'
        };
      } else {
        results.tests.naverNews = {
          status: '❌ 실패',
          statusCode: response.status
        };
      }
    } catch (error) {
      results.tests.naverNews = {
        status: '❌ 에러',
        error: error.message
      };
    }
  } else {
    results.tests.naverNews = {
      status: '⚠️ API 키 없음'
    };
  }

  // HTML 형태로 보기 좋게 출력
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>API 테스트 결과</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #f5f5f5; }
    .section { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .success { color: #22c55e; }
    .error { color: #ef4444; }
    .warning { color: #f59e0b; }
    pre { background: #f9f9f9; padding: 10px; border-radius: 4px; overflow-x: auto; }
    h2 { margin-top: 0; }
  </style>
</head>
<body>
  <h1>🔍 API 연결 테스트 결과</h1>
  
  <div class="section">
    <h2>1️⃣ 환경 변수</h2>
    <pre>${JSON.stringify(results.env, null, 2)}</pre>
  </div>

  <div class="section">
    <h2>2️⃣ Yahoo Finance API</h2>
    <pre>${JSON.stringify(results.tests.yahooFinance, null, 2)}</pre>
  </div>

  <div class="section">
    <h2>3️⃣ 네이버 뉴스 API</h2>
    <pre>${JSON.stringify(results.tests.naverNews, null, 2)}</pre>
  </div>

  <div class="section">
    <h2>✅ 판정</h2>
    <p class="${results.tests.yahooFinance?.status?.includes('성공') ? 'success' : 'error'}">
      <strong>Yahoo Finance:</strong> ${results.tests.yahooFinance?.status || '미테스트'}
    </p>
    <p class="${results.tests.naverNews?.status?.includes('성공') ? 'success' : 'error'}">
      <strong>네이버 뉴스:</strong> ${results.tests.naverNews?.status || '미테스트'}
    </p>
  </div>

  <div class="section">
    <h2>🔄 다시 테스트</h2>
    <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
      새로고침
    </button>
  </div>
</body>
</html>
`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}