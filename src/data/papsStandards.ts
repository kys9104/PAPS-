import { FactorResult, PAPSRecord } from '../types';

export interface StandardThreshold {
  grade1: number; // 1등급 기준치
  grade2: number; // 2등급 기준치
  grade3: number; // 3등급 기준치
  grade4: number; // 4등급 기준치
  isLowerBetter?: boolean; // 기록이 낮을수록 우수 (예: 달리기 초 단위)
}

/**
 * [교육부 학생건강체력평가(PAPS) 고등학교 1학년(만 16세) 공식 등급 기준표]
 * - 2022 개정 체육과 교육과정 및 학생 건강체력평가 기준 적용
 */
export const HIGH_SCHOOL_GRADE1_PAPS_STANDARDS = {
  남: {
    // 1. 심폐지구력
    왕복오래달리기: { grade1: 70, grade2: 56, grade3: 42, grade4: 26, isLowerBetter: false }, // 횟수 (1등급: 70~80이상, 2등급: 56~69, 3등급: 42~55, 4등급: 26~41, 5등급: 25이하)
    오래달리기걷기: { grade1: 398, grade2: 457, grade3: 551, grade4: 639, isLowerBetter: true }, // 초 (1600m, 1등급: 398이하, 2등급: 399~457, 3등급: 458~551, 4등급: 552~639, 5등급: 640이상)
    '오래달리기-걷기': { grade1: 398, grade2: 457, grade3: 551, grade4: 639, isLowerBetter: true },
    스텝검사: { grade1: 76.0, grade2: 62.0, grade3: 52.0, grade4: 47.0, isLowerBetter: false }, // PEI 지수

    // 2. 유연성
    앉아윗몸앞으로굽히기: { grade1: 13.0, grade2: 9.0, grade3: 4.0, grade4: -2.0, isLowerBetter: false }, // cm (1등급: 13.0이상, 2등급: 9.0~12.9, 3등급: 4.0~8.9, 4등급: -2.0~3.9, 5등급: -2.1이하)
    '앉아 윗몸 앞으로 굽히기': { grade1: 13.0, grade2: 9.0, grade3: 4.0, grade4: -2.0, isLowerBetter: false },

    // 3. 근력 및 근지구력
    악력: { grade1: 61.0, grade2: 42.5, grade3: 35.5, grade4: 29.0, isLowerBetter: false }, // kg (1등급: 61.0이상, 2등급: 42.5~60.9, 3등급: 35.5~42.4, 4등급: 29.0~35.4, 5등급: 28.9이하)
    팔굽혀펴기: { grade1: 46, grade2: 30, grade3: 16, grade4: 7, isLowerBetter: false }, // 회 (1등급: 46이상, 2등급: 30~45, 3등급: 16~29, 4등급: 7~15, 5등급: 6이하)
    무릎대고팔굽혀펴기: { grade1: 46, grade2: 30, grade3: 16, grade4: 7, isLowerBetter: false },
    윗몸말아올리기: { grade1: 90, grade2: 60, grade3: 35, grade4: 15, isLowerBetter: false }, // 회 (1등급: 90이상, 2등급: 60~89, 3등급: 35~59, 4등급: 15~34, 5등급: 14이하)

    // 4. 순발력
    '50m달리기': { grade1: 7.00, grade2: 7.60, grade3: 8.10, grade4: 10.00, isLowerBetter: true }, // 초 (1등급: 7.00이하, 2등급: 7.01~7.60, 3등급: 7.61~8.10, 4등급: 8.11~10.00, 5등급: 10.01이상)
    '50m 달리기': { grade1: 7.00, grade2: 7.60, grade3: 8.10, grade4: 10.00, isLowerBetter: true },
    제자리멀리뛰기: { grade1: 255.1, grade2: 216.1, grade3: 195.1, grade4: 160.1, isLowerBetter: false }, // cm (1등급: 255.1이상, 2등급: 216.1~255, 3등급: 195.1~216, 4등급: 160.1~195, 5등급: 160이하)
    '제자리 멀리뛰기': { grade1: 255.1, grade2: 216.1, grade3: 195.1, grade4: 160.1, isLowerBetter: false }
  },
  여: {
    // 1. 심폐지구력
    왕복오래달리기: { grade1: 50, grade2: 37, grade3: 25, grade4: 17, isLowerBetter: false }, // 횟수 (1등급: 50이상, 2등급: 37~49, 3등급: 25~36, 4등급: 17~24, 5등급: 16이하)
    오래달리기걷기: { grade1: 379, grade2: 442, grade3: 517, grade4: 608, isLowerBetter: true }, // 초 (1200m, 1등급: 379이하, 2등급: 380~442, 3등급: 443~517, 4등급: 518~608, 5등급: 609이상)
    '오래달리기-걷기': { grade1: 379, grade2: 442, grade3: 517, grade4: 608, isLowerBetter: true },
    스텝검사: { grade1: 76.0, grade2: 62.0, grade3: 52.0, grade4: 47.0, isLowerBetter: false }, // PEI 지수

    // 2. 유연성
    앉아윗몸앞으로굽히기: { grade1: 16.0, grade2: 11.0, grade3: 8.0, grade4: 2.0, isLowerBetter: false }, // cm (1등급: 16.0이상, 2등급: 11.0~15.9, 3등급: 8.0~10.9, 4등급: 2.0~7.9, 5등급: 1.9이하)
    '앉아 윗몸 앞으로 굽히기': { grade1: 16.0, grade2: 11.0, grade3: 8.0, grade4: 2.0, isLowerBetter: false },

    // 3. 근력 및 근지구력
    악력: { grade1: 36.0, grade2: 29.0, grade3: 23.0, grade4: 16.5, isLowerBetter: false }, // kg (1등급: 36.0이상, 2등급: 29.0~35.9, 3등급: 23.0~28.9, 4등급: 16.5~22.9, 5등급: 16.4이하)
    팔굽혀펴기: { grade1: 40, grade2: 24, grade3: 14, grade4: 6, isLowerBetter: false }, // 회 (무릎대고팔굽혀펴기, 1등급: 40이상, 2등급: 24~39, 3등급: 14~23, 4등급: 6~13, 5등급: 5이하)
    무릎대고팔굽혀펴기: { grade1: 40, grade2: 24, grade3: 14, grade4: 6, isLowerBetter: false },
    윗몸말아올리기: { grade1: 40, grade2: 30, grade3: 13, grade4: 4, isLowerBetter: false }, // 회 (1등급: 40이상, 2등급: 30~39, 3등급: 13~29, 4등급: 4~12, 5등급: 3이하)

    // 4. 순발력
    '50m달리기': { grade1: 8.80, grade2: 9.80, grade3: 10.50, grade4: 12.20, isLowerBetter: true }, // 초 (1등급: 8.80이하, 2등급: 8.81~9.80, 3등급: 9.81~10.50, 4등급: 10.51~12.20, 5등급: 12.21이상)
    '50m 달리기': { grade1: 8.80, grade2: 9.80, grade3: 10.50, grade4: 12.20, isLowerBetter: true },
    제자리멀리뛰기: { grade1: 186.1, grade2: 159.1, grade3: 139.1, grade4: 100.1, isLowerBetter: false }, // cm (1등급: 186.1이상, 2등급: 159.1~186, 3등급: 139.1~159, 4등급: 100.1~139, 5등급: 100이하)
    '제자리 멀리뛰기': { grade1: 186.1, grade2: 159.1, grade3: 139.1, grade4: 100.1, isLowerBetter: false }
  }
} as const;

