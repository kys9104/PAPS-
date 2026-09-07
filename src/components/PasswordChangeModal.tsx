import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Check, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { StudentProfile } from '../types';
import { updateStudentPin } from '../services/storageService';

interface PasswordChangeModalProps {
  isOpen: boolean;
  student: StudentProfile | null;
  onClose: () => void;
  onSuccess: (updatedStudent: StudentProfile) => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  student,
  onClose,
  onSuccess
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPin) {
      setErrorMsg('현재 비밀번호(PIN)를 입력해주세요.');
      return;
    }

    if (currentPin !== student.pin) {
      setErrorMsg('현재 비밀번호(PIN)가 일치하지 않습니다.');
      return;
    }

    if (!newPin || newPin.length < 4) {
      setErrorMsg('새 비밀번호는 숫자 4자리 이상으로 설정해주세요.');
      return;
    }

    if (newPin === currentPin) {
      setErrorMsg('새 비밀번호가 현재 비밀번호와 동일합니다.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateStudentPin(student.id, newPin);
      if (res.success) {
        setSuccessMsg('비밀번호가 성공적으로 재설정되었습니다!');
        const updatedStudent: StudentProfile = {
          ...student,
          pin: newPin
        };
        setTimeout(() => {
          onSuccess(updatedStudent);
          handleClose();
        }, 1200);
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('비밀번호 변경 처리 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowCurrentPin(false);
    setShowNewPin(false);
    onClose();
  };

  return (
    <div
      id="password-change-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="password-change-modal"
        className="w-full max-w-md bg-[#0d172e] border border-[#1e2f5b] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-white"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#142245] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#E8FD3B]/10 border border-[#E8FD3B]/30 flex items-center justify-center text-[#E8FD3B] shadow-[0_0_15px_rgba(232,253,59,0.15)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              개인 비밀번호(PIN) 재설정
            </h3>
            <p className="text-xs text-slate-400">
              {student.grade}학년 {student.classNum}반 {student.studentNum}번 {student.name} 학생
            </p>
          </div>
        </div>

        <div className="mb-5 p-3.5 bg-[#142245]/60 border border-[#1e2f5b] rounded-2xl flex items-start gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-[#E8FD3B] shrink-0 mt-0.5" />
          <span>
            초기 등록된 비밀번호를 나만의 개인 비밀번호로 변경하여 안전하게 체력 측정 기록과 운동 계획을 관리하세요.
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 shrink-0 text-[#E8FD3B]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              현재 비밀번호 (PIN)
            </label>
            <div className="relative">
              <input
                type={showCurrentPin ? 'text' : 'password'}
                maxLength={8}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="현재 PIN 입력 (초기: 0000)"
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              새 비밀번호 (4자리 이상 숫자)
            </label>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="새로운 PIN 번호 입력"
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              새 비밀번호 확인
            </label>
            <input
              type={showNewPin ? 'text' : 'password'}
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="새로운 PIN 번호 재입력"
              className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition font-mono"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#E8FD3B] hover:bg-[#d4f82a] text-black font-extrabold text-sm shadow-[0_0_20px_rgba(232,253,59,0.3)] transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block animate-pulse">변경 처리 중...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>비밀번호 재설정 완료</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
