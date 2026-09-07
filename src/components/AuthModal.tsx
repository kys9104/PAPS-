import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  User,
  KeyRound,
  Lock,
  GraduationCap,
  CheckCircle2,
  Users
} from 'lucide-react';
import { StudentProfile } from '../types';
import { loginOrRegisterStudent } from '../services/storageService';
import { SHINAN_OFFICIAL_STUDENTS, OfficialStudentRosterItem } from '../data/shinanStudents';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: StudentProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const [grade] = useState<number>(1);
  const [classNum, setClassNum] = useState<number>(1);
  const [studentNum, setStudentNum] = useState<number>(1);
  const [name, setName] = useState<string>('곽승준');
  const [gender, setGender] = useState<'남' | '여'>('남');
  const [pin, setPin] = useState<string>('0000');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter official students for selected class
  const classStudents = SHINAN_OFFICIAL_STUDENTS.filter((s) => s.classNum === classNum);

  const handleSelectOfficialStudent = (student: OfficialStudentRosterItem) => {
    setClassNum(student.classNum);
    setStudentNum(student.studentNum);
    setName(student.name);
    setGender(student.gender);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('학생 성명을 입력하거나 명단에서 선택해 주세요.');
      return;
    }
    if (pin.length !== 4) {
      setErrorMsg('PIN 비밀번호는 숫자 4자리여야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginOrRegisterStudent(grade, classNum, studentNum, name.trim(), pin, gender);
      if (res.success && res.student) {
        onSuccess(res.student);
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('인증 처리 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d172e] border border-[#1e2f5b] rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header Ribbon */}
        <div className="bg-[#142245] px-6 py-4 border-b border-[#1e2f5b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#070e1e] border border-[#E8FD3B]/30 text-[#E8FD3B] flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#E8FD3B] bg-[#E8FD3B]/10 px-2 py-0.5 rounded-full border border-[#E8FD3B]/30">
                  신안해양과학고 1학년
                </span>
                <span className="text-[10px] font-medium bg-sky-950/60 px-2 py-0.5 rounded-full text-sky-300 border border-sky-800/60">
                  공식 명단 37명 탑재
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5 tracking-tight">
                학생 본인 인증 및 로그인
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-[#1c2e5a] transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Class Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#E8FD3B]" />
                학급 선택 (1학년 명단)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                명단에서 본인 이름을 클릭하면 즉시 입력됩니다
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#070e1e] p-1.5 rounded-2xl border border-[#1e2f5b]">
              <button
                type="button"
                onClick={() => {
                  setClassNum(1);
                  const first = SHINAN_OFFICIAL_STUDENTS.find((s) => s.classNum === 1);
                  if (first) handleSelectOfficialStudent(first);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  classNum === 1
                    ? 'bg-[#E8FD3B] text-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>1반 (19명)</span>
                {classNum === 1 && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setClassNum(2);
                  const first = SHINAN_OFFICIAL_STUDENTS.find((s) => s.classNum === 2);
                  if (first) handleSelectOfficialStudent(first);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  classNum === 2
                    ? 'bg-sky-400 text-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>2반 (18명)</span>
                {classNum === 2 && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
              </button>
            </div>
          </div>

          {/* Quick Student Chips Grid */}
          <div className="p-3.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">
                {classNum}반 학생 바로 선택
              </span>
              <span className="text-[10px] text-[#E8FD3B] font-mono font-bold">
                선택됨: {classNum}반 {studentNum}번 {name} ({gender})
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {classStudents.map((s) => {
                const isSelected = studentNum === s.studentNum && name === s.name;
                return (
                  <button
                    key={`${s.classNum}-${s.studentNum}`}
                    type="button"
                    onClick={() => handleSelectOfficialStudent(s)}
                    className={`px-2 py-1.5 rounded-xl text-left text-xs font-medium transition flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8FD3B] text-black border-[#E8FD3B] font-bold shadow-xs'
                        : 'bg-[#0d172e] text-slate-300 hover:text-white hover:bg-[#142245] border-[#1e2f5b]'
                    }`}
                  >
                    <span className="truncate">
                      <span className={`text-[10px] mr-1 ${isSelected ? 'text-black/70' : 'text-slate-500'}`}>
                        {s.studentNum}번
                      </span>
                      <strong className="font-bold">{s.name}</strong>
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1 text-black" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields: Grade, Class, Number */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">학년</label>
              <input
                type="text"
                disabled
                value="1학년"
                className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs font-bold text-slate-400 text-center cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">반</label>
              <select
                value={classNum}
                onChange={(e) => {
                  const c = Number(e.target.value);
                  setClassNum(c);
                  const first = SHINAN_OFFICIAL_STUDENTS.find((s) => s.classNum === c);
                  if (first) handleSelectOfficialStudent(first);
                }}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none"
              >
                <option value={1}>1반</option>
                <option value={2}>2반</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">번호</label>
              <select
                value={studentNum}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setStudentNum(num);
                  const matched = classStudents.find((s) => s.studentNum === num);
                  if (matched) {
                    setName(matched.name);
                    setGender(matched.gender);
                  }
                }}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none"
              >
                {classStudents.map((s) => (
                  <option key={s.studentNum} value={s.studentNum}>
                    {s.studentNum}번 ({s.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name & Gender */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">
                학생 성명 <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="예: 곽승준"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white outline-none"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">성별</label>
              <div className="flex rounded-xl overflow-hidden border border-[#1e2f5b] p-0.5 bg-[#070e1e]">
                <button
                  type="button"
                  onClick={() => setGender('남')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    gender === '남'
                      ? 'bg-sky-500 text-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  남
                </button>
                <button
                  type="button"
                  onClick={() => setGender('여')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    gender === '여'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  여
                </button>
              </div>
            </div>
          </div>

          {/* 4-Digit PIN */}
          <div className="bg-[#070e1e] border border-[#1e2f5b] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                개인 PIN 비밀번호 (4자리) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-[#E8FD3B] font-semibold hover:underline cursor-pointer"
              >
                {showPin ? '숨기기' : '보기'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                required
                maxLength={4}
                placeholder="기본 비밀번호: 0000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold tracking-widest text-white outline-none"
              />
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              * 기본 초기 PIN은 <strong className="text-[#E8FD3B] font-mono font-bold">0000</strong>이며, 로그인 후 상단 프로필에서 언제든 본인만의 비밀번호로 변경할 수 있습니다.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-black text-xs transition shadow-[0_0_15px_rgba(232,253,59,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            <span>{isSubmitting ? '인증 처리 중...' : `${name} 학생으로 체육 기록실 입장`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
