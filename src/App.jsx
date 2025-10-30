import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, Upload, Loader2, FileText, MessageSquare, Mic, MicOff,
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink, BarChart, 
  Globe, Building, Activity, TrendingDown, DollarSign, PieChart,
  Info, CheckCircle, Link2, FileCheck, Play, Pause, Volume2
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
  
  // 음성 관련 상태
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isReading, setIsReading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  
  // AI 대화
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [previousQuestions, setPreviousQuestions] = useState([]);
  
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ko-KR';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setCustomQuestion(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  // 섹터 히트맵 (실시간 데이터 기반)
  const SectorHeatmap = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 실시간 섹터 히트맵</h4>
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
        <h4 className="text-sm font-semibold text-slate-900 mb-3">🏢 동종업계 실시간 비교</h4>
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

  // 감성 게이지 (실시간)
  const SentimentGauge = ({ sentiment, score }) => {
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">📈 시장 감성 분석</h4>
        <div className="relative h-40">
          {/* 반원 게이지 */}
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
            />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={
                score?.positive > 60 ? '#10b981' :
                score?.negative > 60 ? '#ef4444' :
                '#f59e0b'
              }
              strokeWidth="20"
              strokeDasharray={`${(score?.positive || 50) * 2.5} 1000`}
            />
            {/* 바늘 */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos((Math.PI * (score?.positive || 50)) / 100 + Math.PI) * 70}
              y2={100 + Math.sin((Math.PI * (score?.positive || 50)) / 100 + Math.PI) * 70}
              stroke="#1f2937"
              strokeWidth="3"
            />
            <circle cx="100" cy="100" r="5" fill="#1f2937" />
          </svg>
          
          {/* 레이블 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center mt-8">
              <p className="text-2xl font-bold text-slate-900">{sentiment}</p>
              <p className="text-sm text-slate-600">
                긍정 {score?.positive || 0}% | 부정 {score?.negative || 0}%
              </p>
            </div>
          </div>
        </div>
        
        {/* 상세 수치 */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center">
            <p className="text-xs text-green-600">긍정</p>
            <p className="text-lg font-bold text-green-700">{score?.positive || 0}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">중립</p>
            <p className="text-lg font-bold text-gray-700">{score?.neutral || 0}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-red-600">부정</p>
            <p className="text-lg font-bold text-red-700">{score?.negative || 0}%</p>
          </div>
        </div>
      </div>
    );
  };

  // 출처 표시 컴포넌트
  const SourceBadge = ({ sources, newsLinks }) => {
    if (!sources || sources.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
        {newsLinks && newsLinks.map((news, idx) => (
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

  // 음성 읽기 (개선)
  const handleTextToSpeech = (text = null) => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      setReadingProgress(0);
      return;
    }

    // 읽을 텍스트 준비 (기호 제거)
    let textToRead = text || report.keyPoints.join('. ');
    textToRead = textToRead
      .replace(/[\[\]]/g, '') // 대괄호 제거
      .replace(/[*#_-]/g, '') // 마크다운 기호 제거
      .replace(/뉴스\d+/g, '') // "뉴스1" 같은 출처 제거
      .replace(/\(.+?\)/g, '') // 괄호 내용 제거
      .trim();

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ko-KR';
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => {
      setIsReading(false);
      setReadingProgress(0);
    };
    utterance.onerror = () => {
      setIsReading(false);
      setReadingProgress(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  // 음성 인식 시작
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // AI 대화형 응답
  const handleVoiceQuestion = async (question) => {
    const answer = await handleCustomQuestion(question);
    if (answer && voiceMode) {
      handleTextToSpeech(answer);
    }
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

    // 출처 매핑
    const sourcesInText = reportText.match(/\[(뉴스\d+|[^[\]]+\.pdf|업로드파일)\]/g);
    if (sourcesInText) {
      result.sources = [...new Set(sourcesInText)];
    }

    // 나머지 파싱은 기존과 동일...
    
    return result;
  };

  // AI 질문 처리
  const handleCustomQuestion = async (questionText = null) => {
    const question = questionText || customQuestion;
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
          confidence: '높음',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setQuestionAnswer(newAnswer);
        setPreviousQuestions(prev => [newAnswer, ...prev].slice(0, 5));
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
          sentimentScore: data.metadata.sentimentScore
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
        stockMetrics: data.metadata.stockData,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Investment Intelligence</h1>
                <p className="text-sm text-slate-600">AI 기반 투자 분석 플랫폼 v5.0 Final</p>
              </div>
            </div>
            
            {/* 음성 모드 토글 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setVoiceMode(!voiceMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  voiceMode 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Mic className="w-4 h-4 inline mr-2" />
                음성 모드
              </button>
              
              {voiceMode && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">속도</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-700">{speechRate}x</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
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
                placeholder="예: HBM4 전망 중심으로 분석해주세요"
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
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      {files.length}개 파일 선택됨
                    </span>
                  </div>
                  {files.map((file, idx) => (
                    <div key={idx} className="text-xs text-green-700 mt-1 truncate">
                      • {file.name}
                    </div>
                  ))}
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
                  <h2 className="text-2xl font-bold text-slate-900">{report.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{report.timestamp}</p>
                  {report.fileSources.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-700">
                        {report.fileSources.map(f => f.name).join(', ')} 반영됨
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
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
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>다운로드</span>
                  </button>
                  
                  <button
                    onClick={() => handleTextToSpeech()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isReading
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {isReading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">신뢰도</p>
                  <p className="text-xl font-bold text-blue-900">{report.metrics.confidence}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium">감성</p>
                  <p className="text-xl font-bold text-green-900">{report.metrics.sentiment}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium">뉴스</p>
                  <p className="text-xl font-bold text-purple-900">{report.metrics.dataPoints}건</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium">출처</p>
                  <p className="text-xl font-bold text-amber-900">{report.metrics.sources}개</p>
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
                    {/* Summary with Sources */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                      <h3 className="font-bold text-lg text-slate-900 mb-3">요약</h3>
                      <p className="text-slate-700 leading-relaxed">
                        {report.summary}
                      </p>
                      <SourceBadge sources={report.sources} newsLinks={report.newsLinks} />
                    </div>

                    {/* Additional Analysis */}
                    {report.additionalAnalysis && (
                      <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                        <h3 className="font-bold text-lg text-purple-900 mb-3">
                          ➕ 추가 분석 (요청사항 반영)
                        </h3>
                        <p className="text-purple-800 leading-relaxed">
                          {report.additionalAnalysis}
                        </p>
                      </div>
                    )}

                    {/* Other sections... */}
                  </div>
                ) : activeTab === 'visualization' ? (
                  <div className="space-y-6">
                    {/* 실시간 시각화 */}
                    <SentimentGauge 
                      sentiment={report.metrics.sentiment} 
                      score={report.metrics.sentimentScore} 
                    />
                    
                    {report.sectorData && report.sectorData.length > 0 && (
                      <SectorHeatmap data={report.sectorData} />
                    )}
                    
                    {report.comparativeStocks && report.comparativeStocks.length > 0 && (
                      <PeerComparisonChart 
                        comparativeStocks={report.comparativeStocks}
                        currentCompany={topic}
                      />
                    )}
                  </div>
                ) : (
                  /* AI 대화 탭 */
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <h3 className="text-xl font-bold text-slate-900 mb-4">
                        🤖 AI 애널리스트와 대화
                      </h3>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                          placeholder="질문을 입력하거나 🎤 버튼을 눌러 음성으로 질문하세요"
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg"
                          disabled={questionLoading}
                        />
                        
                        {voiceMode && (
                          <button
                            onClick={startListening}
                            disabled={isListening}
                            className={`px-4 py-3 rounded-lg ${
                              isListening
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleCustomQuestion()}
                          disabled={questionLoading}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-300"
                        >
                          {questionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            '전송'
                          )}
                        </button>
                      </div>

                      {/* 답변 */}
                      {questionAnswer && (
                        <div className="mt-4 p-4 bg-white rounded-lg">
                          <p className="font-semibold text-slate-900 mb-2">Q: {questionAnswer.question}</p>
                          <p className="text-slate-700">A: {questionAnswer.answer}</p>
                          {voiceMode && (
                            <button
                              onClick={() => handleTextToSpeech(questionAnswer.answer)}
                              className="mt-2 text-xs text-purple-600 hover:text-purple-700"
                            >
                              <Volume2 className="w-3 h-3 inline mr-1" />
                              다시 듣기
                            </button>
                          )}
                        </div>
                      )}

                      {/* 이전 대화 */}
                      {previousQuestions.length > 0 && (
                        <div className="mt-6 space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700">이전 대화</h4>
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
