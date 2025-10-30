import React, { useState, useRef } from 'react';
import { TrendingUp, Upload, Loader2, FileText, MessageSquare, Volume2, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, BarChart, Globe, Building } from 'lucide-react';

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
    recommendation: true
  });
  const [isReading, setIsReading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const fileInputRef = useRef(null);

  // 음성 읽기 함수
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

  // 타입별 리포트 파싱 함수 (완전 개선)
  const parseReportByType = (reportText, topicType, metadata) => {
    const result = {
      summary: '',
      keyPoints: [],
      recommendation: {},
      risks: [],
      analysis: {},
      economicIndicators: {},
      sectorMetrics: {},
      stockMetrics: {}
    };

    // 1. 요약 추출 (모든 타입 공통)
    const summaryMatch = reportText.match(/##\s*1\.\s*요약\s*\n+([\s\S]*?)(?=\n##\s*2\.|$)/i);
    if (summaryMatch) {
      result.summary = summaryMatch[1]
        .split('\n')
        .filter(line => line.trim().length > 0 && !line.trim().match(/^[-*]/))
        .join(' ')
        .trim()
        .substring(0, 600);
    }

    // 2. 핵심 포인트 추출 (타입별 다르게)
    let pointsPattern;
    if (topicType === 'company') {
      pointsPattern = /##\s*2\.\s*핵심\s*투자\s*포인트\s*\n+([\s\S]*?)(?=\n##\s*3\.|$)/i;
    } else if (topicType === 'economy') {
      pointsPattern = /##\s*2\.\s*핵심\s*경제\s*지표\s*\n+([\s\S]*?)(?=\n##\s*3\.|$)/i;
    } else {
      pointsPattern = /##\s*2\.\s*핵심\s*산업\s*트렌드\s*\n+([\s\S]*?)(?=\n##\s*3\.|$)/i;
    }
    
    const pointsMatch = reportText.match(pointsPattern);
    if (pointsMatch) {
      const points = pointsMatch[1].match(/[-*]\s*(.+)/g);
      if (points) {
        result.keyPoints = points
          .map(p => p.replace(/^[-*]\s*/, '').trim())
          .filter(p => p.length > 10)
          .slice(0, 5);
      }
    }

    // 3. 타입별 특화 데이터 추출
    if (topicType === 'company') {
      // SWOT 분석 추출
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

      // 투자 의견 추출
      const investMatch = reportText.match(/##\s*5\.\s*투자\s*의견\s*\n+([\s\S]*?)(?=\n##\s*6\.|$)/i);
      if (investMatch) {
        const investText = investMatch[1];
        
        const opinionMatch = investText.match(/투자\s*등급[:\s]*(BUY|HOLD|SELL)/i);
        const targetMatch = investText.match(/목표\s*주가[:\s]*([0-9,]+)\s*원/i);
        const currentMatch = investText.match(/현재\s*주가[:\s]*([0-9,]+)\s*원/i);
        const periodMatch = investText.match(/투자\s*기간[:\s]*([^\n]+)/i);
        const reasonMatch = investText.match(/투자\s*근거[:\s]*([^\n]+)/i);

        result.recommendation = {
          opinion: opinionMatch ? opinionMatch[1] : 'HOLD',
          targetPrice: targetMatch ? targetMatch[1] + '원' : '-',
          currentPrice: currentMatch ? currentMatch[1] + '원' : '-',
          horizon: periodMatch ? periodMatch[1].trim() : '12개월',
          reason: reasonMatch ? reasonMatch[1].trim() : ''
        };

        // 상승여력 계산
        if (targetMatch && currentMatch) {
          const target = parseInt(targetMatch[1].replace(/,/g, ''));
          const current = parseInt(currentMatch[1].replace(/,/g, ''));
          if (!isNaN(target) && !isNaN(current) && current > 0) {
            const upside = ((target - current) / current * 100).toFixed(1);
            result.recommendation.upside = (upside > 0 ? '+' : '') + upside + '%';
          } else {
            result.recommendation.upside = '-';
          }
        } else {
          result.recommendation.upside = '-';
        }
      }

      // 주가 메트릭 (메타데이터에서)
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
          volume: metadata.stockData.volume ? 
            metadata.stockData.volume.toLocaleString() : '-',
          changePercent: metadata.stockData.changePercent ? 
            metadata.stockData.changePercent.toFixed(2) + '%' : '-'
        };
      }

    } else if (topicType === 'economy') {
      // 경제 지표 추출
      const indicatorsMatch = reportText.match(/##\s*2\.\s*핵심\s*경제\s*지표\s*\n+([\s\S]*?)(?=\n##\s*3\.|$)/i);
      if (indicatorsMatch) {
        const text = indicatorsMatch[1];
        
        const extractIndicator = (name) => {
          const pattern = new RegExp(`${name}[:\s]*([^\n]+)`, 'i');
          const match = text.match(pattern);
          return match ? match[1].trim() : '-';
        };

        result.economicIndicators = {
          gdp: extractIndicator('GDP 성장률'),
          inflation: extractIndicator('물가상승률'),
          interestRate: extractIndicator('기준금리'),
          exchangeRate: extractIndicator('환율'),
          unemployment: extractIndicator('실업률')
        };
      }

      // 경제 전망 추출
      const outlookMatch = reportText.match(/##\s*5\.\s*경제\s*전망\s*\n+([\s\S]*?)(?=\n##\s*6\.|$)/i);
      if (outlookMatch) {
        const text = outlookMatch[1];
        
        const sentimentMatch = text.match(/경제\s*전망[:\s]*(긍정적|중립적|부정적)/i);
        const periodMatch = text.match(/전망\s*기간[:\s]*([^\n]+)/i);
        const growthMatch = text.match(/성장률\s*전망[:\s]*([^\n]+)/i);

        result.recommendation = {
          outlook: sentimentMatch ? sentimentMatch[1] : '중립적',
          horizon: periodMatch ? periodMatch[1].trim() : '6-12개월',
          growthForecast: growthMatch ? growthMatch[1].trim() : '-',
          type: 'economy'
        };
      }

    } else if (topicType === 'sector') {
      // 산업 메트릭 추출
      const metricsMatch = reportText.match(/##\s*3\.\s*산업\s*구조.*?\n+([\s\S]*?)(?=\n##\s*4\.|$)/i);
      if (metricsMatch) {
        const text = metricsMatch[1];
        
        const marketSizeMatch = text.match(/시장\s*규모[^\n]*:\s*([^\n]+)/i);
        const growthRateMatch = text.match(/성장률[^\n]*:\s*([^\n]+)/i);

        result.sectorMetrics = {
          marketSize: marketSizeMatch ? marketSizeMatch[1].trim() : '-',
          growthRate: growthRateMatch ? growthRateMatch[1].trim() : '-'
        };
      }

      // 산업 전망 추출
      const outlookMatch = reportText.match(/##\s*5\.\s*산업\s*전망\s*\n+([\s\S]*?)(?=\n##\s*6\.|$)/i);
      if (outlookMatch) {
        const text = outlookMatch[1];
        
        const sentimentMatch = text.match(/산업\s*전망[:\s]*(긍정적|중립적|부정적)/i);
        const periodMatch = text.match(/전망\s*기간[:\s]*([^\n]+)/i);
        const attractivenessMatch = text.match(/투자\s*매력도[:\s]*(높음|중간|낮음)/i);

        result.recommendation = {
          outlook: sentimentMatch ? sentimentMatch[1] : '중립적',
          horizon: periodMatch ? periodMatch[1].trim() : '12개월',
          attractiveness: attractivenessMatch ? attractivenessMatch[1] : '중간',
          type: 'sector'
        };
      }
    }

    // 4. 리스크 추출 (모든 타입 공통)
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

    // 5. 투자자 관점 추출
    const investorMatch = reportText.match(/##\s*6\.\s*(?:투자자|투자).*?\n+([\s\S]*?)$/i);
    if (investorMatch) {
      result.investorPerspective = investorMatch[1].trim();
    }

    return result;
  };

  // AI 질문 처리 함수 (개선)
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
          searchQuery: `${topic} 관련 질문 답변`,
          uploadedFiles: [],
          additionalInfo: `
[질문] ${customQuestion}

[컨텍스트]
주제: ${topic}
타입: ${report.topicType}
리포트 요약: ${report.summary}

[요구사항]
1. 위 리포트 맥락에서 질문에 답변
2. 3-4문장으로 명확하게
3. 리포트 내용 기반으로만 답변
`
        })
      });

      if (!response.ok) throw new Error('답변 생성 실패');

      const data = await response.json();
      
      if (data.success) {
        const cleanAnswer = data.report
          .replace(/[*#_~`]/g, '')
          .substring(0, 400);
        
        const newAnswer = {
          id: Date.now(),
          question: customQuestion,
          answer: cleanAnswer,
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

  // 리포트 생성 함수 (개선)
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
          uploadedFiles: files.map(f => ({ name: f.name })),
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

      // 타입 정보 가져오기
      const topicType = data.topicType || data.metadata?.topicType || 'company';
      console.log('받은 주제 타입:', topicType);
      
      // 타입별 파싱
      const parsedReport = parseReportByType(data.report, topicType, data.metadata);
      
      // 타입별 제목 생성
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
          '핵심 포인트를 추출하는 중...'
        ],
        analysis: parsedReport.analysis,
        risks: parsedReport.risks.length > 0 ? parsedReport.risks : [
          '리스크 분석 중...'
        ],
        recommendation: parsedReport.recommendation,
        economicIndicators: parsedReport.economicIndicators,
        sectorMetrics: parsedReport.sectorMetrics,
        stockMetrics: parsedReport.stockMetrics,
        investorPerspective: parsedReport.investorPerspective,
        news: data.metadata.sources || [],
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

  // 타입별 아이콘 가져오기
  const getTypeIcon = (type) => {
    if (type === 'economy') return <Globe className="w-5 h-5" />;
    if (type === 'sector') return <BarChart className="w-5 h-5" />;
    return <Building className="w-5 h-5" />;
  };

  // 타입별 색상 가져오기
  const getTypeColor = (type) => {
    if (type === 'economy') return 'blue';
    if (type === 'sector') return 'purple';
    return 'green';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Investment Intelligence</h1>
              <p className="text-sm text-slate-600">AI 기반 투자 분석 플랫폼 v3.0</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-900 mb-2">
              💡 <strong>사용방법:</strong> 기업명, 경제 지표, 산업 분석 주제를 입력하세요
            </p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700 mb-1">
                <strong>🤖 AI 엔진:</strong> Claude Sonnet 4 (최적화)
              </p>
              <p className="text-xs text-blue-700">
                <strong>📊 데이터:</strong> 네이버 뉴스 (실시간) + Yahoo Finance (주가)
              </p>
            </div>
          </div>

          {/* Topic Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              분석 주제
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 삼성전자, 미국 금리 전망, 반도체 산업 분석..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              참고 자료 업로드 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-1">
                클릭하여 파일 선택 또는 드래그 앤 드롭
              </p>
              <p className="text-xs text-slate-400">
                PDF, DOC, DOCX 형식 지원
              </p>
              {files.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    선택된 파일 ({files.length}개)
                  </p>
                  <div className="space-y-1">
                    {files.map((file, index) => (
                      <p key={index} className="text-xs text-slate-600 truncate">
                        📄 {file.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              추가 분석 요청 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="특정 관점이나 추가 분석 사항을 입력하세요"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 resize-none"
              rows="3"
            ></textarea>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>분석 중... (10-15초 소요)</span>
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
            {/* Header */}
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
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>다운로드</span>
                  </button>
                  
                  <button
                    onClick={handleTextToSpeech}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

              {/* Metrics - 타입별 다르게 표시 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {report.topicType === 'company' && (
                  <>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">신뢰도</p>
                      <p className="text-2xl font-bold text-blue-900">{report.metrics.confidence}%</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-green-600 font-medium mb-1">감성</p>
                      <p className="text-2xl font-bold text-green-900">{report.metrics.sentiment}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs text-purple-600 font-medium mb-1">뉴스</p>
                      <p className="text-2xl font-bold text-purple-900">{report.metrics.dataPoints}건</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="text-xs text-amber-600 font-medium mb-1">주가 데이터</p>
                      <p className="text-2xl font-bold text-amber-900">
                        {report.metadata?.hasStockData ? '있음' : '없음'}
                      </p>
                    </div>
                  </>
                )}
                
                {report.topicType === 'economy' && (
                  <>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">분석 신뢰도</p>
                      <p className="text-2xl font-bold text-blue-900">{report.metrics.confidence}%</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-xs text-indigo-600 font-medium mb-1">경제 전망</p>
                      <p className="text-xl font-bold text-indigo-900">{report.metrics.sentiment}</p>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-4">
                      <p className="text-xs text-teal-600 font-medium mb-1">분석 데이터</p>
                      <p className="text-2xl font-bold text-teal-900">{report.metrics.dataPoints}건</p>
                    </div>
                    <div className="bg-cyan-50 rounded-lg p-4">
                      <p className="text-xs text-cyan-600 font-medium mb-1">출처</p>
                      <p className="text-2xl font-bold text-cyan-900">{report.metrics.sources}개</p>
                    </div>
                  </>
                )}
                
                {report.topicType === 'sector' && (
                  <>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs text-purple-600 font-medium mb-1">분석 품질</p>
                      <p className="text-2xl font-bold text-purple-900">{report.metrics.confidence}%</p>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-4">
                      <p className="text-xs text-pink-600 font-medium mb-1">산업 전망</p>
                      <p className="text-xl font-bold text-pink-900">{report.metrics.sentiment}</p>
                    </div>
                    <div className="bg-violet-50 rounded-lg p-4">
                      <p className="text-xs text-violet-600 font-medium mb-1">수집 뉴스</p>
                      <p className="text-2xl font-bold text-violet-900">{report.metrics.dataPoints}건</p>
                    </div>
                    <div className="bg-fuchsia-50 rounded-lg p-4">
                      <p className="text-xs text-fuchsia-600 font-medium mb-1">데이터 출처</p>
                      <p className="text-2xl font-bold text-fuchsia-900">{report.metrics.sources}개</p>
                    </div>
                  </>
                )}
              </div>

              {/* 주가 메트릭 (기업만) */}
              {report.topicType === 'company' && report.stockMetrics && Object.keys(report.stockMetrics).length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-sm text-slate-900 mb-3">📈 실시간 주가 지표</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      <p className="text-xs text-slate-600">전일대비</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.changePercent}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">52주 최고</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.high52Week}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">52주 최저</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.low52Week}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">거래량</p>
                      <p className="text-sm font-bold text-slate-900">{report.stockMetrics.volume}</p>
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
                    {/* Summary */}
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
                        <p className="text-slate-700 leading-relaxed mt-4 whitespace-pre-line">
                          {report.summary}
                        </p>
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
                            <p className="text-slate-700 leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Type-specific content */}
                    {/* 기업: SWOT 분석 */}
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

                    {/* 경제: 경제 지표 */}
                    {report.topicType === 'economy' && report.economicIndicators && Object.keys(report.economicIndicators).length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">경제 지표 현황</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">GDP 성장률</p>
                            <p className="text-xl font-bold text-slate-900">{report.economicIndicators.gdp}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">물가상승률</p>
                            <p className="text-xl font-bold text-slate-900">{report.economicIndicators.inflation}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">기준금리</p>
                            <p className="text-xl font-bold text-slate-900">{report.economicIndicators.interestRate}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">환율</p>
                            <p className="text-xl font-bold text-slate-900">{report.economicIndicators.exchangeRate}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">실업률</p>
                            <p className="text-xl font-bold text-slate-900">{report.economicIndicators.unemployment}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 산업: 산업 메트릭 */}
                    {report.topicType === 'sector' && report.sectorMetrics && Object.keys(report.sectorMetrics).length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">산업 현황</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">시장 규모</p>
                            <p className="text-xl font-bold text-slate-900">{report.sectorMetrics.marketSize}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">성장률</p>
                            <p className="text-xl font-bold text-slate-900">{report.sectorMetrics.growthRate}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Risks */}
                    <div>
                      <div
                        className="flex items-center justify-between cursor-pointer mb-3"
                        onClick={() => toggleSection('risk')}
                      >
                        <h3 className="font-bold text-lg text-slate-900">
                          {report.topicType === 'economy' && '경제 리스크 요인'}
                          {report.topicType === 'sector' && '산업 리스크 요인'}
                          {report.topicType === 'company' && '투자 리스크 요인'}
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

                    {/* Recommendations - 타입별 다르게 */}
                    <div>
                      <div
                        className="flex items-center justify-between cursor-pointer mb-3"
                        onClick={() => toggleSection('recommendation')}
                      >
                        <h3 className="font-bold text-lg text-slate-900">
                          {report.topicType === 'economy' && '경제 전망'}
                          {report.topicType === 'sector' && '산업 전망'}
                          {report.topicType === 'company' && '투자 의견'}
                        </h3>
                        {expandedSections.recommendation ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      {expandedSections.recommendation && (
                        <>
                          {/* 기업: 투자 의견 */}
                          {report.topicType === 'company' && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <p className="text-sm text-slate-600 mb-1">투자의견</p>
                                  <p className={`text-3xl font-bold ${
                                    report.recommendation.opinion === 'BUY' ? 'text-green-700' :
                                    report.recommendation.opinion === 'SELL' ? 'text-red-700' :
                                    'text-amber-700'
                                  }`}>
                                    {report.recommendation.opinion}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-600 mb-1">목표주가</p>
                                  <p className="text-3xl font-bold text-slate-900">{report.recommendation.targetPrice}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-600 mb-1">현재가</p>
                                  <p className="text-xl font-semibold text-slate-700">{report.recommendation.currentPrice}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-600 mb-1">상승여력</p>
                                  <p className={`text-xl font-semibold ${
                                    report.recommendation.upside?.startsWith('+') ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {report.recommendation.upside}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-green-200">
                                <p className="text-sm text-slate-600">
                                  투자기간: {report.recommendation.horizon}
                                </p>
                                {report.recommendation.reason && (
                                  <p className="text-sm text-slate-700 mt-2">
                                    투자근거: {report.recommendation.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 경제: 경제 전망 */}
                          {report.topicType === 'economy' && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                              <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg">
                                  <p className="text-xs text-slate-600 mb-2">경제 전망</p>
                                  <p className={`text-xl font-bold ${
                                    report.recommendation.outlook === '긍정적' ? 'text-green-700' :
                                    report.recommendation.outlook === '부정적' ? 'text-red-700' :
                                    'text-amber-700'
                                  }`}>
                                    {report.recommendation.outlook}
                                  </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg">
                                  <p className="text-xs text-slate-600 mb-2">전망 기간</p>
                                  <p className="text-xl font-semibold text-slate-900">
                                    {report.recommendation.horizon}
                                  </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg">
                                  <p className="text-xs text-slate-600 mb-2">성장률 전망</p>
                                  <p className="text-xl font-semibold text-blue-700">
                                    {report.recommendation.growthForecast}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 산업: 산업 전망 */}
                          {report.topicType === 'sector' && (
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                              <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg">
                                  <p className="text-xs text-slate-600 mb-2">산업 전망</p>
                                  <p className={`text-xl font-bold ${
                                    report.recommendation.outlook === '긍정적' ? 'text-green-700' :
                                    report.recommendation.outlook === '부정적' ? 'text-red-700' :
                                    'text-amber-700'
                                  }`}>
                                    {report.recommendation.outlook}
                                  </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg">
                                  <p className="text-xs text-slate-600 mb-2">투자 매력도</p>
                                  <p className={`text-xl font-semibold ${
                                    report.recommendation.attractiveness === '높음' ? 'text-purple-700' :
                                    report.recommendation.attractiveness === '낮음' ? 'text-gray-700' :
                                    'text-blue-700'
                                  }`}>
                                    {report.recommendation.attractiveness}
                                  </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg">
                                  <p className="text-xs text-slate-600 mb-2">전망 기간</p>
                                  <p className="text-xl font-semibold text-slate-900">
                                    {report.recommendation.horizon}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Investor Perspective */}
                    {report.investorPerspective && (
                      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-5 border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-900 mb-3">투자자 관점</h3>
                        <p className="text-slate-700 leading-relaxed">
                          {report.investorPerspective}
                        </p>
                      </div>
                    )}

                    {/* News Sources */}
                    {report.news && report.news.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3">참고 뉴스</h3>
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
                                  <p className="text-xs text-slate-500 mt-1">
                                    {new Date(news.date).toLocaleDateString('ko-KR')}
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* AI Analyst Tab */
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-8 border border-slate-200">
                      <div className="flex items-center space-x-2 mb-4">
                        {getTypeIcon(report.topicType)}
                        <h2 className="text-2xl font-bold text-slate-900">
                          {topic} - AI 분석 요약
                        </h2>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {report.summary}
                      </p>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                      <h3 className="text-xl font-bold text-slate-900 mb-4">
                        📊 핵심 인사이트
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {report.keyPoints.map((point, index) => (
                          <div key={index} className={`bg-gradient-to-r from-${getTypeColor(report.topicType)}-50 to-${getTypeColor(report.topicType)}-100 rounded-lg p-4 border-l-4 border-${getTypeColor(report.topicType)}-500`}>
                            <div className="flex items-start space-x-3">
                              <span className={`flex-shrink-0 w-8 h-8 bg-${getTypeColor(report.topicType)}-600 text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                                {index + 1}
                              </span>
                              <p className="text-slate-700 pt-1">{point}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

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
                    본 리포트는 AI 기반 분석 결과이며, 투자 결정의 참고 자료로만 활용하시기 바랍니다. 
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center text-xs text-slate-500">
            <p>© 2025 Investment Intelligence v3.0. All rights reserved.</p>
            <p className="mt-2">Powered by Claude Sonnet 4 & Real-time Market Data</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InvestmentIntelligencePlatform;
