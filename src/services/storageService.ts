import {
  StudentProfile,
  PAPSRecord,
  FITTPlan,
  LessonPlan,
  MainExerciseSlot,
  WorkoutLog,
  TeacherSettings
} from '../types';
import { getFirebaseFirestore } from './firebaseConfig';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { buildInitialStudentProfiles } from '../data/shinanStudents';

const STORAGE_KEYS = {
  CURRENT_STUDENT: 'shinan_current_student',
  ALL_STUDENTS: 'shinan_all_students',
  PAPS_RECORDS: 'shinan_paps_records',
  FITT_PLANS: 'shinan_fitt_plans',
  LESSON_PLANS: 'shinan_lesson_plans',
  WORKOUT_LOGS: 'shinan_workout_logs',
  TEACHER_SETTINGS: 'shinan_teacher_settings',
  TEACHER_AUTH: 'shinan_teacher_auth',
  STUDENT_NEIS_NOTES: 'shinan_student_neis_notes'
};

export const OFFICIAL_TEACHER_PASSWORD = '4161';

export function isTeacherAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.TEACHER_AUTH) === 'true';
  } catch {
    return false;
  }
}

export function setTeacherAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      sessionStorage.setItem(STORAGE_KEYS.TEACHER_AUTH, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.TEACHER_AUTH);
    }
  } catch {
    // fallback
  }
}

export function verifyTeacherPassword(password: string): boolean {
  return password.trim() === OFFICIAL_TEACHER_PASSWORD;
}

// 8개 본운동 기본 생성 헬퍼
export function createDefaultMainExercises(presetType: 'cardio' | 'strength' | 'flexibility' | 'agility' | 'total'): MainExerciseSlot[] {
  const templates: Record<string, MainExerciseSlot[]> = {
    cardio: [
      { index: 1, name: '20m 셔틀런 인터벌', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '전신 심폐' },
      { index: 2, name: '점핑 잭 (팔벌려뛰기)', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '전신 유산소' },
      { index: 3, name: '하이니 런 (무릎 당겨뛰기)', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '장요근 및 코어' },
      { index: 4, name: '마운틴 클라이머', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '복직근 및 어깨' },
      { index: 5, name: '스케이터 점프', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '둔근 및 심폐' },
      { index: 6, name: '버피 테스트', durationOrReps: '40초', category: '순발력', targetMuscle: '전신 복합' },
      { index: 7, name: '섀도우 복싱 펀치 러닝', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '상체 및 심폐' },
      { index: 8, name: '플랭크 잭', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '코어 및 둔근' }
    ],
    strength: [
      { index: 1, name: '맨몸 풀 스쿼트', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '대퇴사두근 및 둔근' },
      { index: 2, name: '정석 푸시업 (무릎/정석)', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '대흉근 및 삼두근' },
      { index: 3, name: '워킹/백 런지', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '하체 둔근' },
      { index: 4, name: '엘보우 플랭크 홀드', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '코어 복직근' },
      { index: 5, name: '체어 딥스 (상완삼두)', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '삼두박근' },
      { index: 6, name: '글루트 브릿지 (둔근)', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '대둔근 및 햄스트링' },
      { index: 7, name: '사이드 플랭크 (좌/우)', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '복사근' },
      { index: 8, name: '슈퍼맨 백 익스텐션', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '척추기립근' }
    ],
    flexibility: [
      { index: 1, name: '앉아윗몸앞으로굽히기 홀드', durationOrReps: '40초', category: '유연성', targetMuscle: '햄스트링 및 요추' },
      { index: 2, name: '월 숄더 모빌리티 스트레칭', durationOrReps: '40초', category: '유연성', targetMuscle: '어깨 및 흉추' },
      { index: 3, name: '나비 자세 (골반 내전근)', durationOrReps: '40초', category: '유연성', targetMuscle: '골반 및 고관절' },
      { index: 4, name: '다운독 및 카프 스트레칭', durationOrReps: '40초', category: '유연성', targetMuscle: '후면 사슬' },
      { index: 5, name: '이상근 4자 다리 스트레칭', durationOrReps: '40초', category: '유연성', targetMuscle: '둔근 및 이상근' },
      { index: 6, name: '코브라 자세 (복부 신전)', durationOrReps: '40초', category: '유연성', targetMuscle: '복직근 및 가슴' },
      { index: 7, name: '사이드 라잉 흉추 회전', durationOrReps: '40초', category: '유연성', targetMuscle: '흉추 회전근' },
      { index: 8, name: '차일드 포즈 전신 이완', durationOrReps: '40초', category: '유연성', targetMuscle: '광배근 및 척추' }
    ],
    agility: [
      { index: 1, name: '제자리 멀리뛰기 착지 드릴', durationOrReps: '40초', category: '순발력', targetMuscle: '하체 탄성' },
      { index: 2, name: '점프 스쿼트', durationOrReps: '40초', category: '순발력', targetMuscle: '대퇴부 및 순발력' },
      { index: 3, name: '래피드 피트 (잔발 스텝)', durationOrReps: '40초', category: '순발력', targetMuscle: '종아리 및 민첩성' },
      { index: 4, name: '버피 점프 턱', durationOrReps: '40초', category: '순발력', targetMuscle: '전신 순발력' },
      { index: 5, name: '사이드 스텝 셔틀 탭', durationOrReps: '40초', category: '순발력', targetMuscle: '측면 민첩성' },
      { index: 6, name: '플라이오메트릭 런지 점프', durationOrReps: '40초', category: '순발력', targetMuscle: '하체 파워' },
      { index: 7, name: '박스 점프 / 스텝 업', durationOrReps: '40초', category: '순발력', targetMuscle: '대퇴사두근' },
      { index: 8, name: '인터벌 섀도우 대시', durationOrReps: '40초', category: '순발력', targetMuscle: '전신 가속력' }
    ],
    total: [
      { index: 1, name: '맨몸 스쿼트', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '대퇴사두근' },
      { index: 2, name: '푸시업', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '대흉근' },
      { index: 3, name: '점핑 잭', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '전신 유산소' },
      { index: 4, name: '런지 교차', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '둔근' },
      { index: 5, name: '마운틴 클라이머', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '코어' },
      { index: 6, name: '엘보우 플랭크', durationOrReps: '40초', category: '근력 및 근지구력', targetMuscle: '복직근' },
      { index: 7, name: '버피 테스트', durationOrReps: '40초', category: '순발력', targetMuscle: '전신 복합' },
      { index: 8, name: '하이 니 (제자리 달리기)', durationOrReps: '40초', category: '심폐지구력', targetMuscle: '심폐지구력' }
    ]
  };
  return templates[presetType] || templates.total;
}

