import React, { useState, useEffect } from 'react';
import {
  StudentProfile,
  PAPSRecord,
  FITTPlan,
  LessonPlan,
  WorkoutLog
} from './types';
import {
  getCurrentStudent,
  setCurrentStudent,
  getStudentPapsRecords,
  getStudentFittPlan,
  getStudentLessonPlans,
  getStudentWorkoutLogs,
  savePapsRecord,
  saveStudentFittPlan,
  saveStudentLessonPlans,
  saveWorkoutLog,
  DEFAULT_LESSON_PLANS,
  isTeacherAuthenticated,
  setTeacherAuthenticated,
  deletePapsRecord,
  deleteWorkoutLog,
  getTeacherSettings,
  getAllStudents
} from './services/storageService';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { TeacherSyncModal } from './components/TeacherSyncModal';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { TeacherControlBar } from './components/TeacherControlBar';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { DashboardTab } from './components/DashboardTab';
import { FittTab } from './components/FittTab';
import { PapsTab } from './components/PapsTab';
import { ExerciseGuideTab } from './components/ExerciseGuideTab';
import { TimerTab } from './components/TimerTab';
import { NeisTab } from './components/NeisTab';
import { AllStudentsTab } from './components/AllStudentsTab';
import { LoginView } from './components/LoginView';
import { GasSettingsModal } from './components/GasSettingsModal';
import { Waves } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'neis' | 'all-students'
  >('dashboard');

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [papsRecords, setPapsRecords] = useState<PAPSRecord[]>([]);
  const [fittPlan, setFittPlan] = useState<FITTPlan | null>(null);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  // First Screen Login Gate (학생/교사 인증 상태)
  // 처음 접속 시 반드시 로그인 화면이 먼저 나오도록 명시적 활성 세션 확인
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const hasActiveSession = sessionStorage.getItem('shinan_session_active') === 'true';
      if (!hasActiveSession) return false;
      return Boolean(getCurrentStudent() || isTeacherAuthenticated());
    } catch {
      return false;
    }
  });

  // Modals & Teacher Auth
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [isTeacher, setIsTeacher] = useState<boolean>(() => isTeacherAuthenticated());
  const [isTeacherLoginOpen, setIsTeacherLoginOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isGasSettingsOpen, setIsGasSettingsOpen] = useState<boolean>(false);

  // FITT to Interval Timer link state
  const [appliedLessonPlan, setAppliedLessonPlan] = useState<LessonPlan | null>(null);

  // Timer cross-navigation params
  const [timerExercise, setTimerExercise] = useState<{ name: string; category: string }>({
    name: '20m 셔틀런 인터벌 트레이닝',
    category: '심폐지구력'
  });

  // Reload data for a specific student
  const refreshStudentData = (activeStudent: StudentProfile) => {
    setStudent(activeStudent);
    setPapsRecords(getStudentPapsRecords(activeStudent.id));
    setFittPlan(getStudentFittPlan(activeStudent.id));
    setLessonPlans(getStudentLessonPlans(activeStudent.id));
    setWorkoutLogs(getStudentWorkoutLogs(activeStudent.id));
  };

  // Initial Data Bootstrap: 기본 샘플 기록 시딩 (단, 학생을 임의로 자동 로그인시키지 않음)
  useEffect(() => {
    const sampleStudentId = '1-1-01';
    const existingPaps = getStudentPapsRecords(sampleStudentId);

    // 샘플 데이터가 전혀 없을 때 1-1-01용 초기 레코드만 조용히 백그라운드 시딩
    if (existingPaps.length === 0) {
      const samplePaps: PAPSRecord = {
        id: `paps_sample_${sampleStudentId}`,
        studentId: sampleStudentId,
        date: new Date().toISOString().split('T')[0],
        gender: '남',
        cardio: {
          testType: '왕복오래달리기',
          value: 68,
          unit: '회',
          grade: 2,
          score: 16
        },
        flexibility: {
          testType: '앉아윗몸앞으로굽히기',
          value: 16.5,
          unit: 'cm',
          grade: 1,
          score: 20
        },
        strength: {
          testType: '악력',
          value: 45.5,
          unit: 'kg',
          grade: 2,
          score: 16
        },
        agility: {
          testType: '제자리멀리뛰기',
          value: 235,
          unit: 'cm',
          grade: 2,
          score: 16
        },
        bodyComp: {
          height: 173,
          weight: 64,
          bmi: 21.4,
          grade: 1,
          score: 20,
          status: '표준 (정상체중)'
        },
        totalScore: 88,
        overallGrade: 1,
        neisNote:
          '신안해양과학고 1학년 체육 수업에서 왕복오래달리기 68회, 제자리멀리뛰기 235cm를 기록하며 전 영역에서 고른 기초 체력을 과시함. 과부하 및 점진성의 원리를 이해하고 주 4회 규칙적인 인터벌 트레이닝을 성실히 이행함.'
      };
      savePapsRecord(samplePaps);

      const sampleFitt: FITTPlan = {
        studentId: sampleStudentId,
        updatedAt: new Date().toISOString(),
        frequency: '주 4회 (월, 수, 금, 토 방과후)',
        intensity: 'RPE 7~8 (약간 힘들다 / 심박수 145~165bpm)',
        time: '1회당 45분 (워밍업 5분 + 본실습 35분 + 쿨다운 5분)',
        type: '왕복오래달리기 인터벌 + 맨몸 하체/코어 스쿼트 & 플랭크',
        selfAnalysis:
          '심폐지구력과 신체조성은 1~2등급 수준이나 좌전굴 유연성이 다소 뻣뻣하여 후반부 스트레칭 보강이 필요함.',
        goalStatement:
          '5주간의 실천 계획을 통해 셔틀런 77회(1등급 만점) 돌파 및 좌전굴 19cm 이상 달성.',
        principlesChecklist: {
          overload: true,
          progression: true,
          specificity: true,
          individuality: true,
          continuity: true
        }
      };
      saveStudentFittPlan(sampleFitt);
      saveStudentLessonPlans(sampleStudentId, DEFAULT_LESSON_PLANS);

      const sampleLog: WorkoutLog = {
        id: `sample_log_1`,
        studentId: sampleStudentId,
        date: new Date().toISOString().split('T')[0],
        exerciseName: '20m 셔틀런 인터벌 트레이닝',
        category: '심폐지구력',
        sets: 4,
        reps: 20,
        durationMinutes: 25,
        rpe: 8,
        memo: '목표 페이스를 유지하며 4세트를 전원 완주함'
      };
      saveWorkoutLog(sampleLog);
    }

    // 세션이 유효하고 로그인된 학생이 있는 경우에만 학생 데이터를 불러옴
    const hasActiveSession = sessionStorage.getItem('shinan_session_active') === 'true';
    const activeStudent = getCurrentStudent();

    if (hasActiveSession && activeStudent) {
      refreshStudentData(activeStudent);
    } else if (!isTeacherAuthenticated()) {
      // 첫 화면은 로그인 화면이어야 하므로 임의 자동 로그인 제거
      setStudent(null);
    }
  }, []);

  const handleStudentLoginFromView = (selectedStudent: StudentProfile) => {
    try {
      sessionStorage.setItem('shinan_session_active', 'true');
    } catch {}
    setCurrentStudent(selectedStudent);
    refreshStudentData(selectedStudent);
    setIsTeacher(false);
    setTeacherAuthenticated(false);
    setIsLoggedIn(true);
    setCurrentTab('dashboard');
  };

  const handleTeacherLoginFromView = () => {
    try {
      sessionStorage.setItem('shinan_session_active', 'true');
    } catch {}
    setIsTeacher(true);
    setTeacherAuthenticated(true);
    // 중요: 교사 로그인 시 학생 계정은 자동 연결하지 않고 온전히 교사 관리자 모드로 분리
    setCurrentStudent(null);
    setStudent(null);
    setIsLoggedIn(true);
    setCurrentTab('all-students');
  };

  const handleAuthSuccess = (authenticatedStudent: StudentProfile) => {
    try {
      sessionStorage.setItem('shinan_session_active', 'true');
    } catch {}
    refreshStudentData(authenticatedStudent);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('shinan_session_active');
    } catch {}
    setCurrentStudent(null);
    setStudent(null);
    setIsTeacher(false);
    setTeacherAuthenticated(false);
    setIsLoggedIn(false);
  };

  const handleTeacherLogout = () => {
    try {
      sessionStorage.removeItem('shinan_session_active');
    } catch {}
    setTeacherAuthenticated(false);
    setIsTeacher(false);
    setIsTeacherModalOpen(false);
    setCurrentStudent(null);
    setStudent(null);
    setIsLoggedIn(false);
  };

  const handleTeacherLoginSuccess = () => {
    try {
      sessionStorage.setItem('shinan_session_active', 'true');
    } catch {}
    setIsTeacher(true);
    setTeacherAuthenticated(true);
    setCurrentStudent(null);
    setStudent(null);
    setIsTeacherLoginOpen(false);
    setIsTeacherModalOpen(true);
  };

  const handleSelectForTimer = (name: string, category: string) => {
    setTimerExercise({ name, category });
    setCurrentTab('timer');
  };

  // Teacher Deletion Handlers
  const handleDeleteWorkoutLog = async (logId: string) => {
    if (!student) return;
    await deleteWorkoutLog(logId);
    setWorkoutLogs(getStudentWorkoutLogs(student.id));
  };

  const handleDeletePapsRecord = async (recordId: string) => {
    if (!student) return;
    await deletePapsRecord(recordId);
    setPapsRecords(getStudentPapsRecords(student.id));
  };

  // 첫 화면 로그인 게이트: 로그인되지 않은 경우 Split LoginView 렌더링
  if (!isLoggedIn) {
    return (
      <LoginView
        onStudentLogin={handleStudentLoginFromView}
        onTeacherLogin={handleTeacherLoginFromView}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1e] text-white flex flex-col font-sans selection:bg-[#E8FD3B] selection:text-black">
      {/* Top Header & Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        student={student}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        isTeacher={isTeacher}
        onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
        onTeacherLogout={handleTeacherLogout}
        onOpenTeacherModal={() => {
          if (isTeacher) {
            setIsTeacherModalOpen(true);
          } else {
            setIsTeacherLoginOpen(true);
          }
        }}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
      />

      {/* Teacher Persistent Control & Impersonation Bar */}
      {isTeacher && (
        <TeacherControlBar
          currentStudent={student}
          onSelectStudent={(selected) => {
            setCurrentStudent(selected);
            refreshStudentData(selected);
          }}
          onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
          onOpenGasSettings={() => setIsGasSettingsOpen(true)}
          onDataChanged={() => {
            if (student) refreshStudentData(student);
          }}
          onDataReset={() => {
            if (student) refreshStudentData(student);
          }}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <DashboardTab
            student={student}
            papsRecords={papsRecords}
            fittPlan={fittPlan}
            lessonPlans={lessonPlans}
            workoutLogs={workoutLogs}
            onNavigateTab={setCurrentTab}
            onOpenAuth={() => setIsAuthOpen(true)}
            isTeacher={isTeacher}
            onDeleteWorkoutLog={handleDeleteWorkoutLog}
            onDeletePapsRecord={handleDeletePapsRecord}
            onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
          />
        )}

        {currentTab === 'all-students' && (
          <AllStudentsTab
            currentStudent={student}
            isTeacher={isTeacher}
            onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
            onSelectStudent={(selected) => {
              refreshStudentData(selected);
            }}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'fitt' && (
          <FittTab
            student={student}
            fittPlan={fittPlan}
            lessonPlans={lessonPlans}
            onUpdateFittPlan={(plan) => setFittPlan(plan)}
            onUpdateLessonPlans={(plans) => setLessonPlans(plans)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onApplyToIntervalTimer={(lesson) => {
              setAppliedLessonPlan(lesson);
              setCurrentTab('timer');
            }}
          />
        )}

        {currentTab === 'paps' && (
          <PapsTab
            student={student}
            records={papsRecords}
            onSaveSuccess={(record) => setPapsRecords((prev) => [record, ...prev])}
            onOpenAuth={() => setIsAuthOpen(true)}
            isTeacher={isTeacher}
            onDeleteRecord={handleDeletePapsRecord}
          />
        )}

        {currentTab === 'neis' && (
          <NeisTab
            student={student}
            papsRecords={papsRecords}
            fittPlan={fittPlan}
            lessonPlans={lessonPlans}
            workoutLogs={workoutLogs}
            onOpenAuth={() => setIsAuthOpen(true)}
            isTeacher={isTeacher}
            onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
            onNavigateTab={setCurrentTab}
            onSelectStudent={handleAuthSuccess}
          />
        )}

        {currentTab === 'exercises' && (
          <ExerciseGuideTab onSelectForTimer={handleSelectForTimer} />
        )}

        {currentTab === 'timer' && (
          <TimerTab
            student={student}
            fittPlan={fittPlan}
            lessonPlans={lessonPlans}
            appliedLessonPlan={appliedLessonPlan}
            initialExerciseName={timerExercise.name}
            initialCategory={timerExercise.category}
            onWorkoutLogged={(log) => setWorkoutLogs((prev) => [log, ...prev])}
            onOpenAuth={() => setIsAuthOpen(true)}
            isTeacher={isTeacher}
            onDeleteWorkoutLog={handleDeleteWorkoutLog}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Student Password / PIN Reset Modal */}
      {student && (
        <PasswordChangeModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          student={student}
          onSuccess={(updatedStudent) => {
            setStudent(updatedStudent);
          }}
        />
      )}

      {/* Teacher Authentication Modal */}
      <TeacherLoginModal
        isOpen={isTeacherLoginOpen}
        onClose={() => setIsTeacherLoginOpen(false)}
        onSuccess={handleTeacherLoginSuccess}
      />

      {/* Teacher Settings & Google Sheet Webhook Modal */}
      <TeacherSyncModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        currentStudent={student}
        onSelectStudent={handleAuthSuccess}
      />

      {/* Google Apps Script(GAS) Webhook Modal */}
      <GasSettingsModal
        isOpen={isGasSettingsOpen}
        onClose={() => setIsGasSettingsOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-[#091124] border-t border-[#1a2b56] py-6 text-xs text-slate-400 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0d172e] border border-[#E8FD3B]/40 text-[#E8FD3B] flex items-center justify-center">
              <Waves className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-white">신안해양과학고등학교</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-slate-300 font-bold">paps&fitt</span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="text-slate-400">2022 개정 체육과 맞춤형 체력관리 시스템</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="text-slate-400">순발력 · 심폐지구력 · 유연성 · 근력/근지구력 · BMI</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#142245] text-[#E8FD3B] font-black border border-[#E8FD3B]/30">
              Navy & Neon Edition
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
