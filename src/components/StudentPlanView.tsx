import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Activity,
  CheckCircle2,
  Timer,
  Edit3,
  Dumbbell,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Printer,
  FileCheck,
  BookOpen
} from 'lucide-react';
import { StudentProfile, FITTPlan, LessonPlan } from '../types';

interface StudentPlanViewProps {
  student: StudentProfile | null;
  fittPlan: FITTPlan | null;
  lessonPlans: LessonPlan[];
  onNavigateToTimer?: (lesson: LessonPlan) => void;
  onSwitchToEditMode?: () => void;
  onToggleComplete?: (index: number) => void;
}

export const StudentPlanView: React.FC<StudentPlanViewProps> = ({
  student,
  fittPlan,
  lessonPlans,
  onNavigateToTimer,
  onSwitchToEditMode,
  onToggleComplete
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  if (!student) {
    return (
      <div className="p-8 text-center bg-[#0d172e] rounded-3xl border border-[#1e2f5b] text-slate-400 space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <p className="text-sm font-bold text-white">로그인 후 본인의 운동 처방 계획을 확인할 수 있습니다.</p>
        <p className="text-xs">신안해양과학고 학생 계정으로 로그인해주세요.</p>
      </div>
    );
  }

  const completedCount = lessonPlans.filter((l) => l.isCompleted).length;
  const totalLessons = lessonPlans.length || 5;
  const completionRate = Math.round((completedCount / totalLessons) * 100);
  const effectiveSets = fittPlan?.setsCount || 3;

  const filteredLessons = lessonPlans.filter((l) => {
    if (filter === 'completed') return l.isCompleted;
    if (filter === 'pending') return !l.isCompleted;
    return true;
  });

  return (
    <div className="space-y-6 text-white print:text-black print:space-y-4">
      {/* 1. Student Plan Overview Card */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:border-black print:bg-white print:p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30 print:text-black print:border-black">
              학생 개인 전용 계획 조회
            </span>
            <span className="text-xs text-sky-300 font-bold bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-800/60 print:text-black print:border-black">
              {student.classNum}반 {student.studentNum}번 {student.name}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white print:text-black">
            나의 FITT 운동 처방 & 5차시 실천 계획표
          </h2>
          <p className="text-xs text-slate-400 mt-1 print:text-gray-600">
            신안해양과학고 1학년 맞춤형 FITT 원리 기반 운동 강도, 처방 세트 수, 5차시 8개 본운동 루틴을 한눈에 조회합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <div className="px-4 py-2 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl text-center">
            <p className="text-[10px] text-slate-400 font-bold">5차시 실천 완료율</p>
            <p className="text-sm font-black text-[#E8FD3B]">{completedCount} / {totalLessons}차시 ({completionRate}%)</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] text-slate-200 border border-[#1e2f5b] hover:border-slate-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="운동 처방 및 5차시 실천 계획표를 인쇄하거나 PDF로 저장합니다."
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">계획표 인쇄</span>
          </button>
          {onSwitchToEditMode && (
            <button
              type="button"
              onClick={onSwitchToEditMode}
              className="px-4 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-[#E8FD3B] border border-[#1e2f5b] hover:border-[#E8FD3B]/40 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>처방·차시 계획 수정하기</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. FITT 4-Pillar Summary Cards + Manual Sets Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Frequency */}
        <div className="p-4 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-[#E8FD3B] text-black font-black text-xs rounded-lg flex items-center justify-center">
              F
            </span>
            <span className="text-xs font-bold text-slate-300">운동 빈도</span>
          </div>
          <p className="text-xs font-semibold text-white leading-snug">
            {fittPlan?.frequency || '주 3~4회 (월·수·금·토)'}
          </p>
          <span className="text-[10px] text-slate-500">규칙적 실천 주기</span>
        </div>

        {/* Intensity */}
        <div className="p-4 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-sky-500 text-white font-bold text-xs rounded-lg flex items-center justify-center">
              I
            </span>
            <span className="text-xs font-bold text-slate-300">운동 강도</span>
          </div>
          <p className="text-xs font-semibold text-sky-300 leading-snug">
            {fittPlan?.intensity || 'RPE 7~8 (약간 힘듦)'}
          </p>
          <span className="text-[10px] text-slate-500">목표 심박수 & RPE</span>
        </div>

        {/* Time */}
        <div className="p-4 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-amber-400 text-black font-black text-xs rounded-lg flex items-center justify-center">
              T
            </span>
            <span className="text-xs font-bold text-slate-300">운동 시간</span>
          </div>
          <p className="text-xs font-semibold text-amber-300 leading-snug">
            {fittPlan?.time || '1회 45분 (워밍업+본운동+쿨다운)'}
          </p>
          <span className="text-[10px] text-slate-500">회당 지속 시간</span>
        </div>

        {/* Type */}
        <div className="p-4 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-purple-500 text-white font-bold text-xs rounded-lg flex items-center justify-center">
              T
            </span>
            <span className="text-xs font-bold text-slate-300">운동 형태</span>
          </div>
          <p className="text-xs font-semibold text-purple-300 leading-snug truncate" title={fittPlan?.type}>
            {fittPlan?.type || '인터벌 + 맨몸 저항성'}
          </p>
          <span className="text-[10px] text-slate-500">체력 보완 종목</span>
        </div>

        {/* Prescription Sets (수동 설정 세트 수) */}
        <div className="p-4 bg-gradient-to-br from-[#0e1d3d] to-[#070e1e] rounded-2xl border border-[#E8FD3B]/40 flex flex-col justify-between space-y-2 shadow-[0_0_15px_rgba(232,253,59,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 bg-[#E8FD3B] text-black font-black text-xs rounded-lg flex items-center justify-center">
                S
              </span>
              <span className="text-xs font-black text-[#E8FD3B]">처방 세트 수</span>
            </div>
            <span className="text-[9px] font-bold text-black bg-[#E8FD3B] px-1.5 py-0.5 rounded">
              수동 설정
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{effectiveSets}</span>
            <span className="text-xs font-bold text-slate-400">세트 (Sets)</span>
          </div>
          <span className="text-[10px] text-slate-400">서킷 루틴 반복 횟수</span>
        </div>
      </div>

      {/* 3. Goal & Self Analysis Statement Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] space-y-1.5">
          <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            나의 체력 상태 자가 분석 및 취약점 진단
          </span>
          <p className="text-xs text-slate-200 leading-relaxed">
            {fittPlan?.selfAnalysis || 'PAPS 측정 결과를 바탕으로 취약 체력 요인을 분석하여 작성된 계획입니다.'}
          </p>
        </div>

        <div className="p-5 bg-[#0d172e] rounded-3xl border border-[#1e2f5b] space-y-1.5">
          <span className="text-[11px] font-bold text-[#E8FD3B] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            5주간의 실천 목표 선언문 (SMART 원칙)
          </span>
          <p className="text-xs text-slate-200 leading-relaxed">
            {fittPlan?.goalStatement || '규칙적인 인터벌 트레이닝 실천을 통해 PAPS 등급을 향상시키겠습니다.'}
          </p>
        </div>
      </div>

      {/* 4. Detailed 5-Lesson Plan Timeline & List */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2f5b] pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              차시별 맞춤형 운동 계획 타임라인 (1차시 ~ 5차시)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              각 차시별 목표, 운동 강도, 세트 수, 8개 본운동 종목 및 준비/정리운동 구성표입니다.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#070e1e] p-1 rounded-xl border border-[#1e2f5b] text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#E8FD3B] text-black font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              전체 ({totalLessons})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'pending'
                  ? 'bg-sky-500 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              미완료 ({totalLessons - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'completed'
                  ? 'bg-emerald-400 text-black font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              완료 ({completedCount})
            </button>
          </div>
        </div>

        {/* Timeline List */}
        <div className="space-y-6">
          {filteredLessons.map((lesson) => {
            const originalIndex = lessonPlans.findIndex((l) => l.lessonWeek === lesson.lessonWeek);
            const lessonSets = lesson.setsCount || effectiveSets;
            const workSec = lesson.workTimeSeconds || 40;
            const restSec = lesson.restTimeSeconds || 20;
            const exercises = lesson.mainExercises || [];

            return (
              <div
                key={lesson.lessonWeek}
                className={`rounded-3xl border p-5 sm:p-6 transition shadow-md ${
                  lesson.isCompleted
                    ? 'bg-[#081226] border-[#E8FD3B]/40 shadow-[0_0_15px_rgba(232,253,59,0.08)]'
                    : 'bg-[#070e1e] border-[#1e2f5b]'
                }`}
              >
                {/* Lesson Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2f5b]">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                        lesson.isCompleted
                          ? 'bg-[#E8FD3B] text-black shadow-[0_0_12px_rgba(232,253,59,0.25)]'
                          : 'bg-[#142245] text-slate-300 border border-[#1e2f5b]'
                      }`}
                    >
                      {lesson.lessonWeek}차
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-base font-black text-white">{lesson.title}</h4>
                        <span className="text-[11px] font-bold text-sky-400 bg-sky-950/70 px-2.5 py-0.5 rounded-lg border border-sky-800/60">
                          {lesson.focusArea || lesson.targetFactor || '체력 맞춤'}
                        </span>
                        {lesson.isCompleted && (
                          <span className="text-[10px] font-extrabold text-black bg-[#E8FD3B] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                            실천 완료
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        <span className="text-slate-400 font-bold">차시 목표:</span> {lesson.targetGoal || '기초 체력 단련 및 FITT 실천'}
                      </p>
                    </div>
                  </div>

                  {/* Highlight Parameters & Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Intensity Badge */}
                    <div className="px-3 py-1.5 bg-[#0d172e] border border-sky-500/30 rounded-xl text-left">
                      <span className="text-[9px] text-slate-400 block">운동 강도</span>
                      <span className="text-xs font-black text-sky-300 font-mono">
                        {lesson.intensity || fittPlan?.intensity || 'RPE 7'}
                      </span>
                    </div>

                    {/* Sets Badge */}
                    <div className="px-3 py-1.5 bg-[#0d172e] border border-[#E8FD3B]/40 rounded-xl text-left">
                      <span className="text-[9px] text-slate-400 block">설정 세트</span>
                      <span className="text-xs font-black text-[#E8FD3B] font-mono">
                        {lessonSets} SETS
                      </span>
                    </div>

                    {/* Interval Time Badge */}
                    <div className="px-3 py-1.5 bg-[#0d172e] border border-amber-500/30 rounded-xl text-left">
                      <span className="text-[9px] text-slate-400 block">운동 / 휴식</span>
                      <span className="text-xs font-black text-amber-300 font-mono">
                        {workSec}초 / {restSec}초
                      </span>
                    </div>

                    {/* Completion Toggle Button */}
                    {onToggleComplete && (
                      <button
                        type="button"
                        onClick={() => onToggleComplete(originalIndex)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                          lesson.isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                        }`}
                        title={lesson.isCompleted ? '클릭 시 미완료 상태로 변경합니다.' : '이 차시의 실천을 완료로 표시합니다.'}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${lesson.isCompleted ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{lesson.isCompleted ? '완료 취소' : '완료 체크'}</span>
                      </button>
                    )}

                    {/* Quick Link to Interval Timer */}
                    {onNavigateToTimer && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTimer(lesson)}
                        className="px-3.5 py-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer ml-auto lg:ml-0"
                        title="이 차시의 계획을 스마트 인터벌 타이머에 바로 연동하여 실습을 시작합니다."
                      >
                        <Timer className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>타이머 실습 시작</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lesson Workout Content Breakdown (Warm-up, 8 Main Exercises, Cool-down) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4">
                  {/* Warm-up */}
                  <div className="lg:col-span-3 p-3.5 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] space-y-1.5">
                    <span className="text-xs font-bold text-[#E8FD3B] flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      준비운동 (Warm-up)
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                      {lesson.warmUp || '동적 스트레칭 및 관절 가동성 운동'}
                    </p>
                  </div>

                  {/* 8 Main Exercises */}
                  <div className="lg:col-span-6 p-3.5 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        본운동 (8개 순환 종목)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {exercises.length}개 종목 구성
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {exercises.map((slot) => (
                        <div
                          key={slot.index}
                          className="px-2.5 py-1.5 bg-[#070e1e] rounded-xl border border-[#1e2f5b] flex items-center justify-between gap-1.5 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 font-black text-[10px] flex items-center justify-center shrink-0">
                              {slot.index}
                            </span>
                            <span className="font-bold text-white truncate text-[11px]">
                              {slot.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {slot.durationOrReps || `${workSec}초`}
                            </span>
                            {slot.category && (
                              <span className="text-[9px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                                {slot.category.slice(0, 2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cool-down */}
                  <div className="lg:col-span-3 p-3.5 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] space-y-1.5">
                    <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      정리운동 (Cool-down)
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                      {lesson.coolDown || '정적 스트레칭 및 심호흡 이완'}
                    </p>
                  </div>
                </div>

                {/* Special Notes & Reflection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#1e2f5b]/80 text-xs">
                  <div className="text-slate-400">
                    <span className="font-bold text-slate-300 mr-1.5">지도 메모 / 특이사항:</span>
                    <span className="text-slate-300">
                      {lesson.specialNotes || '특이사항 없음 (안전 수칙 준수)'}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    <span className="font-bold text-[#E8FD3B] mr-1.5">실천 소감 및 성찰:</span>
                    <span className="text-slate-200 italic">
                      {lesson.reflection || '실습 완료 후 소감을 기록해보세요.'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
