import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Award,
  Save,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Lock,
  ShieldCheck
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
  getGradeLabel,
  getGradeColor,
  generateNEISRecommendation
} from '../data/papsStandards';
import {
  savePapsRecord,
  syncToGoogleSheet,
  exportToGoogleSheetGas
} from '../services/storageService';

interface PapsTabProps {
  student: StudentProfile | null;
  records: PAPSRecord[];
  onSaveSuccess: (record: PAPSRecord) => void;
  onOpenAuth: () => void;
  isTeacher?: boolean;
  onDeleteRecord?: (recordId: string) => void;
}

export const PapsTab: React.FC<PapsTabProps> = ({
  student,
  records,
  onSaveSuccess,
  onOpenAuth,
  isTeacher = false,
  onDeleteRecord
}) => {
  const gender = student?.gender || '남';

  // 1. Cardio
  const [cardioTest, setCardioTest] = useState<CardioTest>('왕복오래달리기');
  const [cardioVal, setCardioVal] = useState<number>(65);

  // 2. Flexibility
  const [flexibilityTest] = useState<FlexibilityTest>('앉아윗몸앞으로굽히기');
  const [flexibilityVal, setFlexibilityVal] = useState<number>(15.5);

  // 3. Strength
  const [strengthTest, setStrengthTest] = useState<StrengthTest>('악력');
  const [strengthVal, setStrengthVal] = useState<number>(44.0);

  // 4. Agility
  const [agilityTest, setAgilityTest] = useState<AgilityTest>('제자리멀리뛰기');
  const [agilityVal, setAgilityVal] = useState<number>(230);

  // 5. Body Comp
  const [heightCm, setHeightCm] = useState<number>(172.5);
  const [weightKg, setWeightKg] = useState<number>(63.0);

  // Options
  const [targetOverallGrade, setTargetOverallGrade] = useState<number>(1);
  const [isGoalMode, setIsGoalMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Grade Calculations
  const evaluations = useMemo(() => {
    const safeGender: '남' | '여' = gender === '여' ? '여' : '남';
    const standards = PAPS_STANDARDS[safeGender] || PAPS_STANDARDS['남'];

    const cardioStandard = (standards as any)[cardioTest] || standards.왕복오래달리기;
    const cardio = evaluateGrade(cardioVal, cardioStandard);

    const flexibilityStandard = (standards as any)[flexibilityTest] || standards.앉아윗몸앞으로굽히기;
    const flexibility = evaluateGrade(flexibilityVal, flexibilityStandard);

    const strengthStandard = (standards as any)[strengthTest] || standards.악력;
    const strength = evaluateGrade(strengthVal, strengthStandard);

    const agilityStandard = (standards as any)[agilityTest] || standards.제자리멀리뛰기;
    const agility = evaluateGrade(agilityVal, agilityStandard);

    const bodyComp = evaluateBMI(heightCm, weightKg, safeGender);

    const totalScore = cardio.score + flexibility.score + strength.score + agility.score + bodyComp.score;
    const overallGrade = getOverallGrade(totalScore);

    return {
      cardio: { testType: cardioTest, value: cardioVal, unit: cardioTest === '왕복오래달리기' ? '회' : '초', grade: cardio.grade, score: cardio.score },
      flexibility: { testType: flexibilityTest, value: flexibilityVal, unit: 'cm', grade: flexibility.grade, score: flexibility.score },
      strength: { testType: strengthTest, value: strengthVal, unit: strengthTest === '악력' ? 'kg' : '회', grade: strength.grade, score: strength.score },
      agility: { testType: agilityTest, value: agilityVal, unit: agilityTest === '제자리멀리뛰기' ? 'cm' : '초', grade: agility.grade, score: agility.score },
      bodyComp,
      totalScore,
      overallGrade
    };
  }, [cardioTest, cardioVal, flexibilityTest, flexibilityVal, strengthTest, strengthVal, agilityTest, agilityVal, heightCm, weightKg, gender]);

  const handleSave = async () => {
    if (!student) {
      onOpenAuth();
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);

    const neis = generateNEISRecommendation(student.name, {
      ...evaluations,
      id: '',
      studentId: student.id,
      date: new Date().toISOString().split('T')[0],
      gender
    });

    const newRecord: PAPSRecord = {
      id: `paps_${student.id}_${Date.now()}`,
      studentId: student.id,
      date: new Date().toISOString().split('T')[0],
      gender,
      isGoal: isGoalMode,
      cardio: evaluations.cardio,
      flexibility: evaluations.flexibility,
      strength: evaluations.strength,
      agility: evaluations.agility,
      bodyComp: evaluations.bodyComp,
      totalScore: evaluations.totalScore,
      overallGrade: evaluations.overallGrade,
      neisNote: neis.summary
    };

    savePapsRecord(newRecord);
    onSaveSuccess(newRecord);

    try {
      await syncToGoogleSheet({
        action: 'paps_record',
        student,
        data: {
          ...newRecord,
          studentName: student.name,
          classNum: student.classNum,
          studentNum: student.studentNum,
          cardio: `${evaluations.cardio.value}${evaluations.cardio.unit} (${evaluations.cardio.grade}등급)`,
          flexibility: `${evaluations.flexibility.value}cm (${evaluations.flexibility.grade}등급)`,
          strength: `${evaluations.strength.value}${evaluations.strength.unit} (${evaluations.strength.grade}등급)`,
          agility: `${evaluations.agility.value}${evaluations.agility.unit} (${evaluations.agility.grade}등급)`,
          bmi: `${evaluations.bodyComp.bmi} (${evaluations.bodyComp.status})`
        }
      });
    } catch {
      // Background sheet sync fallback
    }

    setIsSaving(false);
    setSaveSuccessMsg(`PAPS 측정 기록이 성공적으로 저장되었습니다! (종합 ${evaluations.overallGrade}등급, ${evaluations.totalScore}점)`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Google Apps Script(GAS) 웹앱 수동 내보내기
  const handleExportPapsToGas = async () => {
    if (!student) {
      alert('학생 인증 정보가 없습니다.');
      return;
    }
    setIsSaving(true);
    const payload = {
      studentId: student.id,
      studentName: student.name,
      gender,
      overallGrade: evaluations.overallGrade,
      totalScore: evaluations.totalScore,
      cardio: evaluations.cardio,
      flexibility: evaluations.flexibility,
      strength: evaluations.strength,
      agility: evaluations.agility,
      bodyComp: evaluations.bodyComp
    };

    const res = await exportToGoogleSheetGas('PAPS', payload);
    setIsSaving(false);
    setSaveSuccessMsg(res.message);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  const overallColors = getGradeColor(evaluations.overallGrade);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold text-[#E8FD3B] bg-[#E8FD3B]/10 px-2.5 py-0.5 rounded-full border border-[#E8FD3B]/30">
              PAPS 5대 체력 요인
            </span>
            <span className="text-xs text-slate-400 font-mono">
              교육부 고등학교 남/여 표준 기준표 연동
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            PAPS 체력 측정 & 자동 등급 판정기
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            실측치를 입력하면 2022 개정 체육 2 평가 기준에 맞춰 영역별 등급과 총점(100점 만점), NEIS 세특이 실시간 자동 연산됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPapsToGas}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-2xl bg-[#142245] hover:bg-[#1c2e5a] text-slate-200 text-xs font-bold border border-[#1e2f5b] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Google Apps Script를 통해 구글 시트 [PAPS_결과] 탭으로 내보냅니다."
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>시트로 내보내기</span>
          </button>
          <button
            onClick={() => {
              setCardioVal(60);
              setFlexibilityVal(14);
              setStrengthVal(40);
              setAgilityVal(225);
              setHeightCm(172);
              setWeightKg(62);
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#070e1e] hover:bg-[#142245] text-slate-300 text-xs font-bold border border-[#1e2f5b] flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            기본값 초기화
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-2xl bg-[#E8FD3B] hover:bg-[#d5eb28] text-black text-xs font-black flex items-center gap-1.5 transition shadow-[0_0_20px_rgba(232,253,59,0.3)] disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            {isSaving ? '저장 중...' : '측정 기록 저장'}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#E8FD3B]" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 2. Real-time Live Evaluation Score Banner */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-[#142245] border border-[#E8FD3B]/40 flex flex-col items-center justify-center text-[#E8FD3B] shadow-[0_0_20px_rgba(232,253,59,0.2)]">
            <span className="text-3xl font-black">{evaluations.overallGrade}</span>
            <span className="text-[10px] font-extrabold uppercase">GRADE</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">실시간 환산 종합 등급</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${overallColors.badge}`}>
                {getGradeLabel(evaluations.overallGrade)}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1">
              총점 <span className="text-[#E8FD3B] font-mono">{evaluations.totalScore}점</span>{' '}
              <span className="text-sm text-slate-400 font-normal">/ 100점 만점</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              학생 기준: {student ? `${student.name} (${student.gender}학생)` : `${gender}학생 기준`}
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-3 bg-[#070e1e] p-1.5 rounded-2xl border border-[#1e2f5b]">
          <button
            type="button"
            onClick={() => setIsGoalMode(false)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              !isGoalMode
                ? 'bg-[#E8FD3B] text-black shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            실제 측정치
          </button>
          <button
            type="button"
            onClick={() => setIsGoalMode(true)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              isGoalMode
                ? 'bg-sky-400 text-black shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            목표 설정치
          </button>
        </div>
      </div>

      {/* 3. 5 Factors Input Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Factor 1: Cardio */}
        <div className="p-5 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <h3 className="text-sm font-bold text-white">1. 심폐지구력</h3>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getGradeColor(evaluations.cardio.grade).badge}`}>
              {evaluations.cardio.grade}등급 ({evaluations.cardio.score}점)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 font-bold mb-1">측정 종목 선택</label>
              <select
                value={cardioTest}
                onChange={(e) => setCardioTest(e.target.value as CardioTest)}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E8FD3B]"
              >
                <option value="왕복오래달리기">왕복오래달리기 (셔틀런, 회)</option>
                <option value="오래달리기걷기">오래달리기걷기 (초)</option>
                <option value="스텝검사">스텝검사 (PEI 지수)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-semibold">측정값 입력</span>
                <span className="font-bold text-[#E8FD3B] font-mono">
                  {cardioVal} {cardioTest === '왕복오래달리기' ? '회' : '초'}
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={cardioTest === '왕복오래달리기' ? 150 : 1500}
                value={cardioVal}
                onChange={(e) => setCardioVal(Number(e.target.value))}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono font-bold"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1등급: {cardioTest === '왕복오래달리기' ? (gender === '남' ? '70회 이상' : '50회 이상') : '기준표 참조'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Factor 2: Flexibility */}
        <div className="p-5 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <h3 className="text-sm font-bold text-white">2. 유연성</h3>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getGradeColor(evaluations.flexibility.grade).badge}`}>
              {evaluations.flexibility.grade}등급 ({evaluations.flexibility.score}점)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 font-bold mb-1">측정 종목</label>
              <div className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-slate-300 font-medium">
                앉아윗몸앞으로굽히기 (좌전굴, cm)
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-semibold">측정값 입력 (cm)</span>
                <span className="font-bold text-teal-400 font-mono">{flexibilityVal} cm</span>
              </div>
              <input
                type="number"
                step="0.5"
                min={-20}
                max={40}
                value={flexibilityVal}
                onChange={(e) => setFlexibilityVal(Number(e.target.value))}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-teal-400 rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono font-bold"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1등급: {gender === '남' ? '19.0cm 이상' : '22.0cm 이상'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Factor 3: Strength */}
        <div className="p-5 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8FD3B]" />
              <h3 className="text-sm font-bold text-white">3. 근력·근지구력</h3>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getGradeColor(evaluations.strength.grade).badge}`}>
              {evaluations.strength.grade}등급 ({evaluations.strength.score}점)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 font-bold mb-1">측정 종목 선택</label>
              <select
                value={strengthTest}
                onChange={(e) => setStrengthTest(e.target.value as StrengthTest)}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E8FD3B]"
              >
                <option value="악력">악력 (kg)</option>
                <option value="팔굽혀펴기">팔굽혀펴기 (회)</option>
                <option value="윗몸말아올리기">윗몸말아올리기 (회)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-semibold">측정값 입력</span>
                <span className="font-bold text-[#E8FD3B] font-mono">
                  {strengthVal} {strengthTest === '악력' ? 'kg' : '회'}
                </span>
              </div>
              <input
                type="number"
                step={strengthTest === '악력' ? 0.1 : 1}
                min={0}
                max={strengthTest === '악력' ? 90 : 120}
                value={strengthVal}
                onChange={(e) => setStrengthVal(Number(e.target.value))}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-[#E8FD3B] rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono font-bold"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1등급: {strengthTest === '악력' ? (gender === '남' ? '61.0kg 이상' : '36.0kg 이상') : '기준표 참조'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Factor 4: Agility */}
        <div className="p-5 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-bold text-white">4. 순발력</h3>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getGradeColor(evaluations.agility.grade).badge}`}>
              {evaluations.agility.grade}등급 ({evaluations.agility.score}점)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 font-bold mb-1">측정 종목 선택</label>
              <select
                value={agilityTest}
                onChange={(e) => setAgilityTest(e.target.value as AgilityTest)}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="제자리멀리뛰기">제자리멀리뛰기 (cm)</option>
                <option value="50m달리기">50m달리기 (초)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-semibold">측정값 입력</span>
                <span className="font-bold text-amber-400 font-mono">
                  {agilityVal} {agilityTest === '50m달리기' ? '초' : 'cm'}
                </span>
              </div>
              <input
                type="number"
                step={agilityTest === '50m달리기' ? 0.01 : 1}
                min={0}
                max={agilityTest === '50m달리기' ? 30 : 350}
                value={agilityVal}
                onChange={(e) => setAgilityVal(Number(e.target.value))}
                className="w-full bg-[#070e1e] border border-[#1e2f5b] focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono font-bold"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1등급: {agilityTest === '제자리멀리뛰기' ? (gender === '남' ? '255.1cm 이상' : '186.1cm 이상') : (gender === '남' ? '7.00초 이하' : '8.80초 이하')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Factor 5: Body Composition (BMI) - 체육교사에게만 노출/수정 가능, 학생에게는 비노출 보호 */}
        {isTeacher ? (
          <div className="p-5 rounded-3xl bg-[#0d172e] border border-purple-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>5. 신체조성 (체지방/BMI)</span>
                  <span className="text-[10px] text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-700/60 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    체육교사 권한
                  </span>
                </h3>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getGradeColor(evaluations.bodyComp.grade).badge}`}>
                {evaluations.bodyComp.grade}등급 ({evaluations.bodyComp.score}점)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">키 (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">몸무게 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full bg-[#070e1e] border border-[#1e2f5b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">계산된 BMI 지수</span>
                <span className="text-lg font-black text-purple-300 font-mono">
                  {evaluations.bodyComp.bmi} kg/㎡
                </span>
              </div>
              <span className="text-xs font-bold text-purple-200 bg-[#142245] px-2.5 py-1 rounded-full border border-purple-500/30">
                {evaluations.bodyComp.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-3xl bg-[#0a1224] border border-[#1a294d] shadow-xl flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-300">5. 신체조성 (체격/비만도)</h3>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-950/70 border border-purple-800 px-2 py-0.5 rounded-full font-bold">
                교사 전용 보호 항목
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              학생 개인정보 및 체격 프라이버시 보호 규정에 따라 신체조성(키, 몸무게, 비만도 지수)은 체육교사만 열람 및 입력할 수 있습니다.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 border-t border-[#1e2f5b]/50">
              * 1~4번 체력 요인(심폐지구력, 유연성, 근력, 순발력)은 정상 반영됩니다.
            </div>
          </div>
        )}

        {/* Goal Setting & Target Comparison Helper */}
        <div className="p-5 rounded-3xl bg-[#0d172e] border border-[#1e2f5b] shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#E8FD3B]" />
              <h3 className="text-sm font-bold text-white">목표 등급 설정 및 갭 분석</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              원하는 목표 등급을 설정하면 4대 체력 요소별 요구 증가량을 비교 분석할 수 있습니다.
            </p>
          </div>

          <div className="p-3.5 bg-[#070e1e] rounded-2xl border border-[#1e2f5b] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">목표 종합 등급:</span>
              <select
                value={targetOverallGrade}
                onChange={(e) => setTargetOverallGrade(Number(e.target.value))}
                className="bg-[#142245] text-[#E8FD3B] font-bold px-2.5 py-1 rounded-xl border border-[#E8FD3B]/30 text-xs"
              >
                <option value={1}>1등급 (80점 이상)</option>
                <option value={2}>2등급 (60점 이상)</option>
                <option value={3}>3등급 (40점 이상)</option>
              </select>
            </div>
            <div className="text-[11px] text-[#E8FD3B] font-bold">
              {evaluations.overallGrade <= targetOverallGrade
                ? '축하합니다! 현재 수치가 이미 목표 등급을 충족하고 있습니다.'
                : `목표 등급까지 ${evaluations.overallGrade - targetOverallGrade}개 등급 상향이 필요합니다. FITT 처방을 점검하세요.`}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Historical Measurement Records List (with Teacher Delete support) */}
      <div className="rounded-3xl bg-[#0d172e] border border-[#1e2f5b] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#E8FD3B]" />
            나의 누적 PAPS 측정 이력
          </h3>
          {isTeacher && (
            <span className="text-[11px] font-bold text-[#E8FD3B] bg-[#E8FD3B]/10 px-3 py-1 rounded-full border border-[#E8FD3B]/30">
              체육교사 관리 모드 (개별 기록 삭제 가능)
            </span>
          )}
        </div>

        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e2f5b] text-slate-400 font-bold">
                  <th className="py-2.5 px-3">측정일</th>
                  <th className="py-2.5 px-3">종류</th>
                  <th className="py-2.5 px-3">종합 등급</th>
                  <th className="py-2.5 px-3">총점</th>
                  <th className="py-2.5 px-3">심폐지구력</th>
                  <th className="py-2.5 px-3">유연성</th>
                  <th className="py-2.5 px-3">근력·근지구력</th>
                  <th className="py-2.5 px-3">순발력</th>
                  <th className="py-2.5 px-3">신체조성</th>
                  {isTeacher && <th className="py-2.5 px-3 text-right text-rose-400">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f5b]">
                {records.map((r) => {
                  const badge = getGradeColor(r.overallGrade);
                  return (
                    <tr key={r.id} className="hover:bg-[#142245]/50 transition">
                      <td className="py-3 px-3 font-semibold text-white font-mono">{r.date}</td>
                      <td className="py-3 px-3">
                        {r.isGoal ? (
                          <span className="text-[10px] bg-sky-950/60 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                            목표치
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#E8FD3B]/10 text-[#E8FD3B] border border-[#E8FD3B]/30 px-2 py-0.5 rounded-full font-bold">
                            실측치
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${badge.badge}`}>
                          {r.overallGrade}등급
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-white font-mono">{r.totalScore}점</td>
                      <td className="py-3 px-3 text-slate-300">
                        {r.cardio.testType} {r.cardio.value}{r.cardio.unit} ({r.cardio.grade}등급)
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {r.flexibility.value}cm ({r.flexibility.grade}등급)
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {r.strength.testType} {r.strength.value}{r.strength.unit} ({r.strength.grade}등급)
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {r.agility.testType} {r.agility.value}{r.agility.unit} ({r.agility.grade}등급)
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        BMI {r.bodyComp.bmi} ({r.bodyComp.grade}등급)
                      </td>
                      {isTeacher && (
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`${r.date}일자 PAPS 측정 기록(${r.overallGrade}등급, ${r.totalScore}점)을 삭제하시겠습니까?`)) {
                                if (onDeleteRecord) onDeleteRecord(r.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                            title="교사 권한: 이 PAPS 측정 기록 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-[#070e1e] rounded-2xl border border-dashed border-[#1e2f5b]">
            아직 누적된 PAPS 기록이 없습니다. 상단 수치를 확인하고 '측정 기록 저장'을 클릭하세요.
          </div>
        )}
      </div>
    </div>
  );
};
