import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Trash2,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Eye,
  ChevronDown
} from 'lucide-react';
import { StudentProfile } from '../types';
import { getAllStudents, resetStudentAllData, deleteAllPapsRecordsForStudent, deleteAllWorkoutLogsForStudent, resetStudentFittPlan } from '../services/storageService';

interface TeacherControlBarProps {
  currentStudent: StudentProfile | null;
  onSelectStudent: (student: StudentProfile) => void;
  onOpenTeacherModal?: () => void;
  onDataChanged?: () => void;
  onDataReset?: () => void;
}

export const TeacherControlBar: React.FC<TeacherControlBarProps> = ({
  currentStudent,
  onSelectStudent,
  onOpenTeacherModal,
  onDataChanged,
  onDataReset
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'all' | 'paps' | 'workout' | 'fitt'>('all');
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);

  const allStudents = getAllStudents();

  const handleDelete = async () => {
    if (!currentStudent) return;
    setIsProcessing(true);
    setStatusMsg(null);

    try {
      let msg = '';
      if (deleteType === 'all') {
        await resetStudentAllData(currentStudent.id);
        msg = `${currentStudent.name} 학생의 모든 PAPS 측정치, 운동 일지, FITT 처방이 초기화되었습니다.`;
      } else if (deleteType === 'paps') {
        await deleteAllPapsRecordsForStudent(currentStudent.id);
        msg = `${currentStudent.name} 학생의 누적 PAPS 측정 기록이 모두 삭제되었습니다.`;
      } else if (deleteType === 'workout') {
        await deleteAllWorkoutLogsForStudent(currentStudent.id);
        msg = `${currentStudent.name} 학생의 운동 실습 일지가 모두 삭제되었습니다.`;
      } else if (deleteType === 'fitt') {
        await resetStudentFittPlan(currentStudent.id);
        msg = `${currentStudent.name} 학생의 FITT 운동처방 및 5차시 계획이 초기화되었습니다.`;
      }

      setStatusMsg({ text: msg, success: true });
      if (onDataChanged) {
        onDataChanged();
      } else if (onDataReset) {
        onDataReset();
      }
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setStatusMsg(null);
        setConfirmText('');
      }, 1500);
    } catch (err) {
      console.error('Delete error in TeacherControlBar:', err);
      setStatusMsg({ text: '기록 삭제 처리 중 오류가 발생했습니다.', success: false });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Top Banner for Authenticated Teacher */}
      <div
        id="teacher-control-bar"
        className="bg-[#091124] border-b border-[#1e2f5b] px-4 sm:px-6 lg:px-8 py-2.5 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Status & Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#E8FD3B]/10 border border-[#E8FD3B]/30 flex items-center justify-center text-[#E8FD3B]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-[#E8FD3B] tracking-wide">
              체육교사 관제 모드
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="text-slate-300 hidden md:inline">
              학생 전원의 5개 탭(대시보드·PAPS·FITT·타이머·가이드) 및 누적 기록 열람/삭제 권한 보유
            </span>
          </div>

          {/* Right: Quick Student Switcher & Delete Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Student Switch Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-2.5 py-1.5">
              <Eye className="w-3.5 h-3.5 text-[#E8FD3B]" />
              <span className="text-slate-400 text-[11px] hidden sm:inline">조회 학생:</span>
              <select
                value={currentStudent?.id || ''}
                onChange={(e) => {
                  const target = allStudents.find((s) => s.id === e.target.value);
                  if (target) onSelectStudent(target);
                }}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
              >
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0d172e] text-white">
                    {s.grade}-{s.classNum}-{String(s.studentNum).padStart(2, '0')} {s.name} ({s.gender})
                  </option>
                ))}
              </select>
            </div>

            {/* Delete Record Button */}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={!currentStudent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition font-bold disabled:opacity-50"
              title="현재 조회 중인 학생의 PAPS 또는 운동 일지 삭제"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>기록 삭제</span>
            </button>

            {/* Roster Modal Button */}
            <button
              onClick={onOpenTeacherModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black font-extrabold transition shadow-[0_0_12px_rgba(232,253,59,0.25)] cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>1학년 명렬표(37명)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentStudent && (
        <div
          id="teacher-delete-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
        >
          <div
            id="teacher-delete-modal"
            className="w-full max-w-md bg-[#0d172e] border border-[#1e2f5b] rounded-3xl p-6 sm:p-7 shadow-2xl relative text-white space-y-4"
          >
            {/* Close */}
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#142245] transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  학생 기록 삭제 및 초기화 (교사 전용)
                </h3>
                <p className="text-xs text-slate-400">
                  {currentStudent.grade}학년 {currentStudent.classNum}반 {currentStudent.studentNum}번{' '}
                  <span className="text-white font-bold">{currentStudent.name}</span> 학생
                </p>
              </div>
            </div>

            {statusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  statusMsg.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {statusMsg.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Options */}
            <div className="space-y-2 text-xs">
              <label className="block text-slate-400 font-semibold mb-1">
                삭제 대상 선택:
              </label>

              <div className="space-y-2">
                <label
                  onClick={() => setDeleteType('all')}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    deleteType === 'all'
                      ? 'bg-rose-500/10 border-rose-500/40 text-white'
                      : 'bg-[#070e1e] border-[#1e2f5b] text-slate-300 hover:bg-[#142245]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteType"
                    checked={deleteType === 'all'}
                    onChange={() => setDeleteType('all')}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div>
                    <span className="font-bold text-rose-300 block">
                      전체 데이터 초기화 (완전 리셋)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PAPS 누적 측정치 + 스마트 타이머 일지 + FITT 처방 및 5차시 실천 기록 모두 삭제
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setDeleteType('paps')}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    deleteType === 'paps'
                      ? 'bg-blue-500/10 border-blue-500/40 text-white'
                      : 'bg-[#070e1e] border-[#1e2f5b] text-slate-300 hover:bg-[#142245]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteType"
                    checked={deleteType === 'paps'}
                    onChange={() => setDeleteType('paps')}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <span className="font-bold text-blue-300 block">
                      PAPS 측정 기록만 삭제
                    </span>
                    <span className="text-[11px] text-slate-400">
                      잘못 입력된 5대 체력 측정값 및 NEIS 추천 세특 기록 초기화
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setDeleteType('workout')}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    deleteType === 'workout'
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-[#070e1e] border-[#1e2f5b] text-slate-300 hover:bg-[#142245]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteType"
                    checked={deleteType === 'workout'}
                    onChange={() => setDeleteType('workout')}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-300 block">
                      스마트 타이머 운동 실습 일지만 삭제
                    </span>
                    <span className="text-[11px] text-slate-400">
                      누적된 인터벌 실습 기록 및 세트/Reps 로그 초기화
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setDeleteType('fitt')}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    deleteType === 'fitt'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-[#070e1e] border-[#1e2f5b] text-slate-300 hover:bg-[#142245]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteType"
                    checked={deleteType === 'fitt'}
                    onChange={() => setDeleteType('fitt')}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-emerald-300 block">
                      FITT 처방 & 5차시 계획서 초기화
                    </span>
                    <span className="text-[11px] text-slate-400">
                      학생이 수동 작성한 운동 원리 및 5차시 루틴을 기본값으로 복원
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-2xl text-xs space-y-2">
              <p className="text-rose-200">
                ⚠️ 삭제된 데이터는 복구할 수 없습니다. 계속하시려면 아래에{' '}
                <span className="font-bold text-rose-400">"{currentStudent.name}"</span>을(를) 입력해주세요.
              </p>
              <input
                type="text"
                placeholder={`${currentStudent.name} 입력`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-[#070e1e] border border-rose-500/40 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none text-xs font-bold"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText.trim() !== currentStudent.name || isProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>삭제 진행 중...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>선택 기록 영구 삭제</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
