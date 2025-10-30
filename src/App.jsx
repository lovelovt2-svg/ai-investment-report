import React, { useState, useRef } from 'react';
import { 
  TrendingUp, Upload, Loader2, FileText, MessageSquare,
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink, BarChart, 
  Globe, Building, Activity, TrendingDown, DollarSign, PieChart,
  Info, CheckCircle, Link2, FileCheck, X
} from 'lucide-react';

const InvestmentIntelligencePlatform = () => {
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('report');
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    analysis: true,
    risk: true,
    recommendation: true,
    additional: true
  });
  
  // AI 대화
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [previousQuestions, setPreviousQuestions] = useState([]);
  
  const fileInputRef = useRef(null);

  // 섹터 히트맵 (실시간 데이터 기반)
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
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-600">
          <span>🔴 상승</span>
          <span>⚪ 보합</span>
          <span>🟢 하락</span>
        </div>
      </div>
    );
  };

  // 동종업계 비교 (실시간)
  const PeerComparisonChart = ({ comparativeStocks, currentCompany }) => {
    if (!comparativeStocks || comparativeStocks.length === 0) return null;
    
    const maxPrice = Math.max(...comparativeStocks.map(s => s.price || 0));
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">🏢 동종업계 비교</h4>
        <div className="space-y-3">
          {comparativeStocks.map((stock, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-24 text-sm font-medium text-slate-700">{stock.name}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                    parseFloat(stock.change) > 0 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(stock.price / maxPrice) * 100}%` }}
                />
                <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium text-slate-900 z-10">
                  {stock.price?.toLocaleString()}원 ({stock.change > 0 ? '+' : ''}{stock.change}%)
                </span>
              </div>
              <div className="text-xs text-slate-600">
                PER {stock.pe}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 감성 게이지 (개선)
  const SentimentGauge = ({ sentiment, score }) => {
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📈 시장 감성 분석</h4>
        
        {/* 막대 그래프 형태로 변경 */}
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
        
        {/* 최종 판정 */}
        <div className={`mt-4 p-3 rounded-lg text-center ${
          sentiment === '긍정적' ? 'bg-green-50 text-green-700' :
          sentiment === '부정적' ? 'bg-red-50 text-red-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          <p className="text-sm font-semibold">종합 평가: {sentiment}</p>
          <p className="text-xs mt-1">
            긍정 단어 {score?.positive || 40}% 기준으로 판단
          </p>
        </div>
      </div>
    );
  };

  // 투자 의견 차트
  const InvestmentMetrics = ({ stockMetrics, recommendation }) => {
    if (!stockMetrics && !recommendation) return null;
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">💰 주요 투자 지표</h4>
        
        {recommendation && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            recommendation.opinion === 'BUY' ? 'bg-green-50 border border-green-200' :
            recommendation.opinion === 'SELL' ? 'bg-red-50 border border-red-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className="text-2xl font-bold mb-1">
              {recommendation.opinion}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">목표가:</span>
                <span className="font-medium ml-1">{recommendation.targetPrice || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">현재가:</span>
                <span className="font-medium ml-1">{recommendation.currentPrice || '-'}</span>
              </div>
            </div>
          </div>
        )}
        
        {stockMetrics && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600">PER:</span>
              <span className="font-medium ml-1">{stockMetrics.pe || '-'}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600">EPS:</span>
              <span className="font-medium ml-1">{stockMetrics.eps || '-'}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600">시가총액:</span>
              <span className="font-medium ml-1">{stockMetrics.marketCap || '-'}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600">52주 최고:</span>
              <span className="font-medium ml-1">{stockMetrics.high52Week || '-'}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 출처 표시 컴포넌트
  const SourceBadge = ({ sources, newsLinks }) => {
    if (!sources || sources.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
        {newsLinks && newsLinks.slice(0, 3).map((news, idx) => (
          <a
            key={idx}
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs transition-colors"
            title={news.title}
          >
            <Link2 className="w-3 h-3" />
            <span>뉴스{news.id}</span>
          </a>
        ))}
        {sources.filter(s => s.includes('파일')).map((source, idx) => (
          <span
            key={`file-${idx}`}
            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs"
          >
            <FileText className="w-3 h-3" />
            <span>{source.replace(/[\[\]]/g, '')}</span>
          </span>
        ))}
      </div>
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  // 리포트 파싱 (개선)
  const parseReportByType = (reportText, topicType, metadata) => {
    const result = {
      summary: '',
      keyPoints: [],
      recommendation: {},
      risks: [],
      analysis: {},
      additionalAnalysis: null,
      sources: [],
      newsLinks: metadata?.newsWithLinks || []
    };

    // 요약 추출
    const summaryMatch = reportText.match(/##\s*1\.\s*요약\s*\n+([\s\S]*?)(?=\n##\s*2\.|$)/i);
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim();
    }

    // 추가 분석 추출
    const additionalMatch = reportText.match(/##\s*6\.\s*추가\s*분석.*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (additionalMatch) {
      result.additionalAnalysis = additionalMatch[1].trim();
    }

    // 핵심 포인트 추출
    const pointsMatch = reportText.match(/##\s*2\.\s*핵심.*?\n+([\s\S]*?)(?=\n##\s*3\.|$)/i);
    if (pointsMatch) {
      const points = pointsMatch[1].match(/[-*]\s*(.+)/g);
      if (points) {
        result.keyPoints = points
          .map(p => p.replace(/^[-*]\s*/, '').trim())
          .filter(p => p.length > 10)
          .slice(0, 5);
      }
    }

    // 타입별 특화 파싱
    if (topicType === 'company') {
      // SWOT 분석
      const swotMatch = reportText.match(/##\s*3\.\s*SWOT\s*분석\s*\n+([\s\S]*?)(?=\n##\s*4\.|$)/i);
      if (swotMatch) {
        const swotText = swotMatch[1];
        
        const extractSwotItems = (section) => {
          const pattern = new RegExp(`###?\\s*${section}[^\n]*\n+([\\s\\S]*?)(?=###|##|$)`, 'i');
          const match = swotText.match(pattern);
          if (match) {
            const items = match[1].match(/[-*]\s*(.+)/g);
            return items ? items.map(i => i.replace(/^[-*]\s*/, '').trim()).slice(0, 3) : [];
          }
          return [];
        };

        result.analysis = {
          strengths: extractSwotItems('강점'),
          weaknesses: extractSwotItems('약점'),
          opportunities: extractSwotItems('기회'),
          threats: extractSwotItems('위협')
        };
      }

      // 투자 의견
      const investMatch = reportText.match(/##\s*5\.\s*투자\s*의견\s*\n+([\s\S]*?)(?=\n##|$)/i);
      if (investMatch) {
        const investText = investMatch[1];
        
        const opinionMatch = investText.match(/투자\s*등급[:\s]*(BUY|HOLD|SELL)/i);
        const targetMatch = investText.match(/목표.*?주가[:\s]*([0-9,]+)\s*원/i);
        const currentMatch = investText.match(/현재.*?주가[:\s]*([0-9,]+)\s*원/i);

        result.recommendation = {
          opinion: opinionMatch ? opinionMatch[1] : 'HOLD',
          targetPrice: targetMatch ? targetMatch[1] + '원' : '-',
          currentPrice: currentMatch ? currentMatch[1] + '원' : '-',
        };

        // 상승여력 계산
        if (targetMatch && currentMatch) {
          const target = parseInt(targetMatch[1].replace(/,/g, ''));
          const current = parseInt(currentMatch[1].replace(/,/g, ''));
          if (!isNaN(target) && !isNaN(current) && current > 0) {
            const upside = ((target - current) / current * 100).toFixed(1);
            result.recommendation.upside = (upside > 0 ? '+' : '') + upside + '%';
          }
        }
      }
    }

    // 리스크 추출
    const riskMatch = reportText.match(/##\s*4\.\s*.*?리스크.*?\n+([\s\S]*?)(?=\n##\s*5\.|$)/i);
    if (riskMatch) {
      const risks = riskMatch[1].match(/[-*]\s*(.+)/g);
      if (risks) {
        result.risks = risks
          .map(r => r.replace(/^[-*]\s*/, '').trim())
          .filter(r => r.length > 10)
          .slice(0, 5);
      }
    }

    // 출처 추출
    const sourcesInText = reportText.match(/\[(뉴스\d+|[^[\]]+\.pdf|업로드파일)\]/g);
    if (sourcesInText) {
      result.sources = [...new Set(sourcesInText)];
    }

    return result;
  };

  // AI 질문 처리
  const handleCustomQuestion = async () => {
    const question = customQuestion;
    if (!question.trim()) {
      alert('질문을 입력해주세요.');
      return null;
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
          additionalInfo: `
사용자가 "${question}" 라고 질문했습니다.
간단명료하게 3-4문장으로 답변해주세요.
`
        })
      });

      if (!response.ok) throw new Error('답변 생성 실패');

      const data = await response.json();
      
      if (data.success) {
        let cleanAnswer = data.report
          .replace(/##.*?\n/g, '')
          .replace(/[*#_~`]/g, '')
          .replace(/^\d+\.\s*/gm, '')
          .trim()
          .substring(0, 500);
        
        const newAnswer = {
          id: Date.now(),
          question: question,
          answer: cleanAnswer,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setQuestionAnswer(newAnswer);
        setPreviousQuestions(prev => [newAnswer, ...prev].slice(0, 3));
        setCustomQuestion('');
        
        return cleanAnswer;
      }
    } catch (error) {
      console.error('질문 처리 오류:', error);
      alert('답변 생성 중 오류가 발생했습니다.');
      return null;
    } finally {
      setQuestionLoading(false);
    }
  };

  // 리포트 생성
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
        analysis: parsedReport.analysis,
        risks: parsedReport.risks,
        recommendation: parsedReport.recommendation,
        additionalAnalysis: parsedReport.additionalAnalysis,
        sources: parsedReport.sources,
        newsLinks: data.metadata.newsWithLinks || [],
        comparativeStocks: data.metadata.comparativeStocks || [],
        sectorData: data.metadata.sectorData || [],
        stockMetrics: data.metadata.stockData ? {
          pe: data.metadata.stockData.pe ? data.metadata.stockData.pe + '배' : '-',
          eps: data.metadata.stockData.eps ? data.metadata.stockData.eps + '원' : '-',
          marketCap: data.metadata.stockData.marketCap ? 
            (data.metadata.stockData.marketCap / 1e12).toFixed(2) + '조원' : '-',
          high52Week: data.metadata.stockData.high52Week ? 
            data.metadata.stockData.high52Week.toLocaleString() + '원' : '-',
        } : null,
        fileSources: data.metadata.fileSources || [],
        metadata: data.metadata
      });
      
      setLoading(false);
      setActiveTab('report');
      
    } catch (error) {
      console.error('리포트 생성 오류:', error);
      setLoading(false);
      alert('리포트 생성 중 오류가 발생했습니다.');
    }
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
            
            {/* AI 엔진 & 데이터 정보 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-purple-700">AI: Claude</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">데이터: 실시간 뉴스 + 주가 + 파일</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          {/* 분석 가능 항목 안내 */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <span className="font-semibold">사용방법:</span> 기업명, 경제 지표, 산업 분석 주제를 입력하세요
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 rounded">🏢 기업 (예: 삼성전자, SK하이닉스)</span>
                  <span className="px-2 py-0.5 bg-blue-100 rounded">🌍 경제 (예: 미국 금리, 환율)</span>
                  <span className="px-2 py-0.5 bg-blue-100 rounded">📊 산업 (예: 반도체 산업, AI 시장)</span>
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
                        업로드 파일이 리포트에 반영됩니다
                      </span>
                    </div>
                    <button onClick={() => setFiles([])} className="text-green-600 hover:text-green-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {files.slice(0, 3).map((file, idx) => (
                    <div key={idx} className="text-xs text-green-700 truncate">
                      • {file.name}
                    </div>
                  ))}
                  {files.length > 3 && (
                    <div className="text-xs text-green-700">
                      • 외 {files.length - 3}개
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 transition-all flex items-center justify-center"
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
                  {report.fileSources.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-700">
                        업로드 파일 반영됨
                      </span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    const element = document.createElement('a');
                    const file = new Blob([report.fullReport], {type: 'text/plain'});
                    element.href = URL.createObjectURL(file);
                    element.download = `${report.title.replace(/[^a-z0-9가-힣]/gi, '_')}.txt`;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                  <FileText className="w-4 h-4" />
                  <span>다운로드</span>
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-blue-600 font-medium">데이터 신뢰도</p>
                    <Info className="w-3 h-3 text-blue-400 cursor-help" title="수집된 데이터의 양과 품질" />
                  </div>
                  <p className="text-xl font-bold text-blue-900">{report.metrics.confidence}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-green-600 font-medium">시장 감성</p>
                    <Info className="w-3 h-3 text-green-400 cursor-help" title="뉴스 긍정/부정 비율" />
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
                  <p className="text-xs text-amber-600 font-medium mb-1">데이터 출처</p>
                  <p className="text-xl font-bold text-amber-900">
                    {report.metadata?.dataSource || '뉴스+AI'}
                  </p>
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
                    {/* Summary */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                      <h3 className="font-bold text-lg text-slate-900 mb-3">요약</h3>
                      <p className="text-slate-700 leading-relaxed">
                        {report.summary}
                      </p>
                      <SourceBadge sources={report.sources} newsLinks={report.newsLinks} />
                    </div>

                    {/* Key Points */}
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

                    {/* Additional Analysis */}
                    {report.additionalAnalysis && (
                      <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                        <h3 className="font-bold text-lg text-purple-900 mb-3">
                          추가 분석
                        </h3>
                        <p className="text-purple-800 leading-relaxed">
                          {report.additionalAnalysis}
                        </p>
                      </div>
                    )}

                    {/* Risks */}
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
                    {/* 시각화 컴포넌트들 */}
                    <SentimentGauge 
                      sentiment={report.metrics.sentiment} 
                      score={report.metrics.sentimentScore} 
                    />
                    
                    <InvestmentMetrics 
                      stockMetrics={report.stockMetrics}
                      recommendation={report.recommendation}
                    />
                    
                    {report.sectorData && report.sectorData.length > 0 && (
                      <div className="md:col-span-2">
                        <SectorHeatmap data={report.sectorData} />
                      </div>
                    )}
                    
                    {report.comparativeStocks && report.comparativeStocks.length > 0 && (
                      <div className="md:col-span-2">
                        <PeerComparisonChart 
                          comparativeStocks={report.comparativeStocks}
                          currentCompany={topic}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* AI 대화 탭 */
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
                          onClick={() => handleCustomQuestion()}
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

                      {/* 답변 */}
                      {questionAnswer && (
                        <div className="mt-4 p-4 bg-white rounded-lg">
                          <p className="font-semibold text-slate-900 mb-2">Q: {questionAnswer.question}</p>
                          <p className="text-slate-700">A: {questionAnswer.answer}</p>
                        </div>
                      )}

                      {/* 이전 대화 */}
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
      
      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>📍 사용방법: 기업명, 경제 지표, 산업 분석 주제를 입력하세요</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>⚡ Powered by Claude</span>
              <span>•</span>
              <span>📊 실시간 데이터 기반</span>
              <span>•</span>
              <span>🌏 위치: 인천, KR</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InvestmentIntelligencePlatform;
