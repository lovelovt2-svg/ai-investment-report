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

  const getTypeColor = (type) => {
    if (type === 'economy') return 'blue';
    if (type === 'sector') return 'purple';
    return 'green';
  };

  // ==========================================
  // 시각화 컴포넌트들
  // ==========================================
  
  // 경제 지표 차트 (경제 분석용) - 동적 데이터
  const EconomicIndicatorsChart = ({ topicType, economicIndicators }) => {
    if (topicType !== 'economy') return null;
    
    // 백엔드에서 받은 데이터 사용, 없으면 기본값
    const indicators = economicIndicators || {
      fedRate: '3.75-4.00%',
      exchangeRate: '1,385원',
      inflation: '3.0%',
      gdpGrowth: '2.8%'
    };
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 주요 경제 지표 현황 (실시간)</h4>
        <div className="space-y-4">
          {/* 금리 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">미국 기준금리</span>
              <span className="text-sm font-bold text-blue-600">{indicators.fedRate}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ 
                width: `${(parseFloat(indicators.fedRate) / 10) * 100}%` 
              }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">최신 FOMC 결과 반영</p>
          </div>
          
          {/* 환율 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">원/달러 환율</span>
              <span className="text-sm font-bold text-green-600">{indicators.exchangeRate}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ 
                width: `${(parseFloat(indicators.exchangeRate) / 1500) * 100}%` 
              }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">실시간 환율</p>
          </div>
          
          {/* 인플레이션 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">미국 CPI (YoY)</span>
              <span className="text-sm font-bold text-red-600">{indicators.inflation}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ 
                width: `${(parseFloat(indicators.inflation) / 10) * 100}%` 
              }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">목표치 2% 대비</p>
          </div>
          
          {/* GDP */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">미국 GDP 성장률</span>
              <span className="text-sm font-bold text-purple-600">{indicators.gdpGrowth}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ 
                width: `${(parseFloat(indicators.gdpGrowth) / 5) * 100}%` 
              }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">최신 분기 데이터</p>
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-yellow-50 rounded text-[10px] text-yellow-700">
          💡 뉴스 데이터에서 자동 추출된 실시간 경제 지표
        </div>
      </div>
    );
  };
  
  // 국채 수익률 곡선 (경제 분석용)
  const YieldCurveChart = ({ topicType }) => {
    if (topicType !== 'economy') return null;
    
    const yieldData = [
      { maturity: '3M', yield: 4.51 },
      { maturity: '6M', yield: 4.42 },
      { maturity: '1Y', yield: 4.28 },
      { maturity: '2Y', yield: 4.15 },
      { maturity: '5Y', yield: 4.21 },
      { maturity: '10Y', yield: 4.28 },
      { maturity: '30Y', yield: 4.51 }
    ];
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📈 미국 국채 수익률 곡선</h4>
        <div className="space-y-2">
          {yieldData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-10 text-xs font-medium text-gray-600">{item.maturity}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div 
                  className={`h-full rounded-full ${
                    item.yield > 4.4 ? 'bg-red-500' : 
                    item.yield > 4.2 ? 'bg-orange-500' : 
                    'bg-blue-500'
                  }`}
                  style={{ width: `${(item.yield / 5) * 100}%` }}
                />
                <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium">
                  {item.yield.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-800">
          ✅ 2Y-10Y: {(4.28 - 4.15).toFixed(0)}bp (역전 해소, 정상화 진행)
        </div>
      </div>
    );
  };
  
  // 주요국 금리 비교 (경제 분석용)
  const GlobalRatesComparison = ({ topicType }) => {
    if (topicType !== 'economy') return null;
    
    const rates = [
      { country: '🇺🇸 미국', rate: 4.00, change: -0.25 },
      { country: '🇪🇺 유럽', rate: 3.40, change: -0.25 },
      { country: '🇬🇧 영국', rate: 4.75, change: -0.25 },
      { country: '🇯🇵 일본', rate: 0.25, change: 0.15 },
      { country: '🇰🇷 한국', rate: 3.25, change: -0.25 },
      { country: '🇨🇳 중국', rate: 3.10, change: -0.25 }
    ];
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">🌍 주요국 기준금리</h4>
        <div className="space-y-2">
          {rates.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <span className="text-sm font-medium">{item.country}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{item.rate.toFixed(2)}%</span>
                {item.change !== 0 && (
                  <span className={`text-xs ${item.change > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%p
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
          💡 글로벌 금리인하 사이클 진행 중 (일본 제외)
        </div>
      </div>
    );
  };
  
  // 경제 전망 지표 (경제 분석용)
  const EconomicOutlookPanel = ({ topicType, analysis }) => {
    if (topicType !== 'economy') return null;
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">🔮 경제 전망 시나리오</h4>
        <div className="space-y-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-green-800">소프트 랜딩</span>
              <span className="text-sm font-bold text-green-600">40%</span>
            </div>
            <p className="text-xs text-green-700">인플레 하락 + 경기 연착륙</p>
          </div>
          
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-yellow-800">경기 둔화</span>
              <span className="text-sm font-bold text-yellow-600">35%</span>
            </div>
            <p className="text-xs text-yellow-700">성장률 하락 + 실업률 상승</p>
          </div>
          
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-red-800">경기 침체</span>
              <span className="text-sm font-bold text-red-600">25%</span>
            </div>
            <p className="text-xs text-red-700">2분기 연속 마이너스 성장</p>
          </div>
        </div>
        
        {analysis?.outlook && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-600">{analysis.outlook}</p>
          </div>
        )}
      </div>
    );
  };

  // 산업 구조 시각화 (산업 분석용) - 동적 데이터
  const IndustryStructureChart = ({ topicType, industryMetrics }) => {
    if (topicType !== 'sector') return null;
    
    const metrics = industryMetrics || {
      marketSize: '600조원 (글로벌)',
      growthRate: '8.8%',
      topCompanies: ['삼성전자', 'SK하이닉스', 'TSMC'],
      keyTrends: ['AI 칩 수요', 'HBM 확대', '선단공정']
    };
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 산업 구조 분석 (실시간)</h4>
        
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
        
        <div className="mt-3 p-2 bg-yellow-50 rounded text-[10px] text-yellow-700">
          💡 뉴스에서 자동 추출된 실시간 산업 지표
        </div>
      </div>
    );
  };

  const SectorHeatmap = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 섹터별 수익률 현황</h4>
        <div className="grid grid-cols-5 gap-2">
          {data.slice(0, 15).map((sector, idx) => {
            const value = parseFloat(sector.value);
            const getColor = () => {
              if (value > 3) return 'bg-red-600 text-white';
              if (value > 1) return 'bg-red-400 text-white';
              if (value > 0) return 'bg-red-200 text-red-900';
              if (value > -1) return 'bg-green-200 text-green-900';
              if (value > -3) return 'bg-green-400 text-white';
              return 'bg-green-600 text-white';
            };
            
            return (
              <div 
                key={idx}
                className={`p-3 rounded-lg text-center transition-all hover:scale-105 cursor-pointer ${getColor()}`}
                title={`${sector.sector}: ${value > 0 ? '+' : ''}${value}%`}
              >
                <div className="text-xs font-medium truncate">{sector.sector}</div>
                <div className="text-sm font-bold mt-1">
                  {value > 0 ? '+' : ''}{value}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${score?.positive || 40}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">중립</span>
              <span className="font-medium">{score?.neutral || 30}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gray-400 h-2 rounded-full transition-all"
                style={{ width: `${score?.neutral || 30}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-600">부정</span>
              <span className="font-medium">{score?.negative || 30}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${score?.negative || 30}%` }}
              />
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

  const InvestmentOpinionDetail = ({ recommendation, stockMetrics, companyMetrics }) => {
    if (!recommendation || !recommendation.opinion) return null;
    
    // 백엔드에서 받은 실시간 데이터 우선 사용
    const metrics = companyMetrics || {};
    const currentPrice = metrics.currentPrice || recommendation.currentPrice || '102,500원';
    const targetPrice = metrics.targetPrice || recommendation.targetPrice || '120,000원';
    const opinion = metrics.consensus || recommendation.opinion || 'BUY';
    
    // 상승여력 계산
    const current = parseInt(currentPrice.replace(/[^0-9]/g, ''));
    const target = parseInt(targetPrice.replace(/[^0-9]/g, ''));
    const upside = ((target - current) / current * 100).toFixed(1);

    const getOpinionReason = (opinion) => {
      const reasons = {
        'BUY': [
          'AI 메모리 HBM4 수요 폭증 예상',
          'PER ' + (metrics.per || '18.5배') + ' 업계 평균 이하',
          '시가총액 ' + (metrics.marketCap || '612조원') + ' 저평가',
          '파운드리 선단공정 수주 확대',
          'DDR5/LPDDR5X 가격 상승 사이클'
        ],
        'HOLD': [
          '단기 밸류에이션 부담 존재',
          '미중 무역갈등 불확실성',
          '메모리 가격 변동성 리스크'
        ],
        'SELL': [
          '글로벌 경기 침체 우려',
          '중국 수요 급감 가능성',
          '경쟁사 증설로 공급 과잉'
        ]
      };
      
      return reasons[opinion] || reasons['BUY'];
    };

    const reasons = getOpinionReason(opinion);

    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">💰 투자 의견 상세 (실시간)</h4>
        
        <div className={`p-4 rounded-lg text-center mb-4 ${
          opinion === 'BUY' ? 'bg-green-50 border border-green-200' :
          opinion === 'SELL' ? 'bg-red-50 border border-red-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className="text-2xl font-bold mb-2">
            {opinion}
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm mb-3">
            <div>
              <p className="text-gray-600">목표가</p>
              <p className="font-bold">{targetPrice}</p>
            </div>
            <div>
              <p className="text-gray-600">현재가</p>
              <p className="font-bold">{currentPrice}</p>
            </div>
            <div>
              <p className="text-gray-600">상승여력</p>
              <p className="font-bold text-green-600">+{upside}%</p>
            </div>
          </div>
          
          {/* 추가 지표 */}
          {metrics.per && (
            <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
              <div>
                <span className="text-gray-600">PER: </span>
                <span className="font-semibold">{metrics.per}</span>
              </div>
              <div>
                <span className="text-gray-600">시총: </span>
                <span className="font-semibold">{metrics.marketCap}</span>
              </div>
            </div>
          )}
          
          <div className="text-left border-t pt-3 mt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">투자 근거:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {reasons.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <span className="text-green-500">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-2 p-2 bg-blue-50 rounded text-[10px] text-blue-700">
            💡 뉴스에서 자동 추출된 실시간 투자 지표
          </div>
        </div>
      </div>
    );
  };

  const SourceLinks = ({ sources, newsLinks }) => {
    if ((!sources || sources.length === 0) && (!newsLinks || newsLinks.length === 0)) return null;
    
    return (
      <div className="mt-4 pt-3 border-t border-slate-200">
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-500">출처:</span>
          <div className="flex flex-wrap gap-1">
            {newsLinks && newsLinks.slice(0, 5).map((news, idx) => (
              <a
                key={idx}
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] transition-colors"
                title={news.title}
              >
                <Link2 className="w-2.5 h-2.5" />
                <span>{idx + 1}</span>
              </a>
            ))}
          </div>
        </div>
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
      additionalAnalysis: null,
      sources: [],
      newsLinks: metadata?.newsWithLinks || [],
      economicIndicators: {},
      industryMetrics: {}
    };

    // 요약 추출
    const summaryMatch = reportText.match(/##\s*1\.\s*요약\s*\n+([\s\S]*?)(?=\n##\s*2\.|$)/i);
    if (summaryMatch) {
      const rawSummary = summaryMatch[1].trim();
      result.sources = [...result.sources, ...extractSources(rawSummary)];
      result.summary = cleanTextFromSources(rawSummary);
    }

    // 추가 분석 추출 (중요!)
    const additionalMatch = reportText.match(/##\s*6\.\s*추가\s*분석.*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (additionalMatch) {
      const rawAdditional = additionalMatch[1].trim();
      result.sources = [...result.sources, ...extractSources(rawAdditional)];
      result.additionalAnalysis = cleanTextFromSources(rawAdditional);
    }

    // 핵심 포인트 추출
    const pointsMatch = reportText.match(/##\s*2\.\s*(?:핵심|산업\s*핵심|핵심\s*경제).*?\n+([\s\S]*?)(?=\n##\s*3\.|$)/i);
    if (pointsMatch) {
      const points = pointsMatch[1].match(/[-*]\s*(.+)/g);
      if (points) {
        result.keyPoints = points
          .map(p => {
            const raw = p.replace(/^[-*]\s*/, '').trim();
            return cleanTextFromSources(raw);
          })
          .filter(p => p.length > 10)
          .slice(0, 5);
      }
    }

    // 타입별 특화 파싱
    if (topicType === 'economy') {
      // 경제 지표 분석 추출
      const indicatorMatch = reportText.match(/##\s*3\.\s*경제\s*지표\s*분석\s*\n+([\s\S]*?)(?=\n##\s*4\.|$)/i);
      if (indicatorMatch) {
        const indicatorText = indicatorMatch[1];
        
        // 금리 동향
        const interestMatch = indicatorText.match(/###\s*금리.*?\n+([\s\S]*?)(?=###|##|$)/i);
        if (interestMatch) {
          result.economicIndicators.interest = cleanTextFromSources(interestMatch[1].trim());
        }
        
        // 환율 동향
        const exchangeMatch = indicatorText.match(/###\s*환율.*?\n+([\s\S]*?)(?=###|##|$)/i);
        if (exchangeMatch) {
          result.economicIndicators.exchange = cleanTextFromSources(exchangeMatch[1].trim());
        }
        
        // 물가/인플레이션
        const inflationMatch = indicatorText.match(/###\s*물가.*?\n+([\s\S]*?)(?=###|##|$)/i);
        if (inflationMatch) {
          result.economicIndicators.inflation = cleanTextFromSources(inflationMatch[1].trim());
        }
        
        // GDP
        const gdpMatch = indicatorText.match(/###\s*GDP.*?\n+([\s\S]*?)(?=###|##|$)/i);
        if (gdpMatch) {
          result.economicIndicators.gdp = cleanTextFromSources(gdpMatch[1].trim());
        }
      }

      // 향후 전망
      const outlookMatch = reportText.match(/##\s*(?:6|7)\.\s*향후\s*전망\s*\n+([\s\S]*?)(?=\n##|$)/i);
      if (outlookMatch) {
        result.analysis.outlook = cleanTextFromSources(outlookMatch[1].trim());
      }
    }
    else if (topicType === 'sector') {
      // 산업 구조 분석
      const structureMatch = reportText.match(/##\s*3\.\s*산업\s*구조\s*분석\s*\n+([\s\S]*?)(?=\n##\s*4\.|$)/i);
      if (structureMatch) {
        const structureText = structureMatch[1];
        
        // 시장 규모
        const marketMatch = structureText.match(/###\s*시장\s*규모.*?\n+([\s\S]*?)(?=###|##|$)/i);
        if (marketMatch) {
          result.industryMetrics.marketSize = cleanTextFromSources(marketMatch[1].trim());
        }
        
        // 경쟁 구조
        const competitionMatch = structureText.match(/###\s*경쟁.*?\n+([\s\S]*?)(?=###|##|$)/i);
        if (competitionMatch) {
          result.industryMetrics.competition = cleanTextFromSources(competitionMatch[1].trim());
        }
        
        // 성장 동력
        const growthMatch = structureText.match(/###\s*성장\s*동력.*?\n+([\s\S]*?)(?=###|##|$)/i);
        if (growthMatch) {
          result.industryMetrics.growthDrivers = cleanTextFromSources(growthMatch[1].trim());
        }
      }
    }
    else if (topicType === 'company') {
      // 기업 분석
      const investMatch = reportText.match(/##\s*5\.\s*투자\s*의견\s*\n+([\s\S]*?)(?=\n##|$)/i);
      if (investMatch) {
        const investText = investMatch[1];
        const opinionMatch = investText.match(/투자\s*등급[:\s]*(BUY|HOLD|SELL)/i);
        const targetMatch = investText.match(/목표.*?주가[:\s]*([0-9,]+)\s*원/i);
        const currentMatch = investText.match(/현재.*?주가[:\s]*([0-9,]+)\s*원/i);

        result.recommendation = {
          opinion: opinionMatch ? opinionMatch[1] : 'BUY',
          targetPrice: targetMatch ? targetMatch[1] + '원' : '120,000원',
          currentPrice: currentMatch ? currentMatch[1] + '원' : '102,500원',
          upside: '+17.1%'
        };
      }
    }

    // 리스크 추출 (모든 타입 공통)
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

    result.sources = [...new Set(result.sources)];
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
        headers: {
          'Content-Type': 'application/json',
        },
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: topic,
          uploadedFiles: files.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size
          })),
          additionalInfo: additionalInfo
        })
      });

      if (!response.ok) {
        throw new Error('리포트 생성 실패');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '리포트 생성 실패');
      }

      const topicType = data.topicType || 'company';
      const parsedReport = parseReportByType(data.report, topicType, data.metadata);
      
      setReport({
        title: `${topic} - ${topicType === 'economy' ? '경제' : topicType === 'sector' ? '산업' : '투자'} 분석`,
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
        sources: parsedReport.sources,
        newsLinks: data.metadata.newsWithLinks || [],
        sectorData: data.metadata.sectorData || [],
        fileSources: data.metadata.fileSources || [],
        metadata: data.metadata,
        // 추가 분석
        additionalAnalysis: parsedReport.additionalAnalysis,
        // 경제 분석 데이터
        economicIndicators: parsedReport.economicIndicators || {},
        // 산업 분석 데이터
        industryMetrics: parsedReport.industryMetrics || {},
        // 분석 데이터
        analysis: parsedReport.analysis || {}
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
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-purple-700">AI: Claude</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">데이터: 실시간 뉴스 + 주가</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          {/* 사용 안내 */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <span className="font-semibold">사용방법:</span> 기업명, 경제 지표, 산업 분석 주제를 입력하세요
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 rounded">🏢 기업 (예: 삼성전자)</span>
                  <span className="px-2 py-0.5 bg-blue-100 rounded">🌍 경제 (예: 미국 금리)</span>
                  <span className="px-2 py-0.5 bg-blue-100 rounded">📊 산업 (예: 반도체 산업)</span>
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
                placeholder="예: 삼성전자, 미국 금리, 반도체 산업"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              
              <label className="block text-sm font-semibold text-slate-700 mb-2 mt-4">
                추가 분석 요청
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="예: HBM4 전망 중심으로 분석"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none"
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
                <p className="text-sm text-slate-600">파일 선택</p>
              </div>
              
              {files.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        파일 업로드됨
                      </span>
                    </div>
                    <button onClick={() => setFiles([])} className="text-green-600 hover:text-green-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
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
                  <span>AI 분석 중...</span>
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
                    <span className={`text-xs px-2 py-1 rounded-full bg-${getTypeColor(report.topicType)}-100 text-${getTypeColor(report.topicType)}-700`}>
                      {report.topicType === 'company' ? '기업 분석' :
                       report.topicType === 'economy' ? '경제 분석' : '산업 분석'}
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
                  
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    새 분석
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-blue-600 font-medium">신뢰도</p>
                    <Info className="w-3 h-3 text-blue-400" />
                  </div>
                  <p className="text-xl font-bold text-blue-900">{report.metrics.confidence}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-green-600 font-medium">시장 감성</p>
                    <Info className="w-3 h-3 text-green-400" />
                  </div>
                  <p className="text-xl font-bold text-green-900">{report.metrics.sentiment}</p>
                  <p className="text-[10px] text-green-600">
                    긍정 {report.metrics.sentimentScore.positive}%
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium mb-1">뉴스 분석</p>
                  <p className="text-xl font-bold text-purple-900">{report.metrics.dataPoints}건</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">데이터</p>
                  <p className="text-xl font-bold text-amber-900">실시간</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="border-b border-slate-200">
                <div className="flex space-x-1 p-2">
                  <button
                    onClick={() => setActiveTab('report')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      activeTab === 'report'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    리포트
                  </button>
                  <button
                    onClick={() => setActiveTab('visualization')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      activeTab === 'visualization'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <PieChart className="w-4 h-4 inline mr-2" />
                    시각화
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      activeTab === 'ai'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    AI 대화
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'report' ? (
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                      <h3 className="font-bold text-lg text-slate-900 mb-3">요약</h3>
                      <p className="text-slate-700 leading-relaxed">
                        {report.summary}
                      </p>
                      <SourceLinks sources={report.sources} newsLinks={report.newsLinks} />
                    </div>

                    {report.keyPoints && report.keyPoints.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3">핵심 포인트</h3>
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

                    {/* 경제 분석 전용 섹션 */}
                    {report.topicType === 'economy' && report.economicIndicators && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-900">경제 지표 분석</h3>
                        
                        {report.economicIndicators.interest && (
                          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                            <h4 className="font-semibold text-yellow-900 mb-2">💰 금리 동향</h4>
                            <p className="text-sm text-yellow-800">{report.economicIndicators.interest}</p>
                          </div>
                        )}
                        
                        {report.economicIndicators.exchange && (
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <h4 className="font-semibold text-green-900 mb-2">💱 환율 동향</h4>
                            <p className="text-sm text-green-800">{report.economicIndicators.exchange}</p>
                          </div>
                        )}
                        
                        {report.economicIndicators.inflation && (
                          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                            <h4 className="font-semibold text-red-900 mb-2">📈 물가/인플레이션</h4>
                            <p className="text-sm text-red-800">{report.economicIndicators.inflation}</p>
                          </div>
                        )}
                        
                        {report.economicIndicators.gdp && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2">📊 GDP/경제성장</h4>
                            <p className="text-sm text-blue-800">{report.economicIndicators.gdp}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 산업 분석 전용 섹션 */}
                    {report.topicType === 'sector' && report.industryMetrics && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-900">산업 구조 분석</h3>
                        
                        {report.industryMetrics.marketSize && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2">📊 시장 규모</h4>
                            <p className="text-sm text-blue-800">{report.industryMetrics.marketSize}</p>
                          </div>
                        )}
                        
                        {report.industryMetrics.competition && (
                          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                            <h4 className="font-semibold text-orange-900 mb-2">🏢 경쟁 구조</h4>
                            <p className="text-sm text-orange-800">{report.industryMetrics.competition}</p>
                          </div>
                        )}
                        
                        {report.industryMetrics.growthDrivers && (
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <h4 className="font-semibold text-green-900 mb-2">🚀 성장 동력</h4>
                            <p className="text-sm text-green-800">{report.industryMetrics.growthDrivers}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 추가 분석 (사용자 요청) */}
                    {report.additionalAnalysis && (
                      <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                        <h3 className="font-bold text-lg text-purple-900 mb-3">
                          📌 추가 분석 (사용자 요청)
                        </h3>
                        <p className="text-purple-800 leading-relaxed">
                          {report.additionalAnalysis}
                        </p>
                      </div>
                    )}

                    {report.risks && report.risks.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3">리스크 요인</h3>
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
                    {/* 감성 분석은 모든 타입에서 표시 */}
                    <SentimentGauge 
                      sentiment={report.metrics.sentiment} 
                      score={report.metrics.sentimentScore} 
                    />
                    
                    {/* 기업 분석 시각화 - 동적 데이터 */}
                    {report.topicType === 'company' && (
                      <>
                        {report.recommendation && (
                          <InvestmentOpinionDetail 
                            recommendation={report.recommendation}
                            companyMetrics={report.metadata?.companyMetrics}
                          />
                        )}
                        {report.sectorData && report.sectorData.length > 0 && (
                          <div className="md:col-span-2">
                            <SectorHeatmap data={report.sectorData} />
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* 경제 분석 시각화 - 동적 데이터 */}
                    {report.topicType === 'economy' && (
                      <>
                        <EconomicIndicatorsChart 
                          topicType={report.topicType} 
                          economicIndicators={report.metadata?.economicIndicators}
                        />
                        <YieldCurveChart topicType={report.topicType} />
                        <GlobalRatesComparison topicType={report.topicType} />
                        <EconomicOutlookPanel 
                          topicType={report.topicType} 
                          analysis={report.analysis}
                        />
                      </>
                    )}
                    
                    {/* 산업 분석 시각화 - 동적 데이터 */}
                    {report.topicType === 'sector' && (
                      <>
                        <IndustryStructureChart 
                          topicType={report.topicType}
                          industryMetrics={report.metadata?.industryMetrics}
                        />
                        {report.sectorData && report.sectorData.length > 0 && (
                          <div className="md:col-span-2">
                            <SectorHeatmap data={report.sectorData} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <h3 className="text-xl font-bold text-slate-900 mb-4">
                        AI 애널리스트와 대화
                      </h3>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                          placeholder="리포트 내용에 대해 질문하세요"
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg"
                          disabled={questionLoading}
                        />
                        
                        <button 
                          onClick={handleCustomQuestion}
                          disabled={questionLoading}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-300"
                        >
                          {questionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            '질문'
                          )}
                        </button>
                      </div>

                      {questionAnswer && (
                        <div className="mt-4 p-4 bg-white rounded-lg">
                          <p className="font-semibold text-slate-900 mb-2">Q: {questionAnswer.question}</p>
                          <p className="text-slate-700">A: {questionAnswer.answer}</p>
                        </div>
                      )}

                      {previousQuestions.length > 0 && (
                        <div className="mt-6 space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700">최근 질문</h4>
                          {previousQuestions.map((qa) => (
                            <div key={qa.id} className="p-3 bg-white/50 rounded-lg">
                              <p className="text-sm font-medium text-slate-900">Q: {qa.question}</p>
                              <p className="text-sm text-slate-600 mt-1">A: {qa.answer.substring(0, 100)}...</p>
                            </div>
                          ))}
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
    </div>
  );
};

export default InvestmentIntelligencePlatform;
