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
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentProfile, WorkoutLog, LessonPlan } from '../types';
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
  getStudentLessonPlans
} from '../services/storageService';

interface TimerTabProps {
  student: StudentProfile | null;
  lessonPlans?: LessonPlan[];
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
  lessonPlans = [],
  initialExerciseName = '20m 셔틀런 인터벌 트레이닝',
  initialCategory = '심폐지구력',
  onWorkoutLogged,
  onOpenAuth,
  isTeacher = false,
  onDeleteWorkoutLog
}) => {
  const [timerMode, setTimerMode] = useState<TimerMode>('interval');

  // Interval Settings
  const [prepTime, setPrepTime] = useState<number>(5); // 5s
  const [workTime, setWorkTime] = useState<number>(30); // 30s
  const [restTime, setRestTime] = useState<number>(15); // 15s
  const [totalSets, setTotalSets] = useState<number>(5); // 5 sets
  const [targetReps, setTargetReps] = useState<number>(15); // Target reps per set
  const [reps, setReps] = useState<number>(0); // Current accumulated repetitions

  // Interval Running State
  const [currentPhase, setCurrentPhase] = useState<TimerPhase>('idle');
  const [currentSet, setCurrentSet] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(prepTime);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Stopwatch State
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);

  // Save Workout Log Modal State
  const [exerciseName, setExerciseName] = useState<string>(initialExerciseName);
  const [category, setCategory] = useState<string>(initialCategory);
  const [rpe, setRpe] = useState<number>(7);
  const [memo, setMemo] = useState<string>('끝까지 집중하여 완주함');
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [presetTab, setPresetTab] = useState<'lessons' | 'standards'>('lessons');

  const timerRef = useRef<number | null>(null);
  const stopwatchRef = useRef<number | null>(null);

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
    pTargetReps?: number
  ) => {
    setIsRunning(false);
    setCurrentPhase('idle');
    setWorkTime(pWork);
    setRestTime(pRest);
    setTotalSets(pSets);
    setTimeLeft(prepTime);
    setCurrentSet(1);
    setExerciseName(pName);
    setCategory(pCat);
    if (pTargetReps) {
      setTargetReps(pTargetReps);
    }
  };

  // Active 5-lesson plans (passed via props, or student stored, or default)
  const effectiveLessonPlans: LessonPlan[] =
    lessonPlans.length > 0
      ? lessonPlans
      : student
      ? getStudentLessonPlans(student.id)
      : DEFAULT_LESSON_PLANS;

  const getLessonPresetConfig = (lp: LessonPlan) => {
    const factor = lp.focusArea || lp.title || '';
    if (factor.includes('심폐')) {
      return { work: 120, rest: 60, sets: 4, reps: 20, desc: '셔틀런 심폐 인터벌' };
    }
    if (factor.includes('근력')) {
      return { work: 40, rest: 20, sets: 5, reps: 15, desc: '대근육 강화 저항 서킷' };
    }
    if (factor.includes('유연')) {
      return { work: 30, rest: 10, sets: 5, reps: 5, desc: '정적 가동성 스트레칭 유지' };
    }
    if (factor.includes('순발')) {
      return { work: 20, rest: 15, sets: 6, reps: 10, desc: '플라이오메트릭 파워 인터벌' };
    }
    return { work: 30, rest: 15, sets: 5, reps: 12, desc: 'PAPS 맞춤 복합 서킷' };
  };

  // Interval Engine
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 4 && prev > 1 && soundEnabled) {
          playCountdownTick();
        }

        if (prev <= 1) {
          if (currentPhase === 'prep') {
            if (soundEnabled) playWorkStartBeep();
            setCurrentPhase('work');
            return workTime;
          } else if (currentPhase === 'work') {
            if (currentSet >= totalSets) {
              setIsRunning(false);
              setCurrentPhase('finished');
              if (soundEnabled) playCompletionFanfare();
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
              setShowLogModal(true);
              return 0;
            } else {
              if (soundEnabled) playRestStartBeep();
              setCurrentPhase('rest');
              return restTime;
            }
          } else if (currentPhase === 'rest') {
            if (soundEnabled) playWorkStartBeep();
            setCurrentSet((s) => s + 1);
            setCurrentPhase('work');
            return workTime;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, currentPhase, currentSet, totalSets, workTime, restTime, soundEnabled]);

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
        <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-8 shadow-xl flex flex-col items-center justify-center space-y-6 text-center">
          {/* Active Exercise Target Tag */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#070e1e] border border-[#1e2f5b] text-xs text-slate-300">
            <Dumbbell className="w-3.5 h-3.5 text-[#E8FD3B]" />
            <span>실습 종목:</span>
            <span className="font-bold text-white">{exerciseName}</span>
            <span className="text-[10px] text-sky-300 font-bold bg-[#142245] px-2 py-0.5 rounded-full border border-sky-500/20">
              {category}
            </span>
          </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left 3 cols: Interval Presets */}
          <div className="lg:col-span-3 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2f5b] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8FD3B]" />
                체육수업 추천 인터벌 프리셋
              </h3>

              {/* Preset Subtabs */}
              <div className="flex bg-[#070e1e] p-1 rounded-xl border border-[#1e2f5b]">
                <button
                  type="button"
                  onClick={() => setPresetTab('lessons')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    presetTab === 'lessons'
                      ? 'bg-[#E8FD3B] text-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  5차시 맞춤 처방 연동
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTab('standards')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    presetTab === 'standards'
                      ? 'bg-[#142245] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  기본 체육 인터벌
                </button>
              </div>
            </div>

            {presetTab === 'lessons' ? (
              <div className="space-y-2.5">
                {effectiveLessonPlans.map((lp) => {
                  const cfg = getLessonPresetConfig(lp);
                  return (
                    <div
                      key={lp.lessonWeek}
                      className="p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245]/50 border border-[#1e2f5b] hover:border-[#E8FD3B]/40 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#E8FD3B] text-black font-black text-xs flex items-center justify-center">
                            {lp.lessonWeek}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {lp.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            applyPreset(
                              cfg.work,
                              cfg.rest,
                              cfg.sets,
                              `${lp.lessonWeek}차시: ${lp.title}`,
                              lp.focusArea || '종합체력',
                              cfg.reps
                            )
                          }
                          className="px-3 py-1 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-extrabold transition shadow-xs cursor-pointer"
                        >
                          프리셋 적용
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-300 line-clamp-1">
                        <span className="font-semibold text-slate-400">본운동:</span> {lp.mainRoutine}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#1e2f5b]">
                        <span className="inline-flex items-center gap-1 font-medium text-sky-300">
                          🎯 {lp.focusArea || '종합체력'}
                        </span>
                        <span>
                          운동 {cfg.work}초 / 휴식 {cfg.rest}초 · {cfg.sets}세트 (목표 {cfg.reps}회)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Sub-view 2: Standard PE Interval Presets */
              <div className="space-y-2.5">
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
                    <span className="text-slate-400 text-[11px]">8세트 (총 4분 고강도 인터벌)</span>
                  </div>
                  <span className="text-black font-bold bg-[#E8FD3B] px-2.5 py-1 rounded-lg">
                    적용
                  </span>
                </button>

                <button
                  onClick={() =>
                    applyPreset(120, 60, 4, '20m 셔틀런 심폐 인터벌', '심폐지구력', 20)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-sky-400 transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-sky-400">
                      셔틀런 지구력 (2분 달리기 / 1분 휴식)
                    </span>
                    <span className="text-slate-400 text-[11px]">4세트 (심폐지구력 특화)</span>
                  </div>
                  <span className="text-sky-300 font-bold bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/60">
                    적용
                  </span>
                </button>

                <button
                  onClick={() =>
                    applyPreset(30, 15, 6, '맨몸 근력 서킷 (푸시업·스쿼트)', '근력 및 근지구력', 15)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-[#E8FD3B] transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-[#E8FD3B]">
                      근력 서킷 (30초 운동 / 15초 휴식)
                    </span>
                    <span className="text-slate-400 text-[11px]">6세트 (대근육 강화)</span>
                  </div>
                  <span className="text-[#E8FD3B] font-bold bg-[#142245] px-2.5 py-1 rounded-lg border border-[#E8FD3B]/30">
                    적용
                  </span>
                </button>

                <button
                  onClick={() =>
                    applyPreset(30, 10, 5, '유연성 정적 스트레칭', '유연성', 5)
                  }
                  className="w-full text-left p-3.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] border border-[#1e2f5b] hover:border-amber-400 transition text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-white block group-hover:text-amber-400">
                      스트레칭 유지 (30초 정적 자세 / 10초 이완)
                    </span>
                    <span className="text-slate-400 text-[11px]">5세트 (관절 가동성 증진)</span>
                  </div>
                  <span className="text-amber-300 font-bold bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/60">
                    적용
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right 2 cols: Custom Setting Inputs */}
          <div className="lg:col-span-2 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[#E8FD3B]" />
              맞춤형 시간, 세트 및 목표 횟수 설정
            </h3>

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
                  onChange={(e) => setTotalSets(Number(e.target.value))}
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#E8FD3B]"
                />
              </div>

              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] col-span-2 sm:col-span-1">
                <label className="text-[11px] font-bold text-[#E8FD3B] block mb-1">
                  목표 횟수
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

            {/* Exercise Subject Custom Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">실습 종목명</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">체력 분류 카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="심폐지구력">심폐지구력</option>
                  <option value="근력 및 근지구력">근력 및 근지구력</option>
                  <option value="순발력">순발력</option>
                  <option value="유연성">유연성</option>
                  <option value="종합서킷">종합서킷</option>
                </select>
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
