import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Activity,
  Award,
  ChevronRight,
  Flame,
  KeyRound,
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SHINAN_OFFICIAL_STUDENTS } from '../data/shinanStudents';
import { StudentProfile } from '../types';
import {
  loginOrRegisterStudent,
  verifyTeacherPassword,
  setTeacherAuthenticated,
  getAllStudents
} from '../services/storageService';

interface LoginViewProps {
  onLoginSuccess?: (student: StudentProfile | null, isTeacher: boolean) => void;
  onStudentLogin?: (student: StudentProfile) => void;
  onTeacherLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onStudentLogin,
  onTeacherLogin
}) => {
  const [roleTab, setRoleTab] = useState<'student' | 'teacher'>('student');

  // 학생 로그인 상태 (초기 보안 PIN: 0000)
  const [selectedClass, setSelectedClass] = useState<number>(1);
  const [selectedStudentNum, setSelectedStudentNum] = useState<number>(1);
  const [studentName, setStudentName] = useState<string>('곽승준');
  const [studentGender, setStudentGender] = useState<'남' | '여'>('남');
  const [studentPin, setStudentPin] = useState<string>('0000');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isStudentSubmitting, setIsStudentSubmitting] = useState<boolean>(false);

  // 교사 로그인 상태
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // 명단에서 학생 선택 시 자동 입력 (PIN은 기본 0000 유지)
  const handleSelectOfficialStudent = (st: typeof SHINAN_OFFICIAL_STUDENTS[0]) => {
    setSelectedClass(st.classNum);
    setSelectedStudentNum(st.studentNum);
    setStudentName(st.name);
    setStudentGender(st.gender);
    setStudentPin('0000');
    setStudentError(null);
  };

  // 학생 로그인 제출
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    setIsStudentSubmitting(true);

    try {
      const res = await loginOrRegisterStudent(
        1,
        selectedClass,
        selectedStudentNum,
        studentName.trim(),
        studentPin.trim() || '0000',
        studentGender
      );

      if (res.success && res.student) {
        setTeacherAuthenticated(false);
        if (onStudentLogin) {
          onStudentLogin(res.student);
        }
        if (onLoginSuccess) {
          onLoginSuccess(res.student, false);
        }
      } else {
        setStudentError(res.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setStudentError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsStudentSubmitting(false);
    }
  };

  // 교사 로그인 제출 (비밀번호: 4161)
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);

    if (verifyTeacherPassword(teacherPassword)) {
      setTeacherAuthenticated(true);
      if (onTeacherLogin) {
        onTeacherLogin();
      }
      if (onLoginSuccess) {
        const allStudents = getAllStudents();
        const firstStudent = allStudents.length > 0 ? allStudents[0] : null;
        onLoginSuccess(firstStudent, true);
      }
    } else {
      setTeacherError('교사 관리자 비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
    }
  };

  const filteredRoster = SHINAN_OFFICIAL_STUDENTS.filter(
    (s) => s.classNum === selectedClass
  );

  return (
    <div className="min-h-screen bg-[#070e1e] text-white flex flex-col justify-between selection:bg-[#E8FD3B] selection:text-black">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#1e2f5b] bg-[#070e1e]/90 backdrop-blur-md px-4 py-3.5 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#142245] border border-[#E8FD3B]/40 flex items-center justify-center text-[#E8FD3B] shadow-sm">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E8FD3B] bg-[#E8FD3B]/10 px-2 py-0.5 rounded-full border border-[#E8FD3B]/30">
                2022 개정 체육과
              </span>
              <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                신안해양과학고등학교 1학년
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
              paps&fitt
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRoleTab(roleTab === 'student' ? 'teacher' : 'student')}
            className="px-3 py-1.5 rounded-xl border border-[#1e2f5b] bg-[#0d172e] hover:bg-[#142245] text-xs font-bold text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            {roleTab === 'student' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#E8FD3B]" />
                <span>체육교사 로그인</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                <span>학생 로그인으로 전환</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Title Badge */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#142245] border border-[#1e2f5b] text-xs font-bold text-slate-300 mb-3 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#E8FD3B]" />
            <span>신안해양과학고등학교 1학년 체육 수업 맞춤형 플랫폼</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            체계적인 <span className="text-[#E8FD3B]">PAPS 체력 진단</span>과{' '}
            <span className="text-sky-400">5차시 FITT 처방 루틴</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            나만의 체력 등급을 분석하고, 8개 고정 본운동 인터벌 타이머를 실천하며 성장 기록을 관리하세요.
          </p>
        </div>

        {/* Login Box Container */}
        <div className="w-full max-w-xl mx-auto bg-[#0d172e] border border-[#1e2f5b] rounded-3xl shadow-2xl overflow-hidden">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-[#070e1e] border-b border-[#1e2f5b] gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRoleTab('student');
                setStudentError(null);
              }}
              className={`py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                roleTab === 'student'
                  ? 'bg-[#E8FD3B] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>학생 로그인 (1학년 37명)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleTab('teacher');
                setTeacherError(null);
              }}
              className={`py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                roleTab === 'teacher'
                  ? 'bg-[#142245] text-white border border-[#E8FD3B]/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#E8FD3B]" />
              <span>체육교사 관리자 로그인</span>
            </button>
          </div>

          {/* Student Login Form */}
          {roleTab === 'student' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-xs font-black text-slate-400 block mb-2">
                  1단계: 학급 명단에서 내 이름 선택 (빠른 자동 완성)
                </span>
                {/* Class selector */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClass(1);
                      const first = SHINAN_OFFICIAL_STUDENTS.find((s) => s.classNum === 1);
                      if (first) handleSelectOfficialStudent(first);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      selectedClass === 1
                        ? 'bg-[#142245] text-white border border-sky-400'
                        : 'bg-[#070e1e] text-slate-400 hover:text-white border border-[#1e2f5b]'
                    }`}
                  >
                    1학년 1반 (19명)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClass(2);
                      const first = SHINAN_OFFICIAL_STUDENTS.find((s) => s.classNum === 2);
                      if (first) handleSelectOfficialStudent(first);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      selectedClass === 2
                        ? 'bg-[#142245] text-white border border-sky-400'
                        : 'bg-[#070e1e] text-slate-400 hover:text-white border border-[#1e2f5b]'
                    }`}
                  >
                    1학년 2반 (18명)
                  </button>
                </div>

                {/* Student pill selector */}
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl">
                  {filteredRoster.map((st) => {
                    const isSelected =
                      selectedClass === st.classNum &&
                      selectedStudentNum === st.studentNum &&
                      studentName === st.name;
                    return (
                      <button
                        key={`${st.classNum}-${st.studentNum}`}
                        type="button"
                        onClick={() => handleSelectOfficialStudent(st)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#E8FD3B] text-black font-black'
                            : 'bg-[#0d172e] text-slate-300 hover:text-white border border-[#1e2f5b]'
                        }`}
                      >
                        {st.studentNum}번 {st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Details */}
              <form onSubmit={handleStudentSubmit} className="space-y-4 pt-2 border-t border-[#1e2f5b]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      선택 학번
                    </label>
                    <div className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white">
                      1학년 {selectedClass}반 {selectedStudentNum}번
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      학생 이름
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                      className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      성별 (PAPS 기준 산출)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStudentGender('남')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          studentGender === '남'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400'
                            : 'bg-[#070e1e] text-slate-400 border border-[#1e2f5b]'
                        }`}
                      >
                        남학생
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentGender('여')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          studentGender === '여'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-400'
                            : 'bg-[#070e1e] text-slate-400 border border-[#1e2f5b]'
                        }`}
                      >
                        여학생
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      보안 PIN (초기 비밀번호: 0000)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        maxLength={6}
                        value={studentPin}
                        onChange={(e) => setStudentPin(e.target.value)}
                        placeholder="0000"
                        className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none tracking-widest"
                      />
                      <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#070e1e] border border-[#1e2f5b] rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
                  <span>* 학생 초기 보안 PIN은 <strong className="text-[#E8FD3B] font-mono font-black">0000</strong>으로 설정되어 있습니다.</span>
                  <span className="text-slate-500 hidden sm:inline">(로그인 후 변경 가능)</span>
                </div>

                {studentError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-xl">
                    {studentError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStudentSubmitting || !studentName.trim()}
                  className="w-full py-3.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d8ed2a] text-black font-black text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50 mt-4"
                >
                  <span>{isStudentSubmitting ? '로그인 중...' : '학생으로 체육 수업 입장하기'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Teacher Login Form */}
          {roleTab === 'teacher' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="p-4 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#E8FD3B] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">체육교사 전용 보안 인증:</strong>
                  <p className="mt-1 text-slate-400 text-[11px]">
                    전체 37명 학생 기록 열람, PAPS 평가 일괄 수정, 신체조성(키/몸무게/BMI) 관리,
                    생활기록부 세특 최종 승인 및 구글 시트 연동 기능에 접근합니다.
                  </p>
                </div>
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#E8FD3B]" />
                    <span>체육교사 관리자 비밀번호</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={teacherPassword}
                      onChange={(e) => {
                        setTeacherPassword(e.target.value);
                        if (teacherError) setTeacherError(null);
                      }}
                      autoFocus
                      placeholder="비밀번호 입력 (화면 가림 보호)"
                      className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none tracking-widest pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition cursor-pointer"
                      title={showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    * 인가된 체육교사만 접근 가능합니다. (보안 마스킹 적용)
                  </p>
                </div>

                {teacherError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-xl">
                    {teacherError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!teacherPassword.trim()}
                  className="w-full py-3.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d8ed2a] text-black font-black text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50 mt-4"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>체육교사 관리자 로그인</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e2f5b] bg-[#070e1e] py-4 px-6 text-center text-[11px] text-slate-500">
        <p>
          신안해양과학고등학교 1학년 체육과 교육과정 | 2022 개정 교육과정 기반 PAPS & 5차시 맞춤형 FITT 처방 시스템
        </p>
      </footer>
    </div>
  );
};
