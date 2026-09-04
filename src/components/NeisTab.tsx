import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Save,
  RotateCcw,
  FileText,
  User,
  Users,
  Award,
  BookOpen,
  HeartPulse,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  Tag,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  PenTool,
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import {
  StudentProfile,
  PAPSRecord,
  FITTPlan,
  LessonPlan,
  WorkoutLog
} from '../types';
import {
  generateNEISRecommendation,
  getGradeColor,
  getGradeLabel
} from '../data/papsStandards';
import {
  getStudentNeisNote,
  saveStudentNeisNote,
  getAllStudentNeisNotes,
  getAllStudents,
  getStudentPapsRecords
} from '../services/storageService';

interface NeisTabProps {
  student: StudentProfile | null;
  papsRecords: PAPSRecord[];
  fittPlan: FITTPlan | null;
  lessonPlans: LessonPlan[];
  workoutLogs: WorkoutLog[];
  onOpenAuth: () => void;
  isTeacher?: boolean;
  onOpenTeacherLogin?: () => void;
  onNavigateTab: (tab: 'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'neis' | 'all-students') => void;
  onSelectStudent?: (student: StudentProfile) => void;
}

// 4세대 나이스(NEIS) 바이트 계산기 (한글 3바이트, 영문/공백/숫자 1바이트, 줄바꿈 2바이트)
function calculateNeisBytes(text: string): { bytes: number; chars: number } {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (text[i] === '\n') {
      bytes += 2; // 나이스 개행문자 2바이트
    } else if (code <= 0x007f) {
      bytes += 1;
    } else if (code <= 0x07ff) {
      bytes += 2;
    } else {
      bytes += 3; // 한글 등 3바이트
    }
  }
  return { bytes, chars: text.length };
}

// 강조할 수 있는 체육과 핵심 역량 키워드
const COMPETENCY_KEYWORDS = [
  '자기주도적 실천',
  '끈기와 도전정신',
  '안전 수칙 준수',
  '동료 협력 및 배려',
  '심폐지구력 향상',
  '근력·근지구력 보완',
  '규칙적인 운동 습관',
  '신체 자기효능감',
  'FITT 원리 적용',
  '자각적 운동강도(RPE) 조절'
];

// 빠른 문장 삽입용 단어/연결구
const QUICK_INSERT_PHRASES = [
  '자발적으로 실천하며 신체 자기효능감을 높임.',
  '안전 수칙을 철저히 준수하며 동료들을 적극 격려함.',
  'FITT 원리에 따라 체계적으로 운동 강도를 조절함.',
  '꾸준한 반복 훈련을 통해 신체적 한계를 극복함.',
  '체력 증진에 대한 확고한 의지와 긍정적 가치관을 함양함.'
];

