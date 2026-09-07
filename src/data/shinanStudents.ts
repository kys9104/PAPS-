import { StudentProfile } from '../types';

export interface OfficialStudentRosterItem {
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
  gender: '남' | '여';
}

/**
 * 신안해양과학고등학교 1학년 공식 학생 명단 (총 37명)
 * 1학년 1반: 19명
 * 1학년 2반: 18명
 */
export const SHINAN_OFFICIAL_STUDENTS: OfficialStudentRosterItem[] = [
  // -----------------------------
  // 1학년 1반 (19명)
  // -----------------------------
  { grade: 1, classNum: 1, studentNum: 1, name: '곽승준', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 2, name: '김건우', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 3, name: '김준성', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 4, name: '김현지', gender: '여' },
  { grade: 1, classNum: 1, studentNum: 5, name: '명지호', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 7, name: '박주영', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 8, name: '박호연', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 9, name: '백호', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 10, name: '선준혁', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 11, name: '송현우', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 12, name: '양준성', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 13, name: '이관훈', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 14, name: '이민수', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 16, name: '이예준', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 17, name: '임솔지', gender: '여' },
  { grade: 1, classNum: 1, studentNum: 18, name: '장범석', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 19, name: '정찬주', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 20, name: '조희우', gender: '남' },
  { grade: 1, classNum: 1, studentNum: 21, name: '홍서현', gender: '여' },

  // -----------------------------
  // 1학년 2반 (18명)
  // -----------------------------
  { grade: 1, classNum: 2, studentNum: 1, name: '강성수', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 3, name: '김보현', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 4, name: '김예준', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 5, name: '문경호', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 6, name: '박이한', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 7, name: '박해일', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 8, name: '백승광', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 9, name: '백현주', gender: '여' },
  { grade: 1, classNum: 2, studentNum: 10, name: '신예영', gender: '여' },
  { grade: 1, classNum: 2, studentNum: 11, name: '윤호현', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 12, name: '이진우', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 13, name: '이진주', gender: '여' },
  { grade: 1, classNum: 2, studentNum: 14, name: '이진혁', gender: '남' },
  { grade: 1, classNum: 2, studentNum: 15, name: '이채아', gender: '여' },
  { grade: 1, classNum: 2, studentNum: 16, name: '정솔비', gender: '여' },
  { grade: 1, classNum: 2, studentNum: 17, name: '조하얀', gender: '여' },
  { grade: 1, classNum: 2, studentNum: 18, name: '주단비', gender: '여' },
  { grade: 1, classNum: 2, studentNum: 19, name: '최우진', gender: '남' },
];

/**
 * 공식 명단 기반 초기 StudentProfile 목록 생성 헬퍼
 */
export function buildInitialStudentProfiles(): StudentProfile[] {
  return SHINAN_OFFICIAL_STUDENTS.map((item) => ({
    id: `${item.grade}-${item.classNum}-${String(item.studentNum).padStart(2, '0')}`,
    grade: item.grade,
    classNum: item.classNum,
    studentNum: item.studentNum,
    name: item.name,
    gender: item.gender,
    pin: '0000', // 기본 초기 보안 PIN: 0000 (학생 개별 변경 가능)
    joinedAt: new Date().toISOString(),
    lastLoginAt: undefined
  }));
}