// 기본 5차시 기본 템플릿 (본운동 정확히 8개 고정 슬롯 포함)
export const DEFAULT_LESSON_PLANS: LessonPlan[] = [
  {
    lessonWeek: 1,
    title: '1차시: 기초 체력 진단 및 심폐지구력 기초 루틴',
    targetFactor: '심폐지구력',
    warmUp: '동적 관절 가동 스트레칭 5분 + 팔벌려뛰기 50회',
    mainRoutine: '20m 셔틀런 및 8대 유산소 인터벌 순환 트레이닝',
    mainExercises: createDefaultMainExercises('cardio'),
    workTimeSeconds: 40,
    restTimeSeconds: 20,
    setsCount: 3,
    coolDown: '루프밴드 하체 이완 및 햄스트링 정적 스트레칭 5분',
    reflection: '',
    isCompleted: false
  },
  {
    lessonWeek: 2,
    title: '2차시: 코어 및 상·하체 근력/근지구력 강화 실습',
    targetFactor: '근력/근지구력',
    warmUp: '루프밴드 힙 활성화 + 가벼운 버피 10회',
    mainRoutine: '8대 저항성 맨몸 근력 인터벌 루틴 (40초 운동 / 20초 휴식)',
    mainExercises: createDefaultMainExercises('strength'),
    workTimeSeconds: 40,
    restTimeSeconds: 20,
    setsCount: 3,
    coolDown: '코브라 자세 척추 신전 및 이상근 스트레칭',
    reflection: '',
    isCompleted: false
  },
  {
    lessonWeek: 3,
    title: '3차시: 관절 가동성 증진 및 유연성 특화 루틴',
    targetFactor: '유연성',
    warmUp: '가벼운 조깅 3분 + 루프밴드 숄더 및 흉추 모빌리티',
    mainRoutine: '앉아윗몸앞으로굽히기 및 8단계 정적 가동성 스트레칭',
    mainExercises: createDefaultMainExercises('flexibility'),
    workTimeSeconds: 40,
    restTimeSeconds: 20,
    setsCount: 2,
    coolDown: '누워서 전신 이완 호흡법 5분',
    reflection: '',
    isCompleted: false
  },
  {
    lessonWeek: 4,
    title: '4차시: 순발력 및 순간 가속 파워 집중 훈련',
    targetFactor: '순발력',
    warmUp: '발목 탄성 바운스 + 파워 하이니 런 20초 2세트',
    mainRoutine: '8대 플라이오메트릭 순발력 점프 & 대시 서킷 트레이닝',
    mainExercises: createDefaultMainExercises('agility'),
    workTimeSeconds: 35,
    restTimeSeconds: 25,
    setsCount: 3,
    coolDown: '종아리 및 대퇴사두근 폼롤러/정적 스트레칭',
    reflection: '',
    isCompleted: false
  },
  {
    lessonWeek: 5,
    title: '5차시: PAPS 재측정 대비 전신 서킷 트레이닝 및 종합 평가',
    targetFactor: '종합체력',
    warmUp: '전신 다이내믹 워밍업 7분',
    mainRoutine: '전신 8대 복합 인터벌 서킷 (타바타 8개 스테이션 순환)',
    mainExercises: createDefaultMainExercises('total'),
    workTimeSeconds: 40,
    restTimeSeconds: 20,
    setsCount: 3,
    coolDown: '전신 쿨다운 스트레칭 및 FITT 처방 목표 달성도 자기 평가',
    reflection: '',
    isCompleted: false
  }
];

