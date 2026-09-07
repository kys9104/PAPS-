import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  getDocs,
  Firestore
} from 'firebase/firestore';
import {
  StudentProfile,
  PAPSRecord,
  FITTPlan,
  LessonPlan,
  WorkoutLog,
  StudentProgressStatus
} from '../types';
import { getFirebaseFirestore } from './firebaseConfig';
import {
  getCurrentStudent,
  getAllStudents,
  getAllPapsRecords,
  getStudentPapsRecords,
  getStudentFittPlan,
  getStudentLessonPlans,
  getStudentWorkoutLogs,
  savePapsRecord as saveLocalPaps,
  saveStudentFittPlan as saveLocalFitt,
  saveStudentLessonPlans as saveLocalLessons,
  saveWorkoutLog as saveLocalWorkoutLog
} from './storageService';

/**
 * Firestore Database Schema:
 * Collection: "students" (Document ID: studentId e.g. "1-1-01")
 * ├── profile: StudentProfile
 * ├── checklist: StudentProgressStatus { customPlanCreated, selfCheckCompleted, lesson5Created }
 * ├── paps_results: PAPSRecord[] (최신 기록 및 히스토리)
 * └── fitt_records:
 *     ├── plan: FITTPlan
 *     ├── lessonPlans: LessonPlan[]
 *     └── workoutLogs: WorkoutLog[]
 */

export interface StudentFirestoreData {
  profile: StudentProfile;
  checklist: StudentProgressStatus;
  paps_results: PAPSRecord[];
  fitt_records: {
    plan: FITTPlan | null;
    lessonPlans: LessonPlan[];
    workoutLogs: WorkoutLog[];
  };
}

/**
 * 특정 학생의 PAPS, FITT, 5차시 계획 및 체크리스트를 관리하고
 * Firestore와 실시간 연동하는 커스텀 훅
 */
