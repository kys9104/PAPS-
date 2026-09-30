import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Activity,
  HeartPulse,
  Award,
  Sparkles,
  Clock,
  Dumbbell,
  Check,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { StudentProfile, FITTPlan, LessonPlan } from '../types';

interface StudentPlansModalProps {
  student: StudentProfile;
  fittPlan: FITTPlan | null;
  lessonPlans: LessonPlan[];
  isCustomizedLessons: boolean;
  onClose: () => void;
  isTeacher: boolean;
}

export const StudentPlansModal: React.FC<StudentPlansModalProps> = ({
  student,
  fittPlan,
  lessonPlans,
  isCustomizedLessons,
  onClose,
  isTeacher
}) => {
  const [activeTab, setActiveTab] = useState<'fitt' | 'lessons'>('fitt');
  const [selectedLessonWeek, setSelectedLessonWeek] = useState<number>(1);

  const hasFitt = Boolean(fittPlan && (fittPlan.goalStatement || fittPlan.frequency));
  const completedCount = lessonPlans.filter((l) => l.isCompleted).length;

  const currentLesson = lessonPlans.find((l) => l.lessonWeek === selectedLessonWeek) || lessonPlans[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0d172e] border border-[#1e2f5b] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#1e2f5b] bg-[#070e1e] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E8FD3B] text-black font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(232,253,59,0.25)] shrink-0">
              {student.classNum}-{student.studentNum}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">{student.name} 학생 체력 계획서</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#142245] text-sky-300 font-bold border border-sky-500/30">
                  {student.grade}학년 {student.classNum}반 ({student.gender})
                </span>
                {isTeacher && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8FD3B]/10 text-[#E8FD3B] font-extrabold border border-[#E8FD3B]/30">
                    체육교사 열람
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                신안해양과학고등학교 2022 개정 체육과 맞춤형 FITT 처방 및 5차시 실천 계획 종합 일람
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-[#142245] hover:bg-[#1f366e] text-slate-300 hover:text-white border border-[#1e2f5b] transition cursor-pointer"
              title="계획서 인쇄"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-slate-400 hover:text-white border border-[#1e2f5b] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Quick Summary Badges */}
        <div className="px-6 py-3 bg-[#091124] border-b border-[#1e2f5b] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('fitt')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'fitt'
                  ? 'bg-[#E8FD3B] text-black shadow-md'
                  : 'bg-[#070e1e] text-slate-400 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>1. FITT 맞춤형 운동 처방</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  hasFitt ? 'bg-black text-[#E8FD3B]' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {hasFitt ? '작성완료' : '미작성'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'lessons'
                  ? 'bg-[#E8FD3B] text-black shadow-md'
                  : 'bg-[#070e1e] text-slate-400 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>2. 5차시 실천 계획서</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  isCustomizedLessons ? 'bg-black text-[#E8FD3B]' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {isCustomizedLessons ? '수립완료' : '기본계획'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">실습 이수율:</span>
            <span className="font-mono font-bold text-white bg-[#142245] px-2.5 py-0.5 rounded-lg border border-[#1e2f5b]">
              {completedCount}/5차시 ({Math.round((completedCount / 5) * 100)}%)
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {activeTab === 'fitt' ? (
            /* ================= FITT Tab ================= */
            hasFitt && fittPlan ? (
              <div className="space-y-5">
                {/* 1. Goal Statement Banner */}
                <div className="bg-gradient-to-r from-[#142245] via-[#0d172e] to-[#070e1e] p-5 rounded-3xl border border-[#E8FD3B]/30 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-[#E8FD3B] font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>5주간의 실천 목표 선언문 (SMART 원칙)</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-white leading-relaxed pl-3 border-l-2 border-[#E8FD3B]">
                    "{fittPlan.goalStatement || '목표 선언문이 작성되지 않았습니다.'}"
                  </p>
                </div>

                {/* 2. Self Analysis */}
                <div className="bg-[#070e1e] p-5 rounded-3xl border border-[#1e2f5b] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-sky-400 font-bold">
                      <HeartPulse className="w-4 h-4" />
                      <span>체력 상태 자가 분석 및 취약점 진단</span>
                    </div>
                    {fittPlan.updatedAt && (
                      <span className="text-slate-500 font-mono text-[11px]">
                        최종 수정: {new Date(fittPlan.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-line bg-[#0d172e] p-4 rounded-2xl border border-[#1e2f5b]">
                    {fittPlan.selfAnalysis || '자가 분석 내용이 없습니다.'}
                  </p>
                </div>

                {/* 3. F.I.T.T 4 Elements Grid */}
                <div className="space-y-3">
                  <h3 className="font-extrabold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <Activity className="w-4 h-4 text-[#E8FD3B]" />
                    <span>F.I.T.T 4대 처방 요소 세부 내역</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* F: Frequency */}
                    <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#E8FD3B] text-xs">F (Frequency - 운동 빈도)</span>
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <p className="font-bold text-white text-sm">{fittPlan.frequency || '미지정'}</p>
                    </div>

                    {/* I: Intensity */}
                    <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#E8FD3B] text-xs">I (Intensity - 운동 강도)</span>
                        <Activity className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <p className="font-bold text-white text-sm">{fittPlan.intensity || '미지정'}</p>
                    </div>

                    {/* T: Time */}
                    <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#E8FD3B] text-xs">T (Time - 운동 시간 & 세트)</span>
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <p className="font-bold text-white text-sm">
                        {fittPlan.time || '미지정'} ({fittPlan.setsCount || 3}세트)
                      </p>
                    </div>

                    {/* T: Type */}
                    <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#E8FD3B] text-xs">T (Type - 운동 형태)</span>
                        <Dumbbell className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <p className="font-bold text-white text-sm">{fittPlan.type || '미지정'}</p>
                    </div>
                  </div>
                </div>

                {/* 4. Principles Checklist */}
                <div className="bg-[#070e1e] p-5 rounded-3xl border border-[#1e2f5b] space-y-3">
                  <span className="text-xs font-bold text-slate-400 block">
                    5대 트레이닝 원리 자가 점검 체크리스트
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { key: 'overload', label: '과부하의 원리' },
                      { key: 'progression', label: '점진성의 원리' },
                      { key: 'specificity', label: '특수성의 원리' },
                      { key: 'individuality', label: '개별성의 원리' },
                      { key: 'continuity', label: '지속성의 원리' }
                    ].map((item) => {
                      const isChecked = fittPlan.principlesChecklist?.[item.key as keyof typeof fittPlan.principlesChecklist];
                      return (
                        <div
                          key={item.key}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 ${
                            isChecked
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-[#0d172e] border-[#1e2f5b] text-slate-500'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isChecked ? 'bg-emerald-400 text-black' : 'bg-slate-700 text-slate-400'}`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-[11px] font-bold">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#070e1e] p-12 rounded-3xl border border-dashed border-[#1e2f5b] text-center space-y-3 my-6">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">아직 등록된 FITT 맞춤형 운동 처방이 없습니다.</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {student.name} 학생이 아직 'FITT 운동 처방' 탭에서 자가 체력 분석 및 5주 실천 목표 선언문을 작성하여 제출하지 않았습니다.
                </p>
              </div>
            )
          ) : (
            /* ================= 5-Lesson Plans Tab ================= */
            <div className="space-y-5">
              {/* Lesson Week Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {lessonPlans.map((lp) => {
                  const isSelected = lp.lessonWeek === selectedLessonWeek;
                  return (
                    <button
                      key={lp.lessonWeek}
                      onClick={() => setSelectedLessonWeek(lp.lessonWeek)}
                      className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#E8FD3B] text-black border-[#E8FD3B] shadow-md'
                          : lp.isCompleted
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#070e1e] text-slate-400 border-[#1e2f5b] hover:text-white'
                      }`}
                    >
                      <span>{lp.lessonWeek}차시 계획</span>
                      {lp.isCompleted && (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-emerald-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Current Lesson Detail Card */}
              {currentLesson && (
                <div className="bg-[#070e1e] rounded-3xl border border-[#1e2f5b] p-5 sm:p-6 space-y-5">
                  {/* Lesson Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#1e2f5b]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-[#142245] text-sky-300 border border-sky-500/30">
                          {currentLesson.targetFactor}
                        </span>
                        {currentLesson.isCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>실습 완료 ({currentLesson.completedAt ? new Date(currentLesson.completedAt).toLocaleDateString() : '완료됨'})</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-slate-800 text-slate-400 border border-slate-700">
                            실습 미완료
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">{currentLesson.title}</h3>
                      <p className="text-xs text-slate-400">
                        목표: <strong className="text-slate-200">{currentLesson.targetGoal || currentLesson.focusArea}</strong>
                      </p>
                    </div>

                    <div className="bg-[#0d172e] p-3 rounded-2xl border border-[#1e2f5b] text-right space-y-0.5 text-xs font-mono">
                      <div className="text-slate-400 text-[10px]">인터벌 규격</div>
                      <div className="text-white font-bold">
                        운동 {currentLesson.workTimeSeconds || 40}초 / 휴식 {currentLesson.restTimeSeconds || 20}초
                      </div>
                      <div className="text-[#E8FD3B] font-bold">
                        {currentLesson.setsCount || 3}세트 순환
                      </div>
                    </div>
                  </div>

                  {/* Routine 3 Steps: Warmup -> 8 Main Exercises -> Cooldown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Warm-up */}
                    <div className="bg-[#0d172e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
                      <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                        STEP 1. 워밍업 (5분)
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {currentLesson.warmUp}
                      </p>
                    </div>

                    {/* Main Routine Overview */}
                    <div className="bg-[#0d172e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
                      <span className="text-[11px] font-black text-[#E8FD3B] uppercase tracking-wider block">
                        STEP 2. 본운동 인터벌 개요
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {currentLesson.mainRoutine}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        강도: <strong className="text-sky-300">{currentLesson.intensity}</strong>
                      </div>
                    </div>

                    {/* Cool-down */}
                    <div className="bg-[#0d172e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
                      <span className="text-[11px] font-black text-sky-400 uppercase tracking-wider block">
                        STEP 3. 쿨다운 스트레칭 (5분)
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {currentLesson.coolDown}
                      </p>
                    </div>
                  </div>

                  {/* 8 Main Exercise Slots Table */}
                  {currentLesson.mainExercises && currentLesson.mainExercises.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <h4 className="font-extrabold text-white text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Dumbbell className="w-4 h-4 text-[#E8FD3B]" />
                          <span>차시별 8개 고정 본운동 인터벌 구성표</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">총 8개 종목 순환</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {currentLesson.mainExercises.map((slot) => (
                          <div
                            key={slot.index}
                            className="bg-[#0d172e] p-3 rounded-2xl border border-[#1e2f5b] space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono font-bold text-[#E8FD3B]">#{slot.index}</span>
                              <span className="text-slate-400">{slot.category}</span>
                            </div>
                            <div className="font-bold text-white text-xs truncate" title={slot.name}>
                              {slot.name}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#1e2f5b]">
                              <span>{slot.targetMuscle || '전신'}</span>
                              <span className="font-mono text-sky-300 font-bold">{slot.durationOrReps}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Reflection & Notes */}
                  {currentLesson.reflection && (
                    <div className="bg-[#142245]/60 p-4 rounded-2xl border border-sky-500/30 space-y-1">
                      <span className="text-[11px] font-bold text-sky-300 block">
                        학생 차시별 실천 성찰 및 소감 (자기평가)
                      </span>
                      <p className="text-xs text-white leading-relaxed whitespace-pre-line">
                        "{currentLesson.reflection}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-[#070e1e] border-t border-[#1e2f5b] flex items-center justify-between text-xs">
          <span className="text-slate-400">
            신안해양과학고등학교 1학년 체육과 PAPS & FITT 통합 교육과정
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#142245] hover:bg-[#1f366e] text-slate-200 hover:text-white border border-[#1e2f5b] font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
