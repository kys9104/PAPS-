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
  getAllStudents,
  syncAllDataFromFirestore,
  ensureStudentProfilesUpToDate
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
import { AllStudentsTab } from './components/AllStudentsTab';
import { LoginView } from './components/LoginView';
import { GasSettingsModal } from './components/GasSettingsModal';
import { Waves } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'all-students'
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
  const [fittViewMode, setFittViewMode] = useState<'view' | 'edit'>('view');

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

  // Initial Data Bootstrap
  useEffect(() => {
    // 곽승준 학생의 예시 샘플 기록 잔여 데이터 정리
    const rawPaps = localStorage.getItem('shinan_paps_records');
    if (rawPaps && rawPaps.includes('paps_sample_1-1-01')) {
      deletePapsRecord('paps_sample_1-1-01', '1-1-01');
    }

    // 최신 학생 명단 및 성별(홍서현, 조하얀 등) 보정 반영
    ensureStudentProfilesUpToDate();

    // Firestore 데이터 동기화 백그라운드 호출
    syncAllDataFromFirestore().then(() => {
      const curr = getCurrentStudent();
      if (curr) {
        refreshStudentData(curr);
      }
    }).catch((e) => {
      console.warn('Initial background Firestore sync notice:', e);
    });

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

  // 탭 변경 시 최신 클라우드 데이터 백그라운드 동기화
  useEffect(() => {
    if (isLoggedIn) {
      syncAllDataFromFirestore().then(() => {
        const curr = getCurrentStudent();
        if (curr) {
          refreshStudentData(curr);
        }
      }).catch((e) => {
        console.warn('Tab change Firestore sync notice:', e);
      });
    }
  }, [currentTab, isLoggedIn]);

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
            onSelectStudent={(selected) => {
              setCurrentStudent(selected);
              refreshStudentData(selected);
            }}
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
            onNavigateDashboard={() => setCurrentTab('dashboard')}
            onApplyToIntervalTimer={(lesson) => {
              setAppliedLessonPlan(lesson);
              setCurrentTab('timer');
            }}
            onOpenGasSettings={() => setIsGasSettingsOpen(true)}
            initialViewMode={fittPlan ? fittViewMode : 'edit'}
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
            onWorkoutLogged={(log) =>
              setWorkoutLogs((prev) => [log, ...prev.filter((l) => l.id !== log.id)])
            }
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