// 1. 학생 계정 관리
export function getCurrentStudent(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentStudent(student: StudentProfile | null): void {
  if (student) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(student));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
  }
}

export function getAllStudents(): StudentProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALL_STUDENTS);
    const officialList = buildInitialStudentProfiles();

    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS, JSON.stringify(officialList));
      return officialList;
    }

    const parsed: StudentProfile[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS, JSON.stringify(officialList));
      return officialList;
    }

    // 신안해양과학고 공식 명단 학생들의 포함 여부 확인 및 병합 (기존 PIN 및 기록 보존)
    const existingMap = new Map(parsed.map((s) => [s.id, s]));
    let needsUpdate = false;

    const merged = officialList.map((official) => {
      const existing = existingMap.get(official.id);
      if (existing) {
        // 기존 학생 정보가 있으면 PIN 및 마지막 로그인 시간 보존 (초기 1234이거나 없는 경우 0000으로 자동 마이그레이션)
        const effectivePin = (!existing.pin || existing.pin === '1234') ? '0000' : existing.pin;
        if (effectivePin !== existing.pin) needsUpdate = true;
        return {
          ...official,
          name: official.name,
          gender: existing.gender || official.gender,
          pin: effectivePin,
          joinedAt: existing.joinedAt || official.joinedAt,
          lastLoginAt: existing.lastLoginAt
        };
      } else {
        needsUpdate = true;
        return official;
      }
    });

    if (needsUpdate || parsed.length !== officialList.length) {
      localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS, JSON.stringify(merged));
    }

    return merged;
  } catch {
    return buildInitialStudentProfiles();
  }
}

