# Security Specification: Shinan Marine High School PAPS & FITT Platform

## 1. Data Invariants
1. `students`: Document ID must be a valid sanitized identifier (`^[a-zA-Z0-9_\-]+$`) matching student format (e.g. `1-1-01`). Profile must have `id`, `grade`, `classNum`, `studentNum`, and `name`.
2. `paps_records`: Must have valid `id`, `studentId`, `date`, non-empty test factor structures, and bounded string sizes.
3. `fitt_plans`: Must have valid `studentId`, `frequency`, `intensity`, `time`, and `type` with length limits.
4. `lesson_plans`: Must be keyed by valid `studentId` and contain bounded array of lesson plans.
5. `workout_logs`: Must contain valid `id`, `studentId`, `exerciseName`, and bounded metrics (sets, duration, rpe 1-10).
6. `neis_notes`: Must be keyed by valid `studentId` with note string bounded to 4000 characters.
7. `test`: Diagnostic probe collection for initial connectivity test.

## 2. Dirty Dozen Payloads (Designed to violate invariants)
1. **Ghost Field Injection in student**: `{ "id": "1-1-01", "name": "Hack", "isAdmin": true }`
2. **Invalid ID Poisoning**: Document path `/students/../../../etc/passwd` or 2KB string ID
3. **Huge Text DoS in PAPS**: Record with 5MB `teacherFeedback` string
4. **Invalid Enum in Gender**: `{ "gender": "unknown" }`
5. **Negative RPE Score in WorkoutLog**: `{ "rpe": -99 }`
6. **Missing Required Field in PAPS**: Record without `studentId` or `date`
7. **Type Spoofing in FITT**: FITTPlan with `frequency` set to a Boolean `false`
8. **Negative Duration in WorkoutLog**: `{ "durationMinutes": -50 }`
9. **Corrupted LessonPlan array**: `plans` set to an integer `12345` instead of list
10. **Overflowing NeisNote**: Note exceeding 50,000 characters
11. **Improper Document Path Traversal**: Requesting document with invalid characters
12. **Blanket Collection Overwrite**: Trying to drop the whole database with wildcard write

## 3. Red Team Evaluation Matrix
- **Identity Integrity**: All documents enforce `isValidId` and type checking on incoming data.
- **Resource Exhaustion Guard**: String sizes strictly clamped with `.size() <= MAX` on all fields.
- **State Integrity**: Keys checked and validated on create/update.