// 하위 호환성 유지용 별칭
export const PAPS_STANDARDS = HIGH_SCHOOL_GRADE1_PAPS_STANDARDS;

export function evaluateGrade(
  value: number,
  threshold?: StandardThreshold | null
): { grade: number; score: number } {
  if (!threshold || typeof threshold !== 'object') {
    return { grade: 3, score: 12 };
  }
  const { grade1, grade2, grade3, grade4, isLowerBetter = false } = threshold;
  if (grade1 === undefined || grade2 === undefined || grade3 === undefined || grade4 === undefined) {
    return { grade: 3, score: 12 };
  }

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

/**
 * [신체능력검사(필수평가) 비만 평가 기준: BMI (kg/m²)]
 * 고등학교 1학년 기준 (남자/여자 구분)
 * 남자: 마름 <= 16.7, 정상 16.8~24.6, 과체중 24.7~24.9, 경도비만 25.0~29.9, 고도비만 >= 30.0
 * 여자: 마름 <= 16.7, 정상 16.8~23.6, 과체중 23.7~24.9, 경도비만 25.0~29.9, 고도비만 >= 30.0
 */
export function evaluateBMI(
  heightCm: number,
  weightKg: number,
  gender: '남' | '여' = '남'
): {
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
  let status = '표준 (정상체중)';

  const normalMax = gender === '여' ? 23.6 : 24.6;

  if (bmi <= 16.7) {
    grade = 3;
    status = '저체중 (마름)';
  } else if (bmi <= normalMax) {
    grade = 1;
    status = '표준 (정상체중)';
  } else if (bmi <= 24.9) {
    grade = 2;
    status = '과체중';
  } else if (bmi <= 29.9) {
    grade = 4;
    status = '경도비만 (1단계)';
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
