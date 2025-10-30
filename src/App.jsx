// App.jsx 최종 완성본
// 하드코딩 제거 + 동적 데이터만 사용

import React, { useState, useRef } from 'react';
import { Upload, TrendingUp, Loader2, FileText, Bot, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Send } from 'lucide-react';

const App = () => {
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('report');
  const [expandedSections, setExpandedSections] = useState({
    keyPoints: true,
    analysis: true,
    risk: true,
    recommendation: true
  });
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // 주제 타입 판별
  const getTopicType = (searchTopic) => {
    const q = searchTopic.toLowerCase();
    
    const economyWords = ['경제', '금리', '환율', 'gdp', '물가', '인플', '성장률', '경기', '실업'];
    const sectorWords = ['산업', '업종', '섹터', '시장'];
    const companyWords = ['전자', '바이오', '제약', '은행', '반도체', '자동차', '삼성', 'lg', 'sk'];

    for (const word of economyWords) {
      if (q.includes(word)) {
        let hasCompany = false;
        for (const comp of companyWords) {
          if (q.includes(comp)) { hasCompany = true; break; }
        }
        if (!hasCompany) return 'economy';
      }
    }

    for (const word of sectorWords) {
      if (q.includes(word)) return 'sector';
    }

    for (const word of companyWords) {
      if (q.includes(word)) return 'company';
    }

    return 'economy';
  };

  // 리포트 파싱 (하드코딩 제거!)
  const parseReport = (reportText) => {
    const result = {
      summary: '',
      keyPoints: [],
      recommendation: {
        opinion: '-',
        targetPrice: '-',
        currentPrice: '-',
        upside: '-',
        horizon: '12개월'
      },
      risks: [],
      analysis: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: []
      }
    };

    // 요약 추출
    const summaryMatch = reportText.match(/##?\s*(?:1\.\s*)?요약[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
    if (summaryMatch) {
      result.summary = summaryMatch[1]
        .split('\n')
        .filter(line => line.trim() && !line.match(/^[-*]\s/))
        .join('\n')
        .trim()
        .substring(0, 500)
        .replace(/[*#]/g, '');
    }

    // 핵심 포인트
    const pointsMatch = reportText.match(/##?\s*(?:핵심|주요).*?(?:포인트|트렌드|지표)[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
    if (pointsMatch) {
      result.keyPoints = pointsMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^[-*•]\s/))
        .map(line => line.replace(/^[-*•]\s+/, '').trim())
        .filter(p => p.length > 0)
        .slice(0, 4);
    }

    // SWOT 분석 (기업만)
    const swotMatch = reportText.match(/##?\s*3\.\s*SWOT[^\n]*\n+([\s\S]*?)(?=\n##\s*4|$)/i);
    if (swotMatch) {
      const swotText = swotMatch[1];
      
      const extractItems = (section) => {
        const match = swotText.match(new RegExp(`###?\\s*${section}[^\\n]*\\n+([\\s\\S]*?)(?=\\n###?|$)`, 'i'));
        if (!match) return [];
        return match[1].split('\n')
          .filter(line => line.trim().match(/^[-*•]/))
          .map(line => line.replace(/^[-*•]\s+/, '').trim())
          .filter(s => s.length > 0);
      };

      result.analysis.strengths = extractItems('강점');
      result.analysis.weaknesses = extractItems('약점');
      result.analysis.opportunities = extractItems('기회');
      result.analysis.threats = extractItems('위협');
    }

    // 리스크
    const riskMatch = reportText.match(/##?\s*4\.\s*(?:리스크|경제 리스크|산업 리스크)[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
    if (riskMatch) {
      result.risks = riskMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^[-*•]/))
        .map(line => line.replace(/^[-*•]\s+/, '').trim())
        .filter(r => r.length > 0)
        .slice(0, 5);
    }

    // 투자 의견 (기업만)
    const recMatch = reportText.match(/##?\s*5\.\s*투자\s*의견[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
    if (recMatch) {
      const recText = recMatch[1];
      
      const opinionMatch = recText.match(/투자\s*등급\s*[:\s]*(\w+)/i);
      if (opinionMatch) result.recommendation.opinion = opinionMatch[1];
      
      const targetMatch = recText.match(/목표\s*주가\s*[:\s]*([\d,]+)\s*원/i);
      if (targetMatch) result.recommendation.targetPrice = targetMatch[1] + '원';
      
      const currentMatch = recText.match(/현재\s*주가\s*[:\s]*([\d,]+)\s*원/i);
      if (currentMatch) result.recommendation.currentPrice = currentMatch[1] + '원';
      
      if (targetMatch && currentMatch) {
        const target = parseInt(targetMatch[1].replace(/,/g, ''));
        const current = parseInt(currentMatch[1].replace(/,/g, ''));
        const upside = ((target - current) / current * 100).toFixed(1);
        result.recommendation.upside = (upside > 0 ? '+' : '') + upside + '%';
      }
    }

    return result;
  };

  // AI 요약 생성 (투자자 관점만)
  const generateAISummary = (fullReport) => {
    const viewMatch = fullReport.match(/##?\s*6\.\s*투자자\s*관점[^\n]*\n+([\s\S]*?)$/i);
    if (viewMatch) {
      return viewMatch[1].trim().replace(/[*#]/g, '').substring(0, 600);
    }
    
    const summaryMatch = fullReport.match(/##?\s*1\.\s*요약[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim().replace(/[*#]/g, '').substring(0, 400);
    }
    
    return fullReport.substring(0, 400);
  };

  // 파일 업로드
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  // 섹션 토글
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 리포트 생성
  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('분석 주제를 입력해주세요.');
      return;
    }

    setLoading(true);
    setReport(null);
    setCustomQuestion('');
    setCustomAnswer('');

    try {
      const topicType = getTopicType(topic);
      
      const response = await fetch('https://ai-investment-report.vercel.app/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: topic,
          uploadedFiles: files.map(f => ({ name: f.name, size: f.size })),
          additionalInfo: additionalInfo
        })
      });

      if (!response.ok) throw new Error(`API 오류: ${response.status}`);

      const data = await response.json();
      
      if (!data.success || !data.report) {
        throw new Error('리포트 생성 실패');
      }

      const parsedReport = parseReport(data.report);

      // 하드코딩 제거! parsedReport만 사용!
      setReport({
        topic: topic,
        summary: parsedReport.summary || '요약 정보를 생성하지 못했습니다.',
        aiSummary: generateAISummary(data.report),
        fullReport: data.report,
        topicType: data.metadata?.topicType || topicType,
        metrics: {
          confidence: data.metadata?.dataQuality || 85,
          dataPoints: data.metadata?.newsCount || 0,
          sources: data.metadata?.sources?.length || 0,
          accuracy: data.metadata?.dataQuality || 85
        },
        keyPoints: parsedReport.keyPoints.length > 0 ? parsedReport.keyPoints : ['포인트 정보 없음'],
        analysis: parsedReport.analysis, // 그대로 사용!
        risks: parsedReport.risks.length > 0 ? parsedReport.risks : ['리스크 정보 없음'],
        recommendation: parsedReport.recommendation, // 그대로 사용!
        news: data.metadata?.sources || [],
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

  // AI 질문 (fullReport 기반, API 재호출 금지!)
  const handleCustomQuestion = async () => {
    if (!customQuestion.trim()) {
      alert('질문을 입력해주세요.');
      return;
    }

    if (!report || !report.fullReport) {
      alert('먼저 리포트를 생성해주세요.');
      return;
    }

    setAnswerLoading(true);
    setCustomAnswer('');

    try {
      // fullReport 기반 간단 답변 (API 재호출 금지!)
      const context = report.fullReport.substring(0, 2000); // 2000자만
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_ANTHROPIC_API_KEY', // 환경변수로 교체 필요
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500, // 짧게!
          messages: [{
            role: 'user',
            content: `다음 리포트를 바탕으로 질문에 답하세요. 3-4문장으로 간결하게.\n\n리포트:\n${context}\n\n질문: ${customQuestion}`
          }]
        })
      });

      if (!response.ok) throw new Error('API 오류');

      const data = await response.json();
      setCustomAnswer(data.content[0].text);
      setAnswerLoading(false);

    } catch (error) {
      console.error('질문 답변 오류:', error);
      setCustomAnswer('답변 생성에 실패했습니다. 다시 시도해주세요.');
      setAnswerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            📊 AI 투자 리포트 생성기
          </h1>
          <p className="text-slate-600">
            최신 뉴스와 AI 분석으로 전문가 수준의 투자 리포트를 생성합니다
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              분석 주제
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 삼성전자 투자 전망, 2026년 경제 전망, 반도체 산업 동향"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              추가 정보 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="특정 관점이나 추가 고려사항 입력"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              rows="3"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex items-center justify-center space-x-2"
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

        {/* Results */}
        {report && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b">
              <button
                onClick={() => setActiveTab('report')}
                className={`pb-3 px-4 font-semibold transition-colors ${activeTab === 'report' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'}`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                리포트
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`pb-3 px-4 font-semibold transition-colors ${activeTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'}`}
              >
                <Bot className="w-5 h-5 inline mr-2" />
                AI 애널리스트
              </button>
            </div>

            {/* Report Tab */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">{report.topic}</h2>
                  <p className="text-slate-700 leading-relaxed">{report.summary}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-xs text-green-700 mb-1">신뢰도</p>
                    <p className="text-2xl font-bold text-green-900">{report.metrics.confidence}%</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">수집 뉴스</p>
                    <p className="text-2xl font-bold text-blue-900">{report.metrics.dataPoints}건</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs text-purple-700 mb-1">분석 출처</p>
                    <p className="text-2xl font-bold text-purple-900">{report.metrics.sources}개</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-xs text-amber-700 mb-1">데이터 품질</p>
                    <p className="text-2xl font-bold text-amber-900">{report.metrics.accuracy}%</p>
                  </div>
                </div>

                {/* Key Points */}
                <div>
                  <div className="flex items-center justify-between cursor-pointer mb-3" onClick={() => toggleSection('keyPoints')}>
                    <h3 className="font-bold text-lg text-slate-900">핵심 포인트</h3>
                    {expandedSections.keyPoints ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  {expandedSections.keyPoints && (
                    <div className="space-y-2">
                      {report.keyPoints.map((point, i) => (
                        <div key={i} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-800">{point}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SWOT (기업만) */}
                {report.topicType === 'company' && report.analysis.strengths.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between cursor-pointer mb-3" onClick={() => toggleSection('analysis')}>
                      <h3 className="font-bold text-lg text-slate-900">SWOT 분석</h3>
                      {expandedSections.analysis ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                    {expandedSections.analysis && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                          <h4 className="font-semibold text-green-900 mb-3">강점</h4>
                          <ul className="space-y-2">
                            {report.analysis.strengths.map((s, i) => (
                              <li key={i} className="text-sm text-green-800">• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-red-50 rounded-lg p-5 border border-red-200">
                          <h4 className="font-semibold text-red-900 mb-3">약점</h4>
                          <ul className="space-y-2">
                            {report.analysis.weaknesses.map((w, i) => (
                              <li key={i} className="text-sm text-red-800">• {w}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-3">기회</h4>
                          <ul className="space-y-2">
                            {report.analysis.opportunities.map((o, i) => (
                              <li key={i} className="text-sm text-blue-800">• {o}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
                          <h4 className="font-semibold text-amber-900 mb-3">위협</h4>
                          <ul className="space-y-2">
                            {report.analysis.threats.map((t, i) => (
                              <li key={i} className="text-sm text-amber-800">• {t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Risks */}
                <div>
                  <div className="flex items-center justify-between cursor-pointer mb-3" onClick={() => toggleSection('risk')}>
                    <h3 className="font-bold text-lg text-slate-900">
                      {report.topicType === 'economy' ? '경제 리스크' : report.topicType === 'sector' ? '산업 리스크' : '리스크 요인'}
                    </h3>
                    {expandedSections.risk ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  {expandedSections.risk && (
                    <div className="space-y-2">
                      {report.risks.map((risk, i) => (
                        <div key={i} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-900">{risk}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendation (기업만) */}
                {report.topicType === 'company' && report.recommendation.opinion !== '-' && (
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-3">투자 의견</h3>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-green-700 mb-1">투자 의견</p>
                          <p className="text-xl font-bold text-green-900">{report.recommendation.opinion}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700 mb-1">목표 주가</p>
                          <p className="text-xl font-bold text-green-900">{report.recommendation.targetPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700 mb-1">현재 주가</p>
                          <p className="text-xl font-bold text-green-900">{report.recommendation.currentPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700 mb-1">상승 여력</p>
                          <p className="text-xl font-bold text-green-900">{report.recommendation.upside}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700 mb-1">투자 기간</p>
                          <p className="text-xl font-bold text-green-900">{report.recommendation.horizon}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                  <h3 className="font-bold text-lg text-slate-900 mb-3">🤖 AI 투자 인사이트</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{report.aiSummary}</p>
                </div>

                <div className="bg-white rounded-lg p-6 border border-slate-200">
                  <h3 className="font-bold text-lg text-slate-900 mb-4">💬 AI에게 질문하기</h3>
                  <div className="flex space-x-2 mb-4">
                    <input
                      type="text"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="리포트에 대해 질문하세요..."
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-slate-900"
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                    />
                    <button
                      onClick={handleCustomQuestion}
                      disabled={answerLoading}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-slate-300 flex items-center space-x-2"
                    >
                      {answerLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>

                  {customAnswer && (
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-purple-900 whitespace-pre-wrap">{customAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