export async function loginOrRegisterStudent(
  grade: number,
  classNum: number,
  studentNum: number,
  name: string,
  pin: string,
  gender: '남' | '여'
): Promise<{ success: boolean; student?: StudentProfile; message: string }> {
  const studentId = `${grade}-${classNum}-${String(studentNum).padStart(2, '0')}`;
  const all = getAllStudents();
  let existing = all.find((s) => s.id === studentId);

  // Firestore 조회 시도
  const db = getFirebaseFirestore();
  if (db) {
    try {
      const docRef = doc(db, 'students', studentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existing = snap.data() as StudentProfile;
      }
    } catch (e) {
      console.warn('Firebase student fetch warning:', e);
    }
  }

  if (existing) {
    // 기존 PIN이 '1234'이거나 미설정된 상태에서 0000을 입력한 경우 마이그레이션 허용
    if ((!existing.pin || existing.pin === '1234') && pin === '0000') {
      existing.pin = '0000';
    }

    if (existing.pin !== pin) {
      return {
        success: false,
        message: '보안 PIN 번호가 일치하지 않습니다. 올바른 4자리 PIN(기본 초기 PIN: 0000)을 입력해주세요.'
      };
    }
    // PIN 일치 -> 로그인 성공
    existing.lastLoginAt = new Date().toISOString();
    existing.name = name || existing.name; // 업데이트 가능
    existing.gender = gender || existing.gender;

    // 로컬 갱신
    const updatedList = all.map((s) => (s.id === existing!.id ? existing! : s));
    localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS, JSON.stringify(updatedList));
    setCurrentStudent(existing);

    // Firestore 갱신
    if (db) {
      try {
        await setDoc(doc(db, 'students', studentId), existing, { merge: true });
      } catch (e) {
        console.warn('Firebase student update warning:', e);
      }
    }

    return {
      success: true,
      student: existing,
      message: `반갑습니다, ${existing.name} 학생! 로그인되었습니다.`
    };
  }

  // 신규 등록
  const newStudent: StudentProfile = {
    id: studentId,
    grade: 1,
    classNum,
    studentNum,
    name: name.trim() || `학생 ${studentNum}번`,
    pin,
    gender,
    joinedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  const updatedList = [...all.filter((s) => s.id !== studentId), newStudent];
  localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS, JSON.stringify(updatedList));
  setCurrentStudent(newStudent);

  // Firestore 등록
  if (db) {
    try {
      await setDoc(doc(db, 'students', studentId), newStudent);
    } catch (e) {
      console.warn('Firebase new student write warning:', e);
    }
  }

  return {
    success: true,
    student: newStudent,
    message: `신안해양과학고 1학년 ${classNum}반 ${studentNum}번 ${newStudent.name} 학생 계정이 안전하게 생성되었습니다!`
  };
}

// 2. PAPS 기록 관리
export function getAllPapsRecords(): PAPSRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAPS_RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStudentPapsRecords(studentId: string): PAPSRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAPS_RECORDS);
    const allRecords: PAPSRecord[] = raw ? JSON.parse(raw) : [];
    return allRecords
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export async function savePapsRecord(record: PAPSRecord): Promise<void> {
  // 로컬 저장
  const raw = localStorage.getItem(STORAGE_KEYS.PAPS_RECORDS);
  const allRecords: PAPSRecord[] = raw ? JSON.parse(raw) : [];
  const existingIdx = allRecords.findIndex((r) => r.id === record.id);

  let updatedList: PAPSRecord[];
  if (existingIdx >= 0) {
    updatedList = allRecords.map((r) => (r.id === record.id ? record : r));
  } else {
    updatedList = [record, ...allRecords];
  }
  localStorage.setItem(STORAGE_KEYS.PAPS_RECORDS, JSON.stringify(updatedList));

  // Firestore 동기화
  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, 'paps_records', record.id), record, { merge: true });
    } catch (e) {
      console.warn('Firebase paps record write warning:', e);
    }
  }
}

// 3. FITT 운동 처방 관리
export function getStudentFittPlan(studentId: string): FITTPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FITT_PLANS);
    const allPlans: Record<string, FITTPlan> = raw ? JSON.parse(raw) : {};
    return allPlans[studentId] || null;
  } catch {
    return null;
  }
}

export async function saveStudentFittPlan(plan: FITTPlan): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEYS.FITT_PLANS);
  const allPlans: Record<string, FITTPlan> = raw ? JSON.parse(raw) : {};
  allPlans[plan.studentId] = plan;
  localStorage.setItem(STORAGE_KEYS.FITT_PLANS, JSON.stringify(allPlans));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, 'fitt_plans', plan.studentId), plan, { merge: true });
    } catch (e) {
      console.warn('Firebase fitt write warning:', e);
    }
  }
}

// 4. 5차시 운동 계획 관리
export function getStudentLessonPlans(studentId: string): LessonPlan[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.LESSON_PLANS}_${studentId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_LESSON_PLANS;
}

export async function saveStudentLessonPlans(
  studentId: string,
  plans: LessonPlan[]
): Promise<void> {
  localStorage.setItem(`${STORAGE_KEYS.LESSON_PLANS}_${studentId}`, JSON.stringify(plans));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, 'lesson_plans', studentId), {
        studentId,
        plans,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Firebase lesson write warning:', e);
    }
  }
}

