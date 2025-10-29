import React, { useState } from 'react';
import { Search, FileText, Download, Volume2, TrendingUp, BarChart3, Target, AlertTriangle, Copy, Loader, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const InvestmentIntelligencePlatform = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('report');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [expandedNews, setExpandedNews] = useState(false);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      file: file
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const generateReport = async () => {
    if (!searchQuery.trim()) {
      setError('분석 주제를 입력해주세요');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedReport(null);
    
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery,
          uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size })),
          additionalInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      setGeneratedReport({
        content: data.report,
        rating: data.rating,
        newsCount: data.newsCount,
        sentiment: data.sentiment,
        newsList: data.newsList || [],
        generatedAt: new Date().toLocaleString('ko-KR')
      });

    } catch (error) {
      console.error('오류:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = (format) => {
    if (!generatedReport) return;

    const filename = `투자리포트_${searchQuery.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.${format}`;
    const blob = new Blob([generatedReport.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const speakReport = () => {
    if (!generatedReport) return;
    
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      let cleanText = generatedReport.content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/`/g, '')
        .replace(/---+/g, '')
        .replace(/^\s*[-*+]\s/gm, '')
        .replace(/^\s*\d+\.\s/gm, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('음성 읽기 기능을 지원하지 않는 브라우저입니다.');
    }
  };

  const copyToClipboard = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport.content);
    alert('리포트가 클립보드에 복사되었습니다');
  };

  const getRatingColor = (rating) => {
    if (rating === 'BUY') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (rating === 'SELL') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment === '긍정적') return 'text-emerald-600';
    if (sentiment === '부정적') return 'text-red-600';
    return 'text-slate-600';
  };

  // 차트 데이터 (예시)
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Investment Intelligence</h1>
              <p className="text-sm text-slate-500">AI 기반 투자 분석 시스템</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Input Section */}
        {!generatedReport && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">투자 분석 리포트 생성</h2>

              {/* Usage Guide */}
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">💡 AI 분석:</span> 네이버 뉴스 데이터 수집 → Claude AI 분석 → 투자 리포트 자동 생성
                </p>
              </div>

              {/* Search Query */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  분석 주제
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="예: 삼성전자 투자 전망, 2차전지 섹터 분석, 미국 금리 인하 영향"
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && generateReport()}
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  증권사 리포트 업로드 (선택)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <FileText className="w-10 h-10 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">
                      파일을 선택하거나 드래그하세요
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, DOC, DOCX, TXT 지원
                    </p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{file.name}</p>
                            <p className="text-xs text-slate-500">{file.size}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  추가 정보 (선택)
                </label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="특정 분석 관점이나 추가 고려사항을 입력하세요"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  rows="3"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">오류 발생</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>분석 진행 중...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5" />
                    <span>리포트 생성</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Report Section */}
        {generatedReport && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">{searchQuery}</h2>
                  <p className="text-sm text-slate-500">생성 시각: {generatedReport.generatedAt}</p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedReport(null);
                    setSearchQuery('');
                    setUploadedFiles([]);
                    setAdditionalInfo('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  새 분석
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 mb-2">투자 의견</div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-bold border ${getRatingColor(generatedReport.rating)}`}>
                    {generatedReport.rating}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 mb-2">분석 데이터</div>
                  <div className="text-2xl font-bold text-slate-900">{generatedReport.newsCount}<span className="text-base font-normal text-slate-500 ml-1">건</span></div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 mb-2">시장 감성</div>
                  <div className={`text-base font-bold ${getSentimentColor(generatedReport.sentiment)}`}>
                    {generatedReport.sentiment}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => downloadReport('txt')}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>다운로드</span>
                </button>

                <button
                  onClick={speakReport}
                  className={`flex-1 px-4 py-3 ${isSpeaking ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? '멈추기' : '음성 듣기'}</span>
                </button>

                <button
                  onClick={copyToClipboard}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>복사</span>
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-slate-200 px-6 pt-4">
                <div className="flex space-x-6">
                  <button
                    onClick={() => setActiveTab('report')}
                    className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                      activeTab === 'report'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    전체 리포트
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                      activeTab === 'summary'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    요약
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {activeTab === 'report' && (
                  <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-[15px]">
                      {generatedReport.content}
                    </div>
                  </div>
                )}

                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    <div className="p-5 bg-blue-50 border-l-4 border-blue-600 rounded">
                      <h3 className="font-bold text-base text-slate-900 mb-2">핵심 요약</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {generatedReport.content.split('\n')[0].substring(0, 300)}...
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <h4 className="font-semibold text-sm text-slate-900 mb-3">주요 지표</h4>
                        <div className="space-y-2 text-sm text-slate-700">
                          <div className="flex justify-between">
                            <span className="text-slate-600">시장 감성</span>
                            <span className="font-medium">{generatedReport.sentiment}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">투자 의견</span>
                            <span className="font-medium">{generatedReport.rating}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">분석 데이터</span>
                            <span className="font-medium">{generatedReport.newsCount}건</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-semibold text-sm text-slate-900 mb-3">투자 유의사항</h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          본 리포트는 투자 참고 자료이며, 실제 투자 결정 시 리스크 요인을 반드시 검토하시기 바랍니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* News Sources */}
            {generatedReport.newsCount > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>뉴스 출처 ({generatedReport.newsCount}건)</span>
                  </h3>
                  {generatedReport.newsList && generatedReport.newsList.length > 0 && (
                    <button
                      onClick={() => setExpandedNews(!expandedNews)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <span>{expandedNews ? '접기' : '펼치기'}</span>
                      {expandedNews ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                
                {generatedReport.newsList && generatedReport.newsList.length > 0 && expandedNews && (
                  <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                    {generatedReport.newsList.map((news, index) => (
                      <a
                        key={index}
                        href={news.link}
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
                )}
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  네이버 뉴스 API를 통해 수집된 데이터를 Claude AI가 분석하여 작성되었습니다. 
                  본 리포트는 투자 결정의 참고 자료로만 활용하시기 바랍니다.
                </p>
              </div>
            )}
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
