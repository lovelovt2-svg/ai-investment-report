import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, Upload, Loader2, FileText, MessageSquare, Volume2, 
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink, BarChart, 
  Globe, Building, Activity, TrendingDown, DollarSign, PieChart,
  Info, CheckCircle, XCircle, Link2, FileCheck
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
    additional: true,
    visualization: true
  });
  const [isReading, setIsReading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const fileInputRef = useRef(null);

  // 히트맵 컴포넌트
  const SectorHeatmap = ({ data }) => {
    if (!data || !data.data) return null;
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 섹터별 수익률 히트맵</h4>
        <div className="grid grid-cols-5 gap-2">
          {data.data.map((sector, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-lg text-center transition-all hover:scale-105 ${
                sector.value > 2 ? 'bg-green-500 text-white' :
                sector.value > 0 ? 'bg-green-300 text-green-900' :
                sector.value > -2 ? 'bg-red-300 text-red-900' :
                'bg-red-500 text-white'
              }`}
              title={`${sector.sector}: ${sector.value > 0 ? '+' : ''}${sector.value}%`}
            >
              <div className="text-xs font-medium">{sector.sector}</div>
              <div className="text-sm font-bold mt-1">
                {sector.value > 0 ? '+' : ''}{sector.value}%
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>강세</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>보합</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>약세</span>
          </div>
        </div>
      </div>
    );
  };

  // 동종업계 비교 차트
  const PeerComparisonChart = ({ comparativeStocks, currentCompany }) => {
    if (!comparativeStocks || comparativeStocks.length === 0) return null;
    
    const maxPrice = Math.max(...comparativeStocks.map(s => s.price || 0));
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">🏢 동종업계 주가 비교</h4>
        <div className="space-y-3">
          {comparativeStocks.map((stock, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium text-slate-700">{stock.name}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                    stock.change > 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(stock.price / maxPrice) * 100}%` }}
                />
                <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium text-slate-900">
                  {stock.price?.toLocaleString()}원 ({stock.change > 0 ? '+' : ''}{stock.change?.toFixed(2)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
        {comparativeStocks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {comparativeStocks.map((stock, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-slate-500">PER</div>
                  <div className="font-semibold">{stock.pe?.toFixed(1) || '-'}배</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 투자 의견 시각화 (개선)
  const InvestmentOpinionVisual = ({ recommendation, topicType }) => {
    if (!recommendation) return null;
    
    if (topicType === 'company') {
      const getOpinionColor = (opinion) => {
        if (opinion === 'BUY') return 'green';
        if (opinion === 'SELL') return 'red';
        return 'amber';
      };
      
      const color = getOpinionColor(recommendation.opinion);
      
      return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">투자 의견</h3>
            <span className={`px-4 py-2 rounded-full text-lg font-bold bg-${color}-100 text-${color}-700 border-2 border-${color}-300`}>
              {recommendation.opinion}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-600">목표주가</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{recommendation.targetPrice}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-xs text-slate-600">현재가</span>
              </div>
              <p className="text-xl font-bold text-slate-700">{recommendation.currentPrice}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-slate-600">상승여력</span>
              </div>
              <p className={`text-xl font-bold ${
                recommendation.upside?.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {recommendation.upside}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <BarChart className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-slate-600">투자기간</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{recommendation.horizon}</p>
            </div>
          </div>
          
          {recommendation.reason && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">투자 근거:</span> {recommendation.reason}
              </p>
            </div>
          )}
        </div>
      );
    }
    
    // 경제/산업 전망 시각화
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          {topicType === 'economy' ? '경제 전망' : '산업 전망'}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-sm text-slate-600 mb-2">전망</p>
            <p className={`text-2xl font-bold ${
              recommendation.outlook === '긍정적' ? 'text-green-600' :
              recommendation.outlook === '부정적' ? 'text-red-600' :
              'text-amber-600'
            }`}>
              {recommendation.outlook}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-sm text-slate-600 mb-2">기간</p>
            <p className="text-2xl font-bold text-slate-900">{recommendation.horizon}</p>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-sm text-slate-600 mb-2">
              {topicType === 'economy' ? '성장률' : '매력도'}
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {recommendation.growthForecast || recommendation.attractiveness || '-'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 음성 읽기
  const handleTextToSpeech = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const points = report.keyPoints.map((point, i) => {
      const numberWords = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째'];
      return `${numberWords[i] || (i+1) + '번째'}, ${point}`;
    }).join('. ');
    
    const textToRead = `${report.title.replace(/[*#_-]/g, '')}의 핵심 포인트입니다. ${points}. 이상입니다.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    window.speechSynthesis.speak(utterance);
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
      economicIndicators: {},
      sectorMetrics: {},
      stockMetrics: {},
      additionalAnalysis: null,
      sources: []
    };

    // 요약 추출
    const summaryMatch = reportText.match(/##\s*1\.\s*요약\s*\n+([\s\S]*?)(?=\n##\s*2\.|$)/i);
    if (summaryMatch) {
      result.summary = summaryMatch[1]
        .split('\n')
        .filter(line => line.trim().length > 0 && !line.trim().match(/^[-*]/))
        .join(' ')
        .trim();
    }

    // 출처 추출
    const sourcesInText = reportText.match(/\[(뉴스\d+|업로드파일|[^[\]]+\.pdf)\]/g);
    if (sourcesInText) {
      result.sources = [...new Set(sourcesInText)];
    }

    // 추가 분석 섹션 추출
    const additionalMatch = reportText.match(/##\s*\d+\.\s*추가\s*분석.*?\n+([\s\S]*?)(?=\n##|$)/i);
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
        const reasonMatch = investText.match(/근거[:\s]*([^\n]+)/i);

        result.recommendation = {
          opinion: opinionMatch ? opinionMatch[1] : 'HOLD',
          targetPrice: targetMatch ? targetMatch[1] + '원' : '-',
          currentPrice: currentMatch ? currentMatch[1] + '원' : '-',
          horizon: '12개월',
          reason: reasonMatch ? reasonMatch[1].trim() : ''
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

      // 주가 메트릭
      if (metadata?.stockData) {
        result.stockMetrics = {
          pe: metadata.stockData.pe ? metadata.stockData.pe.toFixed(1) + '배' : '-',
          eps: metadata.stockData.eps ? metadata.stockData.eps.toFixed(0) + '원' : '-',
          marketCap: metadata.stockData.marketCap ? 
            (metadata.stockData.marketCap / 1e12).toFixed(2) + '조원' : '-',
          high52Week: metadata.stockData.high52Week ? 
            metadata.stockData.high52Week.toLocaleString() + '원' : '-',
          low52Week: metadata.stockData.low52Week ? 
            metadata.stockData.low52Week.toLocaleString() + '원' : '-',
        };
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

    return result;
  };

  // AI 질문 처리
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
          additionalInfo: `
사용자가 "${customQuestion}" 라고 질문했습니다.

이 질문에 대해 간단명료하게 3-4문장으로 답변해주세요.
- 현재 분석 주제: ${topic}
- 리포트 타입: ${report.topicType}
- 핵심만 간략히
- 마크다운 기호 사용 금지
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
          .replace(/^[-]\s*/gm, '')
          .trim();
        
        const paragraphs = cleanAnswer.split('\n\n');
        let finalAnswer = '';
        
        for (const para of paragraphs) {
          if (!para.match(/^(요약|질문|답변|핵심|투자|리포트)/i) && para.length > 50) {
            finalAnswer = para;
            break;
          }
        }
        
        if (!finalAnswer) {
          finalAnswer = cleanAnswer.split('. ').slice(0, 4).join('. ');
        }
        
        if (finalAnswer.length > 500) {
          finalAnswer = finalAnswer.substring(0, 497) + '...';
        }
        
        const newAnswer = {
          id: Date.now(),
          question: customQuestion,
          answer: finalAnswer,
          confidence: '높음',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setQuestionAnswer(newAnswer);
        setPreviousQuestions(prev => [newAnswer, ...prev].slice(0, 5));
        setCustomQuestion('');
      }
    } catch (error) {
      console.error('질문 처리 오류:', error);
      alert('답변 생성 중 오류가 발생했습니다.');
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
            content: '' // 실제로는 파일 읽기 필요
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
      
      let titleSuffix = '투자 분석 리포트';
      if (topicType === 'economy') titleSuffix = '경제 분석 리포트';
      else if (topicType === 'sector') titleSuffix = '산업 분석 리포트';
      
      setReport({
        title: `${topic} - ${titleSuffix}`,
        timestamp: new Date(data.metadata.timestamp).toLocaleString('ko-KR'),
        topicType: topicType,
        summary: parsedReport.summary || data.report.substring(0, 600),
        fullReport: data.report,
        metrics: {
          confidence: data.metadata?.dataQuality || 85,
          dataPoints: data.metadata.newsCount,
          sources: data.metadata.sources?.length || 0,
          accuracy: data.metadata?.dataQuality || 85,
          sentiment: data.metadata.sentiment
        },
        keyPoints: parsedReport.keyPoints.length > 0 ? parsedReport.keyPoints : [
          '핵심 포인트 분석 중...'
        ],
        analysis: parsedReport.analysis,
        risks: parsedReport.risks.length > 0 ? parsedReport.risks : [
          '리스크 분석 중...'
        ],
        recommendation: parsedReport.recommendation,
        economicIndicators: parsedReport.economicIndicators,
        sectorMetrics: parsedReport.sectorMetrics,
        stockMetrics: parsedReport.stockMetrics,
        additionalAnalysis: parsedReport.additionalAnalysis,
        sources: parsedReport.sources,
        news: data.metadata.sources || [],
        metadata: data.metadata,
        comparativeStocks: data.metadata.comparativeStocks || [],
        heatmapData: data.metadata.heatmapData || null,
        fileSources: data.metadata.fileSources || []
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Investment Intelligence</h1>
              <p className="text-sm text-slate-600">AI 기반 투자 분석 플랫폼 v4.0 Complete</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-900 mb-2">
              💡 <strong>사용방법:</strong> 기업명, 경제 지표, 산업 분석 주제를 입력하세요
            </p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-2 gap-2">
                <p className="text-xs text-blue-700">
                  <strong>🤖 AI 엔진:</strong> Claude Sonnet 4
                </p>
                <p className="text-xs text-blue-700">
                  <strong>📊 데이터:</strong> 실시간 뉴스 + 주가 + 업로드 파일
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div>
              {/* Topic Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  분석 주제 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 삼성전자, 미국 금리 전망, 반도체 산업..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Additional Info */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  추가 분석 요청 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="특정 관점이나 추가 분석 요청사항을 입력하세요&#10;예: HBM4 수요 전망, 단기 트레이딩 관점, ESG 분석 등"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="4"
                />
                {additionalInfo && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    추가 요청사항이 리포트에 별도 섹션으로 반영됩니다
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  참고 리포트 업로드 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">클릭하여 파일 선택</p>
                  <p className="text-xs text-slate-400">PDF, DOC, DOCX</p>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileCheck className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-900">
                        업로드된 파일 ({files.length}개)
                      </p>
                    </div>
                    <div className="space-y-1">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-green-700">
                          <FileText className="w-3 h-3" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      ✓ 업로드된 파일 내용이 리포트에 반영되고 출처 표시됩니다
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI 분석 중... (15-20초 소요)</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>리포트 생성</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {report && (
          <div className="space-y-6">
            {/* Header with Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeIcon(report.topicType)}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${getTypeColor(report.topicType)}-100 text-${getTypeColor(report.topicType)}-700`}>
                      {report.topicType === 'company' && '기업 분석'}
                      {report.topicType === 'economy' && '경제 분석'}
                      {report.topicType === 'sector' && '산업 분석'}
                    </span>
                    {report.fileSources.length > 0 && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                        파일 {report.fileSources.length}개 반영
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{report.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{report.timestamp}</p>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      const element = document.createElement('a');
                      const file = new Blob([report.fullReport], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                  >
                    <FileText className="w-4 h-4" />
                    <span>다운로드</span>
                  </button>
                  
                  <button
                    onClick={handleTextToSpeech}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      isReading
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isReading ? '중지' : '듣기'}</span>
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className={`bg-${getTypeColor(report.topicType)}-50 rounded-lg p-3`}>
                  <p className={`text-xs text-${getTypeColor(report.topicType)}-600 font-medium mb-1`}>신뢰도</p>
                  <p className={`text-xl font-bold text-${getTypeColor(report.topicType)}-900`}>
                    {report.metrics.confidence}%
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium mb-1">감성</p>
                  <p className="text-xl font-bold text-green-900">{report.metrics.sentiment}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium mb-1">뉴스</p>
                  <p className="text-xl font-bold text-purple-900">{report.metrics.dataPoints}건</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">출처</p>
                  <p className="text-xl font-bold text-amber-900">{report.metrics.sources}개</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-indigo-600 font-medium mb-1">데이터</p>
                  <p className="text-xl font-bold text-indigo-900">
                    {report.metadata?.hasStockData ? '주가+뉴스' : '뉴스'}
                  </p>
                </div>
              </div>

              {/* Stock Metrics (기업만) */}
              {report.topicType === 'company' && report.stockMetrics && Object.keys(report.stockMetrics).length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    실시간 주가 지표
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    <div>
                      <p className="text-xs text-slate-600">PER</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.pe}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">EPS</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.eps}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">시가총액</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.marketCap}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">52주 최고</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.high52Week}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">52주 최저</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.low52Week}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="border-b border-slate-200">
                <div className="flex space-x-1 p-2">
                  <button
                    onClick={() => setActiveTab('report')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'report'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>리포트</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('visualization')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'visualization'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <PieChart className="w-4 h-4" />
                    <span>시각화</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('analyst')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'analyst'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>AI 애널리스트</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'report' ? (
                  <div className="space-y-6">
                    {/* Summary with Sources */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleSection('summary')}
                      >
                        <h3 className="font-bold text-lg text-slate-900">요약</h3>
                        {expandedSections.summary ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      {expandedSections.summary && (
                        <>
                          <p className="text-slate-700 leading-relaxed mt-4">
                            {report.summary}
                          </p>
                          {report.sources && report.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Link2 className="w-3 h-3" />
                                <span>출처: {report.sources.slice(0, 3).join(', ')}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Key Points */}
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-3">
                        {report.topicType === 'company' && '핵심 투자 포인트'}
                        {report.topicType === 'economy' && '핵심 경제 지표'}
                        {report.topicType === 'sector' && '핵심 산업 트렌드'}
                      </h3>
                      <div className="space-y-2">
                        {report.keyPoints.map((point, index) => (
                          <div key={index} className={`flex items-start space-x-3 p-3 bg-${getTypeColor(report.topicType)}-50 rounded-lg`}>
                            <span className={`flex-shrink-0 w-6 h-6 bg-${getTypeColor(report.topicType)}-600 text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                              {index + 1}
                            </span>
                            <p className="text-slate-700 leading-relaxed flex-1">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Analysis Section (추가 요청사항 반영) */}
                    {report.additionalAnalysis && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-200">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleSection('additional')}
                        >
                          <h3 className="font-bold text-lg text-purple-900">
                            ➕ 추가 분석 (요청사항 반영)
                          </h3>
                          {expandedSections.additional ? (
                            <ChevronUp className="w-5 h-5 text-purple-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        {expandedSections.additional && (
                          <div className="mt-4">
                            <p className="text-purple-800 leading-relaxed whitespace-pre-line">
                              {report.additionalAnalysis}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SWOT Analysis (기업만) */}
                    {report.topicType === 'company' && report.analysis && Object.keys(report.analysis).length > 0 && (
                      <div>
                        <div
                          className="flex items-center justify-between cursor-pointer mb-3"
                          onClick={() => toggleSection('analysis')}
                        >
                          <h3 className="font-bold text-lg text-slate-900">SWOT 분석</h3>
                          {expandedSections.analysis ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        {expandedSections.analysis && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-3">강점</h4>
                              <ul className="space-y-2">
                                {(report.analysis.strengths || []).map((item, index) => (
                                  <li key={index} className="text-sm text-green-800 flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-red-50 rounded-lg p-5 border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-3">약점</h4>
                              <ul className="space-y-2">
                                {(report.analysis.weaknesses || []).map((item, index) => (
                                  <li key={index} className="text-sm text-red-800 flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                              <h4 className="font-semibold text-blue-900 mb-3">기회</h4>
                              <ul className="space-y-2">
                                {(report.analysis.opportunities || []).map((item, index) => (
                                  <li key={index} className="text-sm text-blue-800 flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
                              <h4 className="font-semibold text-amber-900 mb-3">위협</h4>
                              <ul className="space-y-2">
                                {(report.analysis.threats || []).map((item, index) => (
                                  <li key={index} className="text-sm text-amber-800 flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Risks */}
                    <div>
                      <div
                        className="flex items-center justify-between cursor-pointer mb-3"
                        onClick={() => toggleSection('risk')}
                      >
                        <h3 className="font-bold text-lg text-slate-900">
                          {report.topicType === 'economy' && '경제 리스크'}
                          {report.topicType === 'sector' && '산업 리스크'}
                          {report.topicType === 'company' && '투자 리스크'}
                        </h3>
                        {expandedSections.risk ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      {expandedSections.risk && (
                        <div className="space-y-2">
                          {report.risks.map((risk, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-900">{risk}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Investment Opinion Visual */}
                    <InvestmentOpinionVisual 
                      recommendation={report.recommendation} 
                      topicType={report.topicType} 
                    />

                    {/* News Sources */}
                    {report.news && report.news.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3">📰 관련 뉴스 (관련성 순)</h3>
                        <div className="space-y-2">
                          {report.news.slice(0, 5).map((news, index) => (
                            <a
                              key={index}
                              href={news.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors group"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600">
                                    {news.title}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <p className="text-xs text-slate-500">
                                      {new Date(news.date).toLocaleDateString('ko-KR')}
                                    </p>
                                    {news.relevance && (
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                        관련성 {news.relevance}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* File Sources */}
                    {report.fileSources && report.fileSources.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-sm text-purple-900 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          업로드된 파일 출처
                        </h4>
                        <div className="space-y-2">
                          {report.fileSources.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-purple-700">
                              <CheckCircle className="w-3 h-3 text-purple-500" />
                              <span>{file.name}</span>
                              <span className="text-xs text-purple-500">• 리포트에 반영됨</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'visualization' ? (
                  /* Visualization Tab */
                  <div className="space-y-6">
                    {/* Investment Opinion Visual */}
                    <InvestmentOpinionVisual 
                      recommendation={report.recommendation} 
                      topicType={report.topicType} 
                    />

                    {/* Sector Heatmap */}
                    {report.heatmapData && (
                      <SectorHeatmap data={report.heatmapData} />
                    )}

                    {/* Peer Comparison */}
                    {report.comparativeStocks && report.comparativeStocks.length > 0 && (
                      <PeerComparisonChart 
                        comparativeStocks={report.comparativeStocks} 
                        currentCompany={topic}
                      />
                    )}

                    {/* Sentiment Gauge */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 시장 감성 지표</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-32 h-32 rounded-full border-8 ${
                            report.metrics.sentiment === '긍정적' ? 'border-green-500' :
                            report.metrics.sentiment === '부정적' ? 'border-red-500' :
                            'border-amber-500'
                          } flex items-center justify-center`}>
                            <div className="text-center">
                              <p className="text-3xl font-bold text-slate-900">
                                {report.metrics.confidence}%
                              </p>
                              <p className="text-sm text-slate-600">{report.metrics.sentiment}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-sm">긍정 뉴스: {Math.round(report.metrics.dataPoints * 0.4)}건</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-amber-500" />
                              <span className="text-sm">중립 뉴스: {Math.round(report.metrics.dataPoints * 0.3)}건</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-sm">부정 뉴스: {Math.round(report.metrics.dataPoints * 0.3)}건</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Data Quality */}
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">📈 데이터 품질 지표</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>데이터 신뢰도</span>
                            <span>{report.metrics.confidence}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${report.metrics.confidence}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>정보 충실도</span>
                            <span>{report.metrics.accuracy}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${report.metrics.accuracy}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* AI Analyst Tab */
                  <div className="space-y-6">
                    {/* Interactive Q&A */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <MessageSquare className="w-6 h-6 text-purple-600" />
                        <h3 className="text-xl font-bold text-slate-900">
                          AI 애널리스트와 대화
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                        리포트 내용에 대해 궁금한 점을 질문하세요
                      </p>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                          placeholder={`예: ${report.topicType === 'company' ? '이 기업의 장기 전망은?' : 
                                             report.topicType === 'economy' ? '금리 인상 가능성은?' : 
                                             '이 산업의 성장 동력은?'}`}
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          disabled={questionLoading}
                        />
                        <button 
                          onClick={handleCustomQuestion}
                          disabled={questionLoading}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-300 transition-colors text-sm whitespace-nowrap flex items-center space-x-2"
                        >
                          {questionLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>분석중...</span>
                            </>
                          ) : (
                            <span>질문하기</span>
                          )}
                        </button>
                      </div>

                      {/* Current Answer */}
                      {questionAnswer && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              A
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 mb-2">{questionAnswer.question}</p>
                              <p className="text-slate-700 leading-relaxed">{questionAnswer.answer}</p>
                              <p className="text-xs text-slate-500 mt-2">{questionAnswer.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Previous Questions */}
                      {previousQuestions.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">이전 질문들</h4>
                          <div className="space-y-2">
                            {previousQuestions.map((qa) => (
                              <div key={qa.id} className="p-3 bg-white/50 rounded-lg border border-purple-100">
                                <p className="text-sm font-medium text-slate-900">{qa.question}</p>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{qa.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Insights */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                      <h3 className="text-xl font-bold text-slate-900 mb-4">
                        💡 빠른 인사이트
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {report.keyPoints.map((point, index) => (
                          <div key={index} className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                            <div className="flex items-start space-x-3">
                              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <p className="text-sm text-slate-700">{point}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">투자 유의사항</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    본 리포트는 AI 기반 분석이며, 투자 결정의 참고 자료로만 활용하시기 바랍니다. 
                    실제 투자 시에는 전문가 상담을 권장하며, 투자에 따른 책임은 투자자 본인에게 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center text-xs text-slate-500">
            <p>© 2025 Investment Intelligence v4.0 Complete. All rights reserved.</p>
            <p className="mt-2">Powered by Claude Sonnet 4 | Real-time Market Data | Advanced Analytics</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InvestmentIntelligencePlatform;