// 5. 운동 실습 기록 (타이머 실습 등)
export function getStudentWorkoutLogs(studentId: string): WorkoutLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
    const allLogs: WorkoutLog[] = raw ? JSON.parse(raw) : [];
    return allLogs
      .filter((l) => l.studentId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
  const allLogs: WorkoutLog[] = raw ? JSON.parse(raw) : [];
  const updated = [log, ...allLogs];
  localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(updated));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, 'workout_logs', log.id), log);
    } catch (e) {
      console.warn('Firebase workout log write warning:', e);
    }
  }
}

// 5-1. 학생 비밀번호(PIN) 재설정 함수
export async function updateStudentPin(
  studentId: string,
  newPin: string
): Promise<{ success: boolean; message: string }> {
  try {
    const all = getAllStudents();
    const target = all.find((s) => s.id === studentId);
    if (!target) {
      return { success: false, message: '학생 정보를 찾을 수 없습니다.' };
    }

    target.pin = newPin.trim();
    const updatedList = all.map((s) => (s.id === studentId ? target : s));
    localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS, JSON.stringify(updatedList));

    const curr = getCurrentStudent();
    if (curr && curr.id === studentId) {
      curr.pin = newPin.trim();
      setCurrentStudent(curr);
    }

    // Firestore 동기화
    const db = getFirebaseFirestore();
    if (db) {
      try {
        await setDoc(doc(db, 'students', studentId), { pin: newPin.trim() }, { merge: true });
      } catch (e) {
        console.warn('Firebase update student pin warning:', e);
      }
    }

    return { success: true, message: '비밀번호(PIN)가 성공적으로 변경되었습니다!' };
  } catch (err) {
    console.error('Update student pin failed:', err);
    return { success: false, message: '비밀번호 변경 중 오류가 발생했습니다.' };
  }
}

// 5-2. 체육교사용 기록 삭제 및 초기화 관리 함수
export async function deletePapsRecord(recordIdOrStudentId: string, maybeRecordId?: string): Promise<void> {
  const targetId = maybeRecordId || recordIdOrStudentId;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAPS_RECORDS);
    const allRecords: PAPSRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = allRecords.filter((r) => r.id !== targetId);
    localStorage.setItem(STORAGE_KEYS.PAPS_RECORDS, JSON.stringify(filtered));

    const db = getFirebaseFirestore();
    if (db) {
      try {
        await deleteDoc(doc(db, 'paps_records', targetId));
      } catch (e) {
        console.warn('Firebase paps delete warning:', e);
      }
    }
  } catch (err) {
    console.error('Failed to delete PAPS record:', err);
  }
}

export async function deleteAllPapsRecordsForStudent(studentId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAPS_RECORDS);
    const allRecords: PAPSRecord[] = raw ? JSON.parse(raw) : [];
    const toDelete = allRecords.filter((r) => r.studentId === studentId);
    const filtered = allRecords.filter((r) => r.studentId !== studentId);
    localStorage.setItem(STORAGE_KEYS.PAPS_RECORDS, JSON.stringify(filtered));

    const db = getFirebaseFirestore();
    if (db) {
      for (const r of toDelete) {
        try {
          await deleteDoc(doc(db, 'paps_records', r.id));
        } catch (e) {
          console.warn('Firebase individual paps delete warning:', e);
        }
      }
    }
  } catch (err) {
    console.error('Failed to delete all PAPS records for student:', err);
  }
}

export async function deleteWorkoutLog(logIdOrStudentId: string, maybeLogId?: string): Promise<void> {
  const targetId = maybeLogId || logIdOrStudentId;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
    const allLogs: WorkoutLog[] = raw ? JSON.parse(raw) : [];
    const filtered = allLogs.filter((l) => l.id !== targetId);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(filtered));

    const db = getFirebaseFirestore();
    if (db) {
      try {
        await deleteDoc(doc(db, 'workout_logs', targetId));
      } catch (e) {
        console.warn('Firebase workout log delete warning:', e);
      }
    }
  } catch (err) {
    console.error('Failed to delete workout log:', err);
  }
}

