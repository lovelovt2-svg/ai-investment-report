import React, { useState } from 'react';
import { Search, Upload, Download, FileText, Sparkles, Brain, CheckCircle, RefreshCw, X, TrendingUp, AlertCircle, Copy } from 'lucide-react';

const FullAutoReportGenerator = () => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);

  const exampleQueries = [
    "오늘 금통위 결과에 대한 앞으로의 투자예측",
    "삼성전자 투자 전략 분석",
    "반도체 업황 사이클과 투자 기회",
    "미국 FOMC 결과가 한국 증시에 미치는 영향"
  ];

  const addProgress = (message, type = 'info') => {
    setProgress(prev => [...prev, { 
      message, 
      type,
      time: new Date().toLocaleTimeString('ko-KR') 
    }]);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
    addProgress(`📄 파일 업로드: ${files.length}개`, 'success');
  };

  const removeFile = (index) => {
    const removed = uploadedFiles[index];
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    addProgress(`🗑️ 파일 제거: ${removed.name}`, 'info');
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setProgress([]);
    setError(null);
    
    try {
      addProgress('🚀 AI 리포트 생성 시작!', 'info');
      addProgress(`🔎 분석 주제: "${searchQuery}"`, 'info');
      addProgress('📰 실시간 뉴스 수집 중...', 'info');
      
      // API 호출
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery,
          uploadedFiles,
          additionalInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      addProgress('🤖 Claude AI가 리포트 작성 중...', 'info');
      
      const data = await response.json();
      
      addProgress(`✅ 뉴스 ${data.newsCount}건 수집 완료!`, 'success');
      addProgress(`📊 시장 감성: ${data.sentiment}`, 'success');
      addProgress('✅ 리포트 생성 완료!', 'success');
      
      setGeneratedReport({
        content: data.report,
        rating: data.rating,
        newsCount: data.newsCount,
        sentiment: data.sentiment,
        generatedAt: new Date().toLocaleString('ko-KR')
      });

      setStep(2);

    } catch (error) {
      console.error('오류:', error);
      setError(error.message);
      addProgress(`❌ 오류 발생: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    const text = generatedReport.content;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `투자리포트_${searchQuery.slice(0, 20)}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setStep(1);
    setSearchQuery('');
    setUploadedFiles([]);
    setAdditionalInfo('');
    setGeneratedReport(null);
    setProgress([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-blue-500/30">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI 투자 리포트 생성기</h1>
                <p className="text-blue-300 mt-1">⚡ 완전 자동화 - 버튼 한 번에 완성!</p>
              </div>
            </div>
            {step === 2 && (
              <button onClick={resetForm} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
                새 리포트 작성
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Step 1: Input */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Search className="w-7 h-7 text-blue-400" />
                분석 주제 입력
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    검색어 / 분석 주제 *
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="예: 오늘 금통위 결과에 대한 투자예측"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-2">💡 예시 검색어:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {exampleQueries.map((query, i) => (
                      <button
                        key={i}
                        onClick={() => setSearchQuery(query)}
                        className="text-left text-sm text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 px-3 py-2 rounded-lg transition"
                      >
                        • {query}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    📄 증권사 리포트 업로드 (선택)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.docx,.txt"
                    onChange={handleFileUpload}
                    className="w-full bg-slate-900/50 border-2 border-dashed border-slate-600 rounded-xl px-4 py-6 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer hover:border-blue-500 transition"
                  />
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-white font-medium">{file.name}</p>
                              <p className="text-xs text-slate-400">{file.size}</p>
                            </div>
                          </div>
                          <button onClick={() => removeFile(index)} className="text-red-400 hover:text-red-300">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    💭 추가 정보 (선택)
                  </label>
                  <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="개인 분석이나 참고할 정보를 입력하세요..."
                    rows={4}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                  <div className="flex gap-3">
                    <Sparkles className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white mb-2">🤖 AI가 자동으로:</p>
                      <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                        <li>Google News 실시간 검색</li>
                        <li>시장 감성 분석</li>
                        <li>Claude AI로 리포트 생성</li>
                        <li>완전히 새로운 투자 전략 제시</li>
                      </ul>
                      <p className="mt-3 text-yellow-300 text-sm">
                        ⚡ 버튼 한 번에 모든 것이 자동으로!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={!searchQuery.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-6 rounded-2xl hover:shadow-2xl transition disabled:opacity-50 text-xl"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  AI가 리포트 작성 중... (30초 대기)
                </span>
              ) : (
                '🚀 완전 자동으로 AI 리포트 생성'
              )}
            </button>

            {/* Progress Log */}
            {progress.length > 0 && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin text-blue-400' : 'text-green-400'}`} />
                  진행 상황
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {progress.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <span className="text-slate-400 flex-shrink-0">{item.time}</span>
                      <span className={`${
                        item.type === 'success' ? 'text-green-300' :
                        item.type === 'error' ? 'text-red-300' :
                        'text-slate-200'
                      }`}>{item.message}</span>
                    </div>
                  ))}
                </div>
                
                {error && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-300 font-semibold">오류: {error}</p>
                    <p className="text-xs text-red-400 mt-2">
                      Vercel 환경 변수에 ANTHROPIC_API_KEY가 설정되어 있는지 확인하세요.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Result */}
        {step === 2 && generatedReport && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold mb-2">✅ 리포트 생성 완료!</h2>
                  <p className="text-blue-100">"{searchQuery}"</p>
                </div>
                <button onClick={downloadReport} className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  다운로드
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-sm text-blue-100 mb-1">투자의견</p>
                  <p className="text-xl font-bold">{generatedReport.rating}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-sm text-blue-100 mb-1">수집 뉴스</p>
                  <p className="text-xl font-bold">{generatedReport.newsCount}건</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-sm text-blue-100 mb-1">시장 감성</p>
                  <p className="text-xl font-bold">{generatedReport.sentiment}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-white">AI가 생성한 완전히 새로운 리포트</h3>
              </div>
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-slate-200 leading-relaxed bg-slate-900/50 rounded-xl p-6 max-h-[600px] overflow-y-auto">
                  {generatedReport.content}
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <div className="flex gap-3">
                <Sparkles className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-white mb-2">✨ 완전 자동 생성 완료!</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>실시간 뉴스 {generatedReport.newsCount}건 자동 수집</li>
                    <li>시장 감성: {generatedReport.sentiment}</li>
                    <li>전문 애널리스트 수준 분석</li>
                    <li>생성 시각: {generatedReport.generatedAt}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="bg-slate-900/50 border-t border-slate-800 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-400 text-sm">
          <p className="font-semibold text-white mb-2">AI 투자 리포트 생성기 v1.0 - 완전 자동화</p>
          <p>⚡ 버튼 한 번으로 완성 | 🤖 Claude AI 직접 연동 | 📰 실시간 데이터 수집</p>
        </div>
      </footer>
    </div>
  );
};

export default FullAutoReportGenerator;