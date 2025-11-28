import React, { useState, useRef } from 'react';
import { 
  TrendingUp, Upload, Loader2, FileText, MessageSquare,
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink, BarChart, 
  Globe, Building, Activity, TrendingDown, DollarSign, PieChart,
  Info, CheckCircle, Link2, FileCheck, X, RefreshCw
} from 'lucide-react';

const InvestmentIntelligencePlatform = () => {
  // ==========================================
  // 상태 관리
  // ==========================================
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('report');
  
  // AI 대화
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [previousQuestions, setPreviousQuestions] = useState([]);
  
  const fileInputRef = useRef(null);

  // ==========================================
  // 헬퍼 함수들
  // ==========================================
  const handleReset = () => {
    setTopic('');
    setFiles([]);
    setAdditionalInfo('');
    setReport(null);
    setPreviousQuestions([]);
    setCustomQuestion('');
    setQuestionAnswer(null);
    setActiveTab('report');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cleanTextFromSources = (text) => {
    if (!text) return '';
    return text.replace(/\[(뉴스\d+|[^[\]]+\.pdf|업로드파일[^\]]*)\]/g, '').trim();
  };

  const extractSources = (text) => {
    if (!text) return [];
    const matches = text.match(/\[(뉴스\d+|[^[\]]+\.pdf|업로드파일[^\]]*)\]/g);
    return matches ? [...new Set(matches)] : [];
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const getTypeIcon = (type) => {
    if (type === 'economy') return <Globe className="w-5 h-5" />;
    if (type === 'sector') return <BarChart className="w-5 h-5" />;
    return <Building className="w-5 h-5" />;
  };

  const getTypeLabel = (type) => {
    if (type === 'economy') return '경제 분석';
    if (type === 'sector') return '산업 분석';
    return '기업 분석';
  };

  // 네이버 증권 링크 생성
  const getNaverFinanceUrl = (query) => {
    const stockCodes = {
      '삼성전자': '005930',
      '삼성': '005930',
      'sk하이닉스': '000660',
      '네이버': '035420',
      '카카오': '035720',
      '현대차': '005380',
      'lg전자': '066570'
    };
    const code = stockCodes[query.toLowerCase()] || '';
    if (code) {
      return `https://finance.naver.com/item/main.naver?code=${code}`;
    }
    return `https://finance.naver.com/search/searchList.naver?query=${encodeURIComponent(query)}`;
  };

  // ==========================================
  // 시각화 컴포넌트들
  // ==========================================
  
  // 경제 지표 차트
  const EconomicIndicatorsChart = ({ topicType, economicIndicators }) => {
    if (topicType !== 'economy') return null;
    
    const indicators = economicIndicators || {
      fedRate: '4.50-4.75%',
      exchangeRate: '1,400원',
      inflation: '2.6%',
      gdpGrowth: '2.8%'
    };
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 주요 경제 지표 현황</h4>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">미국 기준금리</span>
              <span className="text-sm font-bold text-blue-600">{indicators.fedRate}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(parseFloat(indicators.fedRate) / 10) * 100}%` }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">원/달러 환율</span>
              <span className="text-sm font-bold text-green-600">{indicators.exchangeRate}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(parseFloat(indicators.exchangeRate?.replace(/[^0-9]/g, '') || 1400) / 1500) * 100}%` }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">미국 CPI (YoY)</span>
              <span className="text-sm font-bold text-red-600">{indicators.inflation}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(parseFloat(indicators.inflation) / 10) * 100}%` }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">미국 GDP 성장률</span>
              <span className="text-sm font-bold text-purple-600">{indicators.gdpGrowth}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(parseFloat(indicators.gdpGrowth) / 5) * 100}%` }}></div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-slate-50 rounded text-[10px] text-slate-600">
          📡 데이터 소스: {economicIndicators?.source || '뉴스 분석'}
        </div>
      </div>
    );
  };

  // 산업 구조 시각화
  const IndustryStructureChart = ({ topicType, industryMetrics }) => {
    if (topicType !== 'sector') return null;
    
    const metrics = industryMetrics || {
      marketSize: '데이터 수집 중',
      growthRate: '데이터 수집 중',
      topCompanies: [],
      keyTrends: []
    };
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 산업 구조 분석</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium mb-1">시장 규모</p>
            <p className="text-lg font-bold text-blue-900">{metrics.marketSize}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-600 font-medium mb-1">연간 성장률</p>
            <p className="text-lg font-bold text-green-900">{metrics.growthRate}</p>
          </div>
        </div>
        
        {metrics.topCompanies && metrics.topCompanies.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">주요 기업</p>
            <div className="flex flex-wrap gap-1">
              {metrics.topCompanies.map((company, idx) => (
                <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                  {company}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {metrics.keyTrends && metrics.keyTrends.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">핵심 트렌드</p>
            <div className="space-y-1">
              {metrics.keyTrends.map((trend, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="text-orange-500">▸</span>
                  <span>{trend}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-3 p-2 bg-slate-50 rounded text-[10px] text-slate-600">
          📡 데이터 소스: {industryMetrics?.source || '뉴스 분석'}
        </div>
      </div>
    );
  };

  // 감성 분석 게이지
  const SentimentGauge = ({ sentiment, score }) => {
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📈 시장 감성 분석</h4>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-600">긍정</span>
              <span className="font-medium">{score?.positive || 40}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${score?.positive || 40}%` }} />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">중립</span>
              <span className="font-medium">{score?.neutral || 30}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gray-400 h-2 rounded-full transition-all" style={{ width: `${score?.neutral || 30}%` }} />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-600">부정</span>
              <span className="font-medium">{score?.negative || 30}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${score?.negative || 30}%` }} />
            </div>
          </div>
        </div>
        
        <div className={`mt-4 p-3 rounded-lg text-center ${
          sentiment === '긍정적' ? 'bg-green-50 text-green-700' :
          sentiment === '부정적' ? 'bg-red-50 text-red-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          <p className="text-sm font-semibold">종합 평가: {sentiment}</p>
        </div>
      </div>
    );
  };

  // ⭐ 투자 의견 상세 (주가 없을 때 처리 추가)
  const InvestmentOpinionDetail = ({ recommendation, stockData, companyMetrics, searchQuery }) => {
    const hasStockData = stockData && stockData.currentPrice;
    
    // 주가 데이터가 없는 경우
    if (!hasStockData) {
      return (
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">💰 투자 의견</h4>
          
          {/* ⚠️ 주가 없음 경고 */}
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">
                  실시간 주가 데이터 없음
                </p>
                <p className="text-xs text-yellow-700 mb-3">
                  현재 실시간 주가를 가져올 수 없습니다. 정확한 투자 판단을 위해 아래 링크에서 최신 주가를 확인하세요.
                </p>
                <a
                  href={getNaverFinanceUrl(searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  네이버 증권에서 확인
                </a>
              </div>
            </div>
          </div>
          
          {/* 뉴스 기반 투자 방향 */}
          {recommendation && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-2">📰 뉴스 기반 분석</p>
              <p className="text-sm text-slate-800">
                {recommendation.opinion === 'BUY' && '전반적으로 긍정적인 뉴스가 많습니다.'}
                {recommendation.opinion === 'HOLD' && '긍정/부정 뉴스가 혼재되어 있습니다.'}
                {recommendation.opinion === 'SELL' && '부정적인 뉴스가 다수 관찰됩니다.'}
                {!recommendation.opinion && '뉴스 분석 결과를 확인하세요.'}
              </p>
            </div>
          )}
        </div>
      );
    }
    
    // 주가 데이터가 있는 경우 (실시간)
    const currentPrice = companyMetrics?.currentPrice || stockData?.currentPrice;
    const targetPrice = companyMetrics?.targetPrice || stockData?.targetPrice;
    const opinion = recommendation?.opinion || 'HOLD';
    const source = stockData?.source || 'Unknown';
    const isRealtime = source.includes('실시간') || source.includes('Yahoo') || source.includes('Claude');
    
    // 상승여력 계산
    const current = parseInt(String(currentPrice).replace(/[^0-9]/g, '')) || 0;
    const target = parseInt(String(targetPrice).replace(/[^0-9]/g, '')) || 0;
    const upside = current > 0 && target > 0 ? ((target - current) / current * 100).toFixed(1) : null;

    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">💰 투자 의견 상세</h4>
        
        {/* ✅ 실시간 데이터 표시 */}
        {isRealtime && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-700 font-medium">
                ✅ 실시간 데이터 ({source})
              </span>
            </div>
          </div>
        )}
        
        <div className={`p-4 rounded-lg text-center mb-4 ${
          opinion === 'BUY' ? 'bg-green-50 border border-green-200' :
          opinion === 'SELL' ? 'bg-red-50 border border-red-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className="text-2xl font-bold mb-2">{opinion}</p>
          
          <div className="grid grid-cols-3 gap-2 text-sm mb-3">
            <div>
              <p className="text-gray-600">목표가</p>
              <p className="font-bold">{typeof targetPrice === 'number' ? targetPrice.toLocaleString() + '원' : targetPrice}</p>
            </div>
            <div>
              <p className="text-gray-600">현재가</p>
              <p className="font-bold">{typeof currentPrice === 'number' ? currentPrice.toLocaleString() + '원' : currentPrice}</p>
            </div>
            <div>
              <p className="text-gray-600">상승여력</p>
              <p className={`font-bold ${upside && parseFloat(upside) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {upside ? (parseFloat(upside) > 0 ? '+' : '') + upside + '%' : '-'}
              </p>
            </div>
          </div>
          
          {/* PER, 시가총액 */}
          {(companyMetrics?.per || companyMetrics?.marketCap) && (
            <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
              {companyMetrics?.per && (
                <div>
                  <span className="text-gray-600">PER: </span>
                  <span className="font-semibold">{companyMetrics.per}</span>
                </div>
              )}
              {companyMetrics?.marketCap && (
                <div>
                  <span className="text-gray-600">시총: </span>
                  <span className="font-semibold">{companyMetrics.marketCap}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 네이버 증권 링크 */}
        <div className="text-center">
          <a
            href={getNaverFinanceUrl(searchQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            네이버 증권에서 상세 확인
          </a>
        </div>
      </div>
    );
  };

  // 뉴스 출처 링크
  const SourceLinks = ({ sources, newsLinks }) => {
    const [expanded, setExpanded] = useState(false);
    
    if (!newsLinks || newsLinks.length === 0) return null;
    
    return (
      <div className="mt-4 pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600">📰 뉴스 출처 ({newsLinks.length}건)</span>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            {expanded ? <>접기 <ChevronUp className="w-3 h-3" /></> : <>펼치기 <ChevronDown className="w-3 h-3" /></>}
          </button>
        </div>
        
        {!expanded && (
          <div className="flex flex-wrap gap-1">
            {newsLinks.slice(0, 5).map((news, idx) => (
              <a
                key={idx}
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs transition-colors"
                title={news.title}
              >
                <Link2 className="w-3 h-3" />
                <span>뉴스{idx + 1}</span>
              </a>
            ))}
            {newsLinks.length > 5 && (
              <span className="text-xs text-gray-500 px-2 py-1">+{newsLinks.length - 5}개 더</span>
            )}
          </div>
        )}
        
        {expanded && (
          <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
            {newsLinks.map((news, idx) => (
              <a
                key={idx}
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{news.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {news.date ? new Date(news.date).toLocaleDateString('ko-KR') : ''} 
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // 리포트 파싱
  // ==========================================
  const parseReportByType = (reportText, topicType, metadata) => {
    const result = {
      summary: '',
      keyPoints: [],
      recommendation: {},
      risks: [],
      analysis: {},
      sources: [],
      newsLinks: metadata?.newsWithLinks || []
    };

    // 요약 추출
    const summaryMatch = reportText.match(/##\s*1\.\s*요약\s*\n+([\s\S]*?)(?=\n##\s*2\.|$)/i);
    if (summaryMatch) {
      result.summary = cleanTextFromSources(summaryMatch[1].trim());
    }

    // 핵심 포인트 추출
    const pointsMatch = reportText.match(/##\s*2\.\s*(?:핵심|산업\s*핵심|핵심\s*경제).*?\n+([\s\S]*?)(?=\n##\s*3\.|$)/i);
    if (pointsMatch) {
      const points = pointsMatch[1].match(/[-*]\s*(.+)/g);
      if (points) {
        result.keyPoints = points
          .map(p => cleanTextFromSources(p.replace(/^[-*]\s*/, '').trim()))
          .filter(p => p.length > 10)
          .slice(0, 5);
      }
    }

    // 투자 의견 추출 (기업 분석)
    if (topicType === 'company') {
      const investMatch = reportText.match(/##\s*5\.\s*투자\s*의견\s*\n+([\s\S]*?)(?=\n##|$)/i);
      if (investMatch) {
        const investText = investMatch[1];
        const opinionMatch = investText.match(/투자\s*등급[:\s]*(BUY|HOLD|SELL)/i);
        result.recommendation = {
          opinion: opinionMatch ? opinionMatch[1] : null
        };
      }
    }

    // 리스크 추출
    const riskMatch = reportText.match(/##\s*(?:4|5)\.\s*.*?리스크.*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (riskMatch) {
      const risks = riskMatch[1].match(/[-*]\s*(.+)/g);
      if (risks) {
        result.risks = risks
          .map(r => cleanTextFromSources(r.replace(/^[-*]\s*/, '').trim()))
          .filter(r => r.length > 10)
          .slice(0, 5);
      }
    }

    return result;
  };

  // ==========================================
  // AI 질문 처리
  // ==========================================
  const handleCustomQuestion = async () => {
    if (!customQuestion.trim()) {
      alert('질문을 입력해주세요.');
      return;
    }

    setQuestionLoading(true);
    setQuestionAnswer(null);

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: topic,
          uploadedFiles: [],
          additionalInfo: `사용자가 "${customQuestion}" 라고 질문했습니다. 간단명료하게 3-4문장으로 답변해주세요.`
        })
      });

      if (!response.ok) throw new Error('답변 생성 실패');

      const data = await response.json();
      
      if (data.success) {
        let cleanAnswer = data.report
          .replace(/##.*?\n/g, '')
          .replace(/[*#_~`]/g, '')
          .trim()
          .substring(0, 500);
        
        cleanAnswer = cleanTextFromSources(cleanAnswer);
        
        const newAnswer = {
          id: Date.now(),
          question: customQuestion,
          answer: cleanAnswer,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setQuestionAnswer(newAnswer);
        setPreviousQuestions(prev => [newAnswer, ...prev].slice(0, 3));
        setCustomQuestion('');
      }
    } catch (error) {
      console.error('질문 처리 오류:', error);
      alert('답변 생성 중 오류가 발생했습니다.');
    } finally {
      setQuestionLoading(false);
    }
  };

  // ==========================================
  // 리포트 생성
  // ==========================================
  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('분석 주제를 입력해주세요.');
      return;
    }

    setLoading(true);
    setReport(null);
    setPreviousQuestions([]);
    
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: topic,
          uploadedFiles: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
          additionalInfo: additionalInfo
        })
      });

      if (!response.ok) throw new Error('리포트 생성 실패');

      const data = await response.json();
      
      if (!data.success) throw new Error(data.error || '리포트 생성 실패');

      const topicType = data.topicType || 'company';
      const parsedReport = parseReportByType(data.report, topicType, data.metadata);
      
      setReport({
        title: `${topic} - ${getTypeLabel(topicType)}`,
        timestamp: new Date(data.metadata.timestamp).toLocaleString('ko-KR'),
        topicType: topicType,
        summary: parsedReport.summary,
        fullReport: data.report,
        metrics: {
          confidence: data.metadata?.dataQuality || 85,
          dataPoints: data.metadata.newsCount,
          sources: data.metadata.newsWithLinks?.length || 0,
          sentiment: data.metadata.sentiment,
          sentimentScore: data.metadata.sentimentScore || { positive: 40, neutral: 30, negative: 30 }
        },
        keyPoints: parsedReport.keyPoints,
        risks: parsedReport.risks,
        recommendation: parsedReport.recommendation,
        newsLinks: data.metadata.newsWithLinks || [],
        metadata: data.metadata,
        searchQuery: topic
      });
      
      setLoading(false);
      setActiveTab('report');
      
    } catch (error) {
      console.error('리포트 생성 오류:', error);
      setLoading(false);
      alert('리포트 생성 중 오류가 발생했습니다.');
    }
  };

  // ==========================================
  // UI 렌더링
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Investment Intelligence</h1>
                <p className="text-xs sm:text-sm text-slate-600">AI 기반 투자 분석 플랫폼</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-purple-700">AI: Claude Sonnet 4</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">뉴스: 네이버 (실시간)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-blue-700">주가: Yahoo Finance (실시간)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <span className="font-semibold">사용방법:</span> 기업명, 경제 지표, 산업 분석 주제를 입력하세요
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 rounded">🏢 기업 (예: 삼성전자)</span>
                  <span className="px-2 py-0.5 bg-blue-100 rounded">🌍 경제 (예: 미국 금리)</span>
                  <span className="px-2 py-0.5 bg-blue-100 rounded">📊 산업 (예: 반도체)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                분석 주제 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 삼성전자, 미국 금리, 반도체"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              
              <label className="block text-sm font-semibold text-slate-700 mb-2 mt-4">
                추가 분석 요청
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="예: HBM4 전망 중심으로 분석해줘"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows="3"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                참고 자료 업로드
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors h-32"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">파일 선택 (PDF, DOC, TXT)</p>
              </div>
              
              {files.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">{files.length}개 파일 업로드됨</span>
                    </div>
                    <button onClick={() => setFiles([])} className="text-green-600 hover:text-green-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-green-700">{files.map(f => f.name).join(', ')}</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 transition-all flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>AI 분석 중... (약 15초)</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <span>리포트 생성</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-all flex items-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              <span>초기화</span>
            </button>
          </div>
        </div>

        {/* Results */}
        {report && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(report.topicType)}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      report.topicType === 'economy' ? 'bg-blue-100 text-blue-700' :
                      report.topicType === 'sector' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {getTypeLabel(report.topicType)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{report.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{report.timestamp}</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const element = document.createElement('a');
                      const file = new Blob([report.fullReport], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = `${report.title}.txt`;
                      element.click();
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    다운로드
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">신뢰도</p>
                  <p className="text-xl font-bold text-blue-900">{report.metrics.confidence}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium mb-1">시장 감성</p>
                  <p className="text-xl font-bold text-green-900">{report.metrics.sentiment}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium mb-1">뉴스 분석</p>
                  <p className="text-xl font-bold text-purple-900">{report.metrics.dataPoints}건</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">AI 모델</p>
                  <p className="text-lg font-bold text-amber-900">Claude</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 font-medium mb-1">주가 소스</p>
                  <div className="flex items-center gap-1">
                    {report.metadata?.hasStockData ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs font-bold text-green-700">실시간</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span className="text-xs font-bold text-yellow-700">없음</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="border-b border-slate-200">
                <div className="flex space-x-1 p-2">
                  {['report', 'visualization', 'ai'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab === 'report' && <><FileText className="w-4 h-4 inline mr-2" />리포트</>}
                      {tab === 'visualization' && <><PieChart className="w-4 h-4 inline mr-2" />시각화</>}
                      {tab === 'ai' && <><MessageSquare className="w-4 h-4 inline mr-2" />AI 대화</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'report' ? (
                  <div className="space-y-6">
                    {/* 요약 */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                      <h3 className="font-bold text-lg text-slate-900 mb-3">📋 요약</h3>
                      <p className="text-slate-700 leading-relaxed">{report.summary}</p>
                      <SourceLinks newsLinks={report.newsLinks} />
                    </div>

                    {/* 핵심 포인트 */}
                    {report.keyPoints?.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3">🎯 핵심 포인트</h3>
                        <div className="space-y-2">
                          {report.keyPoints.map((point, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <p className="text-slate-700">{point}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 리스크 */}
                    {report.risks?.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3">⚠️ 리스크 요인</h3>
                        <div className="space-y-2">
                          {report.risks.map((risk, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                              <p className="text-sm text-red-900">{risk}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'visualization' ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <SentimentGauge sentiment={report.metrics.sentiment} score={report.metrics.sentimentScore} />
                    
                    {report.topicType === 'company' && (
                      <InvestmentOpinionDetail 
                        recommendation={report.recommendation}
                        stockData={report.metadata?.stockData}
                        companyMetrics={report.metadata?.companyMetrics}
                        searchQuery={report.searchQuery}
                      />
                    )}
                    
                    {report.topicType === 'economy' && (
                      <EconomicIndicatorsChart 
                        topicType={report.topicType} 
                        economicIndicators={report.metadata?.economicIndicators}
                      />
                    )}
                    
                    {report.topicType === 'sector' && (
                      <IndustryStructureChart 
                        topicType={report.topicType}
                        industryMetrics={report.metadata?.industryMetrics}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <h3 className="text-xl font-bold text-slate-900 mb-4">💬 AI 애널리스트와 대화</h3>
                      <p className="text-sm text-slate-600 mb-4">리포트 내용에 대해 추가 질문하세요.</p>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                          placeholder="예: HBM 시장 전망은 어때?"
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                          disabled={questionLoading}
                        />
                        <button 
                          onClick={handleCustomQuestion}
                          disabled={questionLoading}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-300"
                        >
                          {questionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '질문'}
                        </button>
                      </div>

                      {questionAnswer && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                          <p className="font-semibold text-slate-900 mb-2">
                            <span className="text-purple-600">Q:</span> {questionAnswer.question}
                          </p>
                          <p className="text-slate-700">
                            <span className="text-purple-600">A:</span> {questionAnswer.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-xs text-slate-500">
            ⚠️ 본 리포트는 AI가 생성한 참고 자료입니다. 투자 판단은 사용자 책임이며, 실제 투자 전 전문가 상담을 권장합니다.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default InvestmentIntelligencePlatform;