export async function deleteAllWorkoutLogsForStudent(studentId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
    const allLogs: WorkoutLog[] = raw ? JSON.parse(raw) : [];
    const toDelete = allLogs.filter((l) => l.studentId === studentId);
    const filtered = allLogs.filter((l) => l.studentId !== studentId);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(filtered));

    const db = getFirebaseFirestore();
    if (db) {
      for (const l of toDelete) {
        try {
          await deleteDoc(doc(db, 'workout_logs', l.id));
        } catch (e) {
          console.warn('Firebase individual workout log delete warning:', e);
        }
      }
    }
  } catch (err) {
    console.error('Failed to delete all workout logs for student:', err);
  }
}

export async function resetStudentFittPlan(studentId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FITT_PLANS);
    const allPlans: Record<string, FITTPlan> = raw ? JSON.parse(raw) : {};
    delete allPlans[studentId];
    localStorage.setItem(STORAGE_KEYS.FITT_PLANS, JSON.stringify(allPlans));
  } catch (err) {
    console.error('Failed to reset student FITT plan:', err);
  }
}

export async function resetStudentLessonPlans(studentId: string): Promise<void> {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.LESSON_PLANS}_${studentId}`);
  } catch (err) {
    console.error('Failed to reset student lesson plans:', err);
  }
}

export async function resetStudentAllData(studentId: string): Promise<void> {
  await deleteAllPapsRecordsForStudent(studentId);
  await deleteAllWorkoutLogsForStudent(studentId);
  await resetStudentFittPlan(studentId);
  await resetStudentLessonPlans(studentId);
}

// 5-3. 생활기록부 세특(NEIS) 문구 개별 저장 및 관리
export function getStudentNeisNote(studentId: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_NEIS_NOTES);
    const allNotes: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (allNotes[studentId]) return allNotes[studentId];
  } catch {
    // ignore
  }
  const paps = getStudentPapsRecords(studentId);
  return paps[0]?.neisNote || null;
}

export async function saveStudentNeisNote(studentId: string, note: string): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_NEIS_NOTES);
    const allNotes: Record<string, string> = raw ? JSON.parse(raw) : {};
    allNotes[studentId] = note;
    localStorage.setItem(STORAGE_KEYS.STUDENT_NEIS_NOTES, JSON.stringify(allNotes));

    // 최신 PAPS 레코드의 neisNote도 함께 동기화
    const records = getStudentPapsRecords(studentId);
    if (records.length > 0) {
      const latest = { ...records[0], neisNote: note };
      await savePapsRecord(latest);
    }

    // Firestore 동기화
    const db = getFirebaseFirestore();
    if (db) {
      try {
        await setDoc(
          doc(db, 'neis_notes', studentId),
          {
            studentId,
            note,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Firebase neis note write warning:', e);
      }
    }
  } catch (err) {
    console.error('Failed to save student NEIS note:', err);
  }
}

export function getAllStudentNeisNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_NEIS_NOTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// 6. 교사용 설정 및 구글 시트 웹훅 연동
export function getTeacherSettings(): TeacherSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHER_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    googleSheetWebhookUrl: '',
    schoolName: '신안해양과학고등학교',
    semester: '2026학년도 1학기'
  };
}

export function saveTeacherSettings(settings: TeacherSettings): void {
  localStorage.setItem(STORAGE_KEYS.TEACHER_SETTINGS, JSON.stringify(settings));
}

export async function syncToGoogleSheet(payload: {
  action: 'paps_record' | 'fitt_plan' | 'lesson_complete' | 'workout_log';
  student: StudentProfile;
  data: Record<string, unknown>;
}): Promise<{ success: boolean; message: string }> {
  const settings = getTeacherSettings();
  if (!settings.googleSheetWebhookUrl) {
    return {
      success: false,
      message: '교사용 구글 시트 Webhook URL이 설정되어 있지 않습니다. 교사 모드에서 URL을 등록해주세요.'
    };
  }

  try {
    const bodyData = {
      timestamp: new Date().toISOString(),
      schoolName: settings.schoolName,
      grade: payload.student.grade,
      classNum: payload.student.classNum,
      studentNum: payload.student.studentNum,
      studentName: payload.student.name,
      studentId: payload.student.id,
      action: payload.action,
      ...payload.data
    };

    // CORS 및 Apps Script Webhook 대응
    // Google Apps Script는 브라우저 직결 시 mode: 'no-cors' 전송을 사용할 수 있음
    await fetch(settings.googleSheetWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // GAS에서 e.postData.contents 로 받기 용이
      },
      body: JSON.stringify(bodyData),
      mode: 'no-cors'
    });

    return {
      success: true,
      message: '교사용 구글 스프레드시트에 성공적으로 전송되었습니다!'
    };
  } catch (err) {
    console.error('Google Sheet Webhook sync failed:', err);
    return {
      success: false,
      message: `구글 시트 전송 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Google Apps Script(GAS) 웹앱 전용 수동 내보내기 함수
 * - 무분별한 요청/할당량 초과를 방지하기 위해 사용자가 '시트로 내보내기'를 클릭했을 때만 호출
 * - type: 'PAPS' | 'FITT' 구조의 분기형 페이로드 전송
 */
