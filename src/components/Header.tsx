import React from 'react';
import {
  Waves,
  User,
  LogOut,
  Settings,
  FileSpreadsheet,
  Activity,
  HeartPulse,
  BookOpen,
  Timer as TimerIcon,
  Award,
  Users,
  ShieldCheck,
  Lock,
  KeyRound,
  FileText
} from 'lucide-react';
import { StudentProfile } from '../types';
import { getFirebaseFirestore } from '../services/firebaseConfig';
import { getTeacherSettings } from '../services/storageService';

interface HeaderProps {
  currentTab: 'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'neis' | 'all-students';
  onSelectTab: (tab: 'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'neis' | 'all-students') => void;
  student: StudentProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isTeacher: boolean;
  onOpenTeacherLogin: () => void;
  onTeacherLogout: () => void;
  onOpenTeacherModal: () => void;
  onOpenPasswordModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  student,
  onOpenAuth,
  onLogout,
  isTeacher,
  onOpenTeacherLogin,
  onTeacherLogout,
  onOpenTeacherModal,
  onOpenPasswordModal
}) => {
  const isFirestoreActive = Boolean(getFirebaseFirestore());
  const teacherSettings = getTeacherSettings();
  const isSheetConfigured = Boolean(teacherSettings.googleSheetWebhookUrl);

  const tabs = [
    { id: 'dashboard', label: '나의 기록실', icon: Award },
    { id: 'all-students', label: '전체 학생 기록실', icon: Users },
    { id: 'fitt', label: 'FITT 운동 처방 & 5차시', icon: BookOpen },
    { id: 'paps', label: 'PAPS 측정 & 등급 판정', icon: HeartPulse },
    { id: 'neis', label: '생활기록부 세특 생성기', icon: FileText },
    { id: 'exercises', label: '4대 체력 운동 가이드 (40종)', icon: Activity },
    { id: 'timer', label: '스마트 실습 타이머', icon: TimerIcon },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-[#091124]/95 backdrop-blur-md border-b border-[#1a2b56] shadow-xl text-white">
      {/* Top Bar: School Branding & Student Profile / Teacher Setting */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & School Name */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0d172e] border border-[#E8FD3B]/40 p-2.5 shadow-[0_0_15px_rgba(232,253,59,0.15)] flex items-center justify-center text-[#E8FD3B] shrink-0">
            <Waves className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold tracking-wider text-[#E8FD3B] uppercase bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
                신안해양과학고등학교
              </span>
              <span className="text-[11px] font-bold text-sky-300 bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-800/60">
                2022 개정 체육 2
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5 flex items-center gap-1.5">
              <span>체력관리 시스템</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8FD3B] animate-pulse"></span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              Ocean Physical Fitness Bento Platform
            </p>
          </div>
        </div>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Status Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium ${
                isFirestoreActive
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0d172e] border-[#1e2f5b] text-slate-400'
              }`}
              title={isFirestoreActive ? 'Firebase 클라우드 연동 완료' : '로컬 스토리지 오프라인 모드'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isFirestoreActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {isFirestoreActive ? 'Firestore 동기화' : '로컬 모드'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium ${
                isSheetConfigured
                  ? 'bg-sky-950/60 border-sky-500/30 text-sky-300'
                  : 'bg-[#0d172e] border-[#1e2f5b] text-slate-400'
              }`}
              title={isSheetConfigured ? '교사용 구글 시트 웹훅 연동 완료' : '교사용 시트 미설정'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {isSheetConfigured ? '교사용 시트 연동됨' : '시트 웹훅 대기'}
            </span>
          </div>

          {/* Teacher Status or Login Button */}
          {isTeacher ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#142245] border border-[#E8FD3B]/30 text-white shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#E8FD3B] shrink-0" />
                <span className="text-xs font-black text-[#E8FD3B]">체육교사 인증</span>
                <button
                  onClick={onTeacherLogout}
                  className="text-[10px] font-bold text-slate-300 hover:text-rose-400 bg-[#0d172e] px-2 py-0.5 rounded-lg border border-[#1e2f5b] hover:border-rose-500/40 transition ml-0.5 cursor-pointer"
                  title="교사 모드 로그아웃"
                >
                  로그아웃
                </button>
              </div>

              <button
                onClick={onOpenTeacherModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-black bg-[#E8FD3B] hover:bg-[#d5eb28] transition shadow-[0_0_12px_rgba(232,253,59,0.25)] cursor-pointer"
                title="신안해양과학고 1학년 공식 명렬표(37명) 및 교사 연동 센터"
              >
                <Users className="w-3.5 h-3.5" />
                <span>1학년 명렬표·연동</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenTeacherLogin}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-[#0d172e] hover:bg-[#142245] hover:text-[#E8FD3B] border border-[#1e2f5b] transition shadow-xs cursor-pointer"
              title="신안해양과학고 체육교사 관리자 인증 (비밀번호: 4161)"
            >
              <Lock className="w-3.5 h-3.5 text-[#E8FD3B]" />
              <span>체육교사 로그인</span>
            </button>
          )}

          {/* Student Auth Box */}
          {student ? (
            <div className="flex items-center gap-2 bg-[#0d172e] border border-[#1e2f5b] rounded-2xl px-3 py-1.5 shadow-sm">
              <button
                type="button"
                onClick={onOpenAuth}
                title="학생 전환 또는 로그인 변경"
                className="flex items-center gap-2 text-left hover:opacity-85 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-[#E8FD3B] text-black flex items-center justify-center font-black text-xs shadow-xs">
                  {student.studentNum}
                </div>
                <div>
                  <div className="font-extrabold text-white text-xs leading-tight">
                    1-{student.classNum} {student.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {student.gender}학생 ({student.id})
                  </div>
                </div>
              </button>

              {/* Individual Password Reset Button */}
              <button
                type="button"
                onClick={onOpenPasswordModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#E8FD3B] hover:bg-[#142245] border border-transparent hover:border-[#E8FD3B]/30 transition cursor-pointer"
                title="개인 비밀번호(PIN) 재설정"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 transition ml-0.5 p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                title="학생 로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-[#E8FD3B] text-black hover:bg-[#d5eb28] transition shadow-[0_0_15px_rgba(232,253,59,0.3)] cursor-pointer"
            >
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              학생 로그인 / 등록
            </button>
          )}
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1.5 sm:space-x-2 overflow-x-auto scrollbar-none py-2 border-t border-[#1a2b56]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E8FD3B] text-black shadow-[0_0_18px_rgba(232,253,59,0.35)]'
                    : 'text-slate-300 hover:text-white hover:bg-[#142245]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black stroke-[2.5]' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
