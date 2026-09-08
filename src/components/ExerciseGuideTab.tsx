import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Zap,
  Heart,
  StretchVertical,
  Dumbbell,
  Timer,
  ChevronRight,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { ExerciseCategory, ExerciseGuideItem } from '../types';
import { EXERCISE_GUIDES } from '../data/exerciseGuides';

interface ExerciseGuideTabProps {
  onSelectForTimer: (exerciseName: string, category: string) => void;
}

export const ExerciseGuideTab: React.FC<ExerciseGuideTabProps> = ({ onSelectForTimer }) => {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | '전체'>('전체');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeModalItem, setActiveModalItem] = useState<ExerciseGuideItem | null>(null);

  const categories = useMemo(() => {
    return [
      { id: '전체' as const, label: `전체 (${EXERCISE_GUIDES.length}종)`, icon: Activity },
      { id: '순발력' as const, label: `순발력 (${EXERCISE_GUIDES.filter((e) => e.category === '순발력').length}종)`, icon: Zap },
      { id: '심폐지구력' as const, label: `심폐지구력 (${EXERCISE_GUIDES.filter((e) => e.category === '심폐지구력').length}종)`, icon: Heart },
      { id: '유연성' as const, label: `유연성 (${EXERCISE_GUIDES.filter((e) => e.category === '유연성').length}종)`, icon: StretchVertical },
      { id: '근력 및 근지구력' as const, label: `근력·근지구력 (${EXERCISE_GUIDES.filter((e) => e.category === '근력 및 근지구력').length}종)`, icon: Dumbbell }
    ];
  }, []);

  const filteredExercises = useMemo(() => {
    return EXERCISE_GUIDES.filter((item) => {
      const matchCategory = selectedCategory === '전체' || item.category === selectedCategory;
      const musclesStr = Array.isArray(item.targetMuscles)
        ? item.targetMuscles.join(' ')
        : String(item.targetMuscles);
      const titleStr = item.title || item.name;
      const summaryStr = item.summary || item.description || '';
      const matchSearch =
        !searchTerm.trim() ||
        titleStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        musclesStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summaryStr.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchTerm]);

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case '초급':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
      case '중급':
        return 'bg-sky-950/60 text-sky-300 border-sky-500/30';
      case '고급':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/30';
      default:
        return 'bg-[#142245] text-slate-300 border-[#1e2f5b]';
    }
  };

  const getCategoryColor = (cat: ExerciseCategory) => {
    switch (cat) {
      case '순발력':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/30';
      case '심폐지구력':
        return 'text-sky-400 bg-sky-950/60 border-sky-500/30';
      case '유연성':
        return 'text-teal-400 bg-teal-950/60 border-teal-500/30';
      case '근력 및 근지구력':
        return 'text-[#E8FD3B] bg-[#E8FD3B]/10 border-[#E8FD3B]/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
              4대 체력 요소 총 38종 완벽 가이드
            </span>
            <span className="text-xs text-sky-300 font-bold bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-800/60">
              신안해양과학고 체육 실습 라이브러리
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            체력 증진 맞춤형 운동 가이드 & 실습 라이브러리
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            순발력, 심폐지구력, 유연성, 근력·근지구력 종목별 올바른 자세, 세부 단계, 부상 방지 주의사항을 학습하고 스마트 타이머로 실습하세요.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="운동 종목, 부위, 키워드 검색..."
            className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 2. Category Filter Chips */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#E8FD3B] text-black shadow-[0_0_15px_rgba(232,253,59,0.3)]'
                  : 'bg-[#0d172e] text-slate-300 hover:text-white hover:bg-[#142245] border border-[#1e2f5b]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'stroke-[2.5]' : ''}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Exercise Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredExercises.map((item) => {
          const badgeClass = getDifficultyBadge(item.difficulty);
          const catClass = getCategoryColor(item.category);
          return (
            <div
              key={item.id}
              className="bg-[#0d172e] rounded-3xl border border-[#1e2f5b] hover:border-[#E8FD3B]/50 p-5 shadow-xl transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catClass}`}>
                    {item.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                    {item.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-black text-white group-hover:text-[#E8FD3B] transition mb-1">
                  {item.name}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {item.summary || item.description}
                </p>

                <div className="space-y-1 text-[11px] text-slate-400 mb-4 bg-[#070e1e] p-2.5 rounded-2xl border border-[#1e2f5b]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 font-semibold">주동근:</span>
                    <span className="text-slate-300 font-medium">
                      {Array.isArray(item.targetMuscles) ? item.targetMuscles.join(', ') : item.targetMuscles}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 font-semibold">권장:</span>
                    <span className="text-slate-300 font-medium">{item.recommendedSets}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#1e2f5b]">
                <button
                  type="button"
                  onClick={() => setActiveModalItem(item)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#142245] hover:bg-[#1a2b56] text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  자세 상세
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectForTimer(item.name, item.category)}
                  className="p-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black transition shadow-[0_0_10px_rgba(232,253,59,0.25)] cursor-pointer"
                  title="스마트 타이머로 실습하기"
                >
                  <Timer className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredExercises.length === 0 && (
        <div className="p-12 text-center bg-[#0d172e] rounded-3xl border border-dashed border-[#1e2f5b]">
          <p className="text-sm text-slate-400">
            검색 결과와 일치하는 체력 운동 가이드가 없습니다. 다른 검색어를 입력해보세요.
          </p>
        </div>
      )}

      {/* 4. Detail Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0d172e] border border-[#1e2f5b] rounded-3xl shadow-2xl p-6 text-white space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#1e2f5b]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(activeModalItem.category)}`}>
                    {activeModalItem.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyBadge(activeModalItem.difficulty)}`}>
                    {activeModalItem.difficulty}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">{activeModalItem.name}</h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#142245] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeModalItem.summary || activeModalItem.description}
            </p>

            {/* Target Muscles & Sets */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  단련 부위 및 주동근
                </span>
                <span className="text-xs font-extrabold text-sky-400">
                  {Array.isArray(activeModalItem.targetMuscles)
                    ? activeModalItem.targetMuscles.join(', ')
                    : activeModalItem.targetMuscles}
                </span>
              </div>
              <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b]">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  체육수업 권장 실습량
                </span>
                <span className="text-xs font-extrabold text-[#E8FD3B]">
                  {activeModalItem.recommendedSets}
                </span>
              </div>
            </div>

            {/* Steps */}
            {activeModalItem.steps && activeModalItem.steps.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">
                  단계별 올바른 수행 방법
                </h4>
                <div className="space-y-2">
                  {activeModalItem.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-slate-300 bg-[#070e1e] p-3 rounded-2xl border border-[#1e2f5b]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#E8FD3B] text-black font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Tips */}
            {activeModalItem.safetyTips && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>부상 방지 주의사항 및 팁</span>
                </div>
                <p className="leading-relaxed pl-5">{activeModalItem.safetyTips}</p>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1e2f5b]">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-4 py-2 rounded-xl bg-[#142245] text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  onSelectForTimer(activeModalItem.name, activeModalItem.category);
                  setActiveModalItem(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(232,253,59,0.3)] transition cursor-pointer"
              >
                <Timer className="w-4 h-4 stroke-[2.5]" />
                이 운동으로 타이머 실습 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
