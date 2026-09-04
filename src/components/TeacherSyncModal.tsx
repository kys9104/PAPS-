import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  Send,
  Download,
  Database,
  Users,
  Search,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  getTeacherSettings,
  saveTeacherSettings,
  exportClassDataAsCsv,
  syncToGoogleSheet,
  getAllStudents,
  getStudentPapsRecords
} from '../services/storageService';
import {
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  FirebaseCustomConfig
} from '../services/firebaseConfig';
import { StudentProfile } from '../types';

interface TeacherSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: StudentProfile | null;
  onSelectStudent?: (student: StudentProfile) => void;
}

const GAS_TEMPLATE_CODE = `/**
 * 신안해양과학고등학교 1학년 체육 체력 증진 웹앱 연동 Apps Script
 * 배포 방법:
 * 1. 스프레드시트 > 확장 프로그램 > Apps Script 접속
 * 2. 아래 코드를 전체 붙여넣기
 * 3. 배포 > 새 배포 > 유형 선택: 웹 앱
 * 4. 다음 사용자로서 실행: '나(소유자)'
 * 5. 액세스 권한이 있는 사용자: '모든 사용자(Anyone)' 선택 후 [배포]
 * 6. 생성된 '웹 앱 URL'을 복사하여 교사 설정에 등록하세요.
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. PAPS 측정 기록 시트
    if (data.action === "paps_record") {
      var sheet = ss.getSheetByName("PAPS기록") || ss.insertSheet("PAPS기록");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["전송일시", "학교명", "학년", "반", "번호", "이름", "목표여부", "종합등급", "총점", "심폐지구력", "유연성", "근력근지구력", "순발력", "BMI", "생기부추천"]);
        sheet.getRange(1, 1, 1, 15).setBackground("#0284c7").setFontColor("#ffffff").setFontWeight("bold");
      }
      sheet.appendRow([
        new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
        data.schoolName || "신안해양과학고",
        data.grade || 1,
        data.classNum,
        data.studentNum,
        data.studentName,
        data.isGoal ? "목표치" : "실측치",
        data.overallGrade + "등급",
        data.totalScore + "점",
        data.cardio,
        data.flexibility,
        data.strength,
        data.agility,
        data.bmi,
        data.neisNote || ""
      ]);
    }
    
    // 2. FITT 처방 및 5차시 실습 완료 시트
    if (data.action === "fitt_plan" || data.action === "lesson_complete") {
      var sheet2 = ss.getSheetByName("FITT및5차시") || ss.insertSheet("FITT및5차시");
      if (sheet2.getLastRow() === 0) {
        sheet2.appendRow(["일시", "학번", "이름", "구분", "주요내용"]);
        sheet2.getRange(1, 1, 1, 5).setBackground("#0d9488").setFontColor("#ffffff").setFontWeight("bold");
      }
      sheet2.appendRow([
        new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
        data.studentId,
        data.studentName,
        data.action,
        JSON.stringify(data)
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export const TeacherSyncModal: React.FC<TeacherSyncModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  onSelectStudent
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'sheet' | 'csv' | 'firebase'>('roster');
  const [rosterClassFilter, setRosterClassFilter] = useState<'all' | '1' | '2'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return getTeacherSettings().googleSheetWebhookUrl || '';
  });
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ text: string; success: boolean } | null>(null);

  // Firebase Config State
  const [apiKey, setApiKey] = useState<string>(() => getStoredFirebaseConfig()?.apiKey || '');
  const [projectId, setProjectId] = useState<string>(() => getStoredFirebaseConfig()?.projectId || '');
  const [appId, setAppId] = useState<string>(() => getStoredFirebaseConfig()?.appId || '');
  const [firebaseMsg, setFirebaseMsg] = useState<{ text: string; success: boolean } | null>(null);

  if (!isOpen) return null;

  const allStudents = getAllStudents();

  // Filter students for roster tab
  const filteredStudents = allStudents.filter((s) => {
    if (rosterClassFilter === '1' && s.classNum !== 1) return false;
    if (rosterClassFilter === '2' && s.classNum !== 2) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchNum = String(s.studentNum).includes(q);
      const matchId = s.id.toLowerCase().includes(q);
      return matchName || matchNum || matchId;
    }
    return true;
  });

  const handleSaveWebhook = () => {
    const s = getTeacherSettings();
    saveTeacherSettings({ ...s, googleSheetWebhookUrl: webhookUrl.trim() });
    setTestResult({ text: 'Webhook URL이 저장되었습니다.', success: true });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_TEMPLATE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({ text: '먼저 Webhook URL을 입력해주세요.', success: false });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const dummyStudent: StudentProfile = currentStudent || {
      id: '1-1-01',
      grade: 1,
      classNum: 1,
      studentNum: 1,
      name: '곽승준',
      gender: '남',
      pin: '1234',
      joinedAt: new Date().toISOString()
    };

    try {
      const res = await syncToGoogleSheet({
        action: 'workout_log',
        student: dummyStudent,
        data: {
          exerciseName: 'Webhook 통신 상태 점검 테스트',
          category: '통신점검',
          sets: 1,
          durationMinutes: 1,
          rpe: 5,
          memo: '신안해양과학고 체육 웹앱 연동 성공'
        }
      });
      setTestResult({ text: res.message, success: res.success });
    } catch {
      setTestResult({ text: '테스트 전송 실패', success: false });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = exportClassDataAsCsv();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `신안해양과학고_1학년_체육_PAPS_누적기록_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveFirebaseConfig = () => {
    if (!apiKey || !projectId) {
      saveFirebaseConfig(null);
      setFirebaseMsg({ text: 'Firebase 설정이 초기화되어 로컬 오프라인 모드로 전환되었습니다.', success: true });
      setTimeout(() => setFirebaseMsg(null), 4000);
      return;
    }
    const cfg: FirebaseCustomConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      storageBucket: `${projectId.trim()}.appspot.com`,
      messagingSenderId: '',
      appId: appId.trim() || '1:123456789:web:abcdef'
    };
    saveFirebaseConfig(cfg);
    setFirebaseMsg({ text: 'Firebase 설정이 저장되었습니다! 클라우드 동기화가 활성화됩니다.', success: true });
    setTimeout(() => setFirebaseMsg(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0d172e] border border-[#1e2f5b] rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header Ribbon */}
        <div className="p-5 border-b border-[#1e2f5b] bg-[#142245] text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#070e1e] border border-[#E8FD3B]/40 text-[#E8FD3B] flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
                  신안해양과학고등학교 체육과
                </span>
                <span className="text-[10px] font-semibold bg-sky-950/60 text-sky-300 px-2 py-0.5 rounded-full border border-sky-800/60">
                  1학년 총 37명 명렬표 관리
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 text-white">
                교사용 학생 명렬표 & 데이터 연동 센터
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-[#1c2e5a] transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1e2f5b] px-6 bg-[#091124] overflow-x-auto">
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-3 px-4 text-xs font-black border-b-2 whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'roster'
                ? 'border-[#E8FD3B] text-[#E8FD3B] bg-[#142245]/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1학년 학생 명단 (37명)</span>
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`py-3 px-4 text-xs font-black border-b-2 whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'csv'
                ? 'border-[#E8FD3B] text-[#E8FD3B] bg-[#142245]/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>학급 전체 CSV 추출</span>
          </button>
          <button
            onClick={() => setActiveTab('sheet')}
            className={`py-3 px-4 text-xs font-black border-b-2 whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'sheet'
                ? 'border-[#E8FD3B] text-[#E8FD3B] bg-[#142245]/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Google 스프레드시트 Webhook</span>
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`py-3 px-4 text-xs font-black border-b-2 whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'firebase'
                ? 'border-[#E8FD3B] text-[#E8FD3B] bg-[#142245]/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Firebase 클라우드 연동</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. Official Roster Tab */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block">전체 등록 학생</span>
                    <span className="text-xl font-black text-white">37명</span>
                  </div>
                  <span className="text-xs font-bold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-1 rounded-xl border border-[#E8FD3B]/30">
                    100% 동기화
                  </span>
                </div>
                <div className="p-3.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-sky-400 block">1학년 1반</span>
                    <span className="text-xl font-black text-white">19명</span>
                  </div>
                  <span className="text-[11px] font-medium text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-800/60">
                    1~21번 (19명)
                  </span>
                </div>
                <div className="p-3.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 block">1학년 2반</span>
                    <span className="text-xl font-black text-white">18명</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/60">
                    1~19번 (18명)
                  </span>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#070e1e] p-2.5 rounded-2xl border border-[#1e2f5b]">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => setRosterClassFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      rosterClassFilter === 'all'
                        ? 'bg-[#E8FD3B] text-black shadow-xs font-black'
                        : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                    }`}
                  >
                    전체 (37명)
                  </button>
                  <button
                    onClick={() => setRosterClassFilter('1')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      rosterClassFilter === '1'
                        ? 'bg-[#E8FD3B] text-black shadow-xs font-black'
                        : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                    }`}
                  >
                    1반 (19명)
                  </button>
                  <button
                    onClick={() => setRosterClassFilter('2')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      rosterClassFilter === '2'
                        ? 'bg-[#E8FD3B] text-black shadow-xs font-black'
                        : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                    }`}
                  >
                    2반 (18명)
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <input
                      type="text"
                      placeholder="이름 또는 번호 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>
                  <button
                    onClick={handleDownloadCsv}
                    title="전체 명렬표 CSV 다운로드"
                    className="px-3 py-1.5 rounded-xl bg-[#E8FD3B] text-black hover:bg-[#d5eb28] text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">CSV 추출</span>
                  </button>
                </div>
              </div>

              {/* Student Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredStudents.map((s) => {
                  const papsHistory = getStudentPapsRecords(s.id);
                  const latestPaps = papsHistory[0];
                  const isCurrent = currentStudent?.id === s.id;

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-2xl border transition relative flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#142245] border-[#E8FD3B] shadow-[0_0_15px_rgba(232,253,59,0.15)]'
                          : 'bg-[#070e1e] hover:bg-[#101c38] border-[#1e2f5b]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              s.classNum === 1
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {s.studentNum}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-sm text-white tracking-tight">
                                {s.name}
                              </h4>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                  s.gender === '여'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                }`}
                              >
                                {s.gender}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              1학년 {s.classNum}반 {s.studentNum}번 ({s.id})
                            </p>
                          </div>
                        </div>

                        {/* Current Badge or PIN */}
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-slate-400 block">
                            PIN: {s.pin || '1234'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Status & Switch Action */}
                      <div className="mt-2.5 pt-2 border-t border-[#1e2f5b] flex items-center justify-between">
                        <div className="text-[11px]">
                          {latestPaps ? (
                            <span className="font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              {latestPaps.overallGrade}등급 ({latestPaps.totalScore}점)
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">미측정</span>
                          )}
                        </div>

                        {onSelectStudent && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStudent(s);
                              onClose();
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isCurrent
                                ? 'bg-[#E8FD3B] text-black font-black shadow-xs cursor-default'
                                : 'bg-[#142245] hover:bg-[#E8FD3B] hover:text-black text-slate-200 border border-[#1e2f5b]'
                            }`}
                          >
                            <span>{isCurrent ? '선택됨' : '학생 전환'}</span>
                            {!isCurrent && <ArrowRight className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. CSV Tab */}
          {activeTab === 'csv' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl space-y-1">
                <span className="font-bold text-[#E8FD3B] block text-sm mb-1">
                  1학년 전교생 (37명) PAPS 종합 측정 결과 원클릭 엑셀(CSV) 추출
                </span>
                <p className="text-slate-300 leading-relaxed">
                  신안해양과학고 1학년 1반(19명)과 2반(18명) 학생들의 학번, 성명, 성별, 최근 PAPS 종합 등급 및 점수, 종목별 기록, BMI 및 생기부 추천 세특이 UTF-8 엑셀 호환 CSV 형식으로 일괄 다운로드됩니다.
                </p>
              </div>

              <div className="p-8 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E8FD3B]/10 border border-[#E8FD3B]/30 text-[#E8FD3B] flex items-center justify-center mx-auto shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm">신안해양과학고 1학년 체육 통합 명렬표</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    NEIS 학교생활기록부 등록 및 체육과 수행평가 산출물 제출용
                  </p>
                </div>
                <button
                  onClick={handleDownloadCsv}
                  className="px-6 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-xs inline-flex items-center gap-2 transition shadow-[0_0_20px_rgba(232,253,59,0.25)] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  전체 학급 데이터 CSV 파일 다운로드
                </button>
              </div>
            </div>
          )}

          {/* 3. Google Sheet Webhook Tab */}
          {activeTab === 'sheet' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl space-y-1">
                <span className="font-bold text-[#E8FD3B] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#E8FD3B]" />
                  Google Apps Script(GAS) Webhook 이란?
                </span>
                <p className="text-slate-300 leading-relaxed">
                  학생들이 제출한 PAPS 실측치, FITT 운동 처방, 5차시 실천 완료 및 생기부 세특 문구가 선생님의 개인 Google 스프레드시트로 실시간 자동 누적 기록되는 무료 연동 방식입니다.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  배포된 Google Apps Script 웹 앱 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-white outline-none font-mono text-xs placeholder:text-slate-500"
                  />
                  <button
                    onClick={handleSaveWebhook}
                    className="px-4 py-2 bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black rounded-xl shrink-0 transition shadow-xs cursor-pointer"
                  >
                    URL 저장
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                  className="px-4 py-2 bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 border border-[#1e2f5b] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#E8FD3B]" />
                  {isTesting ? '연동 테스트 중...' : '테스트 레코드 1건 전송'}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.text}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Apps Script 템플릿 코드</span>
                  <button
                    onClick={handleCopyCode}
                    className="text-xs text-[#E8FD3B] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? '복사 완료!' : '전체 코드 복사'}
                  </button>
                </div>
                <pre className="p-3 rounded-2xl bg-[#050a14] border border-[#1e2f5b] font-mono text-[10px] text-slate-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                  {GAS_TEMPLATE_CODE}
                </pre>
              </div>
            </div>
          )}

          {/* 4. Firebase Tab */}
          {activeTab === 'firebase' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl space-y-1">
                <span className="font-bold text-[#E8FD3B] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#E8FD3B]" />
                  Firebase Firestore 클라우드 실시간 동기화
                </span>
                <p className="text-slate-300 leading-relaxed">
                  다중 기기 간 실시간 데이터 공유를 활성화하려면 아래에 프로젝트 설정을 입력하거나 기본 로컬 모드로 안전하게 사용하실 수 있습니다.
                </p>
              </div>

              {firebaseMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    firebaseMsg.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {firebaseMsg.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Firebase API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-white font-mono text-xs placeholder:text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Firebase Project ID</label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="shinan-marine-pe"
                    className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-white font-mono text-xs placeholder:text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Firebase App ID (선택)</label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-white font-mono text-xs placeholder:text-slate-500 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveFirebaseConfig}
                    className="px-5 py-2.5 bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black rounded-xl transition shadow-[0_0_15px_rgba(232,253,59,0.25)] cursor-pointer"
                  >
                    설정 적용 및 저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#091124] border-t border-[#1e2f5b] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            신안해양과학고등학교 1학년 체육 체력 증진 및 종합적 관리 시스템
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#142245] border border-[#1e2f5b] hover:bg-[#1c2e5a] text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
