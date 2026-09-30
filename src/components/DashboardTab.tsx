import React, { useState } from 'react';
import {
  Award,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Sparkles,
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
import { getGradeColor, getGradeLabel } from '../data/papsStandards';
import { getAllStudents } from '../services/storageService';

interface DashboardTabProps {
  student: StudentProfile | null;
  papsRecords: PAPSRecord[];
  fittPlan: FITTPlan | null;
  lessonPlans: LessonPlan[];
  workoutLogs: WorkoutLog[];
  onNavigateTab: (tab: 'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'all-students') => void;
  onOpenAuth: () => void;
  isTeacher?: boolean;
  onSelectStudent?: (student: StudentProfile) => void;
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
  onSelectStudent,
  onDeleteWorkoutLog,
  onDeletePapsRecord,
  onOpenPasswordModal
}) => {
  const allStudents = getAllStudents();

  // If teacher is logged in but no student is selected, show the teacher student picker
  if (!student && isTeacher) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-[#1e2f5b] pb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#142245] border border-[#E8FD3B]/40 text-[#E8FD3B] flex items-center justify-center font-black shadow-md shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8FD3B] text-black font-black text-xs">
                  체육교사 전용
                </span>
                <h2 className="text-xl font-black text-white">학생 맞춤형 체력 기록실 열람</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                신안해양과학고 학생을 선택하시면 해당 학생의 누적 PAPS 측정 데이터, FITT 운동 처방 설계서, 자가 분석 및 5주 실천 목표, 차시별 실습 계획을 즉시 확인하실 수 있습니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectStudent?.(s)}
                className="p-3.5 bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-[#E8FD3B]/50 rounded-2xl text-left transition cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                  <span>1학년 {s.classNum}반 {s.studentNum}번</span>
                  <span className="text-[10px] text-sky-400 font-bold font-sans">{s.gender}</span>
                </div>
                <div className="text-sm font-black text-white group-hover:text-[#E8FD3B] flex items-center justify-between">
                  <span>{s.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#E8FD3B]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  const papsColors = latestPaps ? getGradeColor(latestPaps.overallGrade) : null;
  const gradeScore = latestPaps ? latestPaps.totalScore : 0;
  const strokeOffset = 440 - (440 * (gradeScore || 20)) / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white">
      {/* Teacher Switcher Bar (when teacher is viewing) */}
      {isTeacher && (
        <div className="bg-gradient-to-r from-[#142245] to-[#0d172e] border border-[#E8FD3B]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-[#E8FD3B] text-black font-black text-xs shadow-xs">
              체육교사 열람 모드
            </span>
            <span className="text-xs sm:text-sm text-slate-200">
              현재 확인 중인 학생: <strong className="text-white underline decoration-[#E8FD3B] underline-offset-4">{student.name}</strong> ({student.grade}학년 {student.classNum}반 {student.studentNum}번)
            </span>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <span className="text-xs text-slate-400 shrink-0">학생 전환:</span>
            <select
              value={student.id}
              onChange={(e) => {
                const target = allStudents.find((s) => s.id === e.target.value);
                if (target && onSelectStudent) onSelectStudent(target);
              }}
              className="bg-[#070e1e] border border-[#1e2f5b] hover:border-[#E8FD3B]/60 rounded-xl px-3 py-1.5 text-xs text-[#E8FD3B] font-bold focus:outline-none cursor-pointer"
            >
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.classNum}반 {s.studentNum}번 {s.name} ({s.gender})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

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
            title="1학년 전체 학생 기록실 조회"
          >
            <Users className="w-4 h-4 text-sky-400" />
            <span>전체 학생 명단</span>
          </button>
          <button
            onClick={() => onNavigateTab('fitt')}
            className="px-3.5 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-[#E8FD3B] border border-[#E8FD3B]/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>운동 처방 계획서</span>
          </button>
          <button
            onClick={() => onNavigateTab('paps')}
            className="px-4 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 border border-[#1e2f5b] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <HeartPulse className="w-4 h-4 text-[#E8FD3B]" />
            <span>PAPS 측정 등록</span>
          </button>
          <button
            onClick={() => onNavigateTab('timer')}
            className="px-5 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 transition shadow-[0_0_20px_rgba(232,253,59,0.3)] cursor-pointer"
          >
            <Flame className="w-4 h-4 stroke-[2.5]" />
            <span>실습 타이머</span>
          </button>
        </div>
      </div>

      {/* 2. 나의 체력 상태 자가 분석 및 5주간 실천 목표 선언문 카드 (User Request 5 & 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: 나의 체력 상태 자가 분석 및 취약점 진단 */}
        <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#142245] text-[#E8FD3B] flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">나의 체력 상태 자가 분석 및 취약점 진단</h3>
                  <p className="text-[11px] text-slate-400">PAPS 5대 체력 요인 실측 기반 개인 체력 강점 및 취약 요인 진단</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('fitt')}
                className="text-xs text-[#E8FD3B] hover:underline font-bold cursor-pointer shrink-0"
              >
                {fittPlan?.selfAnalysis ? '수정하기' : '작성하기'}
              </button>
            </div>

            {fittPlan?.selfAnalysis ? (
              <div className="p-4 rounded-2xl bg-[#070e1e] border border-[#1e2f5b] space-y-2 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-[#E8FD3B] font-bold">
                  <Check className="w-4 h-4" />
                  <span>체력 자가 진단 및 취약점 분석 완료</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-sans pl-3 border-l-2 border-[#E8FD3B]">
                  {fittPlan.selfAnalysis}
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#070e1e] border border-dashed border-[#1e2f5b] text-center space-y-2.5 mt-3">
                <p className="text-xs text-slate-400">
                  아직 등록된 체력 상태 자가 분석 및 취약점 진단 내용이 없습니다.
                </p>
                <button
                  onClick={() => onNavigateTab('fitt')}
                  className="px-4 py-2 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-[#E8FD3B] text-xs font-bold border border-[#E8FD3B]/30 transition cursor-pointer"
                >
                  FITT 탭에서 자가 분석 작성하기
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#1e2f5b] flex items-center justify-between text-[11px] text-slate-400">
            <span>체육교사 및 본인만 열람 가능한 공식 기록</span>
            <span className="text-sky-300 font-bold">2022 개정 체육 2</span>
          </div>
        </div>

        {/* Card 2: 5주간 실천 목표 선언문 */}
        <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#142245] text-amber-400 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">5주간의 실천 목표 선언문 (SMART 원칙)</h3>
                  <p className="text-[11px] text-slate-400">구체적이고 실현 가능한 5주 체력 증진 다짐 및 목표 선언</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('fitt')}
                className="text-xs text-[#E8FD3B] hover:underline font-bold cursor-pointer shrink-0"
              >
                {fittPlan?.goalStatement ? '수정하기' : '선언하기'}
              </button>
            </div>

            {fittPlan?.goalStatement ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#142245] to-[#070e1e] border border-[#E8FD3B]/40 space-y-2 mt-3 shadow-md">
                <div className="flex items-center gap-1.5 text-xs text-[#E8FD3B] font-bold">
                  <Sparkles className="w-4 h-4 text-[#E8FD3B]" />
                  <span>나의 5주 체력 실천 선언문</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed whitespace-pre-line pl-3 border-l-2 border-[#E8FD3B]">
                  "{fittPlan.goalStatement}"
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#070e1e] border border-dashed border-[#1e2f5b] text-center space-y-2.5 mt-3">
                <p className="text-xs text-slate-400">
                  아직 작성된 5주간 실천 목표 선언문이 없습니다.
                </p>
                <button
                  onClick={() => onNavigateTab('fitt')}
                  className="px-4 py-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black transition cursor-pointer shadow-xs"
                >
                  5주 실천 목표 선언문 작성하기
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#1e2f5b] flex items-center justify-between text-[11px] text-slate-400">
            <span>목표 달성 시 세특 및 성취도 평가 반영</span>
            <span className="text-[#E8FD3B] font-bold">SMART 원칙 준수</span>
          </div>
        </div>
      </div>

      {/* 3. Main Bento Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento 1: PAPS 종합 등급 (col-span-4) */}
        <section className="col-span-12 lg:col-span-4 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
              <Award className="w-5 h-5 text-[#E8FD3B]" />
              PAPS 종합 등급
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#142245] text-[#E8FD3B] text-xs font-bold rounded-full border border-[#E8FD3B]/30">
                {latestPaps ? `${latestPaps.date} 측정` : '측정 대기'}
              </span>
              {isTeacher && latestPaps && onDeletePapsRecord && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`${student.name} 학생의 PAPS 측정 기록(${latestPaps.totalScore}점)을 삭제하시겠습니까?`)) {
                      onDeletePapsRecord(latestPaps.id);
                    }
                  }}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="체육교사 권한: PAPS 측정 기록 삭제"
                >
                  기록 삭제
                </button>
              )}
            </div>
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
              계획 조회 및 수정
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

            {/* Sets (세트 수) */}
            <div className="p-3.5 border border-[#1e2f5b] bg-[#070e1e] rounded-2xl">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-7 h-7 bg-emerald-400 text-black rounded-lg flex items-center justify-center font-black text-xs">
                  S
                </span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  세트 수 (Sets)
                </span>
                <span className="text-[10px] font-bold text-black bg-[#E8FD3B] px-1.5 py-0.5 rounded ml-auto">
                  수동 설정 반영
                </span>
              </div>
              <p className="text-xs text-[#E8FD3B] font-bold pl-9 leading-relaxed">
                {fittPlan?.setsCount || 3}세트 (수동 조절 가능)
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
            전체 체력 운동 가이드 보기
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

        {/* Bento 8: 차시별(1~5차시) 맞춤형 운동 처방 실습 계획 및 8개 본운동 루틴 (User Request 5 & 6) */}
        <section className="col-span-12 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2f5b] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#142245] border border-[#E8FD3B]/30 text-[#E8FD3B] flex items-center justify-center font-black shadow-xs shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>차시별(1~5차시) 맞춤형 운동 처방 실습 계획 및 8개 본운동 루틴 일람</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#142245] text-sky-300 border border-sky-500/20 font-normal">
                    전체 {lessonPlans.length || 5}차시
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  차시별로 계획된 8개 본운동 순환 종목, 운동·휴식 시간 및 세트 수가 안전하게 저장되어 있습니다.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => onNavigateTab('fitt')}
                className="px-3.5 py-1.5 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-[#E8FD3B] text-xs font-bold border border-[#E8FD3B]/30 transition cursor-pointer"
              >
                처방 계획서 작성·수정
              </button>
              <button
                onClick={() => onNavigateTab('timer')}
                className="px-3.5 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>인터벌 타이머 실습</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {lessonPlans.map((lp) => {
              const wTime = lp.workTimeSeconds || 40;
              const rTime = lp.restTimeSeconds || 20;
              const setCnt = lp.mainExercises?.length || lp.setsCount || 8;
              const isDone = lp.isCompleted;

              return (
                <div
                  key={lp.lessonWeek}
                  className={`p-4 sm:p-5 rounded-2xl border transition space-y-3 ${
                    isDone
                      ? 'bg-[#070e1e] border-emerald-500/40'
                      : 'bg-[#070e1e] border-[#1e2f5b] hover:border-[#E8FD3B]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2f5b]/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-[#E8FD3B] text-black font-black text-xs flex items-center justify-center shrink-0">
                        {lp.lessonWeek}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-sm">{lp.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#142245] text-sky-300 font-bold border border-sky-500/20">
                            {lp.targetFactor || '맞춤체력'}
                          </span>
                          {isDone && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40">
                              실습 완료
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{lp.focusArea || 'PAPS 체력 증진'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300 self-start sm:self-auto">
                      <span className="bg-[#0d172e] px-2.5 py-1 rounded-lg border border-[#1e2f5b]">
                        운동 <strong className="text-white font-mono">{wTime}초</strong> / 휴식 <strong className="text-white font-mono">{rTime}초</strong>
                      </span>
                      <span className="bg-[#0d172e] px-2.5 py-1 rounded-lg border border-[#1e2f5b] text-[#E8FD3B] font-bold">
                        {setCnt}세트 실습
                      </span>
                      <button
                        onClick={() => onNavigateTab('timer')}
                        className="px-3 py-1 rounded-lg bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black transition cursor-pointer"
                      >
                        타이머 연동
                      </button>
                    </div>
                  </div>

                  {/* Warmup & Cooldown details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0d172e] p-2.5 rounded-xl border border-[#1e2f5b]">
                      <span className="text-slate-400 font-bold block text-[11px] mb-0.5">준비운동 (Warm-up)</span>
                      <span className="text-slate-200">{lp.warmupDetails || '동적 스트레칭 및 가벼운 조깅 5~8분'}</span>
                    </div>
                    <div className="bg-[#0d172e] p-2.5 rounded-xl border border-[#1e2f5b]">
                      <span className="text-slate-400 font-bold block text-[11px] mb-0.5">정리운동 (Cool-down)</span>
                      <span className="text-slate-200">{lp.cooldownDetails || '정적 스트레칭 및 심호흡 5~7분'}</span>
                    </div>
                  </div>

                  {/* 8 Main Exercise Slots */}
                  {lp.mainExercises && lp.mainExercises.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 block">
                        본운동(Main Workout) 8개 순환 종목 계획:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {lp.mainExercises.map((ex, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-[#0d172e] rounded-xl border border-[#1e2f5b] flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-[#E8FD3B] font-bold">{idx + 1}.</span>
                                <span className="font-bold text-white truncate block">{ex.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">{ex.category}</span>
                            </div>
                            <span className="text-[11px] text-sky-300 font-mono font-bold bg-[#142245] px-1.5 py-0.5 rounded shrink-0">
                              {ex.durationOrReps || '15회'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
              {workoutLogs.slice(0, 5).map((log, index) => (
                <div
                  key={`${log.id}-${index}`}
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
