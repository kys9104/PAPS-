import { FactorResult, PAPSRecord } from '../types';

export interface StandardThreshold {
  grade1: number; // 1등급 기준
  grade2: number;
  grade3: number;
  grade4: number;
  isLowerBetter?: boolean; // 달리기는 낮을수록 우수
}

export const PAPS_STANDARDS = {
  남: {
    왕복오래달리기: { grade1: 77, grade2: 62, grade3: 47, grade4: 31, isLowerBetter: false },
    오래달리기걷기: { grade1: 390, grade2: 440, grade3: 510, grade4: 600, isLowerBetter: true }, // 초 단위
    앉아윗몸앞으로굽히기: { grade1: 19.0, grade2: 13.0, grade3: 6.0, grade4: -1.0, isLowerBetter: false },
    악력: { grade1: 48.0, grade2: 42.0, grade3: 36.0, grade4: 30.0, isLowerBetter: false },
    팔굽혀펴기: { grade1: 45, grade2: 35, grade3: 24, grade4: 14, isLowerBetter: false },
    윗몸말아올리기: { grade1: 70, grade2: 55, grade3: 40, grade4: 25, isLowerBetter: false },
    '50m달리기': { grade1: 7.2, grade2: 7.7, grade3: 8.3, grade4: 9.1, isLowerBetter: true },
    제자리멀리뛰기: { grade1: 240, grade2: 225, grade3: 208, grade4: 188, isLowerBetter: false }
  },
  여: {
    왕복오래달리기: { grade1: 48, grade2: 38, grade3: 28, grade4: 18, isLowerBetter: false },
    오래달리기걷기: { grade1: 360, grade2: 410, grade3: 480, grade4: 560, isLowerBetter: true }, // 초 단위
    앉아윗몸앞으로굽히기: { grade1: 22.0, grade2: 17.0, grade3: 11.0, grade4: 5.0, isLowerBetter: false },
    악력: { grade1: 31.0, grade2: 27.0, grade3: 23.0, grade4: 19.0, isLowerBetter: false },
    팔굽혀펴기: { grade1: 30, grade2: 22, grade3: 14, grade4: 7, isLowerBetter: false }, // 무릎대고
    윗몸말아올리기: { grade1: 50, grade2: 38, grade3: 26, grade4: 15, isLowerBetter: false },
    '50m달리기': { grade1: 8.7, grade2: 9.3, grade3: 10.1, grade4: 11.0, isLowerBetter: true },
    제자리멀리뛰기: { grade1: 185, grade2: 170, grade3: 152, grade4: 133, isLowerBetter: false }
  }
};

export function evaluateGrade(
  value: number,
  threshold: StandardThreshold
): { grade: number; score: number } {
  const { grade1, grade2, grade3, grade4, isLowerBetter } = threshold;
  let grade = 5;

  if (isLowerBetter) {
    if (value <= grade1) grade = 1;
    else if (value <= grade2) grade = 2;
    else if (value <= grade3) grade = 3;
    else if (value <= grade4) grade = 4;
    else grade = 5;
  } else {
    if (value >= grade1) grade = 1;
    else if (value >= grade2) grade = 2;
    else if (value >= grade3) grade = 3;
    else if (value >= grade4) grade = 4;
    else grade = 5;
  }

  // 1등급=20점, 2등급=16점, 3등급=12점, 4등급=8점, 5등급=4점
  const score = Math.max(4, 24 - grade * 4);
  return { grade, score };
}

export function evaluateBMI(heightCm: number, weightKg: number): {
  bmi: number;
  grade: number;
  score: number;
  status: string;
} {
  if (heightCm <= 0 || weightKg <= 0) {
    return { bmi: 0, grade: 5, score: 4, status: '미측정' };
  }
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  let grade = 1;
  let status = '정상체중';

  if (bmi < 18.5) {
    grade = 3;
    status = '저체중';
  } else if (bmi >= 18.5 && bmi <= 22.9) {
    grade = 1;
    status = '표준 (정상체중)';
  } else if (bmi >= 23.0 && bmi <= 24.9) {
    grade = 2;
    status = '과체중';
  } else if (bmi >= 25.0 && bmi <= 29.9) {
    grade = 4;
    status = '비만 (1단계)';
  } else {
    grade = 5;
    status = '고도비만 (2단계 이상)';
  }

  const score = Math.max(4, 24 - grade * 4);
  return { bmi, grade, score, status };
}

export function getOverallGrade(totalScore: number): number {
  if (totalScore >= 80) return 1;
  if (totalScore >= 60) return 2;
  if (totalScore >= 40) return 3;
  if (totalScore >= 20) return 4;
  return 5;
}