export function useStudentData(studentId?: string | null) {
  const [papsRecords, setPapsRecords] = useState<PAPSRecord[]>([]);
  const [fittPlan, setFittPlan] = useState<FITTPlan | null>(null);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [progressStatus, setProgressStatus] = useState<StudentProgressStatus>({
    customPlanCreated: false,
    selfCheckCompleted: false,
    lesson5Created: false
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 로컬 데이터 동기화
  const loadLocalData = useCallback((id: string) => {
    const localPaps = getStudentPapsRecords(id);
    const localFitt = getStudentFittPlan(id);
    const localLessons = getStudentLessonPlans(id);
    const localWorkouts = getStudentWorkoutLogs(id);

    setPapsRecords(localPaps);
    setFittPlan(localFitt);
    setLessonPlans(localLessons);
    setWorkoutLogs(localWorkouts);

    const hasFitt = Boolean(localFitt && localFitt.goalStatement);
    const hasChecklist = Boolean(
      localFitt?.principlesChecklist &&
      Object.values(localFitt.principlesChecklist).some(Boolean)
    );
    const hasLesson5 = localLessons.length === 5 && localLessons.every((l) => l.title);

    setProgressStatus({
      customPlanCreated: hasFitt,
      selfCheckCompleted: hasChecklist,
      lesson5Created: hasLesson5
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!studentId) {
      setPapsRecords([]);
      setFittPlan(null);
      setLessonPlans([]);
      setWorkoutLogs([]);
      setIsLoading(false);
      return;
    }

    // 1. 먼저 로컬 데이터 즉시 로드
    loadLocalData(studentId);

    // 2. Firestore 구독 시도
    const db = getFirebaseFirestore();
    if (!db) return;

    try {
      const studentDocRef = doc(db, 'students', studentId);
      const unsubscribe = onSnapshot(
        studentDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as Partial<StudentFirestoreData>;
            if (data.paps_results) {
              setPapsRecords(data.paps_results);
            }
            if (data.fitt_records?.plan) {
              setFittPlan(data.fitt_records.plan);
            }
            if (data.fitt_records?.lessonPlans) {
              setLessonPlans(data.fitt_records.lessonPlans);
            }
            if (data.fitt_records?.workoutLogs) {
              setWorkoutLogs(data.fitt_records.workoutLogs);
            }
            if (data.checklist) {
              setProgressStatus(data.checklist);
            }
          }
          setIsLoading(false);
        },
        (error) => {
          console.warn('Firestore onSnapshot error (fallback to local):', error);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore subscription failed:', e);
      setIsLoading(false);
    }
  }, [studentId, loadLocalData]);

  // PAPS 저장 (로컬 + Firestore)
  const savePaps = async (record: PAPSRecord) => {
    // 1. 로컬 저장
    saveLocalPaps(record);
    setPapsRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== record.id);
      return [record, ...filtered];
    });

    // 2. Firestore 저장
    const db = getFirebaseFirestore();
    if (db && studentId) {
      try {
        const studentDocRef = doc(db, 'students', studentId);
        const currentRecords = getStudentPapsRecords(studentId);
        await setDoc(
          studentDocRef,
          {
            paps_results: currentRecords,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Firestore savePaps error:', err);
      }
    }
  };

  // FITT 운동 처방 저장 (로컬 + Firestore)
  const saveFitt = async (plan: FITTPlan) => {
    saveLocalFitt(plan);
    setFittPlan(plan);

    const hasFitt = Boolean(plan.goalStatement && plan.frequency);
    const hasChecklist = Boolean(
      plan.principlesChecklist &&
      Object.values(plan.principlesChecklist).some(Boolean)
    );

    const newChecklist = {
      ...progressStatus,
      customPlanCreated: hasFitt,
      selfCheckCompleted: hasChecklist
    };
    setProgressStatus(newChecklist);

    const db = getFirebaseFirestore();
    if (db && studentId) {
      try {
        const studentDocRef = doc(db, 'students', studentId);
        await setDoc(
          studentDocRef,
          {
            fitt_records: {
              plan
            },
            checklist: newChecklist,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Firestore saveFitt error:', err);
      }
    }
  };

  // 5차시 계획서 저장 (로컬 + Firestore)
  const saveLessons = async (lessons: LessonPlan[]) => {
    saveLocalLessons(studentId || '', lessons);
    setLessonPlans(lessons);

    const hasLesson5 = lessons.length === 5 && lessons.every((l) => l.title);
    const newChecklist = {
      ...progressStatus,
      lesson5Created: hasLesson5
    };
    setProgressStatus(newChecklist);

    const db = getFirebaseFirestore();
    if (db && studentId) {
      try {
        const studentDocRef = doc(db, 'students', studentId);
        await setDoc(
          studentDocRef,
          {
            fitt_records: {
              lessonPlans: lessons
            },
            checklist: newChecklist,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Firestore saveLessons error:', err);
      }
    }
  };

  // 차시 실천 완료 토글
  const toggleLessonComplete = async (lessonWeek: number) => {
    const updated = lessonPlans.map((l) => {
      if (l.lessonWeek === lessonWeek) {
        return {
          ...l,
          isCompleted: !l.isCompleted,
          completedAt: !l.isCompleted ? new Date().toISOString() : undefined
        };
      }
      return l;
    });
    await saveLessons(updated);
  };

  return {
    papsRecords,
    fittPlan,
    lessonPlans,
    workoutLogs,
    progressStatus,
    isLoading,
    savePaps,
    saveFitt,
    saveLessons,
    toggleLessonComplete
  };
}

/**
 * 1학년 전교생 37명의 데이터를 Firestore onSnapshot으로 실시간 동기화하는 훅
 */
export function useAllStudentsRealtime() {
  const [students, setStudents] = useState<StudentProfile[]>(() => getAllStudents());
  const [papsMap, setPapsMap] = useState<Record<string, PAPSRecord>>({});
  const [progressMap, setProgressMap] = useState<Record<string, StudentProgressStatus>>({});
  const [isFirestoreLive, setIsFirestoreLive] = useState<boolean>(false);

  // 로컬 스토리지 데이터로 초기 맵 구성
  const refreshFromLocal = useCallback(() => {
    const all = getAllStudents();
    const allPaps = getAllPapsRecords();
    const pMap: Record<string, PAPSRecord> = {};
    const prMap: Record<string, StudentProgressStatus> = {};

    allPaps.forEach((p) => {
      if (!pMap[p.studentId] || new Date(p.date) > new Date(pMap[p.studentId].date)) {
        pMap[p.studentId] = p;
      }
    });

    all.forEach((s) => {
      const fitt = getStudentFittPlan(s.id);
      const lessons = getStudentLessonPlans(s.id);
      prMap[s.id] = {
        customPlanCreated: Boolean(fitt && fitt.goalStatement),
        selfCheckCompleted: Boolean(
          fitt?.principlesChecklist &&
          Object.values(fitt.principlesChecklist).some(Boolean)
        ),
        lesson5Created: lessons.length === 5 && lessons.every((l) => l.title)
      };
    });

    setStudents(all);
    setPapsMap(pMap);
    setProgressMap(prMap);
  }, []);

  useEffect(() => {
    refreshFromLocal();

    const db = getFirebaseFirestore();
    if (!db) {
      setIsFirestoreLive(false);
      return;
    }

    try {
      const studentsColRef = collection(db, 'students');
      const unsubscribe = onSnapshot(
        studentsColRef,
        (snapshot) => {
          setIsFirestoreLive(true);
          const newPapsMap: Record<string, PAPSRecord> = { ...papsMap };
          const newProgressMap: Record<string, StudentProgressStatus> = { ...progressMap };

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Partial<StudentFirestoreData>;
            const sid = docSnap.id;

            if (data.paps_results && data.paps_results.length > 0) {
              newPapsMap[sid] = data.paps_results[0];
            }
            if (data.checklist) {
              newProgressMap[sid] = data.checklist;
            }
          });

          setPapsMap(newPapsMap);
          setProgressMap(newProgressMap);
        },
        (err) => {
          console.warn('All students realtime onSnapshot error:', err);
          setIsFirestoreLive(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Realtime hook init failed:', e);
      setIsFirestoreLive(false);
    }
  }, [refreshFromLocal]);

  return {
    students,
    papsMap,
    progressMap,
    isFirestoreLive,
    refreshFromLocal
  };
}
