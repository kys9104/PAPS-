import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  PenTool,
  Eye,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  HeartPulse,
  Award,
  BookOpen,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  X,
  Save,
  RotateCcw,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import {
  StudentProfile,
  PAPSRecord,
  CardioTest,
  FlexibilityTest,
  StrengthTest,
  AgilityTest
} from '../types';
import {
  PAPS_STANDARDS,
  evaluateGrade,
  evaluateBMI,
  getOverallGrade,
  getGradeColor,
  getGradeLabel,
  generateNEISRecommendation
} from '../data/papsStandards';
import {
  getAllStudents,
  getAllPapsRecords,
  getStudentPapsRecords,
  savePapsRecord,
  getStudentLessonPlans,
  getStudentNeisNote,
  saveStudentNeisNote,
  exportClassDataAsCsv
} from '../services/storageService';

interface AllStudentsTabProps {
  currentStudent: StudentProfile | null;
  isTeacher: boolean;
  onOpenTeacherLogin: () => void;
  onSelectStudent: (student: StudentProfile) => void;
  onNavigateTab: (
    tab: 'dashboard' | 'fitt' | 'paps' | 'exercises' | 'timer' | 'neis' | 'all-students'
  ) => void;
}

export const AllStudentsTab: React.FC<AllStudentsTabProps> = ({
  currentStudent,
  isTeacher,
  onOpenTeacherLogin,
  onSelectStudent,
  onNavigateTab
}) => {
  // 상태 관리
  const [allStudents, setAllStudents] = useState<StudentProfile[]>(() => getAllStudents());
  const [allPapsRecords, setAllPapsRecords] = useState<PAPSRecord[]>(() => getAllPapsRecords());
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // 필터 및 검색
  const [selectedClass, setSelectedClass] = useState<'all' | '1' | '2'>('all');
  const [selectedGender, setSelectedGender] = useState<'all' | '남' | '여'>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5' | 'unmeasured'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'number' | 'score-desc' | 'score-asc' | 'name'>('number');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // 모달 상태
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 최신 레코드 다시 불러오기
  const refreshData = () => {
    setAllStudents(getAllStudents());
    setAllPapsRecords(getAllPapsRecords());
    setRefreshKey((prev) => prev + 1);
  };

  // 학생별 최신 PAPS 레코드 맵
  const studentPapsMap = useMemo(() => {
    const map = new Map<string, PAPSRecord>();
    allStudents.forEach((s) => {
      const records = allPapsRecords
        .filter((r) => r.studentId === s.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (records.length > 0) {
        map.set(s.id, records[0]);
      }
    });
    return map;
  }, [allStudents, allPapsRecords, refreshKey]);

  // 학생별 5차시 완료 개수 맵
  const studentLessonCountMap = useMemo(() => {
    const map = new Map<string, number>();
    allStudents.forEach((s) => {
      const plans = getStudentLessonPlans(s.id);
      const count = plans.filter((p) => p.isCompleted).length;
      map.set(s.id, count);
    });
    return map;
  }, [allStudents, refreshKey]);

  // 학생별 세특 저장 여부 맵
  const studentNeisNoteMap = useMemo(() => {
    const map = new Map<string, string>();
    allStudents.forEach((s) => {
      const note = getStudentNeisNote(s.id);
      if (note) map.set(s.id, note);
    });
    return map;
  }, [allStudents, refreshKey]);

  // 상단 종합 통계 계산
  const stats = useMemo(() => {
    const totalCount = allStudents.length;
    const measuredStudents = allStudents.filter((s) => studentPapsMap.has(s.id));
    const measuredCount = measuredStudents.length;
    const unmeasuredCount = totalCount - measuredCount;

    let grade1Count = 0;
    let grade2Count = 0;
    let grade3Count = 0;
    let grade4Count = 0;
    let grade5Count = 0;
    let totalScoreSum = 0;

    measuredStudents.forEach((s) => {
      const rec = studentPapsMap.get(s.id)!;
      totalScoreSum += rec.totalScore;
      if (rec.overallGrade === 1) grade1Count++;
      else if (rec.overallGrade === 2) grade2Count++;
      else if (rec.overallGrade === 3) grade3Count++;
      else if (rec.overallGrade === 4) grade4Count++;
      else if (rec.overallGrade === 5) grade5Count++;
    });

    const averageScore = measuredCount > 0 ? (totalScoreSum / measuredCount).toFixed(1) : '0';

    return {
      totalCount,
      measuredCount,
      unmeasuredCount,
      measureRate: Math.round((measuredCount / totalCount) * 100),
      grade1Count,
      grade2Count,
      grade3Count,
      grade4Count,
      grade5Count,
      averageScore
    };
  }, [allStudents, studentPapsMap]);

  // 필터링 및 정렬된 학생 목록
  const filteredStudents = useMemo(() => {
    return allStudents
      .filter((s) => {
        // 학급 필터
        if (selectedClass === '1' && s.classNum !== 1) return false;
        if (selectedClass === '2' && s.classNum !== 2) return false;

        // 성별 필터
        if (selectedGender !== 'all' && s.gender !== selectedGender) return false;

        // 등급 필터
        const paps = studentPapsMap.get(s.id);
        if (selectedGradeFilter === 'unmeasured') {
          if (paps) return false;
        } else if (selectedGradeFilter !== 'all') {
          if (!paps || paps.overallGrade !== Number(selectedGradeFilter)) return false;
        }

        // 검색어
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = s.name.toLowerCase().includes(q);
          const matchId = s.id.toLowerCase().includes(q);
          const matchNum = `${s.classNum}반 ${s.studentNum}번`.includes(q);
          if (!matchName && !matchId && !matchNum) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const papsA = studentPapsMap.get(a.id);
        const papsB = studentPapsMap.get(b.id);

        if (sortBy === 'number') {
          if (a.classNum !== b.classNum) return a.classNum - b.classNum;
          return a.studentNum - b.studentNum;
        }
        if (sortBy === 'score-desc') {
          const scoreA = papsA ? papsA.totalScore : -1;
          const scoreB = papsB ? papsB.totalScore : -1;
          return scoreB - scoreA;
        }
        if (sortBy === 'score-asc') {
          const scoreA = papsA ? papsA.totalScore : 999;
          const scoreB = papsB ? papsB.totalScore : 999;
          return scoreA - scoreB;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'ko');
        }
        return 0;
      });
  }, [
    allStudents,
    selectedClass,
    selectedGender,
    selectedGradeFilter,
    searchQuery,
    sortBy,
    studentPapsMap
  ]);

  // CSV 다운로드 핸들러
  const handleDownloadCsv = () => {
    const csvContent = exportClassDataAsCsv();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `신안해양과학고_1학년_전체_PAPS_체력기록부_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('전체 37명 PAPS 종합 기록 CSV 파일이 다운로드되었습니다!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#E8FD3B] text-black px-5 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 border border-black/10 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-[#E8FD3B]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#E8FD3B]/10 text-[#E8FD3B] border border-[#E8FD3B]/30 tracking-wider uppercase">
                신안해양과학고등학교 체육과
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#142245] text-sky-300 border border-[#1e2f5b]">
                1학년 전교생 37명 통합 기록실
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#142245] text-slate-300 border border-[#1e2f5b]">
                PAPS 5대 체력 요인 & FITT 실천 현황
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-[#E8FD3B]" />
              <span>전체 학생 체력 기록실 & 종합 일람표</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              신안해양과학고 1학년 학생들과 체육선생님 모두 전체 학급(1반 19명, 2반 18명)의 PAPS 실측치, 종합 등급,
              5차시 운동 처방 이수율을 한눈에 조회할 수 있으며, <strong>기록 수정 및 반영 권한은 체육교사만 보유</strong>합니다.
            </p>
          </div>

          {/* Teacher vs Student Status Pill */}
          <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] min-w-[280px] shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">나의 접근 모드</span>
              {isTeacher ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>체육교사 관리 모드</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-500/40">
                  <Eye className="w-3.5 h-3.5" />
                  <span>전체 조회 전용 모드</span>
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">수정 권한:</span>
                <span className={isTeacher ? 'text-[#E8FD3B] font-black' : 'text-slate-400 font-medium'}>
                  {isTeacher ? '전교생 기록 직접 수정 가능' : '체육교사 전용 (수정 불가)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">현재 접속 계정:</span>
                <span className="text-white font-extrabold">
                  {isTeacher ? '체육담당 교사' : currentStudent ? `${currentStudent.name} (${currentStudent.classNum}반 ${currentStudent.studentNum}번)` : '학생 로그인'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1e2f5b]/80 flex items-center justify-between gap-2">
              {!isTeacher ? (
                <button
                  onClick={onOpenTeacherLogin}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#142245] hover:bg-[#1d3164] text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>체육교사 관리자 인증</span>
                </button>
              ) : (
                <button
                  onClick={handleDownloadCsv}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>전체 기록 CSV 다운로드</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">1학년 전교생 현황</span>
            <Users className="w-4 h-4 text-[#E8FD3B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{stats.totalCount}명</span>
            <span className="text-xs text-sky-300 font-bold">1반 19명 · 2반 18명</span>
          </div>
          <div className="text-[11px] text-slate-400">신안해양과학고 공식 명부 동기화</div>
        </div>

        <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">PAPS 실측 완료율</span>
            <HeartPulse className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {stats.measuredCount}
              <span className="text-sm font-bold text-slate-400"> / {stats.totalCount}명</span>
            </span>
            <span className="text-xs text-[#E8FD3B] font-black font-mono">({stats.measureRate}%)</span>
          </div>
          <div className="w-full h-1.5 bg-[#142245] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${stats.measureRate}%` }}
            />
          </div>
        </div>

        <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">측정자 평균 총점</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{stats.averageScore}점</span>
            <span className="text-xs text-slate-400">/ 100점 만점</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {stats.measuredCount > 0 ? getGradeLabel(getOverallGrade(Number(stats.averageScore))) : '측정 대기 중'}
          </div>
        </div>

        <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">종합 등급별 분포</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              1등급 {stats.grade1Count}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40">
              2등급 {stats.grade2Count}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
              3등급 {stats.grade3Count}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
              4·5등급 {stats.grade4Count + stats.grade5Count}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            미측정: <strong className="text-amber-400">{stats.unmeasuredCount}명</strong>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] p-4 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Class and Gender Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#E8FD3B]" />
              <span>학급:</span>
            </span>
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedClass === 'all'
                  ? 'bg-[#E8FD3B] text-black font-black'
                  : 'bg-[#070e1e] text-slate-300 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              전체 (37명)
            </button>
            <button
              onClick={() => setSelectedClass('1')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedClass === '1'
                  ? 'bg-[#E8FD3B] text-black font-black'
                  : 'bg-[#070e1e] text-slate-300 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              1반 (19명)
            </button>
            <button
              onClick={() => setSelectedClass('2')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedClass === '2'
                  ? 'bg-[#E8FD3B] text-black font-black'
                  : 'bg-[#070e1e] text-slate-300 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              2반 (18명)
            </button>

            <span className="text-slate-600 mx-1">|</span>

            <span className="text-xs font-bold text-slate-400 mr-1">성별:</span>
            <button
              onClick={() => setSelectedGender('all')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedGender === 'all'
                  ? 'bg-[#142245] text-white border border-sky-400/50'
                  : 'bg-[#070e1e] text-slate-400 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setSelectedGender('남')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedGender === '남'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50'
                  : 'bg-[#070e1e] text-slate-400 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              남학생
            </button>
            <button
              onClick={() => setSelectedGender('여')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedGender === '여'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                  : 'bg-[#070e1e] text-slate-400 hover:text-white border border-[#1e2f5b]'
              }`}
            >
              여학생
            </button>
          </div>

          {/* Search, Sort and View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="학생 이름 / 학번 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-[#070e1e] px-2 py-1 rounded-xl border border-[#1e2f5b]">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
                >
                  <option value="number" className="bg-[#070e1e] text-white">
                    번호 순
                  </option>
                  <option value="score-desc" className="bg-[#070e1e] text-white">
                    PAPS 총점 높은 순
                  </option>
                  <option value="score-asc" className="bg-[#070e1e] text-white">
                    PAPS 총점 낮은 순
                  </option>
                  <option value="name" className="bg-[#070e1e] text-white">
                    이름 순
                  </option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-[#070e1e] p-0.5 rounded-xl border border-[#1e2f5b]">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-[#E8FD3B] text-black font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="표 형식으로 보기"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-[#E8FD3B] text-black font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="카드 그리드로 보기"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Pills Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1e2f5b]/60">
          <span className="text-[11px] font-bold text-slate-400 mr-1">등급 필터:</span>
          {[
            { key: 'all', label: '전체 등급' },
            { key: '1', label: '1등급' },
            { key: '2', label: '2등급' },
            { key: '3', label: '3등급' },
            { key: '4', label: '4등급' },
            { key: '5', label: '5등급' },
            { key: 'unmeasured', label: '미측정' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedGradeFilter(item.key as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedGradeFilter === item.key
                  ? 'bg-[#142245] text-[#E8FD3B] border border-[#E8FD3B]/50'
                  : 'bg-[#070e1e] text-slate-400 hover:text-slate-200 border border-[#1e2f5b]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="text-[11px] text-slate-500 ml-auto">
            조회 결과: <strong className="text-white font-mono">{filteredStudents.length}</strong>명
          </span>
        </div>
      </div>

      {/* Main Content: Table View vs Card Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#070e1e] text-slate-400 font-extrabold uppercase border-b border-[#1e2f5b] tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">번호</th>
                  <th className="py-3.5 px-4">학생명</th>
                  <th className="py-3.5 px-3 text-center">종합 등급</th>
                  <th className="py-3.5 px-3 text-center">총점</th>
                  <th className="py-3.5 px-3">심폐지구력</th>
                  <th className="py-3.5 px-3">유연성</th>
                  <th className="py-3.5 px-3">근력·근지구력</th>
                  <th className="py-3.5 px-3">순발력</th>
                  <th className="py-3.5 px-3">신체조성(BMI)</th>
                  <th className="py-3.5 px-3 text-center">5차시 실천</th>
                  <th className="py-3.5 px-3 text-center">세특</th>
                  <th className="py-3.5 px-4 text-center">관리·조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f5b]/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 text-sm">
                      조건에 일치하는 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => {
                    const paps = studentPapsMap.get(s.id);
                    const lessonCount = studentLessonCountMap.get(s.id) || 0;
                    const hasNeis = Boolean(studentNeisNoteMap.get(s.id));
                    const isSelf = currentStudent?.id === s.id;

                    return (
                      <tr
                        key={s.id}
                        className={`transition hover:bg-[#142245]/50 ${
                          isSelf ? 'bg-sky-950/20' : ''
                        }`}
                      >
                        {/* Number */}
                        <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                          <span className="text-slate-400 text-[10px] mr-1">{s.classNum}반</span>
                          <span>{s.studentNum}번</span>
                        </td>

                        {/* Name & Gender */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">{s.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                s.gender === '남'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {s.gender}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] font-black bg-[#E8FD3B] text-black px-1.5 py-0.2 rounded">
                                나
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Overall Grade */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {paps ? (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-black border ${getGradeColor(
                                paps.overallGrade
                              ).badge}`}
                            >
                              {paps.overallGrade}등급
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold text-xs">미측정</span>
                          )}
                        </td>

                        {/* Total Score */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {paps ? (
                            <span className="font-mono font-black text-sm text-[#E8FD3B]">
                              {paps.totalScore}
                              <span className="text-[10px] text-slate-400 font-normal">점</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Cardio */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {paps ? (
                            <div className="text-xs">
                              <span className="font-mono font-bold text-white">
                                {paps.cardio.value} {paps.cardio.unit}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({paps.cardio.grade}등급)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Flexibility */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {paps ? (
                            <div className="text-xs">
                              <span className="font-mono font-bold text-white">
                                {paps.flexibility.value} cm
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({paps.flexibility.grade}등급)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Strength */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {paps ? (
                            <div className="text-xs">
                              <span className="font-mono font-bold text-white">
                                {paps.strength.value} {paps.strength.unit}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({paps.strength.grade}등급)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Agility */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {paps ? (
                            <div className="text-xs">
                              <span className="font-mono font-bold text-white">
                                {paps.agility.value} {paps.agility.unit}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({paps.agility.grade}등급)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Body Composition (BMI) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {paps && paps.bodyComp ? (
                            <div className="text-xs">
                              <span className="font-mono font-bold text-white">
                                {paps.bodyComp.bmi}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({paps.bodyComp.status || `${paps.bodyComp.grade}등급`})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Lesson Count */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold font-mono text-[11px] ${
                              lessonCount === 5
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : lessonCount > 0
                                ? 'bg-[#142245] text-sky-300'
                                : 'bg-[#070e1e] text-slate-500'
                            }`}
                          >
                            {lessonCount}/5차시
                          </span>
                        </td>

                        {/* NEIS Note Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {hasNeis ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>작성</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">미작성</span>
                          )}
                        </td>

                        {/* Action Buttons: Teacher vs Student */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {isTeacher ? (
                              <button
                                onClick={() => setEditingStudent(s)}
                                className="px-2.5 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-[11px] font-black flex items-center gap-1 transition shadow-xs cursor-pointer"
                                title="체육교사 권한: PAPS 측정치 직접 수정 및 반영"
                              >
                                <PenTool className="w-3 h-3" />
                                <span>기록 수정</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setViewingStudent(s)}
                                className="px-2.5 py-1.5 rounded-xl bg-[#142245] hover:bg-[#1e3264] text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="학생 조회 전용: 상세 성취도 열람"
                              >
                                <Eye className="w-3 h-3" />
                                <span>상세 조회</span>
                              </button>
                            )}

                            {/* Move to NEIS or Profile shortcut */}
                            <button
                              onClick={() => {
                                onSelectStudent(s);
                                onNavigateTab('neis');
                              }}
                              className="p-1.5 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-slate-400 hover:text-white border border-[#1e2f5b] transition cursor-pointer"
                              title="생활기록부 세특 탭으로 이동"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s) => {
            const paps = studentPapsMap.get(s.id);
            const lessonCount = studentLessonCountMap.get(s.id) || 0;
            const hasNeis = Boolean(studentNeisNoteMap.get(s.id));
            const isSelf = currentStudent?.id === s.id;

            return (
              <div
                key={s.id}
                className={`bg-[#0d172e] rounded-3xl border p-5 shadow-xl transition flex flex-col justify-between gap-4 ${
                  isSelf
                    ? 'border-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                    : 'border-[#1e2f5b] hover:border-[#E8FD3B]/30'
                }`}
              >
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#070e1e] border border-[#1e2f5b] text-white flex items-center justify-center font-mono font-black text-sm">
                      {s.classNum}-{s.studentNum}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">{s.name}</h3>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            s.gender === '남'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {s.gender}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-black bg-[#E8FD3B] text-black px-1.5 py-0.2 rounded">
                            나
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        신안해양과학고 1학년 {s.classNum}반
                      </span>
                    </div>
                  </div>

                  {paps ? (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black border ${getGradeColor(
                        paps.overallGrade
                      ).badge}`}
                    >
                      {paps.overallGrade}등급 ({paps.totalScore}점)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                      PAPS 미측정
                    </span>
                  )}
                </div>

                {/* Card Metrics */}
                {paps ? (
                  <div className="grid grid-cols-2 gap-2 bg-[#070e1e] p-3 rounded-2xl border border-[#1e2f5b]">
                    <div className="text-xs space-y-0.5">
                      <span className="text-slate-400 text-[10px] block">심폐지구력</span>
                      <strong className="text-white font-mono">{paps.cardio.value} {paps.cardio.unit}</strong>
                      <span className="text-slate-400 text-[10px] ml-1">({paps.cardio.grade}등급)</span>
                    </div>
                    <div className="text-xs space-y-0.5">
                      <span className="text-slate-400 text-[10px] block">유연성</span>
                      <strong className="text-white font-mono">{paps.flexibility.value} cm</strong>
                      <span className="text-slate-400 text-[10px] ml-1">({paps.flexibility.grade}등급)</span>
                    </div>
                    <div className="text-xs space-y-0.5">
                      <span className="text-slate-400 text-[10px] block">근력·근지구력</span>
                      <strong className="text-white font-mono">{paps.strength.value} {paps.strength.unit}</strong>
                      <span className="text-slate-400 text-[10px] ml-1">({paps.strength.grade}등급)</span>
                    </div>
                    <div className="text-xs space-y-0.5">
                      <span className="text-slate-400 text-[10px] block">순발력</span>
                      <strong className="text-white font-mono">{paps.agility.value} {paps.agility.unit}</strong>
                      <span className="text-slate-400 text-[10px] ml-1">({paps.agility.grade}등급)</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] text-center text-xs text-slate-400">
                    체육수업 측정 대기 중입니다.
                  </div>
                )}

                {/* Progress & Bottom Actions */}
                <div className="pt-2 border-t border-[#1e2f5b]/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">실습:</span>
                    <span className="font-bold text-white font-mono">{lessonCount}/5차시</span>
                    <span className="text-slate-600">·</span>
                    <span className={hasNeis ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {hasNeis ? '세특 작성' : '세특 미작성'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isTeacher ? (
                      <button
                        onClick={() => setEditingStudent(s)}
                        className="px-3 py-1.5 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <PenTool className="w-3 h-3" />
                        <span>수정</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setViewingStudent(s)}
                        className="px-3 py-1.5 rounded-xl bg-[#142245] hover:bg-[#1e3264] text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>조회</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Teacher-Only: Edit PAPS Record Modal */}
      {editingStudent && isTeacher && (
        <EditPapsModal
          student={editingStudent}
          currentRecord={studentPapsMap.get(editingStudent.id) || null}
          onClose={() => setEditingStudent(null)}
          onSaveSuccess={(savedRec) => {
            setEditingStudent(null);
            refreshData();
            showToast(`${editingStudent.name} 학생의 PAPS 기록이 성공적으로 수정·저장되었습니다!`);
          }}
        />
      )}

      {/* Student/Teacher: View Detail Modal */}
      {viewingStudent && (
        <ViewDetailModal
          student={viewingStudent}
          record={studentPapsMap.get(viewingStudent.id) || null}
          isTeacher={isTeacher}
          onClose={() => setViewingStudent(null)}
          onSwitchToEdit={() => {
            setEditingStudent(viewingStudent);
            setViewingStudent(null);
          }}
          onOpenTeacherLogin={onOpenTeacherLogin}
          onNavigateNeis={() => {
            onSelectStudent(viewingStudent);
            onNavigateTab('neis');
            setViewingStudent(null);
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// 1. 체육교사용 PAPS 기록 수정 모달 컴포넌트
// ==========================================
interface EditPapsModalProps {
  student: StudentProfile;
  currentRecord: PAPSRecord | null;
  onClose: () => void;
  onSaveSuccess: (record: PAPSRecord) => void;
}

const EditPapsModal: React.FC<EditPapsModalProps> = ({
  student,
  currentRecord,
  onClose,
  onSaveSuccess
}) => {
  const gender = student.gender;

  // 폼 입력 상태
  const [date, setDate] = useState<string>(
    currentRecord?.date || new Date().toISOString().split('T')[0]
  );
  const [cardioTest, setCardioTest] = useState<CardioTest>(
    (currentRecord?.cardio.testType as CardioTest) || '왕복오래달리기'
  );
  const [cardioValue, setCardioValue] = useState<number>(currentRecord?.cardio.value || 60);

  const [flexibilityValue, setFlexibilityValue] = useState<number>(
    currentRecord?.flexibility.value || 15.0
  );

  const [strengthTest, setStrengthTest] = useState<StrengthTest>(
    (currentRecord?.strength.testType as StrengthTest) || '악력'
  );
  const [strengthValue, setStrengthValue] = useState<number>(currentRecord?.strength.value || 40.0);

  const [agilityTest, setAgilityTest] = useState<AgilityTest>(
    (currentRecord?.agility.testType as AgilityTest) || '제자리멀리뛰기'
  );
  const [agilityValue, setAgilityValue] = useState<number>(currentRecord?.agility.value || 215);

  const [height, setHeight] = useState<number>(currentRecord?.bodyComp.height || 172);
  const [weight, setWeight] = useState<number>(currentRecord?.bodyComp.weight || 62);

  // 실시간 점수 및 등급 자동 산출
  const evaluated = useMemo(() => {
    // 1) 심폐
    const cardioThreshold = (PAPS_STANDARDS[gender] as any)[cardioTest];
    const cardioRes = cardioThreshold
      ? evaluateGrade(cardioValue, cardioThreshold)
      : { grade: 3, score: 12 };

    // 2) 유연성
    const flexThreshold = PAPS_STANDARDS[gender].앉아윗몸앞으로굽히기;
    const flexRes = evaluateGrade(flexibilityValue, flexThreshold);

    // 3) 근력
    const strengthThreshold = (PAPS_STANDARDS[gender] as any)[strengthTest];
    const strengthRes = strengthThreshold
      ? evaluateGrade(strengthValue, strengthThreshold)
      : { grade: 3, score: 12 };

    // 4) 순발력
    const agilityThreshold = (PAPS_STANDARDS[gender] as any)[agilityTest];
    const agilityRes = agilityThreshold
      ? evaluateGrade(agilityValue, agilityThreshold)
      : { grade: 3, score: 12 };

    // 5) 신체조성
    const bmiRes = evaluateBMI(height, weight);

    // 총점 및 종합등급
    const totalScore =
      cardioRes.score + flexRes.score + strengthRes.score + agilityRes.score + bmiRes.score;
    const overallGrade = getOverallGrade(totalScore);

    return {
      cardio: { testType: cardioTest, value: cardioValue, unit: cardioTest === '왕복오래달리기' ? '회' : '초', ...cardioRes },
      flexibility: { testType: '앉아윗몸앞으로굽히기', value: flexibilityValue, unit: 'cm', ...flexRes },
      strength: { testType: strengthTest, value: strengthValue, unit: strengthTest === '악력' ? 'kg' : '회', ...strengthRes },
      agility: { testType: agilityTest, value: agilityValue, unit: agilityTest === '제자리멀리뛰기' ? 'cm' : '초', ...agilityRes },
      bodyComp: { height, weight, ...bmiRes },
      totalScore,
      overallGrade
    };
  }, [
    gender,
    cardioTest,
    cardioValue,
    flexibilityValue,
    strengthTest,
    strengthValue,
    agilityTest,
    agilityValue,
    height,
    weight
  ]);

  // 저장 처리
  const handleSave = async () => {
    const updatedRecord: PAPSRecord = {
      id: currentRecord?.id || `paps_${student.id}_${Date.now()}`,
      studentId: student.id,
      date,
      gender,
      cardio: evaluated.cardio,
      flexibility: evaluated.flexibility,
      strength: evaluated.strength,
      agility: evaluated.agility,
      bodyComp: evaluated.bodyComp,
      totalScore: evaluated.totalScore,
      overallGrade: evaluated.overallGrade,
      teacherFeedback: currentRecord?.teacherFeedback || ''
    };

    // 최신 추천 세특 문구도 갱신 동기화
    const neis = generateNEISRecommendation(student.name, updatedRecord, undefined, 5);
    updatedRecord.neisNote = currentRecord?.neisNote || neis.summary;

    await savePapsRecord(updatedRecord);
    onSaveSuccess(updatedRecord);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0d172e] border border-[#1e2f5b] w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6 my-8 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#1e2f5b]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E8FD3B] text-black flex items-center justify-center font-black">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">{student.name} 학생 PAPS 기록 수정</h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#142245] text-sky-300 font-bold border border-[#1e2f5b]">
                  {student.classNum}반 {student.studentNum}번 ({student.gender})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                체육교사 권한으로 측정치를 수정하면 PAPS 등급 및 총점이 즉시 자동 재계산됩니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#E8FD3B]/40 flex items-center justify-between gap-4 shadow-inner">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-400">실시간 등급 자동 판정 결과</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-[#E8FD3B] font-mono">
                {evaluated.totalScore}
                <span className="text-xs font-normal text-slate-400"> / 100점</span>
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${getGradeColor(
                  evaluated.overallGrade
                ).badge}`}
              >
                {getGradeLabel(evaluated.overallGrade)}
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-300 font-mono hidden sm:block">
            <div>심폐: {evaluated.cardio.score}점({evaluated.cardio.grade}등급)</div>
            <div>유연: {evaluated.flexibility.score}점 · 근력: {evaluated.strength.score}점</div>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {/* Measurement Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">측정 일자</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3.5 py-2 text-sm text-white outline-none"
            />
          </div>

          {/* 1. 심폐지구력 */}
          <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white">1. 심폐지구력</span>
              <span className="text-[#E8FD3B] font-bold">
                {evaluated.cardio.grade}등급 ({evaluated.cardio.score}점)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={cardioTest}
                onChange={(e) => setCardioTest(e.target.value as CardioTest)}
                className="bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="왕복오래달리기">왕복오래달리기 (회)</option>
                <option value="오래달리기걷기">오래달리기걷기 (초)</option>
                <option value="스텝검사">스텝검사</option>
              </select>
              <input
                type="number"
                value={cardioValue}
                onChange={(e) => setCardioValue(Number(e.target.value))}
                step="1"
                className="bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                placeholder="측정값 입력"
              />
            </div>
          </div>

          {/* 2. 유연성 */}
          <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white">2. 유연성 (앉아윗몸앞으로굽히기)</span>
              <span className="text-[#E8FD3B] font-bold">
                {evaluated.flexibility.grade}등급 ({evaluated.flexibility.score}점)
              </span>
            </div>
            <div>
              <input
                type="number"
                value={flexibilityValue}
                onChange={(e) => setFlexibilityValue(Number(e.target.value))}
                step="0.1"
                className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                placeholder="cm 단위 입력 (예: 18.5)"
              />
            </div>
          </div>

          {/* 3. 근력 및 근지구력 */}
          <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white">3. 근력 및 근지구력</span>
              <span className="text-[#E8FD3B] font-bold">
                {evaluated.strength.grade}등급 ({evaluated.strength.score}점)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={strengthTest}
                onChange={(e) => setStrengthTest(e.target.value as StrengthTest)}
                className="bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="악력">악력 (kg)</option>
                <option value="팔굽혀펴기">팔굽혀펴기 (회)</option>
                <option value="윗몸말아올리기">윗몸말아올리기 (회)</option>
              </select>
              <input
                type="number"
                value={strengthValue}
                onChange={(e) => setStrengthValue(Number(e.target.value))}
                step="0.1"
                className="bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                placeholder="측정값 입력"
              />
            </div>
          </div>

          {/* 4. 순발력 */}
          <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white">4. 순발력</span>
              <span className="text-[#E8FD3B] font-bold">
                {evaluated.agility.grade}등급 ({evaluated.agility.score}점)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={agilityTest}
                onChange={(e) => setAgilityTest(e.target.value as AgilityTest)}
                className="bg-[#0d172e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="제자리멀리뛰기">제자리멀리뛰기 (cm)</option>
                <option value="50m달리기">50m 달리기 (초)</option>
              </select>
              <input
                type="number"
                value={agilityValue}
                onChange={(e) => setAgilityValue(Number(e.target.value))}
                step="0.1"
                className="bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                placeholder="측정값 입력"
              />
            </div>
          </div>

          {/* 5. 신체조성 */}
          <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white">
                5. 신체조성 (BMI: {evaluated.bodyComp.bmi} - {evaluated.bodyComp.status})
              </span>
              <span className="text-[#E8FD3B] font-bold">
                {evaluated.bodyComp.grade}등급 ({evaluated.bodyComp.score}점)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">신장 (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  step="0.1"
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                  placeholder="cm"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">체중 (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  step="0.1"
                  className="w-full bg-[#0d172e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                  placeholder="kg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1e2f5b]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-[#070e1e] hover:bg-[#142245] text-slate-400 hover:text-white border border-[#1e2f5b] text-xs font-bold transition cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-2 transition shadow-[0_0_20px_rgba(232,253,59,0.25)] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>수정사항 공식 반영 및 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. 학생/교사 공통 상세 조회 모달
// ==========================================
interface ViewDetailModalProps {
  student: StudentProfile;
  record: PAPSRecord | null;
  isTeacher: boolean;
  onClose: () => void;
  onSwitchToEdit: () => void;
  onOpenTeacherLogin: () => void;
  onNavigateNeis: () => void;
}

const ViewDetailModal: React.FC<ViewDetailModalProps> = ({
  student,
  record,
  isTeacher,
  onClose,
  onSwitchToEdit,
  onOpenTeacherLogin,
  onNavigateNeis
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0d172e] border border-[#1e2f5b] w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 my-8 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#1e2f5b]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">{student.name} 학생 체력 성취표</h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#142245] text-sky-300 font-bold border border-[#1e2f5b]">
                1학년 {student.classNum}반 {student.studentNum}번 ({student.gender})
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              신안해양과학고등학교 공식 PAPS 기록 일람
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Status */}
        {record ? (
          <div className="space-y-4">
            <div className="bg-[#070e1e] p-4 rounded-2xl border border-[#1e2f5b] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">PAPS 종합 결과</span>
                <span className="text-2xl font-black text-[#E8FD3B] font-mono">
                  {record.totalScore}점
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${getGradeColor(
                  record.overallGrade
                ).badge}`}
              >
                {getGradeLabel(record.overallGrade)}
              </span>
            </div>

            {/* 5 Factors */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400">5대 체력 요인별 측정 결과</h4>
              <div className="space-y-1.5">
                {[
                  { label: '심폐지구력', val: `${record.cardio.value} ${record.cardio.unit}`, grade: record.cardio.grade, score: record.cardio.score },
                  { label: '유연성', val: `${record.flexibility.value} cm`, grade: record.flexibility.grade, score: record.flexibility.score },
                  { label: '근력·근지구력', val: `${record.strength.value} ${record.strength.unit}`, grade: record.strength.grade, score: record.strength.score },
                  { label: '순발력', val: `${record.agility.value} ${record.agility.unit}`, grade: record.agility.grade, score: record.agility.score },
                  { label: '신체조성(BMI)', val: `${record.bodyComp.bmi} (${record.bodyComp.status || '정상'})`, grade: record.bodyComp.grade, score: record.bodyComp.score }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#070e1e] rounded-xl border border-[#1e2f5b] flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-300">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-white">{item.val}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${getGradeColor(
                          item.grade
                        ).badge}`}
                      >
                        {item.grade}등급 ({item.score}점)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NEIS Note Preview */}
            {record.neisNote && (
              <div className="p-3.5 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-1">
                <span className="text-[11px] font-bold text-[#E8FD3B] block">생활기록부 추천 세특</span>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {record.neisNote}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#070e1e] p-8 rounded-2xl border border-[#1e2f5b] text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-sm font-bold text-white">아직 등록된 PAPS 측정 기록이 없습니다.</p>
            <p className="text-xs text-slate-400">
              체육 수업 실측 후 선생님께서 기록을 등록해주시면 조회하실 수 있습니다.
            </p>
          </div>
        )}

        {/* Permission Guidance & Action Buttons */}
        <div className="space-y-3 pt-3 border-t border-[#1e2f5b]">
          {!isTeacher ? (
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-sky-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>기록 수정은 체육선생님 고유 권한입니다.</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenTeacherLogin();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#142245] text-amber-300 font-bold border border-amber-500/30 hover:bg-[#1d3164] transition cursor-pointer shrink-0"
              >
                교사 인증
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>체육교사 수정 권한 보유</span>
              </span>
              <button
                onClick={onSwitchToEdit}
                className="px-4 py-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>기록 직접 수정하기</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onNavigateNeis}
              className="px-4 py-2 rounded-xl bg-[#142245] hover:bg-[#1e3264] text-slate-200 border border-[#1e2f5b] text-xs font-bold transition cursor-pointer"
            >
              세특 생성기로 이동
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-slate-400 hover:text-white border border-[#1e2f5b] text-xs font-bold transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
