import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
  CheckCircle2,
  Dumbbell,
  Settings2,
  Save,
  Activity,
  BookOpen,
  Sparkles,
  Timer,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentProfile, WorkoutLog, LessonPlan, FITTPlan } from '../types';
import { EXERCISE_GUIDES } from '../data/exerciseGuides';
import {
  playCountdownTick,
  playWorkStartBeep,
  playRestStartBeep,
  playCompletionFanfare
} from '../utils/audioAlert';
import {
  saveWorkoutLog,
  syncToGoogleSheet,
  DEFAULT_LESSON_PLANS,
  getStudentLessonPlans,
  getStudentFittPlan
} from '../services/storageService';

export interface PlannedSetItem {
  setNumber: number;
  exerciseName: string;
  category: string;
  targetReps?: number;
}

// 텍스트(예: '15~20회 × 3~4세트')에서 목표 횟수와 세트 수를 추출하는 헬퍼
export function parseExerciseRepsAndSets(str: string | undefined): { reps: number; sets: number } {
  if (!str) return { reps: 15, sets: 4 };

  const setMatch = str.match(/(\d+)(?:[~-](\d+))?\s*세트/);
  let sets = 4;
  if (setMatch) {
    sets = setMatch[2] ? parseInt(setMatch[2], 10) : parseInt(setMatch[1], 10);
  }

  const repMatch = str.match(/(\d+)(?:[~-](\d+))?\s*회/);
  let reps = 15;
  if (repMatch) {
    reps = repMatch[1] ? parseInt(repMatch[1], 10) : 15;
  } else {
    const secMatch = str.match(/(\d+)\s*초/);
    if (secMatch) {
      reps = parseInt(secMatch[1], 10);
    }
  }

  return { reps: Math.max(1, reps), sets: Math.max(1, Math.min(30, sets)) };
}

interface TimerTabProps {
  student: StudentProfile | null;
  fittPlan?: FITTPlan | null;
  lessonPlans?: LessonPlan[];
  appliedLessonPlan?: LessonPlan | null;
  initialExerciseName?: string;
  initialCategory?: string;
  onWorkoutLogged: (log: WorkoutLog) => void;
  onOpenAuth: () => void;
  isTeacher?: boolean;
  onDeleteWorkoutLog?: (logId: string) => void;
}

type TimerPhase = 'idle' | 'prep' | 'work' | 'rest' | 'finished';
type TimerMode = 'interval' | 'stopwatch';

