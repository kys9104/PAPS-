export type FitnessFactor = '순발력' | '심폐지구력' | '유연성' | '근력 및 근지구력';
export type ExerciseCategory = FitnessFactor;

export interface StudentProfile {
  id: string; // e.g., '1-1-05' (grade-class-num)
  grade: number; // 1학년 고정
  classNum: number; // 1~2반
  studentNum: number; // 1~21번
  name: string;
  pin: string; // 4자리 PIN
  gender: '남' | '여';
  joinedAt: string;
  lastLoginAt: string;
}

export type CardioTest = '왕복오래달리기' | '오래달리기걷기' | '스텝검사';
export type FlexibilityTest = '앉아윗몸앞으로굽히기';
export type StrengthTest = '악력' | '팔굽혀펴기' | '윗몸말아올리기';
export type AgilityTest = '50m달리기' | '제자리멀리뛰기';

export interface FactorResult {
  testType: string;
  value: number;
  unit: string;
  grade: number; // 1~5
  score: number; // 4~20
}

export interface PAPSRecord {
  id: string;
  studentId: string;
  date: string;
  isGoal?: boolean;
  gender: '남' | '여';
  cardio: FactorResult;
  flexibility: FactorResult;
  strength: FactorResult;
  agility: FactorResult;
  bodyComp: {
    height: number;
    weight: number;
    bmi: number;
    grade: number;
    score: number;
    status?: string;
  };
  totalScore: number; // 0~100
  overallGrade: number; // 1~5
  teacherFeedback?: string;
  neisNote?: string; // 생활기록부 세특 자동 생성 문구
}

export interface FITTPlan {
  studentId: string;
  updatedAt: string;
  frequency: string; // F: 운동 빈도
  intensity: string; // I: 운동 강도
  time: string;      // T: 운동 시간
  type: string;      // T: 운동 형태
  setsCount?: number; // 세트 수 (수동 설정 1~10)
  selfAnalysis: string; // 현재 체력 분석 및 보완점
  goalStatement: string; // 나의 체력 증진 목표
  principlesChecklist: {
    overload: boolean;      // 과부하의 원리
    progression: boolean;   // 점진성의 원리
    specificity: boolean;   // 특수성의 원리
    individuality: boolean; // 개별성의 원리
    continuity: boolean;    // 지속성의 원리
  };
}

export interface MainExerciseSlot {
  index: number; // 1 ~ 8
  name: string;
  durationOrReps: string; // 예: "40초" 또는 "15회"
  category: string; // 예: "근력 및 근지구력", "심폐지구력" 등
  targetMuscle?: string;
}

export interface StudentProgressStatus {
  customPlanCreated: boolean; // 1) 맞춤형 설계서 작성 여부
  selfCheckCompleted: boolean; // 2) 자가 점검 체크리스트 완료 여부
  lesson5Created: boolean; // 3) 5차시 계획 작성 여부
}

export interface LessonPlan {
  lessonWeek: number; // 1 ~ 5차시
  title: string;
  targetFactor: string;
  warmUp: string;
  mainRoutine: string;
  mainExercises?: MainExerciseSlot[]; // 본운동 8개 고정 슬롯
  workTimeSeconds?: number; // 인터벌 운동 시간(초)
  restTimeSeconds?: number; // 인터벌 휴식 시간(초)
  setsCount?: number; // 세트 수 (1~10)
  intensity?: string; // 차시별 운동 강도
  specialNotes?: string; // 특이사항 및 지도 메모
  coolDown: string;
  reflection: string;
  isCompleted: boolean;
  completedAt?: string;
  focusArea?: string;
  targetGoal?: string;
}

export interface WorkoutLog {
  id: string;
  studentId: string;
  studentName?: string;
  date: string;
  exerciseName: string;
  category: string;
  durationMinutes: number;
  sets: number;
  reps?: number; // 세트당 반복 횟수 또는 총 횟수
  rpe: number; // 1~10 (자각적 운동강도)
  memo?: string;
  notes?: string;
}

export interface ExerciseGuideItem {
  id: string;
  category: FitnessFactor;
  name: string;
  englishName?: string;
  title?: string;
  summary?: string;
  description?: string;
  targetMuscles: string[] | string;
  difficulty: '초급' | '중급' | '고급' | '초중급' | '중고급';
  instructions?: string[];
  precautions?: string[];
  recommendedSets: string;
  intensity?: string;
  steps?: string[];
  cautions?: string[];
  youtubeQuery?: string;
}

export interface TeacherSettings {
  googleSheetWebhookUrl: string;
  firebaseProjectId?: string;
  schoolName: string;
  semester: string;
}