export function getGradeLabel(grade: number): string {
  switch (grade) {
    case 1: return '1등급 (매우 우수)';
    case 2: return '2등급 (우수)';
    case 3: return '3등급 (보통)';
    case 4: return '4등급 (개선 필요)';
    case 5: return '5등급 (체력 증진 권장)';
    default: return `${grade}등급`;
  }
}

export function getGradeColor(grade: number): {
  badge: string;
  text: string;
  bg: string;
  border: string;
} {
  switch (grade) {
    case 1:
      return {
        badge: 'bg-emerald-500 text-slate-950 font-bold',
        text: 'text-emerald-400',
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/40'
      };
    case 2:
      return {
        badge: 'bg-cyan-500 text-slate-950 font-bold',
        text: 'text-cyan-400',
        bg: 'bg-cyan-950/40',
        border: 'border-cyan-500/40'
      };
    case 3:
      return {
        badge: 'bg-amber-500 text-slate-950 font-bold',
        text: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/40'
      };
    case 4:
      return {
        badge: 'bg-orange-500 text-white font-bold',
        text: 'text-orange-400',
        bg: 'bg-orange-950/40',
        border: 'border-orange-500/40'
      };
    case 5:
    default:
      return {
        badge: 'bg-rose-500 text-white font-bold',
        text: 'text-rose-400',
        bg: 'bg-rose-950/40',
        border: 'border-rose-500/40'
      };
  }
}

// 2022 개정 체육과 교육과정 기반 학교생활기록부 교과 세부능력 및 특기사항(세특) 자동 추천 엔진
export function generateNEISRecommendation(
  studentName: string,
  record: PAPSRecord,
  fittAnalysis?: string,
  completedLessonsCount = 0
): {
  summary: string;
  options: string[];
} {
  const factors = [
    { name: '심폐지구력', grade: record.cardio.grade, test: record.cardio.testType, val: `${record.cardio.value}${record.cardio.unit}` },
    { name: '유연성', grade: record.flexibility.grade, test: record.flexibility.testType, val: `${record.flexibility.value}${record.flexibility.unit}` },
    { name: '근력·근지구력', grade: record.strength.grade, test: record.strength.testType, val: `${record.strength.value}${record.strength.unit}` },
    { name: '순발력', grade: record.agility.grade, test: record.agility.testType, val: `${record.agility.value}${record.agility.unit}` },
    { name: '체지방/신체조성', grade: record.bodyComp.grade, test: 'BMI', val: `${record.bodyComp.bmi}kg/㎡` },
  ];

  const sortedByGrade = [...factors].sort((a, b) => a.grade - b.grade);
  const best = sortedByGrade[0];
  const weakest = sortedByGrade[sortedByGrade.length - 1];

  const option1 = `2022 개정 교육과정 '체력 증진의 특성과 원리' 단원에서 자기 주도적 신체 진단을 통해 종합 PAPS ${record.overallGrade}등급(총점 ${record.totalScore}점)을 획득함. 특히 ${best.name}(${best.test} ${best.val})에서 탁월한 기량을 발휘하였으며, 상대적으로 보완이 요구되는 ${weakest.name}을 개선하기 위해 FITT 운동 처방 원리(과부하·점진성·특수성)를 체계적으로 적용하여 5차시 맞춤형 운동 루틴을 능동적으로 실천함.`;

  const option2 = `체력의 종합적 관리 역량이 돋보이는 학생으로, PAPS 측정 결과 ${best.name} 영역에서 ${best.grade}등급의 우수한 역량을 입증함. 스스로 작성한 FITT 계획서(운동빈도, 강도, 시간, 형태)에 따라 ${weakest.name} 보완을 위한 인터벌 및 보강 트레이닝을 성실히 수행하였으며, 주차별 실습 기록을 꼼꼼히 누적 관리하며 건강한 신체 가치관을 함양함.`;

  const option3 = `체력 평가 및 운동 처방 실습에서 자신의 신체적 특성을 정확히 분석하고 신안해양과학고 맞춤형 스마트 체력 관리 도구를 적극 활용함. ${record.cardio.testType}(${record.cardio.value}회)과 ${record.strength.testType}(${record.strength.value}${record.strength.unit}) 측정에 끈기 있게 임하였으며, 총 ${completedLessonsCount}회의 실습 차시 동안 안전 수칙을 준수하며 동료 학생들과 긍정적인 운동 문화를 조성하는 데 기여함.`;

  return {
    summary: option1,
    options: [option1, option2, option3]
  };
}
