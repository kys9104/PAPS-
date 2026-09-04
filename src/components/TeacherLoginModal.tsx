import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import { verifyTeacherPassword, setTeacherAuthenticated } from '../services/storageService';

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyTeacherPassword(password)) {
      setTeacherAuthenticated(true);
      setErrorMsg(null);
      setPassword('');
      onSuccess();
    } else {
      setErrorMsg('비밀번호가 올바르지 않습니다. 다시 입력해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0d172e] border border-[#1e2f5b] rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header Ribbon */}
        <div className="p-5 bg-[#142245] border-b border-[#1e2f5b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#070e1e] border border-[#E8FD3B]/40 text-[#E8FD3B] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#E8FD3B] bg-[#E8FD3B]/10 px-2 py-0.5 rounded-full border border-[#E8FD3B]/30">
                신안해양과학고 체육과
              </span>
              <h3 className="text-base font-black tracking-tight text-white mt-0.5">
                체육교사 관리자 인증
              </h3>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl text-xs text-slate-300 leading-relaxed">
            <p className="font-bold text-[#E8FD3B]">
              교사 관리자 전용 보안 인증
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              1학년 37명 명렬표, 실시간 학생 기록 열람/삭제, Google 시트 연동 및 일괄 데이터 관리는 교사 인증 후 사용 가능합니다.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#E8FD3B]" />
              <span>교사 관리자 비밀번호</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoFocus
                placeholder="비밀번호 입력 (화면 가림 보호)"
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none tracking-wider pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black transition shadow-[0_0_15px_rgba(232,253,59,0.3)] cursor-pointer"
            >
              인증 및 관리자 진입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