export async function exportToGoogleSheetGas(
  type: 'PAPS' | 'FITT',
  payload: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  const settings = getTeacherSettings();
  const webhookUrl = settings.googleSheetWebhookUrl?.trim();

  if (!webhookUrl) {
    return {
      success: false,
      message: '구글 시트(GAS) Webhook URL이 설정되지 않았습니다. [구글 시트 연동 설정]에서 URL을 먼저 등록해주세요.'
    };
  }

  try {
    const postBody = {
      type, // 'PAPS' 또는 'FITT'
      timestamp: new Date().toISOString(),
      payload
    };

    // Google Apps Script는 리디렉션 및 CORS 제한으로 인해 'no-cors' 전송을 수행합니다.
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(postBody),
      mode: 'no-cors'
    });

    const targetSheet = type === 'PAPS' ? '[PAPS_결과]' : '[FITT_처방]';
    return {
      success: true,
      message: `구글 스프레드시트 ${targetSheet} 탭으로 데이터가 성공적으로 내보내졌습니다!`
    };
  } catch (err) {
    console.error('GAS export failed:', err);
    return {
      success: false,
      message: `구글 시트 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

// 7. 교사용 전체 데이터 CSV 내보내기
export function exportClassDataAsCsv(): string {
  const allStudents = getAllStudents();
  const rawPaps = localStorage.getItem(STORAGE_KEYS.PAPS_RECORDS);
  const allPaps: PAPSRecord[] = rawPaps ? JSON.parse(rawPaps) : [];

  const headers = [
    '학년',
    '반',
    '번호',
    '이름',
    '성별',
    '최근측정일',
    '종합등급',
    '종합점수',
    '심폐지구력종목',
    '심폐측정값',
    '심폐등급',
    '유연성종목',
    '유연성측정값',
    '유연성등급',
    '근력종목',
    '근력측정값',
    '근력등급',
    '순발력종목',
    '순발력측정값',
    '순발력등급',
    '신장(cm)',
    '체중(kg)',
    'BMI',
    '신체조성등급',
    '생기부추천세특'
  ];

  const allNeisNotes = getAllStudentNeisNotes();

  const rows = allStudents.map((s) => {
    const studentRecords = allPaps
      .filter((r) => r.studentId === s.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = studentRecords[0];
    const neisText = allNeisNotes[s.id] || latest?.neisNote || '';

    if (!latest) {
      return [
        s.grade,
        s.classNum,
        s.studentNum,
        `"${s.name}"`,
        s.gender,
        '미측정',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        `"${neisText.replace(/"/g, '""')}"`
      ].join(',');
    }

    return [
      s.grade,
      s.classNum,
      s.studentNum,
      `"${s.name}"`,
      s.gender,
      latest.date,
      latest.overallGrade,
      latest.totalScore,
      `"${latest.cardio.testType}"`,
      latest.cardio.value,
      latest.cardio.grade,
      `"${latest.flexibility.testType}"`,
      latest.flexibility.value,
      latest.flexibility.grade,
      `"${latest.strength.testType}"`,
      latest.strength.value,
      latest.strength.grade,
      `"${latest.agility.testType}"`,
      latest.agility.value,
      latest.agility.grade,
      latest.bodyComp.height,
      latest.bodyComp.weight,
      latest.bodyComp.bmi,
      latest.bodyComp.grade,
      `"${neisText.replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