export const TimerTab: React.FC<TimerTabProps> = ({
  student,
  fittPlan: propFittPlan,
  lessonPlans = [],
  appliedLessonPlan,
  initialExerciseName = '정자세 맨몸 스쿼트',
  initialCategory = '근력 및 근지구력',
  onWorkoutLogged,
  onOpenAuth,
  isTeacher = false,
  onDeleteWorkoutLog
}) => {
  const [timerMode, setTimerMode] = useState<TimerMode>('interval');

  // Planned workout sets sequence: 각 세트별 실습종목명, 체력분류, 목표횟수 관리
  const [plannedSets, setPlannedSets] = useState<PlannedSetItem[]>(() => {
    const guide = EXERCISE_GUIDES.find(
      (g) => g.name.toLowerCase() === initialExerciseName.toLowerCase()
    );
    const parsed = parseExerciseRepsAndSets(guide?.recommendedSets);
    const sets = parsed.sets || 4;
    const reps = parsed.reps || 15;
    return Array.from({ length: sets }, (_, i) => ({
      setNumber: i + 1,
      exerciseName: initialExerciseName,
      category: initialCategory || guide?.category || '근력 및 근지구력',
      targetReps: reps
    }));
  });

  // Interval Settings
  const [prepTime, setPrepTime] = useState<number>(5); // 5s
  const [workTime, setWorkTime] = useState<number>(40); // 40s
  const [restTime, setRestTime] = useState<number>(20); // 20s
  const [totalSets, setTotalSets] = useState<number>(() => (plannedSets.length > 0 ? plannedSets.length : 4));
  const [targetReps, setTargetReps] = useState<number>(() => plannedSets[0]?.targetReps || 15);
  const [reps, setReps] = useState<number>(0); // Current accumulated repetitions

  // Interval Running State
  const [currentPhase, setCurrentPhase] = useState<TimerPhase>('idle');
  const [currentSet, setCurrentSet] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(prepTime);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active Plan tracking (for 8 main exercises execution)
  const [activeLessonPlan, setActiveLessonPlan] = useState<LessonPlan | null>(appliedLessonPlan || null);

  // Effective FITT plan
  const effectiveFittPlan: FITTPlan | null =
    propFittPlan || (student ? getStudentFittPlan(student.id) : null);

  // Stopwatch State
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);

  // Save Workout Log Modal State
  const [exerciseName, setExerciseName] = useState<string>(initialExerciseName);
  const [category, setCategory] = useState<string>(initialCategory);
  const [rpe, setRpe] = useState<number>(7);
  const [memo, setMemo] = useState<string>(`${initialExerciseName} 실습`);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [presetTab, setPresetTab] = useState<'lessons' | 'standards'>('standards');

  const timerRef = useRef<number | null>(null);
  const stopwatchRef = useRef<number | null>(null);

  // Active 5-lesson plans (passed via props, or student stored, or default)
  const effectiveLessonPlans: LessonPlan[] =
    lessonPlans.length > 0
      ? lessonPlans
      : student
      ? getStudentLessonPlans(student.id)
      : DEFAULT_LESSON_PLANS;

  // initialExerciseName 변경 시 가이드에 맞춰 세트수 및 목표횟수 자동 동기화
  useEffect(() => {
    if (initialExerciseName) {
      const guide = EXERCISE_GUIDES.find(
        (g) => g.name.toLowerCase() === initialExerciseName.toLowerCase()
      );
      const parsed = parseExerciseRepsAndSets(guide?.recommendedSets);
      const cat = initialCategory || guide?.category || '근력 및 근지구력';

      setExerciseName(initialExerciseName);
      setCategory(cat);
      setTotalSets(parsed.sets);
      setTargetReps(parsed.reps);

      const newSets: PlannedSetItem[] = Array.from({ length: parsed.sets }, (_, i) => ({
        setNumber: i + 1,
        exerciseName: initialExerciseName,
        category: cat,
        targetReps: parsed.reps
      }));
      setPlannedSets(newSets);
      setMemo(`${initialExerciseName} (${parsed.sets}세트 맞춤 실습)`);
    }
  }, [initialExerciseName, initialCategory]);

  // 개별 운동 단일 종목 집중 실습 (예: 정자세 스쿼트 15~20회 3~4세트 집중)
  const applySingleExercisePlan = (
    name: string,
    cat: string,
    durationOrReps?: string,
    wSec: number = 40,
    rSec: number = 20,
    lessonTitle?: string
  ) => {
    const parsed = parseExerciseRepsAndSets(durationOrReps);
    setIsRunning(false);
    setCurrentPhase('idle');
    setActiveLessonPlan(null);
    setWorkTime(wSec);
    setRestTime(rSec);
    setTotalSets(parsed.sets);
    setTimeLeft(prepTime);
    setCurrentSet(1);
    setReps(0);
    setExerciseName(name);
    setCategory(cat);
    setTargetReps(parsed.reps);
    setMemo(
      lessonTitle
        ? `${lessonTitle} - ${name} (${parsed.sets}세트 계획 완주)`
        : `${name} (${parsed.sets}세트 계획 완주)`
    );

    // 계획된 세트수만큼 동일 종목으로 채워 타이머가 중간에 엉뚱한 다음 운동으로 넘어가지 않도록 설정
    const newSets: PlannedSetItem[] = Array.from({ length: parsed.sets }, (_, i) => ({
      setNumber: i + 1,
      exerciseName: name,
      category: cat,
      targetReps: parsed.reps
    }));
    setPlannedSets(newSets);
  };

  // 학생이 작성한 차시 계획서(8개 본운동 + 운동/휴식시간 + 반복횟수) 전체를 타이머에 완전 연동
  const applyFullLessonPlan = (plan: LessonPlan) => {
    setIsRunning(false);
    setCurrentPhase('idle');
    setActiveLessonPlan(plan);

    const wTime = plan.workTimeSeconds || 40;
    const rTime = plan.restTimeSeconds || 20;
    const exercises = plan.mainExercises || [];
    const sets = exercises.length > 0 ? exercises.length : (plan.setsCount || 8);

    setWorkTime(wTime);
    setRestTime(rTime);
    setTotalSets(sets);
    setTimeLeft(prepTime);
    setCurrentSet(1);
    setReps(0);

    const newSets: PlannedSetItem[] = exercises.length > 0
      ? exercises.map((ex, idx) => {
          const parsed = parseExerciseRepsAndSets(ex.durationOrReps);
          return {
            setNumber: idx + 1,
            exerciseName: ex.name,
            category: ex.category || plan.targetFactor || '맞춤형 체력',
            targetReps: parsed.reps
          };
        })
      : Array.from({ length: sets }, (_, i) => ({
          setNumber: i + 1,
          exerciseName: plan.title,
          category: plan.targetFactor || '맞춤형 체력',
          targetReps: 15
        }));

    setPlannedSets(newSets);

    const first = newSets[0];
    if (first) {
      setExerciseName(first.exerciseName);
      setCategory(first.category);
      setTargetReps(first.targetReps || 15);
      setMemo(`${plan.title} 8개 본운동 순환 실습 [1세트: ${first.exerciseName}]`);
    }
  };

  // 학생이 작성한 FITT 운동 처방 계획 기반 타이머 자동 설정
  const applyFittPrescription = (fp: FITTPlan) => {
    setIsRunning(false);
    setCurrentPhase('idle');
    setActiveLessonPlan(null);

    let wTime = 40;
    let rTime = 20;
    let sets = 8;
    let autoReps = 15;
    let autoName = fp.type || 'FITT 맞춤 운동 처방 루틴';
    let autoCategory = '맞춤형 체력';

    const typeStr = (fp.type || '').toLowerCase();
    if (typeStr.includes('셔틀런') || typeStr.includes('오래달리기') || typeStr.includes('달리기') || typeStr.includes('심폐')) {
      wTime = 120;
      rTime = 60;
      sets = 4;
      autoReps = 20;
      autoCategory = '심폐지구력';
    } else if (typeStr.includes('스쿼트') || typeStr.includes('푸시업') || typeStr.includes('근력') || typeStr.includes('악력')) {
      wTime = 40;
      rTime = 20;
      sets = 4;
      autoReps = 15;
      autoCategory = '근력 및 근지구력';
    } else if (typeStr.includes('스트레칭') || typeStr.includes('유연성') || typeStr.includes('좌전굴')) {
      wTime = 30;
      rTime = 10;
      sets = 4;
      autoReps = 5;
      autoCategory = '유연성';
    } else if (typeStr.includes('점프') || typeStr.includes('제자리') || typeStr.includes('순발력') || typeStr.includes('버피')) {
      wTime = 20;
      rTime = 15;
      sets = 4;
      autoReps = 10;
      autoCategory = '순발력';
    }

    setWorkTime(wTime);
    setRestTime(rTime);
    setTotalSets(sets);
    setTimeLeft(prepTime);
    setCurrentSet(1);
    setReps(0);
    setTargetReps(autoReps);
    setExerciseName(autoName);
    setCategory(autoCategory);
    setMemo(`FITT 처방 실습: ${fp.goalStatement || autoName}`);

    const newSets: PlannedSetItem[] = Array.from({ length: sets }, (_, i) => ({
      setNumber: i + 1,
      exerciseName: autoName,
      category: autoCategory,
      targetReps: autoReps
    }));
    setPlannedSets(newSets);
  };

  // FITT 탭에서 인터벌 연동 요청 시 자동 세팅
  useEffect(() => {
    if (appliedLessonPlan) {
      applyFullLessonPlan(appliedLessonPlan);
    }
  }, [appliedLessonPlan]);

  // 현재 진행 세트에 따른 본운동 슬롯 및 다음 본운동 추출 (plannedSets 기반)
  const currentPlannedSet: PlannedSetItem =
    plannedSets && plannedSets.length >= currentSet
      ? plannedSets[currentSet - 1]
      : { setNumber: currentSet, exerciseName, category, targetReps };

  const nextPlannedSet: PlannedSetItem | null =
    plannedSets && currentSet < totalSets && plannedSets.length > currentSet
      ? plannedSets[currentSet]
      : null;

  // 세트 번호 변경 시 현재 세트의 본운동명 및 세트별 목표 횟수 실시간 동기화
  useEffect(() => {
    if (plannedSets && plannedSets.length >= currentSet) {
      const item = plannedSets[currentSet - 1];
      if (item) {
        setExerciseName(item.exerciseName);
        setCategory(item.category);
        if (item.targetReps) {
          setTargetReps(item.targetReps);
        }
        setMemo(`${item.exerciseName} [${currentSet}/${totalSets}세트]`);
      }
    }
  }, [currentSet, plannedSets, totalSets]);

  // Rep Counter Handlers
  const handleAddReps = (delta: number) => {
    setReps((prev) => Math.max(0, prev + delta));
  };

  const handleResetReps = () => {
    setReps(0);
  };

  // Quick Preset Handlers
  const applyPreset = (
    pWork: number,
    pRest: number,
    pSets: number,
    pName: string,
    pCat: string,
    pTargetReps: number = 15
  ) => {
    setIsRunning(false);
    setCurrentPhase('idle');
    setActiveLessonPlan(null); // 일반 프리셋으로 전환
    setWorkTime(pWork);
    setRestTime(pRest);
    setTotalSets(pSets);
    setTimeLeft(prepTime);
    setCurrentSet(1);
    setReps(0);
    setExerciseName(pName);
    setCategory(pCat);
    setTargetReps(pTargetReps);
    setMemo(`${pName} (${pSets}세트 맞춤 실습)`);

    const newSets: PlannedSetItem[] = Array.from({ length: pSets }, (_, i) => ({
      setNumber: i + 1,
      exerciseName: pName,
      category: pCat,
      targetReps: pTargetReps
    }));
    setPlannedSets(newSets);
  };

  // 세트 수 변경 시 plannedSets 배열 크기 동기화
  const handleTotalSetsChange = (newTotal: number) => {
    const clamped = Math.max(1, Math.min(30, newTotal));
    setTotalSets(clamped);
    setPlannedSets((prev) => {
      if (prev.length === clamped) return prev;
      if (prev.length < clamped) {
        const last = prev[prev.length - 1] || {
          exerciseName,
          category,
          targetReps
        };
        const added: PlannedSetItem[] = Array.from(
          { length: clamped - prev.length },
          (_, i) => ({
            setNumber: prev.length + i + 1,
            exerciseName: last.exerciseName,
            category: last.category,
            targetReps: last.targetReps || targetReps
          })
        );
        return [...prev, ...added];
      }
      return prev.slice(0, clamped);
    });
  };

  // 세트 추가
  const handleAddSet = () => {
    const nextNum = totalSets + 1;
    if (nextNum > 30) return;
    const last = plannedSets[plannedSets.length - 1] || {
      exerciseName,
      category,
      targetReps
    };
    setTotalSets(nextNum);
    setPlannedSets((prev) => [
      ...prev,
      {
        setNumber: nextNum,
        exerciseName: last.exerciseName,
        category: last.category,
        targetReps: last.targetReps || targetReps
      }
    ]);
  };

  // 특정 세트 삭제
  const handleRemoveSet = (index: number) => {
    if (totalSets <= 1) return;
    const newTotal = totalSets - 1;
    setTotalSets(newTotal);
    setPlannedSets((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((s, i) => ({ ...s, setNumber: i + 1 }));
    });
    if (currentSet > newTotal) {
      setCurrentSet(newTotal);
    }
  };

  // 특정 세트 내용 수정 (실습종목명, 체력분류, 목표횟수)
  const handleUpdatePlannedSet = (
    index: number,
    field: keyof PlannedSetItem,
    value: string | number
  ) => {
    setPlannedSets((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = {
        ...next[index],
        [field]: value
      };
      if (index === currentSet - 1) {
        if (field === 'exerciseName') setExerciseName(String(value));
        if (field === 'category') setCategory(String(value));
        if (field === 'targetReps') setTargetReps(Number(value));
      }
      return next;
    });
  };

  // 1세트의 실습종목명, 체력분류, 목표횟수를 전체 세트에 일괄 복사 적용
  const handleApplySet1ToAll = () => {
    if (plannedSets.length === 0) return;
    const set1 = plannedSets[0];
    const updated = plannedSets.map((s) => ({
      ...s,
      exerciseName: set1.exerciseName,
      category: set1.category,
      targetReps: set1.targetReps
    }));
    setPlannedSets(updated);
    setExerciseName(set1.exerciseName);
    setCategory(set1.category);
    if (set1.targetReps) setTargetReps(set1.targetReps);
  };

  // Interval Engine: Ref-based state machine ensuring 1, 2, 3, 4 SET sequential progression
  const timerStateRef = useRef({
    currentPhase,
    currentSet,
    totalSets,
    workTime,
    restTime,
    prepTime,
    soundEnabled,
    timeLeft
  });

  // Keep ref synchronized with state
  useEffect(() => {
    timerStateRef.current = {
      currentPhase,
      currentSet,
      totalSets,
      workTime,
      restTime,
      prepTime,
      soundEnabled,
      timeLeft
    };
  }, [currentPhase, currentSet, totalSets, workTime, restTime, prepTime, soundEnabled, timeLeft]);

  // Interval Running Loop
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      const state = timerStateRef.current;
      const currentRemaining = state.timeLeft;

      if (currentRemaining <= 4 && currentRemaining > 1 && state.soundEnabled) {
        playCountdownTick();
      }

      if (currentRemaining <= 1) {
        if (state.currentPhase === 'prep') {
          if (state.soundEnabled) playWorkStartBeep();
          setCurrentPhase('work');
          setTimeLeft(state.workTime);
          timerStateRef.current.currentPhase = 'work';
          timerStateRef.current.timeLeft = state.workTime;
        } else if (state.currentPhase === 'work') {
          if (state.currentSet >= state.totalSets) {
            setIsRunning(false);
            setCurrentPhase('finished');
            setTimeLeft(0);
            timerStateRef.current.currentPhase = 'finished';
            timerStateRef.current.timeLeft = 0;
            if (state.soundEnabled) playCompletionFanfare();
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
            setShowLogModal(true);
          } else {
            if (state.soundEnabled) playRestStartBeep();
            setCurrentPhase('rest');
            setTimeLeft(state.restTime);
            timerStateRef.current.currentPhase = 'rest';
            timerStateRef.current.timeLeft = state.restTime;
          }
        } else if (state.currentPhase === 'rest') {
          if (state.soundEnabled) playWorkStartBeep();
          const nextSetNumber = state.currentSet + 1; // Explicit sequential progression: 1 -> 2 -> 3 -> 4...
          setCurrentSet(nextSetNumber);
          setCurrentPhase('work');
          setTimeLeft(state.workTime);
          timerStateRef.current.currentSet = nextSetNumber;
          timerStateRef.current.currentPhase = 'work';
          timerStateRef.current.timeLeft = state.workTime;
        }
      } else {
        const nextTime = currentRemaining - 1;
        setTimeLeft(nextTime);
        timerStateRef.current.timeLeft = nextTime;
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Stopwatch Engine
  useEffect(() => {
    if (!isStopwatchRunning) {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
      return;
    }

    stopwatchRef.current = window.setInterval(() => {
      setStopwatchSeconds((s) => s + 1);
    }, 1000);

    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [isStopwatchRunning]);

  const handleStartInterval = () => {
    if (currentPhase === 'idle' || currentPhase === 'finished') {
      setCurrentPhase('prep');
      setTimeLeft(prepTime);
      setCurrentSet(1);
    }
    setIsRunning(true);
  };

  const handlePauseInterval = () => {
    setIsRunning(false);
  };

  const handleResetInterval = () => {
    setIsRunning(false);
    setCurrentPhase('idle');
    setTimeLeft(prepTime);
    setCurrentSet(1);
  };

  // Stopwatch Handlers
  const handleToggleStopwatch = () => {
    setIsStopwatchRunning(!isStopwatchRunning);
  };

  const handleResetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchSeconds(0);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Phase Display Info
  const getPhaseInfo = () => {
    switch (currentPhase) {
      case 'prep':
        return { text: '준비 (PREP)', color: 'text-amber-300', bg: 'bg-amber-950/60 border-amber-500/40' };
      case 'work':
        return { text: '운동 (WORK)', color: 'text-rose-300', bg: 'bg-rose-950/60 border-rose-500/40 animate-pulse' };
      case 'rest':
        return { text: '휴식 (REST)', color: 'text-emerald-300', bg: 'bg-emerald-950/60 border-emerald-500/40' };
      case 'finished':
        return { text: '실습 완료 (COMPLETE)', color: 'text-[#E8FD3B]', bg: 'bg-[#E8FD3B]/10 border-[#E8FD3B]/40' };
      default:
        return { text: '대기 중 (READY)', color: 'text-slate-400', bg: 'bg-[#142245] border-[#1e2f5b]' };
    }
  };

  const phaseInfo = getPhaseInfo();

  // Save Workout Log
  const handleSaveWorkout = async () => {
    if (!student) {
      onOpenAuth();
      return;
    }

    setIsSaving(true);
    const calculatedMinutes =
      timerMode === 'interval'
        ? Math.max(1, Math.round(((workTime + restTime) * totalSets) / 60))
        : Math.max(1, Math.round(stopwatchSeconds / 60));

    const newLog: WorkoutLog = {
      id: `log_${student.id}_${Date.now()}`,
      studentId: student.id,
      date: new Date().toISOString().split('T')[0],
      exerciseName,
      category,
      sets: timerMode === 'interval' ? totalSets : 1,
      reps: reps > 0 ? reps : undefined,
      durationMinutes: calculatedMinutes,
      rpe,
      memo: reps > 0 ? `${memo} [총 반복 ${reps}회 완수]` : memo
    };

    try {
      await saveWorkoutLog(newLog);
      onWorkoutLogged(newLog);

      // Sheet sync fallback
      await syncToGoogleSheet({
        action: 'workout_log',
        student,
        data: {
          exerciseName: newLog.exerciseName,
          category: newLog.category,
          sets: newLog.sets,
          reps: newLog.reps || 0,
          durationMinutes: newLog.durationMinutes,
          rpe: newLog.rpe,
          memo: newLog.memo
        }
      });

      setShowLogModal(false);
    } catch {
      alert('운동 기록 저장 중 문제가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white">
      {/* 1. Top Banner */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
              Web Audio 사운드 큐 & 스마트 반복 카운터
            </span>
            <span className="text-xs text-sky-300 font-bold bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-800/60">
              신안해양과학고 1학년
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            스마트 체육 실습 타이머 & 운동 일지
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            타바타, 5차시 맞춤 인터벌 및 스톱워치를 통해 체력 실습을 정밀 측정하고, 반복 횟수(Reps)와 시간을 일지에 바로 기록합니다.
          </p>
        </div>

        {/* Mode Toggle & Audio Button */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex bg-[#070e1e] p-1.5 rounded-2xl border border-[#1e2f5b]">
            <button
              onClick={() => {
                setTimerMode('interval');
                setIsRunning(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                timerMode === 'interval'
                  ? 'bg-[#E8FD3B] text-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              인터벌 모드
            </button>
            <button
              onClick={() => {
                setTimerMode('stopwatch');
                setIsStopwatchRunning(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                timerMode === 'stopwatch'
                  ? 'bg-sky-400 text-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              스톱워치 모드
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-[#142245] border-[#E8FD3B]/40 text-[#E8FD3B]'
                : 'bg-[#070e1e] border-[#1e2f5b] text-slate-500'
            }`}
            title={soundEnabled ? '효과음 켜짐' : '효과음 음소거'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Timer Display Card */}
      {timerMode === 'interval' ? (
        <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 sm:p-8 shadow-xl flex flex-col items-center justify-center space-y-5 text-center">
          {/* Active Workout Plan Banner or Set Info */}
          {activeLessonPlan ? (
            <div className="w-full max-w-5xl bg-[#142245] border border-[#E8FD3B]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-[#E8FD3B] text-black font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                  {activeLessonPlan.lessonWeek}차
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{activeLessonPlan.title}</span>
                    <span className="text-[10px] text-sky-300 font-bold bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-800">
                      {activeLessonPlan.targetFactor || 'PAPS 맞춤처방'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 mt-0.5">
                    현재 <span className="font-extrabold text-[#E8FD3B] font-mono">[{currentSet}/{totalSets}세트]</span> 실습:{' '}
                    <span className="font-extrabold text-white underline decoration-[#E8FD3B] underline-offset-4">
                      {currentPlannedSet.exerciseName}
                    </span>
                    <span className="text-[11px] text-sky-300 font-bold ml-1.5 bg-[#0d172e] px-2 py-0.5 rounded-md border border-[#1e2f5b]">
                      {currentPlannedSet.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#070e1e] border border-[#1e2f5b] text-slate-300">
                <Dumbbell className="w-3.5 h-3.5 text-[#E8FD3B]" />
                <span className="text-slate-400">현재 실습:</span>
                <span className="font-extrabold text-[#E8FD3B]">
                  [{currentSet}/{totalSets}세트] {currentPlannedSet.exerciseName}
                </span>
                <span className="text-[10px] text-sky-300 font-bold bg-[#142245] px-2 py-0.5 rounded-full border border-sky-500/20">
                  {currentPlannedSet.category}
                </span>
              </div>
            </div>
          )}

          {/* Phase Pill */}
          <div
            className={`px-5 py-2 rounded-full border text-sm font-black tracking-wider transition ${phaseInfo.bg} ${phaseInfo.color}`}
          >
            {phaseInfo.text}
          </div>

          {/* Time Countdown & Repetition Tracker Display (Equal Size) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl items-stretch">
            {/* Left Card: Big Digital Countdown */}
            <div className="bg-[#070e1e] border border-[#1e2f5b] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl min-h-[300px]">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142245] border border-sky-500/20 text-xs font-bold text-sky-300">
                <Timer className="w-3.5 h-3.5" />
                <span>인터벌 남은 시간</span>
              </div>

              <div className="text-7xl sm:text-8xl lg:text-9xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] my-3">
                {formatTime(timeLeft)}
              </div>

              <div className="w-full flex flex-col items-center gap-2">
                <div className="text-xs sm:text-sm font-bold text-slate-400">
                  진행 세트:{' '}
                  <span className="text-[#E8FD3B] text-base font-black font-mono">
                    {currentSet}
                  </span>{' '}
                  / {totalSets} SETS
                </div>
                <div className="w-full max-w-xs h-2.5 bg-[#0d172e] rounded-full overflow-hidden border border-[#1e2f5b]">
                  <div
                    className="h-full bg-[#E8FD3B] transition-all duration-300"
                    style={{ width: `${(currentSet / totalSets) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right Card: Repetition (반복 횟수) Tracker Card - EQUAL SIZE TO TIMER */}
            <div className="bg-[#070e1e] border border-[#1e2f5b] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl min-h-[300px]">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142245] border border-[#E8FD3B]/30 text-xs font-bold text-[#E8FD3B]">
                <Activity className="w-3.5 h-3.5 text-[#E8FD3B]" />
                <span>실습 반복 횟수 (Reps)</span>
              </div>

              <div className="text-7xl sm:text-8xl lg:text-9xl font-mono font-black text-[#E8FD3B] tracking-tighter drop-shadow-[0_0_25px_rgba(232,253,59,0.25)] my-3 flex items-baseline justify-center">
                {reps}
                <span className="text-2xl sm:text-3xl lg:text-4xl text-slate-400 ml-2 font-bold font-sans">회</span>
              </div>

              <div className="w-full flex flex-col items-center gap-2.5">
                <div className="text-xs sm:text-sm font-semibold text-slate-400">
                  세트당 목표: <span className="text-white font-bold">{targetReps}회</span> ({Math.min(100, Math.round((reps / Math.max(1, targetReps)) * 100))}% 달성)
                </div>

                <div className="w-full max-w-xs h-2.5 bg-[#0d172e] rounded-full overflow-hidden border border-[#1e2f5b]">
                  <div
                    className="h-full bg-[#E8FD3B] transition-all duration-300"
                    style={{ width: `${Math.min(100, (reps / Math.max(1, targetReps)) * 100)}%` }}
                  />
                </div>

                {/* Rep Action Buttons */}
                <div className="grid grid-cols-4 gap-2 w-full max-w-xs pt-1">
                  <button
                    onClick={() => handleAddReps(1)}
                    className="py-2.5 px-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-sm transition shadow-xs active:scale-95 flex items-center justify-center cursor-pointer"
                    title="1회 추가"
                  >
                    +1회
                  </button>
                  <button
                    onClick={() => handleAddReps(5)}
                    className="py-2.5 px-2 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-[#E8FD3B] font-black text-sm transition border border-[#1e2f5b] active:scale-95 cursor-pointer"
                    title="5회 추가"
                  >
                    +5회
                  </button>
                  <button
                    onClick={() => handleAddReps(10)}
                    className="py-2.5 px-2 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-[#E8FD3B] font-black text-sm transition border border-[#1e2f5b] active:scale-95 cursor-pointer"
                    title="10회 추가"
                  >
                    +10회
                  </button>
                  <button
                    onClick={() => handleAddReps(-1)}
                    className="py-2.5 px-2 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-slate-400 hover:text-white font-bold text-sm transition border border-[#1e2f5b] active:scale-95 cursor-pointer"
                    title="1회 차감"
                  >
                    -1회
                  </button>
                </div>

                <button
                  onClick={handleResetReps}
                  className="text-xs text-slate-500 hover:text-slate-300 hover:underline font-medium cursor-pointer"
                >
                  횟수 초기화 (0회)
                </button>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-4 pt-2">
            {!isRunning ? (
              <button
                onClick={handleStartInterval}
                className="px-8 py-3.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-base flex items-center gap-2 transition shadow-[0_0_20px_rgba(232,253,59,0.3)] active:scale-95 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                {currentPhase === 'idle' ? '실습 시작' : '계속 진행'}
              </button>
            ) : (
              <button
                onClick={handlePauseInterval}
                className="px-8 py-3.5 rounded-2xl bg-amber-400 text-black font-black text-base flex items-center gap-2 hover:bg-amber-300 transition shadow-lg active:scale-95 cursor-pointer"
              >
                <Pause className="w-5 h-5 fill-current" />
                일시 정지
              </button>
            )}

            <button
              onClick={handleResetInterval}
              className="p-3.5 rounded-2xl bg-[#142245] hover:bg-[#1a2b56] text-slate-300 border border-[#1e2f5b] transition active:scale-95 cursor-pointer"
              title="초기화"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowLogModal(true)}
              className="px-5 py-3.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-[#E8FD3B] border border-[#E8FD3B]/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              일지 바로 작성
            </button>
          </div>
        </div>
      ) : (
        /* Stopwatch Mode Card */
        <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-8 shadow-xl flex flex-col items-center justify-center space-y-6 text-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#070e1e] border border-[#1e2f5b] text-xs text-slate-300">
            <Flame className="w-3.5 h-3.5 text-sky-400" />
            <span>실습 측정:</span>
            <span className="font-bold text-white">{exerciseName}</span>
          </div>

          {/* Stopwatch & Repetition Dual Display (Equal Size) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl items-stretch">
            {/* Left Card: Stopwatch Timer */}
            <div className="bg-[#070e1e] border border-[#1e2f5b] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl min-h-[300px]">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142245] border border-sky-500/20 text-xs font-bold text-sky-300">
                <Timer className="w-3.5 h-3.5" />
                <span>측정 경과 시간</span>
              </div>

              <div className="text-7xl sm:text-8xl lg:text-9xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] my-auto py-3">
                {formatTime(stopwatchSeconds)}
              </div>

              <div className="text-xs text-slate-400 font-medium">
                자유 실습 시간 실시간 측정
              </div>
            </div>

            {/* Right Card: Repetition Tracker (Equal Size) */}
            <div className="bg-[#070e1e] border border-[#1e2f5b] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl min-h-[300px]">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142245] border border-[#E8FD3B]/30 text-xs font-bold text-[#E8FD3B]">
                <Activity className="w-3.5 h-3.5 text-[#E8FD3B]" />
                <span>실습 반복 횟수 (Reps)</span>
              </div>

              <div className="text-7xl sm:text-8xl lg:text-9xl font-mono font-black text-[#E8FD3B] tracking-tighter drop-shadow-[0_0_25px_rgba(232,253,59,0.25)] my-3 flex items-baseline justify-center">
                {reps}
                <span className="text-2xl sm:text-3xl lg:text-4xl text-slate-400 ml-2 font-bold font-sans">회</span>
              </div>

              <div className="w-full flex flex-col items-center gap-2.5">
                {/* Rep Action Buttons */}
                <div className="grid grid-cols-4 gap-2 w-full max-w-xs pt-1">
                  <button
                    onClick={() => handleAddReps(1)}
                    className="py-2.5 px-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-sm transition shadow-xs active:scale-95 flex items-center justify-center cursor-pointer"
                    title="1회 추가"
                  >
                    +1회
                  </button>
                  <button
                    onClick={() => handleAddReps(5)}
                    className="py-2.5 px-2 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-[#E8FD3B] font-black text-sm transition border border-[#1e2f5b] active:scale-95 cursor-pointer"
                    title="5회 추가"
                  >
                    +5회
                  </button>
                  <button
                    onClick={() => handleAddReps(10)}
                    className="py-2.5 px-2 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-[#E8FD3B] font-black text-sm transition border border-[#1e2f5b] active:scale-95 cursor-pointer"
                    title="10회 추가"
                  >
                    +10회
                  </button>
                  <button
                    onClick={() => handleAddReps(-1)}
                    className="py-2.5 px-2 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-slate-400 hover:text-white font-bold text-sm transition border border-[#1e2f5b] active:scale-95 cursor-pointer"
                    title="1회 차감"
                  >
                    -1회
                  </button>
                </div>

                <button
                  onClick={handleResetReps}
                  className="text-xs text-slate-500 hover:text-slate-300 hover:underline font-medium cursor-pointer"
                >
                  횟수 초기화 (0회)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleStopwatch}
              className={`px-8 py-3.5 rounded-2xl font-black text-base flex items-center gap-2 transition active:scale-95 cursor-pointer ${
                isStopwatchRunning
                  ? 'bg-amber-400 text-black shadow-lg hover:bg-amber-300'
                  : 'bg-sky-400 text-black shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:bg-sky-300'
              }`}
            >
              {isStopwatchRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  스톱
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  시작
                </>
              )}
            </button>

            <button
              onClick={handleResetStopwatch}
              className="p-3.5 rounded-2xl bg-[#142245] hover:bg-[#1a2b56] text-slate-300 border border-[#1e2f5b] transition active:scale-95 cursor-pointer"
              title="리셋"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowLogModal(true)}
              className="px-5 py-3.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-[#E8FD3B] border border-[#E8FD3B]/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              일지에 저장
            </button>
          </div>
        </div>
      )}

      {/* 3. Preset & Interval Configuration Section */}
      {timerMode === 'interval' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 5 cols: Interval Presets */}
          <div className="lg:col-span-5 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2f5b] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8FD3B]" />
                체육수업 추천 인터벌 프리셋
              </h3>

              {/* Preset Subtabs */}
              <div className="flex bg-[#070e1e] p-1 rounded-xl border border-[#1e2f5b]">
                <button
                  type="button"
                  onClick={() => setPresetTab('standards')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    presetTab === 'standards'
                      ? 'bg-[#E8FD3B] text-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  기본 체육 인터벌
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTab('lessons')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    presetTab === 'lessons'
                      ? 'bg-[#E8FD3B] text-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  5차시 처방 연동
                </button>
              </div>
            </div>

            {presetTab === 'lessons' ? (
              <div className="space-y-3">
                {/* 1. Student's FITT Custom Prescription Plan Card */}
                {effectiveFittPlan && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#142245] to-[#0d172e] border border-[#E8FD3B]/40 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-[#E8FD3B] text-black font-black text-[11px]">
                          FITT 처방
                        </span>
                        <span className="font-extrabold text-white text-xs">
                          {student?.name || '학생'}의 FITT 맞춤 처방 계획
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyFittPrescription(effectiveFittPlan)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black transition shadow-xs cursor-pointer active:scale-95"
                      >
                        처방 자동 세팅
                      </button>
                    </div>

                    <div className="text-xs text-slate-200">
                      <span className="font-semibold text-slate-400">목표: </span>
                      {effectiveFittPlan.goalStatement || 'PAPS 맞춤 체력 향상'}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px]">
                      <div className="bg-[#070e1e] p-2 rounded-xl border border-[#1e2f5b]">
                        <span className="text-slate-500 block text-[10px]">빈도 (F)</span>
                        <span className="text-white font-bold">{effectiveFittPlan.frequency}</span>
                      </div>
                      <div className="bg-[#070e1e] p-2 rounded-xl border border-[#1e2f5b]">
                        <span className="text-slate-500 block text-[10px]">강도 (I)</span>
                        <span className="text-[#E8FD3B] font-bold">{effectiveFittPlan.intensity}</span>
                      </div>
                      <div className="bg-[#070e1e] p-2 rounded-xl border border-[#1e2f5b]">
                        <span className="text-slate-500 block text-[10px]">시간 (T)</span>
                        <span className="text-sky-300 font-bold">{effectiveFittPlan.time}</span>
                      </div>
                      <div className="bg-[#070e1e] p-2 rounded-xl border border-[#1e2f5b]">
                        <span className="text-slate-500 block text-[10px]">형태 (T)</span>
                        <span className="text-emerald-300 font-bold truncate block">{effectiveFittPlan.type}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 5-Lesson Plans with 8 Main Exercises */}
                {effectiveLessonPlans.map((lp) => {
                  const isCurrentActive = activeLessonPlan?.lessonWeek === lp.lessonWeek;
                  const wTime = lp.workTimeSeconds || 40;
                  const rTime = lp.restTimeSeconds || 20;
                  const setCnt = lp.mainExercises?.length || lp.setsCount || 8;
                  const firstRepMatch = lp.mainExercises?.[0]?.durationOrReps?.match(/(\d+)/);
                  const parsedRep = firstRepMatch ? parseInt(firstRepMatch[1], 10) : 15;

                  return (
                    <div
                      key={lp.lessonWeek}
                      className={`p-4 rounded-2xl transition space-y-2.5 border ${
                        isCurrentActive
                          ? 'bg-[#142245] border-[#E8FD3B] shadow-[0_0_15px_rgba(232,253,59,0.15)]'
                          : 'bg-[#070e1e] hover:bg-[#142245]/50 border-[#1e2f5b] hover:border-[#E8FD3B]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#E8FD3B] text-black font-black text-xs flex items-center justify-center">
                            {lp.lessonWeek}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {lp.title}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[10px] bg-[#E8FD3B]/20 text-[#E8FD3B] font-extrabold px-2 py-0.5 rounded-md border border-[#E8FD3B]/40">
                              선택됨
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => applyFullLessonPlan(lp)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                            isCurrentActive
                              ? 'bg-white text-black hover:bg-slate-200'
                              : 'bg-[#E8FD3B] hover:bg-[#d5eb28] text-black'
                          }`}
                          title="차시별 추천 8개 본운동 전체를 계획된 세트 목록으로 옮겨 타이머에 적용합니다"
                        >
                          <span>전체 운동 세트 목록으로 옮기기</span>
                        </button>
                      </div>

                      {/* 8 Main Exercises Sequence Preview (Clickable for single-exercise plan) */}
                      {lp.mainExercises && lp.mainExercises.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block">
                            실습 순환 본운동 계획 <span className="text-[#E8FD3B] font-normal">(클릭 시 해당 종목 세트 집중 실습)</span>:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {lp.mainExercises.map((ex, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  applySingleExercisePlan(
                                    ex.name,
                                    ex.category || lp.targetFactor || '근력 및 근지구력',
                                    ex.durationOrReps,
                                    wTime,
                                    rTime,
                                    lp.title
                                  )
                                }
                                className={`text-[10px] px-2.5 py-1 rounded-lg border flex items-center gap-1 transition cursor-pointer active:scale-95 text-left ${
                                  isCurrentActive && currentSet === idx + 1
                                    ? 'bg-[#E8FD3B] text-black font-black border-[#E8FD3B]'
                                    : 'bg-[#0d172e] hover:bg-[#142245] text-slate-200 hover:text-white border-[#1e2f5b] hover:border-[#E8FD3B]/40'
                                }`}
                                title={`${ex.name} 계획 세트(예: 3~4세트)로 타이머 세팅`}
                              >
                                <span className="opacity-60 font-mono">{idx + 1}.</span>
                                <span className="font-bold">{ex.name}</span>
                                {ex.durationOrReps && (
                                  <span className="text-[9px] opacity-80">({ex.durationOrReps})</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#1e2f5b]">
                        <span className="inline-flex items-center gap-1 font-bold text-sky-300">
                          🎯 {lp.targetFactor || lp.focusArea || '종합체력'}
                        </span>
                        <span>
                          운동 <strong className="text-white font-mono">{wTime}초</strong> / 휴식{' '}
                          <strong className="text-white font-mono">{rTime}초</strong> ·{' '}
                          <strong className="text-[#E8FD3B] font-mono">{setCnt}세트</strong> (권장 {parsedRep}회)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Sub-view 2: Standard PE Interval Presets */
              <div className="space-y-2.5">
                {/* 1. 정자세 맨몸 스쿼트 (사용자 요청 핵심 프리셋) */}
                <button
                  onClick={() =>
                    applyPreset(40, 20, 4, '정자세 맨몸 스쿼트', '근력 및 근지구력', 15)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-[#142245] to-[#070e1e] hover:from-[#1c2e5a] border border-[#E8FD3B]/50 hover:border-[#E8FD3B] transition text-xs flex justify-between items-center group cursor-pointer shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#E8FD3B] text-black text-[10px] font-black">추천</span>
                      <span className="font-black text-white text-sm group-hover:text-[#E8FD3B]">
                        정자세 맨몸 스쿼트 (15~20회 × 4세트)
                      </span>
                    </div>
                    <span className="text-slate-300 text-[11px]">
                      40초 운동 / 20초 휴식 · <strong className="text-[#E8FD3B]">4세트 집중 실습</strong> (근력 및 근지구력)
                    </span>
                  </div>
                  <span className="text-black font-black bg-[#E8FD3B] hover:bg-[#d5eb28] px-3 py-1.5 rounded-xl shrink-0 shadow-xs">
                    적용
                  </span>
                </button>

                {/* 2. 정석 푸시업 */}
                <button
                  onClick={() =>
                    applyPreset(40, 20, 4, '정석 푸시업 (팔굽혀펴기)', '근력 및 근지구력', 15)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-[#E8FD3B]/40 transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-[#E8FD3B]">
                      정석 푸시업 (12~20회 × 4세트)
                    </span>
                    <span className="text-slate-400 text-[11px]">40초 운동 / 20초 휴식 · 4세트 (상체 근지구력)</span>
                  </div>
                  <span className="text-[#E8FD3B] font-bold bg-[#142245] px-2.5 py-1 rounded-lg border border-[#E8FD3B]/30">
                    적용
                  </span>
                </button>

                {/* 3. 타바타 정석 서킷 */}
                <button
                  onClick={() =>
                    applyPreset(20, 10, 8, '타바타(Tabata) 전신 서킷', '심폐지구력', 15)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-[#E8FD3B]/40 transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-[#E8FD3B]">
                      타바타 정석 (20초 운동 / 10초 휴식)
                    </span>
                    <span className="text-slate-400 text-[11px]">8세트 (총 4분 고강도 인터벌 심폐 서킷)</span>
                  </div>
                  <span className="text-slate-200 font-bold bg-[#142245] px-2.5 py-1 rounded-lg border border-[#1e2f5b]">
                    적용
                  </span>
                </button>

                {/* 4. 셔틀런 지구력 */}
                <button
                  onClick={() =>
                    applyPreset(120, 60, 4, '20m 왕복오래달리기(셔틀런)', '심폐지구력', 20)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-sky-400 transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-sky-400">
                      셔틀런 지구력 (2분 달리기 / 1분 휴식)
                    </span>
                    <span className="text-slate-400 text-[11px]">4세트 (심폐지구력 특화 셔틀런)</span>
                  </div>
                  <span className="text-sky-300 font-bold bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/60">
                    적용
                  </span>
                </button>

                {/* 5. 버피 테스트 점프 */}
                <button
                  onClick={() =>
                    applyPreset(30, 15, 3, '버피 테스트 점프', '순발력', 12)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-[#E8FD3B] transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-[#E8FD3B]">
                      버피 테스트 점프 (10~15회 × 3세트)
                    </span>
                    <span className="text-slate-400 text-[11px]">30초 운동 / 15초 휴식 · 3세트 (순발력 및 민첩성)</span>
                  </div>
                  <span className="text-[#E8FD3B] font-bold bg-[#142245] px-2.5 py-1 rounded-lg border border-[#E8FD3B]/30">
                    적용
                  </span>
                </button>

                {/* 6. 유연성 정적 스트레칭 */}
                <button
                  onClick={() =>
                    applyPreset(30, 10, 4, '유연성 정적 스트레칭', '유연성', 5)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-amber-400 transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-amber-400">
                      스트레칭 유지 (30초 정적 자세 / 10초 이완)
                    </span>
                    <span className="text-slate-400 text-[11px]">4세트 (좌전굴/이상근 관절 가동성 증진)</span>
                  </div>
                  <span className="text-amber-300 font-bold bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/60">
                    적용
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right 7 cols: Custom Setting Inputs & Full Planned Sets Sequence */}
          <div className="lg:col-span-7 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2f5b]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#E8FD3B]" />
                맞춤형 시간, 세트 및 목표 횟수 설정
              </h3>
              <span className="text-xs text-slate-400">
                총 실습 세트: <strong className="text-[#E8FD3B] font-mono">{totalSets}</strong>세트
              </span>
            </div>

            {/* Base Time & Set Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
                <label className="text-[11px] font-bold text-amber-400 block mb-1">
                  준비 (초)
                </label>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={prepTime}
                  disabled={isRunning}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPrepTime(val);
                    if (currentPhase === 'idle') setTimeLeft(val);
                  }}
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#E8FD3B]"
                />
              </div>

              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
                <label className="text-[11px] font-bold text-rose-400 block mb-1">
                  운동 (초)
                </label>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={workTime}
                  disabled={isRunning}
                  onChange={(e) => setWorkTime(Number(e.target.value))}
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#E8FD3B]"
                />
              </div>

              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
                <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                  휴식 (초)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={restTime}
                  disabled={isRunning}
                  onChange={(e) => setRestTime(Number(e.target.value))}
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#E8FD3B]"
                />
              </div>

              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
                <label className="text-[11px] font-bold text-sky-400 block mb-1">
                  세트 수
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={totalSets}
                  disabled={isRunning}
                  onChange={(e) => handleTotalSetsChange(Number(e.target.value))}
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#E8FD3B]"
                />
              </div>

              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] col-span-2 sm:col-span-1">
                <label className="text-[11px] font-bold text-[#E8FD3B] block mb-1">
                  기본 목표 횟수
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={targetReps}
                  disabled={isRunning}
                  onChange={(e) => setTargetReps(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#E8FD3B] font-mono"
                />
              </div>
            </div>

            {/* Planned Sets Full Table / Cards */}
            <div className="space-y-3 pt-3 border-t border-[#1e2f5b]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E8FD3B]" />
                    <span>계획된 전체 운동 세트 목록 (총 {totalSets}세트)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    모든 세트의 실습종목명과 체력분류를 개별 설정하거나 1세트 내용을 일괄 복사할 수 있습니다.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleApplySet1ToAll}
                    className="px-2.5 py-1.5 rounded-xl bg-[#142245] hover:bg-[#1c2e5a] text-[#E8FD3B] border border-[#E8FD3B]/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="1세트의 실습종목명, 체력분류, 목표횟수를 모든 세트에 동일하게 복사 적용합니다"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>1세트 일괄 복사</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddSet}
                    disabled={totalSets >= 30}
                    className="px-2.5 py-1.5 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-slate-200 border border-[#1e2f5b] text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#E8FD3B]" />
                    <span>세트 추가</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Set List */}
              <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
                {plannedSets.map((item, idx) => {
                  const isCurrentActive = currentSet === idx + 1;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition ${
                        isCurrentActive
                          ? 'bg-[#142245] border-[#E8FD3B] shadow-[0_0_12px_rgba(232,253,59,0.15)]'
                          : 'bg-[#070e1e] border-[#1e2f5b] hover:border-[#1e2f5b]/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                              isCurrentActive
                                ? 'bg-[#E8FD3B] text-black'
                                : 'bg-[#142245] text-slate-200 border border-[#1e2f5b]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-xs font-extrabold text-white">
                            {idx + 1}세트
                          </span>
                          {isCurrentActive && (
                            <span className="text-[10px] bg-[#E8FD3B]/20 text-[#E8FD3B] font-black px-2 py-0.5 rounded-md border border-[#E8FD3B]/40 animate-pulse">
                              진행 중
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Quick Exercise Preset Selector */}
                          <select
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const [selName, selCat, selReps] = e.target.value.split('|');
                              handleUpdatePlannedSet(idx, 'exerciseName', selName);
                              if (selCat) handleUpdatePlannedSet(idx, 'category', selCat);
                              if (selReps) handleUpdatePlannedSet(idx, 'targetReps', Number(selReps));
                            }}
                            value=""
                            className="bg-[#0d172e] border border-[#1e2f5b] hover:border-[#E8FD3B]/40 rounded-lg px-2 py-1 text-[11px] text-[#E8FD3B] font-bold cursor-pointer focus:outline-none"
                          >
                            <option value="">종목 빠른 선택 ▼</option>
                            <option value="정자세 맨몸 스쿼트|근력 및 근지구력|15">정자세 스쿼트 (하체)</option>
                            <option value="정석 푸시업 (팔굽혀펴기)|근력 및 근지구력|15">정석 푸시업 (상체)</option>
                            <option value="20m 왕복오래달리기(셔틀런)|심폐지구력|20">20m 셔틀런 (심폐)</option>
                            <option value="버피 테스트 점프|순발력|12">버피 점프 (순발력)</option>
                            <option value="정석 코어 플랭크|근력 및 근지구력|40">코어 플랭크 (코어)</option>
                            <option value="워킹 런지 (하체 교차)|근력 및 근지구력|16">워킹 런지 (하체)</option>
                            <option value="좌전굴 유연성 스트레칭|유연성|5">좌전굴 스트레칭 (유연성)</option>
                            <option value="제자리 무릎당겨 점프|순발력|15">무릎당겨 점프 (순발력)</option>
                            <option value="마운틴 클라이머|심폐지구력|20">마운틴 클라이머 (전신)</option>
                          </select>

                          {totalSets > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(idx)}
                              className="w-6 h-6 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition cursor-pointer"
                              title="이 세트 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">실습 종목명</label>
                          <input
                            type="text"
                            value={item.exerciseName}
                            onChange={(e) => handleUpdatePlannedSet(idx, 'exerciseName', e.target.value)}
                            placeholder="예: 정자세 맨몸 스쿼트"
                            className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-medium"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">체력분류 카테고리</label>
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdatePlannedSet(idx, 'category', e.target.value)}
                            className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                          >
                            <option value="근력 및 근지구력">근력 및 근지구력</option>
                            <option value="심폐지구력">심폐지구력</option>
                            <option value="순발력">순발력</option>
                            <option value="유연성">유연성</option>
                            <option value="종합서킷">종합서킷</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">목표 횟수/시간</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={item.targetReps || targetReps}
                              onChange={(e) => handleUpdatePlannedSet(idx, 'targetReps', Math.max(1, Number(e.target.value)))}
                              className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-400 shrink-0">회</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Log Modal: Save Workout Record */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d172e] border border-[#1e2f5b] rounded-3xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2f5b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#142245] text-[#E8FD3B] border border-[#E8FD3B]/30 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">오늘의 운동 실습 일지 저장</h3>
                  <p className="text-xs text-slate-400">나의 누적 기록실 및 교사용 시트에 등록됩니다.</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#142245] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">실습 종목</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              {/* Repetition Count in Log */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">실습 반복 횟수 (총 Reps)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={reps}
                    onChange={(e) => setReps(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0">회 완료</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-bold">
                    자각적 운동 강도 (RPE 척도: 1~10)
                  </label>
                  <span className="text-[#E8FD3B] font-bold font-mono">RPE {rpe} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="w-full accent-[#E8FD3B]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1 (매우 가벼움)</span>
                  <span>5 (보통)</span>
                  <span>7 (약간 힘듦)</span>
                  <span>10 (한계)</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">실습 메모 및 소감</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="예: 호흡 리듬을 유지하며 전 세트를 완료함"
                  className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f5b]">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2.5 rounded-2xl bg-[#142245] text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                닫기
              </button>
              <button
                onClick={handleSaveWorkout}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(232,253,59,0.3)] disabled:opacity-50 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                {isSaving ? '저장 중...' : '기록실에 저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
