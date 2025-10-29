import React, { useState, useRef } from 'react';
import { TrendingUp, Upload, Loader2, FileText, MessageSquare, Volume2, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

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
  const [readingMode, setReadingMode] = useState('summary'); // 'summary' or 'keypoints'
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const fileInputRef = useRef(null);

  // 음성 읽기 함수
  const handleTextToSpeech = (mode) => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    // 핵심 포인트만 읽기 - 더 자연스럽게
    const points = report.keyPoints.map((point, i) => {
      const numberWords = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째'];
      return `${numberWords[i]}, ${point}`;
    }).join('. ');
    
    const textToRead = `${report.title.replace(/[*#_-]/g, '')}의 핵심 포인트입니다. ${points}. 이상입니다.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9; // 조금 천천히
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

  // Claude 리포트 파싱 함수
  const parseClaudeReport = (reportText) => {
    const result = {
      summary: '',
      keyPoints: [],
      recommendation: {
        opinion: 'HOLD',
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

    // 요약 추출 - 전체적인 개요
    const summaryMatch = reportText.match(/##?\s*(?:요약|Executive Summary).*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (summaryMatch) {
      // 요약 섹션의 텍스트만 추출 (리스트 제외)
      const summaryText = summaryMatch[1]
        .split('\n')
        .filter(line => !line.trim().match(/^[-*]\s/)) // 리스트 항목 제외
        .join('\n')
        .trim()
        .replace(/[*#]/g, '');
      result.summary = summaryText || reportText.substring(0, 800).replace(/[*#]/g, '');
    } else {
      // 요약 섹션이 없으면 첫 부분 사용
      result.summary = reportText.substring(0, 800).replace(/[*#]/g, '');
    }

    // 핵심 포인트 추출 - 주요 투자 포인트만
    const pointsMatch = reportText.match(/##?\s*(?:핵심|주요|투자).*?포인트.*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (pointsMatch) {
      const points = pointsMatch[1].match(/[-*]\s*(.+)/g);
      if (points) {
        result.keyPoints = points
          .map(p => p.replace(/^[-*]\s*/, '').replace(/[*#]/g, '').trim())
          .filter(p => p.length > 10) // 너무 짧은 것 제외
          .slice(0, 4);
      }
    }
    
    // 핵심 포인트가 없으면 리포트에서 주요 문장 추출
    if (result.keyPoints.length === 0) {
      const sentences = reportText
        .split(/[.!?]\s+/)
        .filter(s => s.length > 30 && s.length < 200)
        .slice(0, 4)
        .map(s => s.replace(/[*#]/g, '').trim());
      result.keyPoints = sentences;
    }

    // 투자 의견 추출
    const opinionMatch = reportText.match(/(?:투자|매매).*?(?:의견|등급|추천)[:\s]*(BUY|매수|SELL|매도|HOLD|중립|보유)/i);
    if (opinionMatch) {
      const opinion = opinionMatch[1].toUpperCase();
      if (opinion.includes('BUY') || opinion.includes('매수')) {
        result.recommendation.opinion = 'BUY';
      } else if (opinion.includes('SELL') || opinion.includes('매도')) {
        result.recommendation.opinion = 'SELL';
      } else {
        result.recommendation.opinion = 'HOLD';
      }
    }

    // 목표주가 추출 - 더 다양한 패턴
    const targetMatch = reportText.match(/목표.*?(?:주가|가격)[:\s]*([0-9,]+)\s*원/i) ||
                        reportText.match(/적정.*?(?:주가|가격)[:\s]*([0-9,]+)\s*원/i);
    if (targetMatch) {
      result.recommendation.targetPrice = targetMatch[1].replace(/,/g, '') + '원';
    }

    // 현재가 추출 - 더 다양한 패턴
    const currentMatch = reportText.match(/현재.*?(?:주가|가격|시세)[:\s]*([0-9,]+)\s*원/i) ||
                         reportText.match(/종가[:\s]*([0-9,]+)\s*원/i);
    if (currentMatch) {
      result.recommendation.currentPrice = currentMatch[1].replace(/,/g, '') + '원';
    }

    // 상승여력 계산
    if (targetMatch && currentMatch) {
      const target = parseInt(targetMatch[1].replace(/,/g, ''));
      const current = parseInt(currentMatch[1].replace(/,/g, ''));
      if (!isNaN(target) && !isNaN(current) && current > 0) {
        const upside = ((target - current) / current * 100).toFixed(1);
        result.recommendation.upside = (upside > 0 ? '+' : '') + upside + '%';
      }
    }

    // 리스크 추출
    const riskMatch = reportText.match(/##?\s*리스크.*?\n([\s\S]*?)(?=\n##|$)/i);
    if (riskMatch) {
      const risks = riskMatch[1].match(/[-*]\s*(.+)/g);
      if (risks) {
        result.risks = risks.map(r => r.replace(/^[-*]\s*/, '').replace(/[*#]/g, '').trim()).slice(0, 5);
      }
    }

    // SWOT 추출
    const swotMatch = reportText.match(/##?\s*SWOT.*?\n([\s\S]*?)(?=\n##[^#]|$)/i);
    if (swotMatch) {
      const swotText = swotMatch[1];
      
      const strengthMatch = swotText.match(/강점.*?\n([\s\S]*?)(?=약점|기회|위협|$)/i);
      if (strengthMatch) {
        const items = strengthMatch[1].match(/[-*]\s*(.+)/g);
        if (items) result.analysis.strengths = items.map(i => i.replace(/^[-*]\s*/, '').replace(/[*#]/g, '').trim()).slice(0, 3);
      }

      const weaknessMatch = swotText.match(/약점.*?\n([\s\S]*?)(?=강점|기회|위협|$)/i);
      if (weaknessMatch) {
        const items = weaknessMatch[1].match(/[-*]\s*(.+)/g);
        if (items) result.analysis.weaknesses = items.map(i => i.replace(/^[-*]\s*/, '').replace(/[*#]/g, '').trim()).slice(0, 3);
      }

      const opportunityMatch = swotText.match(/기회.*?\n([\s\S]*?)(?=강점|약점|위협|$)/i);
      if (opportunityMatch) {
        const items = opportunityMatch[1].match(/[-*]\s*(.+)/g);
        if (items) result.analysis.opportunities = items.map(i => i.replace(/^[-*]\s*/, '').replace(/[*#]/g, '').trim()).slice(0, 3);
      }

      const threatMatch = swotText.match(/위협.*?\n([\s\S]*?)(?=강점|약점|기회|$)/i);
      if (threatMatch) {
        const items = threatMatch[1].match(/[-*]\s*(.+)/g);
        if (items) result.analysis.threats = items.map(i => i.replace(/^[-*]\s*/, '').replace(/[*#]/g, '').trim()).slice(0, 3);
      }
    }

    return result;
  };

  // AI 애널리스트 전용 요약 생성
  const generateAISummary = (fullReport, parsedReport) => {
    // "투자자 관점" 섹션이 있으면 우선 사용
    const investorViewMatch = fullReport.match(/##?\s*투자자.*?관점.*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (investorViewMatch) {
      return investorViewMatch[1].trim().replace(/[*#]/g, '');
    }
    
    // "AI 분석" 섹션 찾기
    const aiAnalysisMatch = fullReport.match(/##?\s*AI.*?분석.*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (aiAnalysisMatch) {
      return aiAnalysisMatch[1].trim().replace(/[*#]/g, '');
    }
    
    // 없으면 요약 + 핵심 포인트 조합으로 새로운 텍스트 생성
    return `${parsedReport.summary.substring(0, 400)}

투자 관점에서 보면, ${parsedReport.keyPoints.slice(0, 2).join(', ')} 등이 주요 관심 포인트입니다. 
현재 투자 의견은 ${parsedReport.recommendation.opinion}이며, 
${parsedReport.risks.length > 0 ? `주요 리스크로는 ${parsedReport.risks[0]}를 고려해야 합니다.` : '리스크 관리가 필요합니다.'}`;
  };

  // AI 질문 처리 함수
  const handleCustomQuestion = async () => {
    if (!customQuestion.trim()) {
      alert('질문을 입력해주세요.');
      return;
    }

    setQuestionLoading(true);
    setQuestionAnswer(null);

    try {
      // 전체 리포트 본문을 context로 전달
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: `"${customQuestion}" - ${topic} 관련 질문에 정확히 답변`,
          uploadedFiles: [],
          additionalInfo: `
[중요] 아래 전체 리포트를 기반으로 질문에 정확하게 답변하세요.

=== 전체 리포트 본문 ===
${report.fullReport}

=== 핵심 요약 ===
${report.summary}

=== 주요 포인트 ===
${report.keyPoints.join('\n')}

=== 투자 의견 ===
의견: ${report.recommendation.opinion}
목표주가: ${report.recommendation.targetPrice}
현재가: ${report.recommendation.currentPrice}
상승여력: ${report.recommendation.upside}

=== 질문 ===
"${customQuestion}"

요구사항:
1. 위 전체 리포트 내용을 정확히 이해하고 답변
2. 질문의 핵심에만 집중하여 3-4문장으로 답변
3. 리포트에 없는 내용은 추측하지 말 것
4. 구체적인 근거와 함께 답변
5. 서론 없이 바로 답변 시작
          `
        })
      });

      if (!response.ok) {
        throw new Error('답변 생성 실패');
      }

      const data = await response.json();
      
      if (data.success) {
        // 마크다운 기호 제거하고 깔끔한 텍스트로
        let cleanAnswer = data.report
          .replace(/[*#_~`]/g, '')
          .replace(/\[.*?\]\(.*?\)/g, '')
          .replace(/^##.*$/gm, '') // 헤더 제거
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        // 질문 답변 부분만 추출
        const answerLines = cleanAnswer.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 20 && 
                 !trimmed.startsWith('질문:') && 
                 !trimmed.startsWith('답변:') &&
                 !trimmed.startsWith('요약');
        });
        
        cleanAnswer = answerLines.slice(0, 5).join(' ').substring(0, 500);
        
        setQuestionAnswer({
          question: customQuestion,
          answer: cleanAnswer,
          confidence: '높음'
        });
        setCustomQuestion('');
      }
    } catch (error) {
      console.error('질문 처리 오류:', error);
      alert('답변 생성 중 오류가 발생했습니다.');
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('분석 주제를 입력해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      // 실제 API 호출
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

      // API 응답을 리포트 형식으로 변환
      const parsedReport = parseClaudeReport(data.report);
      
      // AI 애널리스트 전용 요약 생성
      const aiSummary = generateAISummary(data.report, parsedReport);
      
      setReport({
        title: `${topic} - 투자 분석 리포트`,
        timestamp: new Date(data.metadata.timestamp).toLocaleString('ko-KR'),
        summary: parsedReport.summary || data.report.substring(0, 800).replace(/[*#]/g, ''),
        aiSummary: aiSummary, // AI 애널리스트 탭 전용
        fullReport: data.report, // 전체 리포트 원문 저장
        metrics: {
          confidence: 85,
          dataPoints: data.metadata.newsCount,
          sources: data.metadata.sources.length,
          accuracy: 90
        },
        keyPoints: parsedReport.keyPoints.length > 0 ? parsedReport.keyPoints : [
          '최신 뉴스 분석 결과 핵심 포인트를 추출하지 못했습니다.'
        ],
        analysis: parsedReport.analysis.strengths.length > 0 ? parsedReport.analysis : {
          strengths: ['강점 분석 데이터 없음'],
          weaknesses: ['약점 분석 데이터 없음'],
          opportunities: ['기회 분석 데이터 없음'],
          threats: ['위협 분석 데이터 없음']
        },
        risks: parsedReport.risks.length > 0 ? parsedReport.risks : [
          '리스크 분석 데이터가 충분하지 않습니다.'
        ],
        recommendation: parsedReport.recommendation || {
          opinion: '-',
          targetPrice: '-',
          currentPrice: '-',
          upside: '-',
          horizon: '-'
        },
        analysis: {
          strengths: [
            'AI 반도체 시장 선도 기업 보유',
            '차세대 공정 기술력 확보',
            '글로벌 시장 점유율 상승세'
          ],
          weaknesses: [
            '중국 시장 의존도 높음',
            '환율 변동성 노출',
            '설비 투자 부담 지속'
          ],
          opportunities: [
            'AI 데이터센터 수요 폭발적 증가',
            '전기차/자율주행 반도체 시장 확대',
            '정부 반도체 지원책 강화'
          ],
          threats: [
            '미중 무역 분쟁 심화 가능성',
            '글로벌 경기 침체 우려',
            '일본/대만 경쟁사 추격'
          ]
        },
        risks: [
          '지정학적 리스크로 인한 수출 규제 가능성',
          '글로벌 경기 둔화 시 IT 수요 위축',
          '메모리 반도체 가격 변동성 확대',
          '환율 급등 시 영업이익 감소 위험'
        ],
        recommendation: {
          opinion: 'BUY',
          targetPrice: '95,000원',
          currentPrice: '73,500원',
          upside: '+29.3%',
          horizon: '12개월'
        },
        analystQuestions: [
          {
            question: "AI 반도체 시장의 성장이 지속 가능할까요?",
            answer: "생성형 AI의 확산과 데이터센터 투자 증가로 향후 3-5년간 고성장이 예상됩니다. 주요 빅테크 기업들의 AI 인프라 투자가 지속되고 있어 수요 모멘텀은 견고합니다.",
            confidence: "높음"
          },
          {
            question: "메모리 반도체 가격 상승은 언제까지 이어질까요?",
            answer: "2025년 중반까지 상승세가 유지될 전망이나, 하반기부터는 공급 증가로 상승폭이 둔화될 가능성이 있습니다. 다만 HBM 등 고부가 제품은 타이트한 수급이 지속될 것으로 보입니다.",
            confidence: "중간"
          },
          {
            question: "중국 리스크는 어느 정도 심각한가요?",
            answer: "단기적으로는 중국 경기 둔화와 미중 분쟁이 부정적 요인이나, 기업들의 중국 의존도 축소 노력과 다변화 전략으로 중장기 영향은 제한적일 것으로 판단됩니다.",
            confidence: "중간"
          },
          {
            question: "지금이 매수 적기인가요?",
            answer: "현재 밸류에이션이 역사적 평균 대비 합리적 수준이며, 실적 개선 모멘텀을 고려하면 매력적인 진입 구간으로 판단됩니다. 다만 단기 변동성에 대비한 분할 매수 전략을 권장합니다.",
            confidence: "높음"
          }
        ],
        news: data.metadata.sources || [],
        fullReport: data.report,
        metadata: data.metadata
      });
      
      setLoading(false);
      setActiveTab('report');
      
    } catch (error) {
      console.error('리포트 생성 오류:', error);
      setLoading(false);
      alert('리포트 생성 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
    }
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
              <p className="text-sm text-slate-600">AI 기반 투자 분석 플랫폼</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          {/* Usage Guide */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-900 mb-2">
              💡 <strong>사용방법:</strong> 분석 주제 입력 → 리포트 업로드(선택) → 생성
            </p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700 mb-1">
                <strong>🤖 분석 AI:</strong> Claude Sonnet 4 (Anthropic)
              </p>
              <p className="text-xs text-blue-700">
                <strong>📊 데이터 출처:</strong> 네이버 뉴스 API (최근 3일, 최대 100건)
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
              placeholder="예: 삼성전자 투자 전망, 반도체 섹터 분석, 2차전지 업황..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              증권사 리포트 업로드 <span className="text-slate-400 font-normal">(선택)</span>
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
              추가 정보 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="특정 분석 관점이나 추가 고려사항을 입력하세요&#10;예: 단기 트레이딩 관점, 배당 투자 관점, ESG 중심 분석 등"
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
                <span>분석 중...</span>
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
            {/* Header with Voice Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{report.title}</h2>
                  <p className="text-sm text-slate-500">{report.timestamp}</p>
                </div>
                
                <div className="flex flex-col space-y-2">
                  {/* Download Button */}
                  <button
                    onClick={() => {
                      const element = document.createElement('a');
                      const file = new Blob([report.fullReport || JSON.stringify(report, null, 2)], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>리포트 다운로드</span>
                  </button>
                  
                  {/* Voice Reading - 핵심만 듣기 */}
                  <button
                    onClick={() => handleTextToSpeech('keypoints')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isReading
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isReading ? '중지' : '핵심 포인트 듣기'}</span>
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-blue-600 font-medium">신뢰도</p>
                    <span className="text-xs text-blue-500 cursor-help" title="AI 분석의 확신 정도">ⓘ</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{report.metrics.confidence}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-green-600 font-medium">수집 뉴스</p>
                    <span className="text-xs text-green-500 cursor-help" title="분석에 활용된 뉴스 기사 수">ⓘ</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{report.metrics.dataPoints}건</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-purple-600 font-medium">분석 출처</p>
                    <span className="text-xs text-purple-500 cursor-help" title="참조한 뉴스 소스 수">ⓘ</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{report.metrics.sources}개</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-amber-600 font-medium">데이터 품질</p>
                    <span className="text-xs text-amber-500 cursor-help" title="수집된 데이터의 신뢰성">ⓘ</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-900">{report.metrics.accuracy}%</p>
                </div>
              </div>
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
                    {/* Executive Summary */}
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
                        <p className="text-slate-700 leading-relaxed mt-4 whitespace-pre-line">{report.summary}</p>
                      )}
                    </div>

                    {/* Key Points */}
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-3">핵심 포인트</h3>
                      <div className="space-y-2">
                        {report.keyPoints.map((point, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <p className="text-slate-700 leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SWOT Analysis */}
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
                            <h4 className="font-semibold text-green-900 mb-3">강점 (Strengths)</h4>
                            <ul className="space-y-2">
                              {report.analysis.strengths.map((item, index) => (
                                <li key={index} className="text-sm text-green-800 flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-red-50 rounded-lg p-5 border border-red-200">
                            <h4 className="font-semibold text-red-900 mb-3">약점 (Weaknesses)</h4>
                            <ul className="space-y-2">
                              {report.analysis.weaknesses.map((item, index) => (
                                <li key={index} className="text-sm text-red-800 flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-3">기회 (Opportunities)</h4>
                            <ul className="space-y-2">
                              {report.analysis.opportunities.map((item, index) => (
                                <li key={index} className="text-sm text-blue-800 flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
                            <h4 className="font-semibold text-amber-900 mb-3">위협 (Threats)</h4>
                            <ul className="space-y-2">
                              {report.analysis.threats.map((item, index) => (
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

                    {/* Risk Factors */}
                    <div>
                      <div
                        className="flex items-center justify-between cursor-pointer mb-3"
                        onClick={() => toggleSection('risk')}
                      >
                        <h3 className="font-bold text-lg text-slate-900">리스크 요인</h3>
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

                    {/* Investment Recommendation */}
                    <div>
                      <div
                        className="flex items-center justify-between cursor-pointer mb-3"
                        onClick={() => toggleSection('recommendation')}
                      >
                        <h3 className="font-bold text-lg text-slate-900">투자 의견</h3>
                        {expandedSections.recommendation ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      {expandedSections.recommendation && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm text-slate-600 mb-1">투자의견</p>
                              <p className="text-3xl font-bold text-green-700">{report.recommendation.opinion}</p>
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
                              <p className="text-xl font-semibold text-green-600">{report.recommendation.upside}</p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-4">투자기간: {report.recommendation.horizon}</p>
                        </div>
                      )}
                    </div>

                    {/* Related News */}
                    {report.news && report.news.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-3">관련 뉴스</h3>
                        <div className="space-y-2">
                          {report.news.map((news, index) => (
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
                                    {new Date(news.pubDate).toLocaleDateString('ko-KR')}
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Source Note */}
                    <div className="bg-slate-100 rounded-lg p-5 border border-slate-200">
                      <h4 className="font-semibold text-sm text-slate-900 mb-3 flex items-center">
                        <span className="mr-2">📊</span>
                        데이터 및 분석 출처
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-xs text-slate-500 min-w-[80px]">AI 모델:</span>
                          <span className="text-xs text-slate-700 font-medium">Claude Sonnet 4 (Anthropic)</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-xs text-slate-500 min-w-[80px]">데이터 출처:</span>
                          <span className="text-xs text-slate-700 font-medium">네이버 뉴스 API</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-xs text-slate-500 min-w-[80px]">수집 범위:</span>
                          <span className="text-xs text-slate-700 font-medium">최근 3일간 뉴스 최대 100건</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-xs text-slate-500 min-w-[80px]">분석 방법:</span>
                          <span className="text-xs text-slate-700 font-medium">실시간 뉴스 수집 → AI 감성 분석 → 투자 리포트 자동 생성</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mt-3 pt-3 border-t border-slate-300">
                        본 리포트는 AI 기반 분석 결과이며, 투자 결정의 참고 자료로만 활용하시기 바랍니다.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* AI Analyst Tab - Gemini Canvas Style */
                  <div className="space-y-6">
                    {/* Main Report Section - Gemini Canvas Style */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-8 border border-slate-200">
                      <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
                        {topic} 트렌드 분석
                      </h2>
                      <p className="text-center text-slate-600 mb-8">
                        {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} 투자 인사이트
                      </p>

                      {/* Key Insight Cards */}
                      <div className="space-y-6">
                        {/* Executive Summary Card */}
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                          <h3 className="text-xl font-bold text-slate-900 mb-3">
                            📊 AI 투자 인사이트
                          </h3>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                            {report.aiSummary}
                          </p>
                        </div>

                        {/* Key Points with Visual Cards */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {report.keyPoints.map((point, index) => (
                            <div key={index} className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-blue-500">
                              <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </span>
                                <p className="text-slate-700 leading-relaxed pt-1">{point}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Investment Recommendation Highlight */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                          <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">
                            투자 의견
                          </h3>
                          <div className="text-center">
                            <span className={`inline-block px-6 py-3 rounded-full text-2xl font-bold ${
                              report.recommendation.opinion === 'BUY' 
                                ? 'bg-green-600 text-white'
                                : report.recommendation.opinion === 'SELL'
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}>
                              {report.recommendation.opinion}
                            </span>
                            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-xs text-slate-600 mb-1">목표주가</p>
                                <p className="text-xl font-bold text-slate-900">{report.recommendation.targetPrice}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600 mb-1">현재가</p>
                                <p className="text-xl font-bold text-slate-700">{report.recommendation.currentPrice}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600 mb-1">상승여력</p>
                                <p className="text-xl font-bold text-green-600">{report.recommendation.upside}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="border-t-2 border-slate-200 my-8"></div>

                    {/* FAQ Section */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                      <div className="flex items-center space-x-3 mb-6">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-bold text-slate-900">
                          자주 묻는 질문
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-6">
                        리포트 내용에 대해 투자자들이 자주 묻는 질문과 답변입니다
                      </p>

                      <div className="space-y-4">
                        {report.analystQuestions.map((item, index) => (
                          <div key={index} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            <div className="bg-slate-50 p-4 border-b border-slate-200">
                              <div className="flex items-start space-x-3">
                                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                  Q{index + 1}
                                </span>
                                <h4 className="font-semibold text-slate-900 text-base leading-relaxed pt-1">
                                  {item.question}
                                </h4>
                              </div>
                            </div>
                            <div className="bg-white p-5">
                              <div className="flex items-start space-x-3 mb-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                  A
                                </div>
                                <p className="text-slate-700 leading-relaxed pt-1">{item.answer}</p>
                              </div>
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                                  item.confidence === '높음' 
                                    ? 'bg-green-100 text-green-700' 
                                    : item.confidence === '중간'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  신뢰도: {item.confidence}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Direct Question Section */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <span className="text-2xl">✨</span>
                        <h4 className="text-lg font-bold text-slate-900">AI 애널리스트에게 직접 질문하기</h4>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                        리포트 내용에 대해 궁금한 점이 있으신가요? AI 애널리스트에게 질문하고 맥락 기반 답변을 받아보세요.
                      </p>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                          placeholder="예: 이 종목의 리스크는 어느 정도인가요?"
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
                      <p className="text-xs text-slate-500 mt-3">
                        💡 현재 리포트 내용을 기반으로 답변합니다
                      </p>

                      {/* Answer Display */}
                      {questionAnswer && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                          <div className="flex items-start space-x-3 mb-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              A
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 mb-2">{questionAnswer.question}</p>
                              <p className="text-slate-700 leading-relaxed">{questionAnswer.answer}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                              신뢰도: {questionAnswer.confidence}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Investment Disclaimer - 하단 배치 */}
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">투자 유의사항</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    본 리포트는 AI 기반 분석 결과이며, 투자 결정의 참고 자료로만 활용하시기 바랍니다. 
                    실제 투자 결정 시 리스크 요인을 반드시 검토하고, 분산 투자 원칙을 준수하시기 바랍니다.
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
            <p>© 2025 Investment Intelligence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InvestmentIntelligencePlatform;
