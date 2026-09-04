import React, { useState } from 'react';
import {
  Award,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  User,
  BookOpen,
  Activity,
  Waves,
  Trash2,
  KeyRound,
  ChevronRight,
  Users
} from 'lucide-react';
import { StudentProfile, PAPSRecord, FITTPlan, LessonPlan, WorkoutLog } from '../types';
import { getGradeColor, getGradeLabel, generateNEISRecommendation } from '../data/papsStandards';

interface DashboardTabProps {
  student: StudentProfile | null;
  papsRecords: PAPSRecord[];
  fittPlan: FITTPlan | null;
  lessonPlans: LessonPlan[];
  workoutLogs: WorkoutLog[];
  onNavigateTab: (tab: 'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'neis' | 'all-students') => void;
  onOpenAuth: () => void;
  isTeacher?: boolean;
  onDeleteWorkoutLog?: (logId: string) => void;
  onDeletePapsRecord?: (recordId: string) => void;
  onOpenPasswordModal?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  student,
  papsRecords,
  fittPlan,
  lessonPlans,
  workoutLogs,
  onNavigateTab,
  onOpenAuth,
  isTeacher = false,
  onDeleteWorkoutLog,
  onDeletePapsRecord,
  onOpenPasswordModal
}) => {
  const [copiedNeisIndex, setCopiedNeisIndex] = useState<number | null>(null);

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#0d172e] border border-[#E8FD3B]/30 text-[#E8FD3B] flex items-center justify-center shadow-[0_0_20px_rgba(232,253,59,0.15)]">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          신안해양과학고 학생 로그인이 필요합니다
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          학년, 반, 번호와 4자리 개인 PIN 번호를 입력하시면 본인의 누적 PAPS 측정 데이터, FITT 운동 처방 및 실습 이력을 안전하게 불러옵니다.
        </p>
        <button
          onClick={onOpenAuth}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-sm shadow-[0_0_25px_rgba(232,253,59,0.3)] transition cursor-pointer"
        >
          <User className="w-4 h-4 stroke-[2.5]" />
          학생 로그인 / 계정 등록하기
        </button>
      </div>
    );
  }

  const latestPaps = papsRecords.length > 0 ? papsRecords[0] : null;
  const completedLessons = lessonPlans.filter((l) => l.isCompleted).length;
  const totalWorkoutMinutes = workoutLogs.reduce((acc, l) => acc + l.durationMinutes, 0);

  // NEIS 세특 추천 문구
  const neisRec = latestPaps
    ? generateNEISRecommendation(student.name, latestPaps, fittPlan?.selfAnalysis, completedLessons)
    : null;

  const handleCopyNeis = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedNeisIndex(index);
    setTimeout(() => setCopiedNeisIndex(null), 2500);
  };

  const papsColors = latestPaps ? getGradeColor(latestPaps.overallGrade) : null;
  const gradeScore = latestPaps ? latestPaps.totalScore : 0;
  const strokeOffset = 440 - (440 * (gradeScore || 20)) / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white">
      {/* 1. Student Top Profile Bento Header */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#142245] border border-[#E8FD3B]/30 text-[#E8FD3B] font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(232,253,59,0.15)] shrink-0 font-mono">
            {student.classNum}-{student.studentNum}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
                신안해양과학고 1학년
              </span>
              <span className="text-xs text-slate-400 font-medium">
                학번 ID: {student.id} ({student.gender}학생)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {student.name} 학생의 체력 누적 기록실
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenPasswordModal && (
            <button
              onClick={onOpenPasswordModal}
              className="px-3.5 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 hover:text-[#E8FD3B] border border-[#1e2f5b] hover:border-[#E8FD3B]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="개인 비밀번호(PIN) 재설정"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#E8FD3B]" />
              <span>비밀번호 재설정</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('all-students')}
            className="px-3.5 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 hover:text-[#E8FD3B] border border-[#1e2f5b] hover:border-[#E8FD3B]/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="1학년 37명 전체 학생 기록실 조회"
          >
            <Users className="w-4 h-4 text-sky-400" />
            <span>전체 학생 기록실</span>
          </button>
          <button
            onClick={() => onNavigateTab('paps')}
            className="px-4 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 border border-[#1e2f5b] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <HeartPulse className="w-4 h-4 text-[#E8FD3B]" />
            PAPS 새 측정 등록
          </button>
          <button
            onClick={() => onNavigateTab('timer')}
            className="px-5 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 transition shadow-[0_0_20px_rgba(232,253,59,0.3)] cursor-pointer"
          >
            <Flame className="w-4 h-4 stroke-[2.5]" />
            스마트 타이머 실습
          </button>
        </div>
      </div>

      {/* 2. Main Bento Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento 1: PAPS 종합 등급 (col-span-4) */}
        <section className="col-span-12 lg:col-span-4 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
              <Award className="w-5 h-5 text-[#E8FD3B]" />
              PAPS 종합 등급
            </h3>
            <span className="px-3 py-1 bg-[#142245] text-[#E8FD3B] text-xs font-bold rounded-full border border-[#E8FD3B]/30">
              {latestPaps ? `${latestPaps.date} 측정` : '측정 대기'}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center my-2">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="#142245" strokeWidth="12" fill="none" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#E8FD3B"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="440"
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 drop-shadow-[0_0_8px_rgba(232,253,59,0.5)]"
                />
              </svg>
              <div className="text-center z-10">
                <span className="text-5xl font-black text-white">
                  {latestPaps ? latestPaps.overallGrade : '-'}
                </span>
                <span className="text-xl font-bold text-slate-400 ml-0.5">등급</span>
                <p className="text-[11px] text-[#E8FD3B] font-bold mt-0.5 font-mono">
                  {latestPaps ? `${latestPaps.totalScore}점 / 100점` : '미측정'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 w-full gap-3 mt-5">
              <div className="bg-[#070e1e] p-3 rounded-2xl border border-[#1e2f5b]">
                <p className="text-[10px] text-slate-400 font-bold">심폐지구력</p>
                <p className="text-lg font-extrabold text-[#E8FD3B]">
                  {latestPaps?.cardio.value ?? 0}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    ({latestPaps?.cardio.unit ?? '회'})
                  </span>
                </p>
              </div>
              <div className="bg-[#070e1e] p-3 rounded-2xl border border-[#1e2f5b]">
                <p className="text-[10px] text-slate-400 font-bold">유연성</p>
                <p className="text-lg font-extrabold text-sky-400">
                  {latestPaps?.flexibility.value ?? 0}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    ({latestPaps?.flexibility.unit ?? 'cm'})
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2f5b] flex items-center justify-between text-xs text-slate-400">
            <span>{latestPaps ? getGradeLabel(latestPaps.overallGrade) : '기록 필요'}</span>
            <button
              onClick={() => onNavigateTab('paps')}
              className="text-[#E8FD3B] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              상세보기 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Bento 2: FITT 운동 처방 설계 (col-span-5) */}
        <section className="col-span-12 lg:col-span-5 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
              <BookOpen className="w-5 h-5 text-sky-400" />
              FITT 운동 처방 설계
            </h3>
            <button
              onClick={() => onNavigateTab('fitt')}
              className="text-xs text-[#E8FD3B] hover:underline font-bold cursor-pointer"
            >
              처방 수정
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {/* Frequency */}
            <div className="p-3.5 border border-[#1e2f5b] bg-[#070e1e] rounded-2xl">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-7 h-7 bg-[#E8FD3B] text-black rounded-lg flex items-center justify-center font-black text-xs">
                  F
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  빈도 (Frequency)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium pl-9 leading-relaxed">
                {fittPlan?.frequency || '주 3~4회 규칙적인 실습 수행 권장'}
              </p>
            </div>

            {/* Intensity */}
            <div className="p-3.5 border border-[#1e2f5b] bg-[#070e1e] rounded-2xl">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-7 h-7 bg-sky-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                  I
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  강도 (Intensity)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium pl-9 leading-relaxed">
                {fittPlan?.intensity || '최대 심박수의 65~80% (RPE 7 "약간 힘들다")'}
              </p>
            </div>

            {/* Time */}
            <div className="p-3.5 border border-[#1e2f5b] bg-[#070e1e] rounded-2xl">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-7 h-7 bg-amber-400 text-black rounded-lg flex items-center justify-center font-black text-xs">
                  T
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  시간 (Time)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium pl-9 leading-relaxed">
                {fittPlan?.time || '준비운동 8분 + 본운동 35분 + 정리운동 7분'}
              </p>
            </div>

            {/* Type */}
            <div className="p-3.5 border border-[#1e2f5b] bg-[#070e1e] rounded-2xl">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-7 h-7 bg-purple-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                  T
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  형태 (Type)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium pl-9 leading-relaxed">
                {fittPlan?.type || '유산소(왕복오래달리기) + 하체 및 코어 저항 운동'}
              </p>
            </div>
          </div>
        </section>

        {/* Bento 3: Smart Timer Dark Bento Widget (col-span-3) */}
        <section className="col-span-12 lg:col-span-3 bg-[#070e1e] rounded-3xl border border-[#1e2f5b] p-6 text-white shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Smart Timer
              </h3>
              <p className="text-[11px] text-[#E8FD3B] font-bold">스마트 실습 도구</p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8FD3B] animate-pulse shadow-[0_0_10px_rgba(232,253,59,1)]"></div>
          </div>

          <div className="text-center my-4">
            <p className="text-4xl font-mono font-bold tracking-tighter text-white">
              00:{workoutLogs.length > 0 ? '50' : '45'}
            </p>
            <p className="text-[10px] text-[#E8FD3B] font-bold tracking-widest mt-1">
              WORK SESSION
            </p>
            <p className="text-xs text-slate-400 mt-2">
              누적 실습: <span className="font-bold text-white">{workoutLogs.length}회</span> (총 {totalWorkoutMinutes}분)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onNavigateTab('timer')}
              className="flex-1 py-2.5 bg-[#142245] hover:bg-[#1a2b56] rounded-xl text-xs font-bold border border-[#1e2f5b] transition text-slate-200 cursor-pointer"
            >
              타이머 열기
            </button>
            <button
              onClick={() => onNavigateTab('timer')}
              className="flex-1 py-2.5 bg-[#E8FD3B] hover:bg-[#d5eb28] rounded-xl text-xs font-black text-black transition shadow-[0_0_15px_rgba(232,253,59,0.3)] cursor-pointer"
            >
              실습 시작
            </button>
          </div>
        </section>

        {/* Bento 4: 주차별 5차시 실습 현황 (col-span-4) */}
        <section className="col-span-12 lg:col-span-4 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
              <Calendar className="w-5 h-5 text-sky-400" />
              차시별 체육 실습 현황
            </h3>
            <span className="text-xs font-bold text-[#E8FD3B]">
              {completedLessons}/5차시 ({Math.round((completedLessons / 5) * 100)}%)
            </span>
          </div>

          <div className="space-y-3.5 my-2">
            {[1, 2, 3, 4, 5].map((lessonNum) => {
              const lesson = lessonPlans.find((l) => l.lessonWeek === lessonNum);
              const isDone = lesson?.isCompleted;
              return (
                <div key={lessonNum} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-bold text-slate-400">
                    {lessonNum}차시
                  </div>
                  <div className="flex-1 h-3 bg-[#070e1e] border border-[#1e2f5b] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDone
                          ? 'w-full bg-[#E8FD3B]'
                          : lessonNum === completedLessons + 1
                          ? 'w-[40%] bg-sky-500'
                          : 'w-0'
                      }`}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isDone
                          ? 'bg-[#E8FD3B]/10 text-[#E8FD3B] border border-[#E8FD3B]/30'
                          : lessonNum === completedLessons + 1
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                          : 'bg-[#142245] text-slate-500'
                      }`}
                    >
                      {isDone ? 'DONE' : lessonNum === completedLessons + 1 ? 'ING' : 'WAIT'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#1e2f5b] flex items-center justify-between text-xs text-slate-400">
            <span>2022 개정 교육과정 연계</span>
            <button
              onClick={() => onNavigateTab('fitt')}
              className="text-[#E8FD3B] hover:underline font-bold cursor-pointer"
            >
              5차시 계획서 확인
            </button>
          </div>
        </section>

        {/* Bento 5: 추천 운동 가이드 (col-span-4) */}
        <section className="col-span-12 lg:col-span-4 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
              <Activity className="w-5 h-5 text-[#E8FD3B]" />
              추천 운동 가이드
            </h3>
            <span className="text-xs text-slate-400">4대 체력 요인</span>
          </div>

          <div className="space-y-2.5 my-1">
            <div className="flex items-center gap-3 p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
              <div className="w-10 h-10 bg-sky-950/60 border border-sky-500/30 rounded-xl flex items-center justify-center text-sky-400 shrink-0 font-bold">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">셔틀런 (왕복오래달리기)</p>
                <p className="text-[11px] text-slate-400">심폐지구력 향상 최적화</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#142245] text-sky-300 rounded-full border border-sky-500/20">
                심폐
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
              <div className="w-10 h-10 bg-[#E8FD3B]/10 border border-[#E8FD3B]/30 rounded-xl flex items-center justify-center text-[#E8FD3B] shrink-0 font-bold">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">플랭크 & 코어 안정화</p>
                <p className="text-[11px] text-slate-400">근력 및 자세 유지근 강화</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#142245] text-[#E8FD3B] rounded-full border border-[#E8FD3B]/20">
                근력
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
              <div className="w-10 h-10 bg-amber-950/60 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shrink-0 font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">서전트 점프 & 버피</p>
                <p className="text-[11px] text-slate-400">순발력 및 하체 파워</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#142245] text-amber-300 rounded-full border border-amber-500/20">
                순발력
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('exercises')}
            className="w-full py-3 mt-3 bg-[#142245] hover:bg-[#1a2b56] text-white border border-[#1e2f5b] hover:border-[#E8FD3B]/40 rounded-2xl text-xs font-bold transition cursor-pointer"
          >
            전체 40종 가이드 보기
          </button>
        </section>

        {/* Bento 6: 체력 활동 하이라이트 배너 (col-span-4) */}
        <section className="col-span-12 lg:col-span-4 bg-gradient-to-br from-[#12234a] to-[#0a152d] rounded-3xl border border-[#1e2f5b] p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8FD3B]/20 text-[#E8FD3B] text-[10px] font-extrabold uppercase border border-[#E8FD3B]/30">
                Activity Goal
              </span>
            </div>
            <h3 className="text-xl font-black mb-1 text-white">
              이번 달 목표 달성까지 {Math.max(0, 5 - completedLessons)}차시 남음
            </h3>
            <p className="text-xs text-slate-300">
              누적 실습 시간: 총 {totalWorkoutMinutes}분 ({workoutLogs.length}회 기록)
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <div className="px-3.5 py-1.5 bg-[#142245] border border-[#1e2f5b] rounded-xl text-xs font-bold text-slate-200">
                🏃 셔틀런 실습 완료
              </div>
              <div className="px-3.5 py-1.5 bg-[#142245] border border-[#1e2f5b] rounded-xl text-xs font-bold text-[#E8FD3B]">
                🌊 신안 해양 체력인
              </div>
            </div>
          </div>

          <div className="opacity-10 absolute -right-6 -bottom-6 pointer-events-none text-white">
            <Waves className="w-48 h-48" />
          </div>
        </section>

        {/* Bento 7: 5대 체력 요인별 측정 등급 및 점수 분석 (col-span-12) */}
        <section className="col-span-12 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#E8FD3B]" />
                5대 체력 요인별 측정 등급 및 점수 분석
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                심폐지구력, 유연성, 근력/근지구력, 순발력, 신체조성(BMI)
              </p>
            </div>
            {latestPaps && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${papsColors?.border} ${papsColors?.bg} ${papsColors?.text}`}>
                종합 {latestPaps.overallGrade}등급 ({latestPaps.totalScore}점)
              </span>
            )}
          </div>

          {latestPaps ? (
            <div className="space-y-3 pt-2">
              {[
                {
                  label: '심폐지구력',
                  result: latestPaps.cardio,
                  color: 'bg-sky-400'
                },
                {
                  label: '유연성',
                  result: latestPaps.flexibility,
                  color: 'bg-teal-400'
                },
                {
                  label: '근력·근지구력',
                  result: latestPaps.strength,
                  color: 'bg-[#E8FD3B]'
                },
                {
                  label: '순발력',
                  result: latestPaps.agility,
                  color: 'bg-amber-400'
                },
                {
                  label: '체지방 (BMI)',
                  result: {
                    testType: `BMI ${latestPaps.bodyComp.bmi}`,
                    value: latestPaps.bodyComp.bmi,
                    unit: 'kg/㎡',
                    grade: latestPaps.bodyComp.grade,
                    score: latestPaps.bodyComp.score
                  },
                  color: 'bg-purple-400'
                }
              ].map((item, idx) => {
                const badge = getGradeColor(item.result.grade);
                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-xs font-bold text-slate-300">{item.label}</span>
                      <span className="text-xs text-sky-300 bg-[#142245] px-2.5 py-0.5 rounded-lg border border-[#1e2f5b] font-medium">
                        {item.result.testType}
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {item.result.value} {item.result.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="w-32 h-2.5 bg-[#142245] rounded-full overflow-hidden hidden sm:block border border-[#1e2f5b]">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{ width: `${(item.result.score / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-300 w-12 text-right font-mono">
                        {item.result.score}점
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${badge.badge}`}>
                        {item.result.grade}등급
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#070e1e] rounded-2xl border border-dashed border-[#1e2f5b]">
              <p className="text-sm text-slate-400 mb-3">
                아직 등록된 PAPS 측정 데이터가 없습니다.
              </p>
              <button
                onClick={() => onNavigateTab('paps')}
                className="px-5 py-2.5 rounded-2xl bg-[#E8FD3B] text-black text-xs font-black hover:bg-[#d5eb28] transition cursor-pointer"
              >
                PAPS 측정값 입력하러 가기
              </button>
            </div>
          )}
        </section>

        {/* Bento 8: NEIS 생활기록부 세특 자동 추천 문구 (col-span-12) */}
        <section className="col-span-12 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#142245] border border-[#E8FD3B]/30 text-[#E8FD3B] flex items-center justify-center font-black shadow-xs shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  체육과 교육과정 생활기록부(NEIS) 세특 자동 추천 문구
                </h3>
                <p className="text-xs text-slate-400">
                  2022 개정 체육 2 교과 성취기준 및 학생의 PAPS 실측 결과, FITT 실천 역량 기반 서술형 문구
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => onNavigateTab('neis')}
                className="px-3.5 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>세특 생성기 & 수동 에디터 열기</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>

          {latestPaps && neisRec ? (
            <div className="space-y-3">
              {neisRec.options.map((optionText, idx) => {
                const isCopied = copiedNeisIndex === idx;
                return (
                  <div
                    key={idx}
                    className="p-4 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] hover:border-[#E8FD3B]/40 transition flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#E8FD3B] block">
                        추천 옵션 {idx + 1} ({idx === 0 ? '종합 성장형' : idx === 1 ? '처방 실천형' : '역량 함양형'})
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                        {optionText}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyNeis(optionText, idx)}
                      className={`shrink-0 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isCopied
                          ? 'bg-[#E8FD3B] text-black font-black'
                          : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                      }`}
                      title="클립보드에 복사"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>복사 완료!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden sm:inline">문구 복사</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center bg-[#070e1e] rounded-2xl border border-dashed border-[#1e2f5b]">
              <p className="text-xs text-slate-400">
                PAPS 체력 측정을 등록하시면 학생 맞춤형 NEIS 세특 서술형 문구가 자동으로 조합 생성됩니다.
              </p>
            </div>
          )}
        </section>

        {/* Bento 9: 최근 운동 실습 이력 타임라인 (col-span-12) */}
        <section className="col-span-12 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              최근 운동 실습 이력 타임라인
            </h3>
            <button
              onClick={() => onNavigateTab('timer')}
              className="text-xs text-[#E8FD3B] hover:underline font-bold cursor-pointer"
            >
              새 실습 기록
            </button>
          </div>

          {workoutLogs.length > 0 ? (
            <div className="space-y-2.5">
              {workoutLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#142245] text-[#E8FD3B] flex items-center justify-center font-bold">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block sm:inline mr-2">
                        {log.exerciseName}
                      </span>
                      <span className="text-[10px] text-sky-300 bg-[#142245] px-2 py-0.5 rounded-full border border-sky-500/20 font-semibold">
                        {log.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400">
                    <span>{log.sets}세트</span>
                    <span>{log.durationMinutes}분</span>
                    <span className="text-[#E8FD3B] font-bold bg-[#E8FD3B]/10 px-2 py-0.5 rounded-full border border-[#E8FD3B]/30 font-mono">
                      RPE {log.rpe}
                    </span>
                    <span className="text-[11px] hidden md:inline font-mono">{log.date}</span>

                    {/* Teacher record delete button */}
                    {isTeacher && onDeleteWorkoutLog && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`'${log.exerciseName}' 실습 일지를 삭제하시겠습니까?`)) {
                            onDeleteWorkoutLog(log.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                        title="교사 권한: 이 일지 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center bg-[#070e1e] rounded-2xl border border-dashed border-[#1e2f5b] text-xs text-slate-400">
              아직 누적된 스마트 타이머 실습 이력이 없습니다. 실습 타이머 탭에서 오늘의 운동을 기록해보세요!
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
