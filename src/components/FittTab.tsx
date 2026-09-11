import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Save,
  Target,
  Clock,
  Flame,
  Activity,
  Calendar,
  FileCheck,
  Timer,
  FileSpreadsheet,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  Eye,
  Edit3
} from 'lucide-react';
import { StudentProfile, FITTPlan, LessonPlan, MainExerciseSlot } from '../types';
import {
  saveStudentFittPlan,
  saveStudentLessonPlans,
  saveSingleLessonPlan,
  syncToGoogleSheet,
  createDefaultMainExercises,
  exportToGoogleSheetGas
} from '../services/storageService';
import { EXERCISE_GUIDES } from '../data/exerciseGuides';
import { StudentPlanView } from './StudentPlanView';

interface FittTabProps {
  student: StudentProfile | null;
  fittPlan: FITTPlan | null;
  lessonPlans: LessonPlan[];
  onUpdateFittPlan: (plan: FITTPlan) => void;
  onUpdateLessonPlans: (plans: LessonPlan[]) => void;
  onOpenAuth: () => void;
  onApplyToIntervalTimer?: (lesson: LessonPlan) => void;
  onOpenGasSettings?: () => void;
  initialViewMode?: 'view' | 'edit';
}

export const FittTab: React.FC<FittTabProps> = ({
  student,
  fittPlan,
  lessonPlans,
  onUpdateFittPlan,
  onUpdateLessonPlans,
  onOpenAuth,
  onApplyToIntervalTimer,
  onOpenGasSettings,
  initialViewMode = 'edit'
}) => {
  // Mode State: 'view' (학생용 계획 조회 화면) vs 'edit' (차시 및 FITT 편집 폼)
  const [viewMode, setViewMode] = useState<'view' | 'edit'>(initialViewMode);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // FITT Form State
  const [frequency, setFrequency] = useState<string>(
    fittPlan?.frequency || '주 3~4회 (월, 수, 금, 토)'
  );
  const [intensity, setIntensity] = useState<string>(
    fittPlan?.intensity || 'RPE 7 (약간 힘들다) / 최대심박수의 70~80%'
  );
  const [time, setTime] = useState<string>(
    fittPlan?.time || '1회당 45~50분 (준비운동 7분 + 본운동 35분 + 정리운동 8분)'
  );
  const [type, setType] = useState<string>(
    fittPlan?.type || '유산소(셔틀런·인터벌) + 하체/코어 저항성 맨몸운동'
  );
  // [1. 세트 수 수동 설정 기능] 최소 1세트, 최대 10세트
  const [setsCount, setSetsCount] = useState<number>(fittPlan?.setsCount || 3);

  const [selfAnalysis, setSelfAnalysis] = useState<string>(
    fittPlan?.selfAnalysis ||
      '현재 심폐지구력과 유연성에 비해 하체 근지구력이 부족하여 오래달리기 후반부 속도가 저하됨.'
  );
  const [goalStatement, setGoalStatement] = useState<string>(
    fittPlan?.goalStatement ||
      '5주간의 체력 증진 프로그램을 성실히 수행하여 PAPS 종합 2등급 이상 달성 및 체력 자신감 함양.'
  );

  // Principles Checklist State
  const [principles, setPrinciples] = useState({
    overload: fittPlan?.principlesChecklist?.overload ?? true,
    progression: fittPlan?.principlesChecklist?.progression ?? true,
    specificity: fittPlan?.principlesChecklist?.specificity ?? true,
    individuality: fittPlan?.principlesChecklist?.individuality ?? true,
    continuity: fittPlan?.principlesChecklist?.continuity ?? true
  });

  // 차시별 8개 본운동 슬롯 보장 헬퍼
  const normalizeLessonPlansWithEight = (plans: LessonPlan[]): LessonPlan[] => {
    return plans.map((p) => {
      let slots = p.mainExercises ? [...p.mainExercises] : [];
      if (slots.length !== 8) {
        const factorKey = p.targetFactor?.includes('심폐')
          ? 'cardio'
          : p.targetFactor?.includes('근력')
          ? 'strength'
          : p.targetFactor?.includes('유연')
          ? 'flexibility'
          : p.targetFactor?.includes('순발')
          ? 'agility'
          : 'total';
        const defaultEight = createDefaultMainExercises(factorKey as any);
        slots = defaultEight.map((de, i) => slots[i] || de);
      }
      return {
        ...p,
        mainExercises: slots,
        workTimeSeconds: p.workTimeSeconds || 40,
        restTimeSeconds: p.restTimeSeconds || 20,
        setsCount: p.setsCount || 3,
        intensity: p.intensity || 'RPE 7 (약간 힘들다)',
        specialNotes: p.specialNotes || ''
      };
    });
  };

  // 5 Lessons State (정확히 8개 고정 본운동 슬롯 보장)
  const [lessons, setLessons] = useState<LessonPlan[]>(() =>
    normalizeLessonPlansWithEight(lessonPlans)
  );
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 차시별 개별 저장 상태
  const [savingLessonWeek, setSavingLessonWeek] = useState<number | null>(null);
  const [savedLessonWeek, setSavedLessonWeek] = useState<number | null>(null);

  useEffect(() => {
    if (fittPlan) {
      setFrequency(fittPlan.frequency);
      setIntensity(fittPlan.intensity);
      setTime(fittPlan.time);
      setType(fittPlan.type);
      if (fittPlan.setsCount !== undefined) {
        setSetsCount(fittPlan.setsCount);
      }
      setSelfAnalysis(fittPlan.selfAnalysis);
      setGoalStatement(fittPlan.goalStatement);
      if (fittPlan.principlesChecklist) {
        setPrinciples(fittPlan.principlesChecklist);
      }
    }
  }, [fittPlan]);

  useEffect(() => {
    setLessons(normalizeLessonPlansWithEight(lessonPlans));
  }, [lessonPlans]);

  // [세트 수 수동 설정 핸들러: 유효성 검사 1~10세트]
  const handleSetsCountChange = (val: number | string) => {
    let num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num)) num = 1;
    const clamped = Math.max(1, Math.min(10, num));
    setSetsCount(clamped);
  };

  // 5차시 전체에 설정한 세트 수 일괄 적용
  const handleApplySetsToAllLessons = () => {
    const updated = lessons.map((l) => ({ ...l, setsCount }));
    setLessons(updated);
    setStatusMessage({
      text: `모든 5개 차시의 세트 수가 ${setsCount}세트로 일괄 설정되었습니다.`,
      type: 'success'
    });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 개별 차시 세트 수 변경 핸들러 (유효성 검사 1~10세트)
  const handleLessonSetsCountChange = (lessonIdx: number, val: number | string) => {
    let num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num)) num = 1;
    const clamped = Math.max(1, Math.min(10, num));
    const updated = [...lessons];
    updated[lessonIdx] = {
      ...updated[lessonIdx],
      setsCount: clamped
    };
    setLessons(updated);
  };

  // [2. 차시별 개별 저장 핸들러]
  const handleSaveSingleLesson = async (idx: number) => {
    if (!student) return;
    const target = lessons[idx];
    setSavingLessonWeek(target.lessonWeek);
    try {
      const updated = await saveSingleLessonPlan(student.id, target.lessonWeek, target);
      onUpdateLessonPlans(updated);
      setSavedLessonWeek(target.lessonWeek);
      setStatusMessage({
        text: `${target.lessonWeek}차시 계획이 개별 저장되었습니다!`,
        type: 'success'
      });
      setTimeout(() => setSavedLessonWeek(null), 3000);
    } catch {
      setStatusMessage({
        text: `${target.lessonWeek}차시 개별 저장 중 오류가 발생했습니다.`,
        type: 'error'
      });
    } finally {
      setSavingLessonWeek(null);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // 본운동 8개 슬롯 개별 수정 핸들러
  const handleMainExerciseSlotChange = (
    lessonIdx: number,
    slotIdx: number,
    field: keyof MainExerciseSlot,
    value: string
  ) => {
    const updated = [...lessons];
    const currentSlots = updated[lessonIdx].mainExercises
      ? [...updated[lessonIdx].mainExercises!]
      : createDefaultMainExercises('total');

    currentSlots[slotIdx] = {
      ...currentSlots[slotIdx],
      [field]: value
    };
    updated[lessonIdx] = {
      ...updated[lessonIdx],
      mainExercises: currentSlots
    };
    setLessons(updated);
  };

  // 4대 체력 가이드에서 선택 시 해당 슬롯으로 자동 입력
  const handleSelectGuideForSlot = (
    lessonIdx: number,
    slotIdx: number,
    exerciseId: string
  ) => {
    if (!exerciseId) return;
    const guide = EXERCISE_GUIDES.find((g) => g.id === exerciseId);
    if (!guide) return;

    const updated = [...lessons];
    const currentSlots = updated[lessonIdx].mainExercises
      ? [...updated[lessonIdx].mainExercises!]
      : createDefaultMainExercises('total');

    currentSlots[slotIdx] = {
      index: slotIdx + 1,
      name: guide.name,
      durationOrReps: guide.recommendedSets || '40초',
      category: guide.category,
      targetMuscle: Array.isArray(guide.targetMuscles)
        ? guide.targetMuscles.join(', ')
        : guide.targetMuscles
    };

    updated[lessonIdx] = {
      ...updated[lessonIdx],
      mainExercises: currentSlots
    };
    setLessons(updated);
  };

  // [핵심 요구사항] FITT 차시 내용을 인터벌 타이머로 즉시 매핑 및 화면 이동
  const applyToIntervalTimer = (lesson: LessonPlan) => {
    const normalized = normalizeLessonPlansWithEight([lesson])[0];
    if (onApplyToIntervalTimer) {
      onApplyToIntervalTimer(normalized);
    }
  };

  // [핵심 요구사항] 구글 시트(GAS) 수동 내보내기 (Rate Limit 방지용)
  const handleExportFittToGas = async () => {
    if (!student) return;
    setIsSyncing(true);
    const activeFirstLesson = lessons[0];
    const payload = {
      studentId: student.id,
      studentName: student.name,
      frequency,
      intensity,
      time,
      type,
      selfAnalysis,
      goalStatement,
      principlesChecklist: principles,
      mainExercises: activeFirstLesson?.mainExercises || [],
      mainRoutine: activeFirstLesson?.mainRoutine || ''
    };

    const result = await exportToGoogleSheetGas('FITT', payload);
    setIsSyncing(false);
    setStatusMessage({
      text: result.message,
      type: result.success ? 'success' : 'error'
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  if (!student) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#0d172e] border border-[#E8FD3B]/30 text-[#E8FD3B] flex items-center justify-center shadow-[0_0_20px_rgba(232,253,59,0.15)]">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">학생 인증 후 운동 처방을 설계할 수 있습니다</h2>
        <p className="text-xs text-slate-400 mb-6">
          신안해양과학고 1학년 학생 계정으로 로그인하여 2022 개정 체육과 FITT 운동 처방과 5차시 계획서를 작성해보세요.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-sm shadow-[0_0_20px_rgba(232,253,59,0.3)] transition cursor-pointer"
        >
          로그인 / 등록
        </button>
      </div>
    );
  }

  // Handle Save FITT
  const handleSaveFitt = async () => {
    setIsSyncing(true);
    setStatusMessage(null);

    const updatedPlan: FITTPlan = {
      studentId: student.id,
      updatedAt: new Date().toISOString(),
      frequency,
      intensity,
      time,
      type,
      setsCount,
      selfAnalysis,
      goalStatement,
      principlesChecklist: principles
    };

    try {
      await saveStudentFittPlan(updatedPlan);
      onUpdateFittPlan(updatedPlan);

      // Sheet sync fallback
      const syncRes = await syncToGoogleSheet({
        action: 'fitt_plan',
        student,
        data: {
          frequency,
          intensity,
          time,
          type,
          setsCount,
          goalStatement,
          principlesSummary: Object.entries(principles)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(', ')
        }
      });

      setStatusMessage({
        text: `FITT 운동 처방이 저장되었습니다! ${syncRes.success ? '(구글 시트 연동 완료)' : ''}`,
        type: 'success'
      });
    } catch {
      setStatusMessage({
        text: '저장 처리 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Toggle Lesson Complete
  const handleToggleLesson = async (index: number) => {
    const updated = [...lessons];
    updated[index].isCompleted = !updated[index].isCompleted;
    if (updated[index].isCompleted) {
      updated[index].completedAt = new Date().toISOString();
    }
    setLessons(updated);
    await saveStudentLessonPlans(student.id, updated);
    onUpdateLessonPlans(updated);

    if (updated[index].isCompleted) {
      syncToGoogleSheet({
        action: 'lesson_complete',
        student,
        data: {
          lessonWeek: updated[index].lessonWeek,
          title: updated[index].title,
          reflection: updated[index].reflection
        }
      }).catch(() => {});
    }
  };

  const handleLessonChange = (
    index: number,
    field: keyof LessonPlan,
    value: string
  ) => {
    const updated = [...lessons];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setLessons(updated);
  };

  const handleAppendExercise = (
    lessonIdx: number,
    field: 'warmUp' | 'mainRoutine' | 'coolDown',
    exerciseId: string
  ) => {
    if (!exerciseId) return;
    const guide = EXERCISE_GUIDES.find((g) => g.id === exerciseId);
    if (!guide) return;
    const itemText = `${guide.name} (${guide.recommendedSets})`;
    const currentVal = lessons[lessonIdx][field] || '';
    const newVal = currentVal.trim()
      ? `${currentVal.trim()}, ${itemText}`
      : itemText;
    handleLessonChange(lessonIdx, field, newVal);
  };

  const cardioExercises = EXERCISE_GUIDES.filter((e) => e.category === '심폐지구력');
  const strengthExercises = EXERCISE_GUIDES.filter((e) => e.category === '근력 및 근지구력');
  const flexibilityExercises = EXERCISE_GUIDES.filter((e) => e.category === '유연성');
  const powerExercises = EXERCISE_GUIDES.filter((e) => e.category === '순발력');

  const handleSaveLessons = async () => {
    setIsSyncing(true);
    try {
      await saveStudentLessonPlans(student.id, lessons);
      onUpdateLessonPlans(lessons);
      setStatusMessage({
        text: '5차시 맞춤형 운동 계획 및 실천 일지가 저장되었습니다!',
        type: 'success'
      });
    } catch {
      setStatusMessage({
        text: '5차시 저장 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const allPrinciplesChecked = Object.values(principles).every(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-extrabold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
                2022 개정 체육 2 교육과정
              </span>
              <span className="text-xs text-sky-300 font-bold bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-800/60">
                체력 증진의 특성과 원리
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              체력의 종합적 관리 & FITT 운동 처방 설계
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              자신의 신체 진단 및 PAPS 결과를 바탕으로 빈도(F), 강도(I), 시간(T), 형태(T)의 4대 요소를 직접 수립하고, 5차시 실천 계획을 학생 주도로 실행합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFittToGas}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 border border-[#1e2f5b] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Google Apps Script를 통해 구글 스프레드시트 [FITT_처방] 탭으로 내보냅니다."
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>시트로 내보내기</span>
            </button>
            <button
              onClick={handleSaveFitt}
              disabled={isSyncing}
              className="px-5 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-xs flex items-center gap-2 transition shadow-[0_0_20px_rgba(232,253,59,0.3)] disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              {isSyncing ? '동기화 중...' : 'FITT 처방 저장 및 전송'}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs flex items-center gap-2 border shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300 font-bold'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#E8FD3B]" />
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs (내 처방 계획 조회 vs 처방 및 5차시 계획 편집) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#0d172e] border border-[#1e2f5b] rounded-2xl shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('view')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'view'
                ? 'bg-[#E8FD3B] text-black font-black shadow-[0_0_15px_rgba(232,253,59,0.3)]'
                : 'bg-[#070e1e] text-slate-300 hover:text-white border border-[#1e2f5b]'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>📋 내 운동 처방 계획 조회 (타임라인/리스트)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-[#E8FD3B] text-black font-black shadow-[0_0_15px_rgba(232,253,59,0.3)]'
                : 'bg-[#070e1e] text-slate-300 hover:text-white border border-[#1e2f5b]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>✏️ FITT 처방 및 5차시 계획 편집/수정</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline-block pr-2">
          {viewMode === 'view'
            ? '🔍 학생 본인의 저장된 FITT 처방과 5차시 실천 타임라인을 조회합니다.'
            : '📝 세트 수 수동 설정(1~10세트) 및 차시별 개별 저장이 가능합니다.'}
        </span>
      </div>

      {viewMode === 'view' ? (
        <StudentPlanView
          student={student}
          fittPlan={{
            studentId: student.id,
            updatedAt: fittPlan?.updatedAt || new Date().toISOString(),
            frequency,
            intensity,
            time,
            type,
            setsCount,
            selfAnalysis,
            goalStatement,
            principlesChecklist: principles
          }}
          lessonPlans={lessons}
          onNavigateToTimer={(lesson) => applyToIntervalTimer(lesson)}
          onSwitchToEditMode={() => setViewMode('edit')}
          onToggleComplete={(idx) => handleToggleLesson(idx)}
        />
      ) : (
        <>
      {/* 2. Educational Theory: 5 Principles of Physical Fitness Checklist */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#142245] text-[#E8FD3B] border border-[#E8FD3B]/30 flex items-center justify-center shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                체력 증진 5대 기본 원리 자가 점검 체크리스트
              </h3>
              <p className="text-xs text-slate-400">
                운동 처방을 수립할 때 다음 과학적 체력 증진 원리가 반영되었는지 직접 점검하세요.
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold border ${
              allPrinciplesChecked
                ? 'bg-[#E8FD3B]/10 text-[#E8FD3B] border-[#E8FD3B]/30'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
            }`}
          >
            {allPrinciplesChecked ? '5대 원리 완벽 충족' : '점검 필요'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {[
            {
              key: 'overload',
              name: '1. 과부하의 원리 (Overload)',
              desc: '일상적인 신체 활동 수준보다 높은 자극을 가하여 근육과 심폐 기관의 적응을 유도함.'
            },
            {
              key: 'progression',
              name: '2. 점진성의 원리 (Progression)',
              desc: '체력 향상 속도에 맞추어 운동 강도와 시간을 단계적으로 서서히 늘려나감.'
            },
            {
              key: 'specificity',
              name: '3. 특수성의 원리 (Specificity)',
              desc: '개선하고자 하는 특정 체력 요소(예: 유연성 향상 시 좌전굴 스트레칭)에 맞는 종목을 선택함.'
            },
            {
              key: 'individuality',
              name: '4. 개별성의 원리 (Individuality)',
              desc: '자신의 체력 수준, 성별, 신체 발달 단계 및 건강 상태를 고려하여 맞춤형으로 설계함.'
            },
            {
              key: 'continuity',
              name: '5. 지속성/반복성의 원리 (Continuity)',
              desc: '주 3회 이상 주기적이고 규칙적으로 실천하여 훈련 효과의 퇴보(가역성)를 방지함.'
            }
          ].map((item) => {
            const isChecked = principles[item.key as keyof typeof principles];
            return (
              <label
                key={item.key}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 select-none ${
                  isChecked
                    ? 'bg-[#070e1e] border-[#E8FD3B]/40 text-white shadow-xs'
                    : 'bg-[#070e1e]/60 border-[#1e2f5b] text-slate-400 hover:bg-[#142245]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    setPrinciples((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 accent-[#E8FD3B]"
                />
                <div>
                  <span className={`font-bold text-xs block ${isChecked ? 'text-[#E8FD3B]' : 'text-slate-300'}`}>
                    {item.name}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. FITT Prescription Form */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-[#1e2f5b] pb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#142245] text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-xs">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">FITT 4대 요소 맞춤형 설계서</h3>
            <p className="text-xs text-slate-400">
              운동 형태, 운동 강도, 운동 시간, 운동 빈도를 구체적으로 작성하세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* F: Frequency */}
          <div className="p-4 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
            <label className="text-xs font-bold text-[#E8FD3B] flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              F (Frequency - 운동 빈도)
            </label>
            <p className="text-[11px] text-slate-400">
              일주일에 몇 회, 어느 요일에 규칙적으로 운동할 것인가?
            </p>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="예: 주 3~4회 (월, 수, 금, 토요일 방과후)"
              className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {/* I: Intensity */}
          <div className="p-4 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
            <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              I (Intensity - 운동 강도)
            </label>
            <p className="text-[11px] text-slate-400">
              RPE(자각적 운동강도 1~10 척도) 또는 심박수 목표치 설정
            </p>
            <input
              type="text"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              placeholder="예: RPE 7~8 (호흡이 가쁘고 대화가 약간 어려울 정도)"
              className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {/* T: Time */}
          <div className="p-4 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
            <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              T (Time - 운동 시간)
            </label>
            <p className="text-[11px] text-slate-400">
              1회당 지속 시간 및 워밍업·본운동·쿨다운 시간 배분
            </p>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="예: 1회 45분 (워밍업 5분 + 본실습 35분 + 정리 5분)"
              className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {/* T: Type */}
          <div className="p-4 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
            <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              T (Type - 운동 형태/종목)
            </label>
            <p className="text-[11px] text-slate-400">
              자신의 취약 체력 요인을 보완하기 위한 종목 조합
            </p>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="예: 셔틀런 인터벌 + 맨몸 스쿼트 & 플랭크 저항 운동"
              className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {/* S: Sets (세트 수 수동 설정 기능) */}
          <div className="p-4 bg-gradient-to-br from-[#0c1836] to-[#070e1e] rounded-2xl border border-[#E8FD3B]/40 space-y-3 shadow-md md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2f5b] pb-2">
              <div>
                <label className="text-xs font-black text-[#E8FD3B] flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  S (Sets - 운동 처방 세트 수 수동 설정)
                </label>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  자동 계산값을 덮어쓰고 학생이 직접 세트 수를 설정합니다. (입력 유효성 검사: 최소 1세트 ~ 최대 10세트)
                </p>
              </div>
              <span className="text-[10px] font-bold text-black bg-[#E8FD3B] px-2.5 py-0.5 rounded-full self-start sm:self-auto shadow-xs">
                수동 설정 반영됨
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              {/* Stepper with - / Numeric Input / + */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300">처방 세트 수:</span>
                <div className="flex items-center bg-[#0d172e] border border-[#1e2f5b] rounded-xl p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleSetsCountChange(setsCount - 1)}
                    disabled={setsCount <= 1}
                    className="w-8 h-8 rounded-lg bg-[#142245] hover:bg-[#1f3468] text-white flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer transition"
                    title="1세트 감소 (최소 1세트)"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={setsCount}
                    onChange={(e) => handleSetsCountChange(e.target.value)}
                    className="w-14 text-center bg-transparent text-[#E8FD3B] font-black text-base font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetsCountChange(setsCount + 1)}
                    disabled={setsCount >= 10}
                    className="w-8 h-8 rounded-lg bg-[#142245] hover:bg-[#1f3468] text-white flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer transition"
                    title="1세트 증가 (최대 10세트)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-bold">세트 (Sets)</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">빠른 선택:</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSetsCountChange(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      setsCount === s
                        ? 'bg-[#E8FD3B] text-black font-black shadow-xs'
                        : 'bg-[#142245] text-slate-300 hover:bg-[#1c2e5a]'
                    }`}
                  >
                    {s}세트
                  </button>
                ))}
              </div>

              {/* Apply to All Lessons Button */}
              <button
                type="button"
                onClick={handleApplySetsToAllLessons}
                className="px-3.5 py-2 rounded-xl bg-[#142245] hover:bg-[#1c2e5a] text-[#E8FD3B] border border-[#E8FD3B]/30 hover:border-[#E8FD3B]/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="설정한 세트 수를 1~5차시 계획 전체에 일괄 반영합니다."
              >
                <span>5차시 전체에 이 세트 수 일괄 적용</span>
              </button>
            </div>
          </div>
        </div>

        {/* Self Analysis & Goal Statement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              나의 체력 상태 자가 분석 및 취약점 진단
            </label>
            <textarea
              rows={3}
              value={selfAnalysis}
              onChange={(e) => setSelfAnalysis(e.target.value)}
              className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl p-2.5 text-xs text-white focus:outline-none leading-relaxed resize-none"
              placeholder="PAPS 결과를 바탕으로 본인의 강점과 보완이 필요한 체력 요인을 서술하세요."
            />
          </div>

          <div className="p-4 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              5주간의 실천 목표 선언문 (SMART 원칙)
            </label>
            <textarea
              rows={3}
              value={goalStatement}
              onChange={(e) => setGoalStatement(e.target.value)}
              className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl p-2.5 text-xs text-white focus:outline-none leading-relaxed resize-none"
              placeholder="구체적이고 측정 가능하며 달성 가능한 목표를 선언하세요."
            />
          </div>
        </div>
      </div>

      {/* 4. 5-Lesson Plan & Reflection Diary */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2f5b] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
                수동 작성 및 가이드 드롭다운 연동
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              5차시 맞춤형 운동 계획 및 실천 일지
            </h3>
            <p className="text-xs text-slate-400">
              학생이 준비운동, 본운동 루틴, 쿨다운 카드를 직접 수정하거나 4대 체력 운동 가이드 드롭다운에서 선택하여 채워 넣을 수 있습니다.
            </p>
          </div>

          <button
            onClick={handleSaveLessons}
            disabled={isSyncing}
            className="px-5 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-xs flex items-center gap-2 transition shadow-[0_0_20px_rgba(232,253,59,0.3)] disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            5차시 전체 저장
          </button>
        </div>

        {/* 5 Lesson Cards */}
        <div className="space-y-6">
          {lessons.map((lesson, idx) => (
            <div
              key={lesson.lessonWeek}
              className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                lesson.isCompleted
                  ? 'bg-[#09142b] border-[#E8FD3B]/40 shadow-[0_0_15px_rgba(232,253,59,0.1)]'
                  : 'bg-[#070e1e] border-[#1e2f5b]'
              }`}
            >
              {/* Lesson Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1e2f5b]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                      lesson.isCompleted
                        ? 'bg-[#E8FD3B] text-black shadow-[0_0_12px_rgba(232,253,59,0.3)]'
                        : 'bg-[#142245] text-slate-300 border border-[#1e2f5b]'
                    }`}
                  >
                    {lesson.lessonWeek}차시
                  </div>
                  <div>
                    <input
                      type="text"
                      value={lesson.title}
                      onChange={(e) => handleLessonChange(idx, 'title', e.target.value)}
                      className="text-base font-black bg-transparent text-white border-b border-dashed border-transparent hover:border-[#E8FD3B]/50 focus:border-[#E8FD3B] focus:outline-none py-0.5"
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="text"
                        value={lesson.focusArea}
                        onChange={(e) => handleLessonChange(idx, 'focusArea', e.target.value)}
                        placeholder="초점 영역"
                        className="text-[11px] font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-800/60 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={lesson.targetGoal}
                        onChange={(e) => handleLessonChange(idx, 'targetGoal', e.target.value)}
                        placeholder="차시 목표"
                        className="text-xs text-slate-400 bg-transparent border-b border-transparent focus:border-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* [2. 차시별 개별 저장 버튼] */}
                  <button
                    type="button"
                    onClick={() => handleSaveSingleLesson(idx)}
                    disabled={savingLessonWeek === lesson.lessonWeek}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                      savedLessonWeek === lesson.lessonWeek
                        ? 'bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                    title="다른 차시에 영향 없이 이 차시의 계획 내용만 개별 저장합니다."
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {savingLessonWeek === lesson.lessonWeek
                        ? '저장 중...'
                        : savedLessonWeek === lesson.lessonWeek
                        ? '저장 완료!'
                        : `${lesson.lessonWeek}차시 개별 저장`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyToIntervalTimer(lesson)}
                    className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    title="이 차시의 8개 본운동 루틴과 설정값을 인터벌 타이머로 즉시 매핑하고 시작 대기합니다."
                  >
                    <Timer className="w-4 h-4 text-sky-400" />
                    <span>인터벌 타이머로 연동</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleLesson(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      lesson.isCompleted
                        ? 'bg-[#E8FD3B] text-black shadow-[0_0_15px_rgba(232,253,59,0.3)]'
                        : 'bg-[#142245] text-slate-300 hover:text-white border border-[#1e2f5b]'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${lesson.isCompleted ? 'stroke-[3]' : ''}`} />
                    <span>{lesson.isCompleted ? '실천 완료됨' : '실천 완료 체크'}</span>
                  </button>
                </div>
              </div>

              {/* Workout Structure: Warm-up, Main (8 Slots), Cool-down */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 pt-4">
                {/* 1. Warm-up */}
                <div className="p-4 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] space-y-2 flex flex-col justify-between lg:col-span-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#E8FD3B] flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5" />
                        준비운동 (Warm-up)
                      </label>
                      <span className="text-[10px] text-slate-400">약 5~8분</span>
                    </div>

                    <textarea
                      rows={3}
                      value={lesson.warmUp}
                      onChange={(e) => handleLessonChange(idx, 'warmUp', e.target.value)}
                      placeholder="준비운동 루틴을 직접 입력하세요..."
                      className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl p-2 text-xs text-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Dropdown Append Guide */}
                  <div className="pt-2 border-t border-[#1e2f5b]/80">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      + 4대 체력 가이드에서 추가:
                    </label>
                    <select
                      onChange={(e) => {
                        handleAppendExercise(idx, 'warmUp', e.target.value);
                        e.target.value = '';
                      }}
                      className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] text-slate-300 text-[11px] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                    >
                      <option value="">운동 가이드 선택 (클릭시 추가)</option>
                      <optgroup label="유연성 / 워밍업 스트레칭">
                        {flexibilityExercises.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.recommendedSets})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="심폐지구력">
                        {cardioExercises.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* 2. Main Routine (8개 본운동 슬롯 고정) */}
                <div className="p-4 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] space-y-3 lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2f5b] pb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                        <Activity className="w-4 h-4" />
                        본운동 (8개 운동 슬롯 고정)
                      </label>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        인터벌 서킷 연동
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                      {/* 강도 (Intensity) */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">강도:</span>
                        <input
                          type="text"
                          value={lesson.intensity || 'RPE 7'}
                          onChange={(e) =>
                            handleLessonChange(idx, 'intensity', e.target.value)
                          }
                          placeholder="RPE 7"
                          className="w-18 bg-[#070e1e] border border-[#1e2f5b] focus:border-sky-400 rounded px-1.5 py-0.5 text-center text-xs font-bold text-sky-300"
                          title="차시별 운동 강도"
                        />
                      </div>
                      {/* 운동 초 */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">운동:</span>
                        <input
                          type="number"
                          value={lesson.workTimeSeconds || 40}
                          onChange={(e) =>
                            handleLessonChange(idx, 'workTimeSeconds' as any, String(e.target.value))
                          }
                          className="w-11 bg-[#070e1e] border border-[#1e2f5b] rounded px-1 text-center text-xs font-bold text-white"
                        />
                        <span>초</span>
                      </div>
                      {/* 휴식 초 */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">휴식:</span>
                        <input
                          type="number"
                          value={lesson.restTimeSeconds || 20}
                          onChange={(e) =>
                            handleLessonChange(idx, 'restTimeSeconds' as any, String(e.target.value))
                          }
                          className="w-11 bg-[#070e1e] border border-[#1e2f5b] rounded px-1 text-center text-xs font-bold text-white"
                        />
                        <span>초</span>
                      </div>
                      {/* 세트 수 (-/input/+) */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">세트:</span>
                        <div className="flex items-center bg-[#070e1e] border border-[#1e2f5b] rounded px-1">
                          <button
                            type="button"
                            onClick={() => handleLessonSetsCountChange(idx, (lesson.setsCount || 3) - 1)}
                            disabled={(lesson.setsCount || 3) <= 1}
                            className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer text-xs font-bold"
                            title="1세트 감소 (최소 1세트)"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={lesson.setsCount || 3}
                            onChange={(e) =>
                              handleLessonSetsCountChange(idx, e.target.value)
                            }
                            className="w-8 text-center bg-transparent text-xs font-black text-[#E8FD3B] font-mono focus:outline-none"
                            title="세트 수 (1~10세트)"
                          />
                          <button
                            type="button"
                            onClick={() => handleLessonSetsCountChange(idx, (lesson.setsCount || 3) + 1)}
                            disabled={(lesson.setsCount || 3) >= 10}
                            className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer text-xs font-bold"
                            title="1세트 증가 (최대 10세트)"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 8-Slot Grid (2 Columns x 4 Rows) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(lesson.mainExercises || []).map((slot, slotIdx) => (
                      <div
                        key={slot.index}
                        className="p-2.5 bg-[#070e1e] border border-[#1e2f5b] hover:border-sky-500/50 rounded-xl space-y-1.5 transition"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] font-black flex items-center justify-center shrink-0">
                              {slot.index}
                            </span>
                            <input
                              type="text"
                              value={slot.name}
                              onChange={(e) =>
                                handleMainExerciseSlotChange(idx, slotIdx, 'name', e.target.value)
                              }
                              placeholder={`운동 ${slot.index}`}
                              className="bg-transparent font-bold text-xs text-white focus:outline-none border-b border-dashed border-transparent hover:border-sky-400 focus:border-sky-400 py-0.5 w-full min-w-0"
                            />
                          </div>
                          <input
                            type="text"
                            value={slot.durationOrReps}
                            onChange={(e) =>
                              handleMainExerciseSlotChange(idx, slotIdx, 'durationOrReps', e.target.value)
                            }
                            placeholder="40초"
                            className="bg-[#0d172e] border border-[#1e2f5b] rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-300 w-16 text-right focus:outline-none shrink-0"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#1e2f5b]/60">
                          <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                            {slot.category || '체력 맞춤'}
                          </span>
                          <select
                            onChange={(e) => {
                              handleSelectGuideForSlot(idx, slotIdx, e.target.value);
                              e.target.value = '';
                            }}
                            className="bg-[#0d172e] border border-[#1e2f5b] text-[10px] text-slate-300 rounded px-1 py-0.5 focus:outline-none cursor-pointer max-w-[130px]"
                          >
                            <option value="">가이드 선택</option>
                            <optgroup label="심폐지구력">
                              {cardioExercises.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="근력/근지구력">
                              {strengthExercises.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="순발력">
                              {powerExercises.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="유연성">
                              {flexibilityExercises.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Cool-down */}
                <div className="p-4 bg-[#0d172e] rounded-2xl border border-[#1e2f5b] space-y-2 flex flex-col justify-between lg:col-span-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        정리운동 / 쿨다운 (Cool-down)
                      </label>
                      <span className="text-[10px] text-slate-400">약 5~7분</span>
                    </div>

                    <textarea
                      rows={3}
                      value={lesson.coolDown}
                      onChange={(e) => handleLessonChange(idx, 'coolDown', e.target.value)}
                      placeholder="정리운동 및 스트레칭 루틴을 직접 입력하세요..."
                      className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-teal-400 rounded-xl p-2 text-xs text-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Dropdown Append Guide */}
                  <div className="pt-2 border-t border-[#1e2f5b]/80">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      + 4대 체력 가이드에서 추가:
                    </label>
                    <select
                      onChange={(e) => {
                        handleAppendExercise(idx, 'coolDown', e.target.value);
                        e.target.value = '';
                      }}
                      className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-teal-400 text-slate-300 text-[11px] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                    >
                      <option value="">운동 가이드 선택 (클릭시 추가)</option>
                      <optgroup label="유연성 / 쿨다운 정적 스트레칭">
                        {flexibilityExercises.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.recommendedSets})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Special Notes & Reflection / Diary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#1e2f5b]">
                <div>
                  <label className="block text-xs font-bold text-sky-400 mb-1">
                    특이사항 및 지도 메모 ({lesson.lessonWeek}차시)
                  </label>
                  <input
                    type="text"
                    value={lesson.specialNotes || ''}
                    onChange={(e) => handleLessonChange(idx, 'specialNotes', e.target.value)}
                    placeholder="예: 안전 수칙 준수, 수분 섭취 안내, 특정 관절 부상 대체 종목 등"
                    className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    실천 소감 및 자기 성찰 일지 ({lesson.lessonWeek}차시)
                  </label>
                  <input
                    type="text"
                    value={lesson.reflection}
                    onChange={(e) => handleLessonChange(idx, 'reflection', e.target.value)}
                    placeholder="예: 초반 셔틀런 페이스를 잘 유지하여 심폐지구력이 강화됨을 체감함."
                    className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