export const NeisTab: React.FC<NeisTabProps> = ({
  student,
  papsRecords,
  fittPlan,
  lessonPlans,
  workoutLogs,
  onOpenAuth,
  isTeacher = false,
  onOpenTeacherLogin,
  onNavigateTab,
  onSelectStudent
}) => {
  // 현재 학생 ID
  const studentId = student?.id || '1-1-01';
  const studentName = student?.name || '학생';

  // 최신 PAPS 기록
  const latestPaps = papsRecords.length > 0 ? papsRecords[0] : null;

  // 완료된 차시 수
  const completedLessonsCount = lessonPlans.filter((l) => l.isCompleted).length;

  // 선택된 역량 키워드들 (동적 조합용)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([
    '자기주도적 실천',
    '안전 수칙 준수'
  ]);

  // 수동 입력 및 편집 상태
  const [customText, setCustomText] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isEditorCopied, setIsEditorCopied] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 교사용 모드 상태
  const [rosterFilter, setRosterFilter] = useState<'all' | '1' | '2'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allNeisMap, setAllNeisMap] = useState<Record<string, string>>({});

  // 1. 학생 변경 시 저장된 세특 불러오기
  useEffect(() => {
    const saved = getStudentNeisNote(studentId);
    if (saved) {
      setCustomText(saved);
      setIsSaved(true);
    } else {
      // 저장된 세특이 없으면 기본 추천 문구 1번으로 자동 세팅
      if (latestPaps) {
        const rec = generateNEISRecommendation(
          studentName,
          latestPaps,
          fittPlan?.selfAnalysis,
          completedLessonsCount
        );
        setCustomText(rec.summary);
      } else {
        setCustomText(
          `2022 개정 교육과정 '체력 증진의 특성과 원리' 단원에서 신안해양과학고 맞춤형 체력 관리 프로그램에 적극적으로 참여함. 체계적인 신체 진단과 FITT 운동 처방(운동빈도, 강도, 시간, 형태)에 따른 개인 맞춤형 운동 계획을 수립하고, 수업 중 안전 수칙을 준수하며 능동적으로 건강한 체력 증진을 실천함.`
        );
      }
      setIsSaved(false);
    }
  }, [studentId, latestPaps, studentName, fittPlan, completedLessonsCount]);

  // 교사용 전체 세특 맵 갱신
  useEffect(() => {
    if (isTeacher) {
      setAllNeisMap(getAllStudentNeisNotes());
    }
  }, [isTeacher, studentId, isSaved]);

  // 2. 추천 문구 생성 (4가지 차별화된 관점 + 키워드 반영)
  const recommendationOptions = useMemo(() => {
    const keywordSentence =
      selectedKeywords.length > 0
        ? `특히 실습 전 과정에서 ${selectedKeywords.join(', ')} 등의 가치를 바탕으로 모범적인 수업 태도를 견지함.`
        : '';

    if (latestPaps) {
      const base = generateNEISRecommendation(
        studentName,
        latestPaps,
        fittPlan?.selfAnalysis,
        completedLessonsCount
      );

      // 옵션 1: 종합 성취 및 성장형
      const opt1 = `${base.options[0]} ${keywordSentence}`.trim();

      // 옵션 2: 자기주도적 체력 관리 & FITT 실천형
      const opt2 = `${base.options[1]} ${keywordSentence}`.trim();

      // 옵션 3: 수업 참여도 & 인성·협력·안전형
      const opt3 = `${base.options[2]} ${keywordSentence}`.trim();

      // 옵션 4: 운동 과학 탐구 & 트레이닝 심화형
      const opt4 = `2022 개정 체육과 성취기준에 부합하는 체력 운동의 과학적 원리를 깊이 이해하고, PAPS 종합 ${latestPaps.overallGrade}등급(총점 ${latestPaps.totalScore}점) 결과를 바탕으로 자신에게 최적화된 운동 강도(RPE)를 체계적으로 설정함. ${latestPaps.cardio.testType}과 ${latestPaps.strength.testType} 훈련에서 과부하 및 점진성의 원리를 엄격히 준수하며 지속적인 체력 향상을 도모함. ${keywordSentence}`.trim();

      return [
        {
          id: 1,
          title: '종합 성취 및 체력 성장형',
          tag: 'PAPS 실측치 + FITT 처방 융합',
          text: opt1
        },
        {
          id: 2,
          title: '자기주도적 관리 & 루틴 실천형',
          tag: '약점 극복 + 지속적 트레이닝',
          text: opt2
        },
        {
          id: 3,
          title: '수업 태도 & 협력·안전 가치형',
          tag: '인성·협동·안전 수칙 준수',
          text: opt3
        },
        {
          id: 4,
          title: '운동 과학 탐구 & 트레이닝 심화형',
          tag: '원리 이해 + 체계적 부하 조절',
          text: opt4
        }
      ];
    }

    // PAPS 미측정 시 기본 템플릿 4종
    return [
      {
        id: 1,
        title: '체력 진단 및 기초 실천형',
        tag: '기초 신체 분석 + 능동적 참여',
        text: `2022 개정 체육과 교육과정 '체력 증진의 특성과 원리' 단원에서 자기 주도적 신체 진단과 체력 관리 프로그램에 성실히 참여함. FITT 운동 처방(빈도·강도·시간·형태)의 기본 원리를 익히고 5차시 맞춤형 운동 루틴을 능동적으로 실천하여 건강한 신체 가치관을 확립함. ${keywordSentence}`.trim()
      },
      {
        id: 2,
        title: '신체 자기효능감 및 훈련 지속형',
        tag: '인터벌·서킷 실습 + 끈기',
        text: `스마트 체력 관리 도구를 활용하여 주차별 실습 기록을 성실히 누적하고 자신의 체력적 강약점을 분석함. 동적 워밍업과 쿨다운 스트레칭 등 부상 예방 루틴을 철저히 준수하며 체육 활동에 대한 긍정적인 흥미와 자신감을 고양함. ${keywordSentence}`.trim()
      },
      {
        id: 3,
        title: '수업 태도 & 배려·협동형',
        tag: '안전·배려·공동체 의식',
        text: `체육 실습 수업에서 안전 수칙을 모범적으로 준수하고 동료 학생들과 상호 피드백을 주고받으며 긍정적인 수업 분위기 조성에 크게 기여함. 지속적인 기초 체력 훈련을 통해 신체적 한계를 끈기 있게 극복하려는 태도가 돋보임. ${keywordSentence}`.trim()
      },
      {
        id: 4,
        title: 'FITT 맞춤 설계 & 과학적 탐구형',
        tag: '운동 처방 설계 + 자각적 강도 조절',
        text: `개인의 신체적 특성을 고려하여 과부하와 점진성의 원리가 적용된 5차시 실습 계획을 수립함. 유산소 및 근지구력 운동의 비율을 균형 있게 편성하고 자각적 운동강도(RPE)를 평가하며 체계적으로 실천함. ${keywordSentence}`.trim()
      }
    ];
  }, [latestPaps, studentName, fittPlan, completedLessonsCount, selectedKeywords]);

  // 바이트 및 글자수 계산
  const { bytes: neisBytes, chars: neisChars } = useMemo(
    () => calculateNeisBytes(customText),
    [customText]
  );
  const isByteOverflow = neisBytes > 1500;
  const bytePercentage = Math.min(100, Math.round((neisBytes / 1500) * 100));

  // 키워드 토글 핸들러
  const handleToggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  // 추천 문구를 에디터로 불러오기
  const handleLoadToEditor = (text: string) => {
    setCustomText(text);
    setIsSaved(false);
    showToast('선택한 추천 문구가 에디터에 적용되었습니다. 추가 수정 후 저장하세요!');
  };

  // 개별 추천 문구 복사
  const handleCopyOption = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 에디터 텍스트 복사
  const handleCopyEditorText = () => {
    if (!customText.trim()) return;
    navigator.clipboard.writeText(customText);
    setIsEditorCopied(true);
    setTimeout(() => setIsEditorCopied(false), 2000);
    showToast('나이스(NEIS) 입력용 세특 문구가 클립보드에 복사되었습니다!');
  };

  // 빠른 문구 끝에 추가
  const handleInsertPhrase = (phrase: string) => {
    setCustomText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${phrase}` : phrase;
    });
    setIsSaved(false);
  };

  // 세특 저장 핸들러 (체육교사 고유 권한)
  const handleSave = async () => {
    if (!isTeacher) {
      showToast('⚠️ 생활기록부 세특 저장은 체육교사 인증(비밀번호: 4161) 후 가능합니다.');
      if (onOpenTeacherLogin) {
        onOpenTeacherLogin();
      }
      return;
    }
    if (!student) {
      onOpenAuth();
      return;
    }
    await saveStudentNeisNote(studentId, customText);
    setIsSaved(true);
    setAllNeisMap(getAllStudentNeisNotes());
    showToast(`[체육교사 승인] ${student.name} 학생의 생활기록부 세특이 안전하게 저장되었습니다!`);
  };

  // 초기화 핸들러
  const handleReset = () => {
    if (window.confirm('입력한 내용을 비우고 기본 추천 문구로 재설정하시겠습니까?')) {
      if (recommendationOptions.length > 0) {
        setCustomText(recommendationOptions[0].text);
      } else {
        setCustomText('');
      }
      setIsSaved(false);
    }
  };

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // 전교생 목록 (교사용)
  const allStudents = useMemo(() => getAllStudents(), []);
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (rosterFilter === '1' && s.classNum !== 1) return false;
      if (rosterFilter === '2' && s.classNum !== 2) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.id.includes(q);
      }
      return true;
    });
  }, [allStudents, rosterFilter, searchQuery]);

  // 전교생 세특 일괄 복사 (교사용)
  const handleCopyAllNeis = () => {
    const lines = allStudents.map((s) => {
      const note = allNeisMap[s.id] || getStudentNeisNote(s.id) || '미작성';
      return `[${s.grade}학년 ${s.classNum}반 ${s.studentNum}번 ${s.name}]\n${note}\n`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('전교생 37명의 생활기록부 세특이 클립보드에 일괄 복사되었습니다!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#E8FD3B] text-black px-5 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 border border-black/10 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#E8FD3B]/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#E8FD3B]/10 text-[#E8FD3B] border border-[#E8FD3B]/30 tracking-wider uppercase">
                신안해양과학고등학교 체육과
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#142245] text-sky-300 border border-[#1e2f5b]">
                2022 개정 교육과정 성취기준 연동
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#142245] text-slate-300 border border-[#1e2f5b]">
                나이스(NEIS) 교과세특 1,500 Byte 표준
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-[#E8FD3B]" />
              <span>생활기록부 세특 생성기 & 수동 에디터</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              학생의 PAPS 실측치, FITT 맞춤형 운동 처방, 5차시 실천 기록을 기반으로 생활기록부 문구를
              즉시 자동 생성하고, 선생님 또는 학생 본인이 자유롭게 수동으로 문장을 수정·가공하여 저장할 수 있습니다.
            </p>
          </div>

          {/* Current Active Student Status Badge */}
          <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] min-w-[280px] shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">현재 선택된 학생</span>
              {isTeacher && (
                <span className="text-[10px] font-black text-[#E8FD3B] bg-[#E8FD3B]/10 px-2 py-0.5 rounded-md border border-[#E8FD3B]/30">
                  교사 관리 모드
                </span>
              )}
            </div>

            {student ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#142245] border border-[#E8FD3B]/40 text-[#E8FD3B] flex items-center justify-center font-black text-base shadow-xs">
                  {student.studentNum}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">{student.name}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#142245] text-slate-300 font-bold border border-[#1e2f5b]">
                      1학년 {student.classNum}반
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    {latestPaps ? (
                      <span className="text-emerald-400 font-bold">
                        PAPS {latestPaps.overallGrade}등급 ({latestPaps.totalScore}점)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">PAPS 미측정</span>
                    )}
                    <span>·</span>
                    <span>실습 {completedLessonsCount}/5차시</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-slate-400 mb-2">학생 로그인이 필요합니다.</p>
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-1.5 rounded-xl bg-[#E8FD3B] text-black text-xs font-bold hover:bg-[#d5eb28] transition cursor-pointer"
                >
                  학생 로그인
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Auto Recommendation Options) vs Right Column (Manual Input & Custom Editor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Columns: Automatic Recommendation Engine */}
        <div className="lg:col-span-6 space-y-6">
          {/* Competency Keywords Customizer */}
          <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#E8FD3B]" />
                <span>강조할 체육과 핵심 역량 키워드 선택</span>
              </h3>
              <span className="text-[11px] text-slate-400">클릭하여 문구에 반영</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COMPETENCY_KEYWORDS.map((kw) => {
                const isSelected = selectedKeywords.includes(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => handleToggleKeyword(kw)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#E8FD3B] text-black font-black shadow-xs'
                        : 'bg-[#070e1e] text-slate-300 hover:text-white border border-[#1e2f5b]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{kw}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Recommended Sentence Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8FD3B]" />
                <span>2022 개정 교육과정 자동 추천 문구 (4종)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                원하는 문구를 에디터로 불러와 편집하세요
              </span>
            </div>

            {recommendationOptions.map((opt, idx) => {
              const isCopied = copiedIndex === idx;
              return (
                <div
                  key={opt.id}
                  className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] hover:border-[#E8FD3B]/40 p-5 shadow-xl space-y-3 transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#142245] border border-[#E8FD3B]/30 text-[#E8FD3B] flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-white tracking-tight">
                          {opt.title}
                        </h4>
                        <span className="text-[10px] text-sky-300 font-medium">
                          {opt.tag}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleLoadToEditor(opt.text)}
                        className="px-3 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1 transition shadow-xs cursor-pointer"
                        title="이 문구를 수동 에디터에 적용"
                      >
                        <PenTool className="w-3 h-3" />
                        <span>에디터 적용</span>
                      </button>
                      <button
                        onClick={() => handleCopyOption(opt.text, idx)}
                        className="p-1.5 rounded-xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 border border-[#1e2f5b] transition cursor-pointer"
                        title="클립보드에 바로 복사"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-[#E8FD3B]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]/80">
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed select-text font-sans">
                      {opt.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 Columns: Manual Input & Custom Text Editor */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl space-y-5 sticky top-24">
            {/* Editor Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2f5b]">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#E8FD3B]" />
                  <span>생활기록부 세특 수동 입력 & 편집기</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  직접 자유롭게 내용을 작성하거나 추천 문구를 부분 수정할 수 있습니다.
                </p>
              </div>

              {isSaved && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>저장 완료됨</span>
                </span>
              )}
            </div>

            {/* NEIS Byte and Character Counter */}
            <div className="p-3.5 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-300">
                    NEIS 바이트:
                    <span
                      className={`ml-1 font-mono font-black ${
                        isByteOverflow ? 'text-rose-400' : 'text-[#E8FD3B]'
                      }`}
                    >
                      {neisBytes.toLocaleString()}
                    </span>{' '}
                    / 1,500 Byte
                  </span>
                  <span className="text-slate-400">
                    글자 수: <strong className="text-white font-mono">{neisChars}</strong>자
                  </span>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isByteOverflow
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-[#142245] text-slate-300'
                  }`}
                >
                  {isByteOverflow ? '1,500 Byte 초과' : `${bytePercentage}% 사용`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#142245] rounded-full overflow-hidden border border-[#1e2f5b]">
                <div
                  className={`h-full transition-all duration-300 ${
                    isByteOverflow
                      ? 'bg-rose-500'
                      : bytePercentage > 85
                      ? 'bg-amber-400'
                      : 'bg-[#E8FD3B]'
                  }`}
                  style={{ width: `${bytePercentage}%` }}
                />
              </div>

              {isByteOverflow && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  나이스(NEIS) 입력 한도인 1,500바이트(약 500자)를 초과했습니다. 문장을 축약해주세요.
                </p>
              )}
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setIsSaved(false);
                }}
                rows={10}
                placeholder="학생의 체육 수업 참여 태도, PAPS 실측 성취도, FITT 5차시 실천 역량을 직접 수동으로 입력하거나 위의 추천 문구를 수정하세요..."
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-2xl p-4 text-sm text-white placeholder:text-slate-500 outline-none leading-relaxed resize-y font-sans transition"
              />
            </div>

            {/* Quick Insert Helper Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block">
                자주 사용하는 마무리 문구 원클릭 덧붙이기
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_INSERT_PHRASES.map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => handleInsertPhrase(phrase)}
                    className="px-2.5 py-1 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b] text-[11px] transition cursor-pointer"
                  >
                    + {phrase.slice(0, 18)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher vs Student Guidance Banner */}
            {!isTeacher ? (
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-start gap-2.5 text-[11px] text-amber-200">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-300">생활기록부 세특 저장 권한 안내 (체육교사 전용)</p>
                  <p className="text-slate-300 leading-relaxed">
                    학교생활기록부 기재 요령에 따라 최종 세특 문구의 저장은 <strong>체육교사만 가능</strong>합니다.
                    학생은 자유롭게 문구를 추천받고 편집 연습 및 <strong className="text-white">[NEIS 복사]</strong>를 사용할 수 있습니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#E8FD3B]/10 rounded-2xl border border-[#E8FD3B]/30 flex items-center gap-2.5 text-[11px] text-slate-200">
                <ShieldCheck className="w-4 h-4 text-[#E8FD3B] shrink-0" />
                <p>
                  <strong className="text-[#E8FD3B]">체육교사 수정·저장 권한 활성화:</strong> 저장 시 학생 프로필 및 생활기록부 NEIS DB에 즉시 공식 반영됩니다.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] text-slate-400 hover:text-white border border-[#1e2f5b] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>내용 초기화</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyEditorText}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    isEditorCopied
                      ? 'bg-[#E8FD3B] text-black font-black'
                      : 'bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 border border-[#1e2f5b]'
                  }`}
                  title="나이스(NEIS) 시스템에 바로 붙여넣기용 복사"
                >
                  {isEditorCopied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-300" />
                      <span>NEIS 복사</span>
                    </>
                  )}
                </button>

                {isTeacher ? (
                  <button
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-2 transition shadow-[0_0_20px_rgba(232,253,59,0.25)] cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>세특 저장하기 (교사 권한)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
                    title="세특 저장은 체육교사 인증 후 가능합니다"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>교사 인증 후 저장</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Roster & Batch Management (Only visible when logged in as teacher or expanded) */}
      {isTeacher && (
        <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2f5b]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#142245] border border-[#E8FD3B]/40 text-[#E8FD3B] flex items-center justify-center font-black">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  신안해양과학고 1학년 전교생(37명) 생활기록부 세특 관리 센터
                </h3>
                <p className="text-xs text-slate-400">
                  학생을 클릭하면 상단 에디터로 즉시 전환되어 개별 세특을 열람 및 수동 편집할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAllNeis}
                className="px-4 py-2 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 border border-[#1e2f5b] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="37명 전원의 세특을 텍스트로 취합 복사"
              >
                <Copy className="w-3.5 h-3.5 text-[#E8FD3B]" />
                <span>37명 전체 일괄 복사</span>
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#070e1e] p-2.5 rounded-2xl border border-[#1e2f5b]">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setRosterFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  rosterFilter === 'all'
                    ? 'bg-[#E8FD3B] text-black font-black'
                    : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                }`}
              >
                전체 (37명)
              </button>
              <button
                onClick={() => setRosterFilter('1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  rosterFilter === '1'
                    ? 'bg-[#E8FD3B] text-black font-black'
                    : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                }`}
              >
                1반 (19명)
              </button>
              <button
                onClick={() => setRosterFilter('2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  rosterFilter === '2'
                    ? 'bg-[#E8FD3B] text-black font-black'
                    : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                }`}
              >
                2반 (18명)
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="학생 이름 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          {/* Student Roster Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredStudents.map((s) => {
              const isCurrent = s.id === studentId;
              const hasCustomNote = Boolean(allNeisMap[s.id] || getStudentNeisNote(s.id));
              const noteText = allNeisMap[s.id] || getStudentNeisNote(s.id) || '';

              return (
                <div
                  key={s.id}
                  onClick={() => onSelectStudent && onSelectStudent(s)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                    isCurrent
                      ? 'bg-[#142245] border-[#E8FD3B] shadow-[0_0_15px_rgba(232,253,59,0.15)]'
                      : 'bg-[#070e1e] hover:bg-[#101c38] border-[#1e2f5b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                          s.classNum === 1
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {s.studentNum}
                      </span>
                      <span className="font-extrabold text-sm text-white">{s.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {s.classNum}반
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        hasCustomNote
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-[#142245] text-slate-400 border-[#1e2f5b]'
                      }`}
                    >
                      {hasCustomNote ? '세특 저장됨' : '미작성'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {noteText || 'PAPS 측정 및 자동 추천 문구 대기 중'}
                  </p>

                  <div className="pt-1.5 border-t border-[#1e2f5b]/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{isCurrent ? '현재 편집 중' : '클릭하여 편집'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
