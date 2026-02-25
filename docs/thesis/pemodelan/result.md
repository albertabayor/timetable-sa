# result without tabu

## Configuration
```typescript
const config: SAConfig<TimetableState> = {
  initialTemperature: 100000, // Higher for better exploration at start
  minTemperature: 0.0000001,
  coolingRate: 0.9995, // Slower cooling for thorough search
  maxIterations: 20_000, // Increased for better convergence (15-30 min runtime)
  hardConstraintWeight: 100000, // Very high penalty for hard violations

  // State cloning function - optimized for performance
  // Only clone schedule array (mutable), keep references to static data (rooms, lecturers, classes)
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry }))
  }),

  // Reheating to escape local minima
  reheatingThreshold: 500, // Reheat if no improvement for 500 iterations
  reheatingFactor: 150, // Strong reheating boost
  maxReheats: 10,

  // ============================================
  // NEW: Tabu Search Configuration
  // ============================================
  tabuSearchEnabled: false, // Enable to prevent cycling
  tabuTenure: 50, // How long a state stays tabu
  maxTabuListSize: 1000, // Memory limit for tabu list
  aspirationEnabled: false, // Allow overriding tabu if better solution found

  // ============================================
  // NEW: Intensification Configuration
  // ============================================
  enableIntensification: false, // Enable Phase 1.5 for stubborn hard violations
  intensificationIterations: 2000, // Iterations per intensification attempt
  maxIntensificationAttempts: 3, // Max restart attempts
  operatorSelectionMode: "hybrid",
  // Logging
  logging: {
    enabled: true,
    level: "info",
    logInterval: 500,
  },
};

```

```shell
emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:00:27.131Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:00:27.132Z] [INFO] Starting optimization...
[2026-01-22T06:00:27.132Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:00:27.145Z] [INFO] Initial state {"fitness":"220934.52","hardViolations":15}
[2026-01-22T06:00:28.757Z] [INFO] [Phase 1] Iteration 500: Temp = 77875.21, Hard violations = 5, Best = 5
[2026-01-22T06:00:30.190Z] [INFO] [Phase 1] Iteration 1000: Temp = 60645.48, Hard violations = 4, Best = 4
[2026-01-22T06:00:31.616Z] [INFO] [Phase 1] Iteration 1500: Temp = 47227.80, Hard violations = 4, Best = 4
[2026-01-22T06:00:33.022Z] [INFO] [Phase 1] Iteration 2000: Temp = 36778.75, Hard violations = 2, Best = 2
[2026-01-22T06:00:34.397Z] [INFO] [Phase 1] Iteration 2500: Temp = 28641.52, Hard violations = 2, Best = 2
[2026-01-22T06:00:35.811Z] [INFO] [Phase 1] Iteration 3000: Temp = 22304.65, Hard violations = 2, Best = 2
[2026-01-22T06:00:37.210Z] [INFO] [Phase 1] Iteration 3500: Temp = 17369.79, Hard violations = 2, Best = 2
[2026-01-22T06:00:38.668Z] [INFO] [Phase 1] Iteration 4000: Temp = 13526.76, Hard violations = 2, Best = 2
[2026-01-22T06:00:40.192Z] [INFO] [Phase 1] Iteration 4500: Temp = 10533.99, Hard violations = 2, Best = 2
[2026-01-22T06:00:40.522Z] [INFO] Phase 1 complete: Hard violations = 2
[2026-01-22T06:00:40.522Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:00:41.627Z] [INFO] [Phase 2] Iteration 5000: Temp = 8203.37, Current = 100026.63, Best = 100026.43
[2026-01-22T06:00:43.046Z] [INFO] [Phase 2] Iteration 5500: Temp = 6388.39, Current = 100026.67, Best = 100026.43
[2026-01-22T06:00:44.464Z] [INFO] [Phase 2] Iteration 6000: Temp = 4974.97, Current = 100026.87, Best = 100026.43
[2026-01-22T06:00:45.871Z] [INFO] [Phase 2] Iteration 6500: Temp = 3874.27, Current = 50026.77, Best = 50026.71
[2026-01-22T06:00:47.255Z] [INFO] [Phase 2] Iteration 7000: Temp = 3017.10, Current = 50026.95, Best = 50026.71
[2026-01-22T06:00:48.626Z] [INFO] [Phase 2] Iteration 7500: Temp = 2349.57, Current = 50027.07, Best = 50026.71
[2026-01-22T06:00:49.997Z] [INFO] [Phase 2] Iteration 8000: Temp = 1829.73, Current = 50027.09, Best = 50026.71
[2026-01-22T06:00:51.399Z] [INFO] [Phase 2] Iteration 8500: Temp = 1424.91, Current = 50027.08, Best = 50026.71
[2026-01-22T06:00:52.798Z] [INFO] [Phase 2] Iteration 9000: Temp = 1109.65, Current = 50026.86, Best = 50026.71
[2026-01-22T06:00:53.390Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 50026.71
[2026-01-22T06:00:54.202Z] [INFO] [Phase 2] Iteration 9500: Temp = 129621.36, Current = 50026.95, Best = 50026.71
[2026-01-22T06:00:55.592Z] [INFO] [Phase 2] Iteration 10000: Temp = 100942.91, Current = 50027.01, Best = 50026.71
[2026-01-22T06:00:56.984Z] [INFO] [Phase 2] Iteration 10500: Temp = 78609.50, Current = 50026.94, Best = 50026.71
[2026-01-22T06:00:58.380Z] [INFO] [Phase 2] Iteration 11000: Temp = 61217.31, Current = 50026.93, Best = 50026.71
[2026-01-22T06:00:59.793Z] [INFO] [Phase 2] Iteration 11500: Temp = 47673.11, Current = 50026.79, Best = 50026.71
[2026-01-22T06:01:01.207Z] [INFO] [Phase 2] Iteration 12000: Temp = 37125.53, Current = 50026.80, Best = 50026.71
[2026-01-22T06:01:02.611Z] [INFO] [Phase 2] Iteration 12500: Temp = 28911.59, Current = 50026.77, Best = 50026.71
[2026-01-22T06:01:00.339Z] [INFO] [Phase 2] Iteration 13000: Temp = 22514.96, Current = 50026.70, Best = 50026.69
[2026-01-22T06:01:01.715Z] [INFO] [Phase 2] Iteration 13500: Temp = 17533.57, Current = 50026.84, Best = 50026.69
[2026-01-22T06:01:03.080Z] [INFO] [Phase 2] Iteration 14000: Temp = 13654.31, Current = 50026.95, Best = 50026.69
[2026-01-22T06:01:04.456Z] [INFO] [Phase 2] Iteration 14500: Temp = 10633.32, Current = 50027.00, Best = 50026.69
[2026-01-22T06:01:05.877Z] [INFO] [Phase 2] Iteration 15000: Temp = 8280.72, Current = 50027.04, Best = 50026.69
[2026-01-22T06:01:07.266Z] [INFO] [Phase 2] Iteration 15500: Temp = 6448.63, Current = 50027.02, Best = 50026.69
[2026-01-22T06:01:08.665Z] [INFO] [Phase 2] Iteration 16000: Temp = 5021.88, Current = 50027.16, Best = 50026.69
[2026-01-22T06:01:10.057Z] [INFO] [Phase 2] Iteration 16500: Temp = 3910.80, Current = 50026.91, Best = 50026.69
[2026-01-22T06:01:11.452Z] [INFO] [Phase 2] Iteration 17000: Temp = 3045.54, Current = 50027.12, Best = 50026.69
[2026-01-22T06:01:12.869Z] [INFO] [Phase 2] Iteration 17500: Temp = 2371.72, Current = 50027.07, Best = 50026.69
[2026-01-22T06:01:14.284Z] [INFO] [Phase 2] Iteration 18000: Temp = 1846.99, Current = 50027.05, Best = 50026.69
[2026-01-22T06:01:15.686Z] [INFO] [Phase 2] Iteration 18500: Temp = 1438.34, Current = 50027.06, Best = 50026.69
[2026-01-22T06:01:17.079Z] [INFO] [Phase 2] Iteration 19000: Temp = 1120.11, Current = 50026.97, Best = 50026.69
[2026-01-22T06:01:17.711Z] [INFO] [Phase 2] Reheating #2: Temperature = 149985.20, Fitness = 50026.69
[2026-01-22T06:01:18.478Z] [INFO] [Phase 2] Iteration 19500: Temp = 130843.57, Current = 50027.05, Best = 50026.69
[2026-01-22T06:01:19.893Z] [INFO] [Phase 2] Iteration 20000: Temp = 101894.70, Current = 50026.93, Best = 50026.69
[2026-01-22T06:01:19.895Z] [INFO] Optimization complete {"iterations":20000,"reheats":2,"finalTemperature":"101894.7014","fitness":"50026.69","hardViolations":1,"softViolations":8}
[2026-01-22T06:01:19.896Z] [INFO] Operator Statistics:
[2026-01-22T06:01:19.896Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 1, Improvements = 1, Accepted = 1, Success Rate = 100.00%
[2026-01-22T06:01:19.896Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Room Conflict: Attempts = 27, Improvements = 2, Accepted = 27, Success Rate = 7.41%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Max Daily Periods: Attempts = 973, Improvements = 7, Accepted = 973, Success Rate = 0.72%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:01:19.896Z] [INFO]   Change Time Slot and Room: Attempts = 4630, Improvements = 229, Accepted = 4466, Success Rate = 4.95%
[2026-01-22T06:01:19.896Z] [INFO]   Change Time Slot: Attempts = 4676, Improvements = 112, Accepted = 4405, Success Rate = 2.40%
[2026-01-22T06:01:19.896Z] [INFO]   Change Room: Attempts = 4837, Improvements = 148, Accepted = 4837, Success Rate = 3.06%
[2026-01-22T06:01:19.896Z] [INFO]   Swap Classes: Attempts = 4856, Improvements = 35, Accepted = 287, Success Rate = 0.72%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 273,
  prayerOverlapCache: 273,
  totalEntries: 583,
}
📊 RESULTS:
   Final fitness: 50026.69
   Hard constraint violations: 1
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 2
   Final temperature: 101894.7014
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 1
      Improvements: 1
      Success rate: 100.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 27
      Improvements: 2
      Success rate: 7.41%
   Fix Max Daily Periods:
      Attempts: 973
      Improvements: 7
      Success rate: 0.72%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 4630
      Improvements: 229
      Success rate: 4.95%
   Change Time Slot:
      Attempts: 4676
      Improvements: 112
      Success rate: 2.40%
   Change Room:
      Attempts: 4837
      Improvements: 148
      Success rate: 3.06%
   Swap Classes:
      Attempts: 4856
      Improvements: 35
      Success rate: 0.72%

⚠️  VIOLATIONS (9):
   - [hard] Exclusive Room: Room G5-LabAudioVisual is exclusive and cannot be used by class IF13AM13 (Pemrograman Aplikasi Mobile) from INFORMATIKA
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:01:30.466Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:01:30.467Z] [INFO] Starting optimization...
[2026-01-22T06:01:30.467Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:01:30.481Z] [INFO] Initial state {"fitness":"225025.54","hardViolations":17}
[2026-01-22T06:01:32.141Z] [INFO] [Phase 1] Iteration 500: Temp = 77875.21, Hard violations = 7, Best = 7
[2026-01-22T06:01:31.040Z] [INFO] [Phase 1] Iteration 1000: Temp = 60645.48, Hard violations = 3, Best = 3
[2026-01-22T06:01:32.389Z] [INFO] [Phase 1] Iteration 1500: Temp = 47227.80, Hard violations = 2, Best = 2
[2026-01-22T06:01:33.807Z] [INFO] [Phase 1] Iteration 2000: Temp = 36778.75, Hard violations = 2, Best = 2
[2026-01-22T06:01:35.234Z] [INFO] [Phase 1] Iteration 2500: Temp = 28641.52, Hard violations = 2, Best = 2
[2026-01-22T06:01:36.655Z] [INFO] [Phase 1] Iteration 3000: Temp = 22304.65, Hard violations = 2, Best = 2
[2026-01-22T06:01:38.048Z] [INFO] [Phase 1] Iteration 3500: Temp = 17369.79, Hard violations = 2, Best = 2
[2026-01-22T06:01:39.395Z] [INFO] [Phase 1] Iteration 4000: Temp = 13526.76, Hard violations = 1, Best = 1
[2026-01-22T06:01:40.741Z] [INFO] [Phase 1] Iteration 4500: Temp = 10533.99, Hard violations = 1, Best = 1
[2026-01-22T06:01:41.030Z] [INFO] Phase 1 complete: Hard violations = 1
[2026-01-22T06:01:41.030Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:01:42.132Z] [INFO] [Phase 2] Iteration 5000: Temp = 8203.37, Current = 50027.17, Best = 50027.07
[2026-01-22T06:01:43.477Z] [INFO] [Phase 2] Iteration 5500: Temp = 6388.39, Current = 50027.18, Best = 50027.07
[2026-01-22T06:01:44.847Z] [INFO] [Phase 2] Iteration 6000: Temp = 4974.97, Current = 50027.15, Best = 50027.07
[2026-01-22T06:01:46.208Z] [INFO] [Phase 2] Iteration 6500: Temp = 3874.27, Current = 50027.16, Best = 50027.07
[2026-01-22T06:01:47.542Z] [INFO] [Phase 2] Iteration 7000: Temp = 3017.10, Current = 50027.22, Best = 50027.07
[2026-01-22T06:01:48.913Z] [INFO] [Phase 2] Iteration 7500: Temp = 2349.57, Current = 50027.39, Best = 50027.07
[2026-01-22T06:01:50.318Z] [INFO] [Phase 2] Iteration 8000: Temp = 1829.73, Current = 50027.35, Best = 50027.07
[2026-01-22T06:01:51.691Z] [INFO] [Phase 2] Iteration 8500: Temp = 1424.91, Current = 50027.36, Best = 50027.07
[2026-01-22T06:01:53.110Z] [INFO] [Phase 2] Iteration 9000: Temp = 1109.65, Current = 50027.36, Best = 50027.07
[2026-01-22T06:01:53.682Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 50027.07
[2026-01-22T06:01:54.485Z] [INFO] [Phase 2] Iteration 9500: Temp = 129621.36, Current = 50027.39, Best = 50027.07
[2026-01-22T06:01:56.092Z] [INFO] [Phase 2] Iteration 10000: Temp = 100942.91, Current = 50027.58, Best = 50027.07
[2026-01-22T06:01:57.548Z] [INFO] [Phase 2] Iteration 10500: Temp = 78609.50, Current = 50027.54, Best = 50027.07
[2026-01-22T06:01:58.978Z] [INFO] [Phase 2] Iteration 11000: Temp = 61217.31, Current = 50027.69, Best = 50027.07
[2026-01-22T06:02:00.443Z] [INFO] [Phase 2] Iteration 11500: Temp = 47673.11, Current = 50027.54, Best = 50027.07
[2026-01-22T06:02:01.924Z] [INFO] [Phase 2] Iteration 12000: Temp = 37125.53, Current = 50027.48, Best = 50027.07
[2026-01-22T06:02:00.875Z] [INFO] [Phase 2] Iteration 12500: Temp = 28911.59, Current = 27.50, Best = 27.40
[2026-01-22T06:02:02.297Z] [INFO] [Phase 2] Iteration 13000: Temp = 22514.96, Current = 27.26, Best = 27.26
[2026-01-22T06:02:03.735Z] [INFO] [Phase 2] Iteration 13500: Temp = 17533.57, Current = 27.53, Best = 27.26
[2026-01-22T06:02:05.208Z] [INFO] [Phase 2] Iteration 14000: Temp = 13654.31, Current = 27.45, Best = 27.26
[2026-01-22T06:02:06.665Z] [INFO] [Phase 2] Iteration 14500: Temp = 10633.32, Current = 27.49, Best = 27.26
[2026-01-22T06:02:08.092Z] [INFO] [Phase 2] Iteration 15000: Temp = 8280.72, Current = 27.66, Best = 27.26
[2026-01-22T06:02:09.551Z] [INFO] [Phase 2] Iteration 15500: Temp = 6448.63, Current = 27.48, Best = 27.26
[2026-01-22T06:02:10.958Z] [INFO] [Phase 2] Iteration 16000: Temp = 5021.88, Current = 27.49, Best = 27.26
[2026-01-22T06:02:12.398Z] [INFO] [Phase 2] Iteration 16500: Temp = 3910.80, Current = 27.57, Best = 27.26
[2026-01-22T06:02:13.850Z] [INFO] [Phase 2] Iteration 17000: Temp = 3045.54, Current = 27.45, Best = 27.26
[2026-01-22T06:02:15.259Z] [INFO] [Phase 2] Iteration 17500: Temp = 2371.72, Current = 27.55, Best = 27.26
[2026-01-22T06:02:16.682Z] [INFO] [Phase 2] Iteration 18000: Temp = 1846.99, Current = 27.54, Best = 27.26
[2026-01-22T06:02:18.118Z] [INFO] [Phase 2] Iteration 18500: Temp = 1438.34, Current = 27.65, Best = 27.26
[2026-01-22T06:02:19.549Z] [INFO] [Phase 2] Iteration 19000: Temp = 1120.11, Current = 27.27, Best = 27.26
[2026-01-22T06:02:20.198Z] [INFO] [Phase 2] Reheating #2: Temperature = 149985.20, Fitness = 27.26
[2026-01-22T06:02:20.993Z] [INFO] [Phase 2] Iteration 19500: Temp = 130843.57, Current = 27.36, Best = 27.26
[2026-01-22T06:02:22.422Z] [INFO] [Phase 2] Iteration 20000: Temp = 101894.70, Current = 27.50, Best = 27.26
[2026-01-22T06:02:22.425Z] [INFO] Optimization complete {"iterations":20000,"reheats":2,"finalTemperature":"101894.7014","fitness":"27.26","hardViolations":0,"softViolations":8}
[2026-01-22T06:02:22.425Z] [INFO] Operator Statistics:
[2026-01-22T06:02:22.425Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 1, Improvements = 1, Accepted = 1, Success Rate = 100.00%
[2026-01-22T06:02:22.425Z] [INFO]   Swap Friday with Non-Friday: Attempts = 2, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:02:22.425Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:02:22.425Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:02:22.425Z] [INFO]   Fix Max Daily Periods: Attempts = 628, Improvements = 7, Accepted = 628, Success Rate = 1.11%
[2026-01-22T06:02:22.425Z] [INFO]   Fix Room Capacity: Attempts = 1926, Improvements = 0, Accepted = 1901, Success Rate = 0.00%
[2026-01-22T06:02:22.425Z] [INFO]   Change Time Slot and Room: Attempts = 4420, Improvements = 225, Accepted = 4315, Success Rate = 5.09%
[2026-01-22T06:02:22.425Z] [INFO]   Change Time Slot: Attempts = 4245, Improvements = 89, Accepted = 4030, Success Rate = 2.10%
[2026-01-22T06:02:22.425Z] [INFO]   Change Room: Attempts = 4354, Improvements = 167, Accepted = 4354, Success Rate = 3.84%
[2026-01-22T06:02:22.425Z] [INFO]   Swap Classes: Attempts = 4424, Improvements = 42, Accepted = 284, Success Rate = 0.95%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 273,
  prayerOverlapCache: 273,
  totalEntries: 583,
}
📊 RESULTS:
   Final fitness: 27.26
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 2
   Final temperature: 101894.7014
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 1
      Improvements: 1
      Success rate: 100.00%
   Swap Friday with Non-Friday:
      Attempts: 2
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 628
      Improvements: 7
      Success rate: 1.11%
   Fix Room Capacity:
      Attempts: 1926
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 4420
      Improvements: 225
      Success rate: 5.09%
   Change Time Slot:
      Attempts: 4245
      Improvements: 89
      Success rate: 2.10%
   Change Room:
      Attempts: 4354
      Improvements: 167
      Success rate: 3.84%
   Swap Classes:
      Attempts: 4424
      Improvements: 42
      Success rate: 0.95%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:03:53.791Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:03:53.792Z] [INFO] Starting optimization...
[2026-01-22T06:03:53.792Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:03:53.804Z] [INFO] Initial state {"fitness":"167332.73","hardViolations":15}
[2026-01-22T06:03:55.365Z] [INFO] [Phase 1] Iteration 500: Temp = 77875.21, Hard violations = 2, Best = 2
[2026-01-22T06:03:56.740Z] [INFO] [Phase 1] Iteration 1000: Temp = 60645.48, Hard violations = 2, Best = 2
[2026-01-22T06:03:58.070Z] [INFO] [Phase 1] Iteration 1500: Temp = 47227.80, Hard violations = 1, Best = 1
[2026-01-22T06:03:59.416Z] [INFO] [Phase 1] Iteration 2000: Temp = 36778.75, Hard violations = 1, Best = 1
[2026-01-22T06:04:00.800Z] [INFO] [Phase 1] Iteration 2500: Temp = 28641.52, Hard violations = 1, Best = 1
[2026-01-22T06:04:02.125Z] [INFO] [Phase 1] Iteration 3000: Temp = 22304.65, Hard violations = 1, Best = 1
[2026-01-22T06:04:00.963Z] [INFO] [Phase 1] Iteration 3500: Temp = 17369.79, Hard violations = 1, Best = 1
[2026-01-22T06:04:02.240Z] [INFO] [Phase 1] Iteration 4000: Temp = 13526.76, Hard violations = 1, Best = 1
[2026-01-22T06:04:03.537Z] [INFO] [Phase 1] Iteration 4500: Temp = 10533.99, Hard violations = 1, Best = 1
[2026-01-22T06:04:03.819Z] [INFO] Phase 1 complete: Hard violations = 1
[2026-01-22T06:04:03.820Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:04:04.870Z] [INFO] [Phase 2] Iteration 5000: Temp = 8203.37, Current = 50026.39, Best = 50026.34
[2026-01-22T06:04:06.236Z] [INFO] [Phase 2] Iteration 5500: Temp = 6388.39, Current = 50026.45, Best = 50026.34
[2026-01-22T06:04:07.594Z] [INFO] [Phase 2] Iteration 6000: Temp = 4974.97, Current = 50026.53, Best = 50026.34
[2026-01-22T06:04:08.941Z] [INFO] [Phase 2] Iteration 6500: Temp = 3874.27, Current = 50026.55, Best = 50026.34
[2026-01-22T06:04:10.282Z] [INFO] [Phase 2] Iteration 7000: Temp = 3017.10, Current = 50026.77, Best = 50026.34
[2026-01-22T06:04:11.643Z] [INFO] [Phase 2] Iteration 7500: Temp = 2349.57, Current = 50026.68, Best = 50026.34
[2026-01-22T06:04:12.995Z] [INFO] [Phase 2] Iteration 8000: Temp = 1829.73, Current = 50026.73, Best = 50026.34
[2026-01-22T06:04:14.355Z] [INFO] [Phase 2] Iteration 8500: Temp = 1424.91, Current = 50026.73, Best = 50026.34
[2026-01-22T06:04:15.713Z] [INFO] [Phase 2] Iteration 9000: Temp = 1109.65, Current = 50026.65, Best = 50026.34
[2026-01-22T06:04:16.263Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 50026.34
[2026-01-22T06:04:17.050Z] [INFO] [Phase 2] Iteration 9500: Temp = 129621.36, Current = 50026.66, Best = 50026.34
[2026-01-22T06:04:18.408Z] [INFO] [Phase 2] Iteration 10000: Temp = 100942.91, Current = 50026.71, Best = 50026.34
[2026-01-22T06:04:19.768Z] [INFO] [Phase 2] Iteration 10500: Temp = 78609.50, Current = 50026.75, Best = 50026.34
[2026-01-22T06:04:21.136Z] [INFO] [Phase 2] Iteration 11000: Temp = 61217.31, Current = 50026.74, Best = 50026.34
[2026-01-22T06:04:22.505Z] [INFO] [Phase 2] Iteration 11500: Temp = 47673.11, Current = 50026.83, Best = 50026.34
[2026-01-22T06:04:23.853Z] [INFO] [Phase 2] Iteration 12000: Temp = 37125.53, Current = 50026.76, Best = 50026.34
[2026-01-22T06:04:25.224Z] [INFO] [Phase 2] Iteration 12500: Temp = 28911.59, Current = 50026.86, Best = 50026.34
[2026-01-22T06:04:26.612Z] [INFO] [Phase 2] Iteration 13000: Temp = 22514.96, Current = 26.68, Best = 26.68
[2026-01-22T06:04:28.000Z] [INFO] [Phase 2] Iteration 13500: Temp = 17533.57, Current = 26.81, Best = 26.68
[2026-01-22T06:04:29.384Z] [INFO] [Phase 2] Iteration 14000: Temp = 13654.31, Current = 27.30, Best = 26.68
[2026-01-22T06:04:30.779Z] [INFO] [Phase 2] Iteration 14500: Temp = 10633.32, Current = 27.20, Best = 26.68
[2026-01-22T06:04:32.144Z] [INFO] [Phase 2] Iteration 15000: Temp = 8280.72, Current = 27.15, Best = 26.68
[2026-01-22T06:04:31.014Z] [INFO] [Phase 2] Iteration 15500: Temp = 6448.63, Current = 27.07, Best = 26.68
[2026-01-22T06:04:32.365Z] [INFO] [Phase 2] Iteration 16000: Temp = 5021.88, Current = 27.14, Best = 26.68
[2026-01-22T06:04:33.705Z] [INFO] [Phase 2] Iteration 16500: Temp = 3910.80, Current = 27.09, Best = 26.68
[2026-01-22T06:04:35.073Z] [INFO] [Phase 2] Iteration 17000: Temp = 3045.54, Current = 27.15, Best = 26.68
[2026-01-22T06:04:36.494Z] [INFO] [Phase 2] Iteration 17500: Temp = 2371.72, Current = 27.17, Best = 26.68
[2026-01-22T06:04:37.853Z] [INFO] [Phase 2] Iteration 18000: Temp = 1846.99, Current = 27.32, Best = 26.68
[2026-01-22T06:04:39.213Z] [INFO] [Phase 2] Iteration 18500: Temp = 1438.34, Current = 27.39, Best = 26.68
[2026-01-22T06:04:40.647Z] [INFO] [Phase 2] Iteration 19000: Temp = 1120.11, Current = 27.43, Best = 26.68
[2026-01-22T06:04:41.291Z] [INFO] [Phase 2] Reheating #2: Temperature = 149985.20, Fitness = 26.68
[2026-01-22T06:04:42.069Z] [INFO] [Phase 2] Iteration 19500: Temp = 130843.57, Current = 27.52, Best = 26.68
[2026-01-22T06:04:43.464Z] [INFO] [Phase 2] Iteration 20000: Temp = 101894.70, Current = 27.44, Best = 26.68
[2026-01-22T06:04:43.467Z] [INFO] Optimization complete {"iterations":20000,"reheats":2,"finalTemperature":"101894.7014","fitness":"26.68","hardViolations":0,"softViolations":8}
[2026-01-22T06:04:43.467Z] [INFO] Operator Statistics:
[2026-01-22T06:04:43.467Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:04:43.467Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:04:43.467Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:04:43.467Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:04:43.467Z] [INFO]   Fix Max Daily Periods: Attempts = 7, Improvements = 7, Accepted = 7, Success Rate = 100.00%
[2026-01-22T06:04:43.467Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:04:43.467Z] [INFO]   Change Time Slot and Room: Attempts = 5099, Improvements = 309, Accepted = 4992, Success Rate = 6.06%
[2026-01-22T06:04:43.467Z] [INFO]   Change Time Slot: Attempts = 4929, Improvements = 108, Accepted = 4693, Success Rate = 2.19%
[2026-01-22T06:04:43.467Z] [INFO]   Change Room: Attempts = 4996, Improvements = 171, Accepted = 4996, Success Rate = 3.42%
[2026-01-22T06:04:43.467Z] [INFO]   Swap Classes: Attempts = 4969, Improvements = 39, Accepted = 296, Success Rate = 0.78%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 270,
  prayerOverlapCache: 270,
  totalEntries: 577,
}
📊 RESULTS:
   Final fitness: 26.68
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 2
   Final temperature: 101894.7014
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 7
      Improvements: 7
      Success rate: 100.00%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 5099
      Improvements: 309
      Success rate: 6.06%
   Change Time Slot:
      Attempts: 4929
      Improvements: 108
      Success rate: 2.19%
   Change Room:
      Attempts: 4996
      Improvements: 171
      Success rate: 3.42%
   Swap Classes:
      Attempts: 4969
      Improvements: 39
      Success rate: 0.78%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:04:47.170Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:04:47.172Z] [INFO] Starting optimization...
[2026-01-22T06:04:47.172Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:04:47.187Z] [INFO] Initial state {"fitness":"213914.28","hardViolations":12}
[2026-01-22T06:04:48.746Z] [INFO] [Phase 1] Iteration 500: Temp = 77875.21, Hard violations = 1, Best = 1
[2026-01-22T06:04:50.067Z] [INFO] [Phase 1] Iteration 1000: Temp = 60645.48, Hard violations = 1, Best = 1
[2026-01-22T06:04:50.758Z] [INFO] Phase 1 complete: Hard violations = 0
[2026-01-22T06:04:50.758Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:04:51.398Z] [INFO] [Phase 2] Iteration 1500: Temp = 47227.80, Current = 26.88, Best = 26.78
[2026-01-22T06:04:52.722Z] [INFO] [Phase 2] Iteration 2000: Temp = 36778.75, Current = 27.12, Best = 26.78
[2026-01-22T06:04:54.049Z] [INFO] [Phase 2] Iteration 2500: Temp = 28641.52, Current = 27.22, Best = 26.78
[2026-01-22T06:04:55.357Z] [INFO] [Phase 2] Iteration 3000: Temp = 22304.65, Current = 27.22, Best = 26.78
[2026-01-22T06:04:56.715Z] [INFO] [Phase 2] Iteration 3500: Temp = 17369.79, Current = 27.22, Best = 26.78
[2026-01-22T06:04:58.042Z] [INFO] [Phase 2] Iteration 4000: Temp = 13526.76, Current = 27.22, Best = 26.78
[2026-01-22T06:04:59.378Z] [INFO] [Phase 2] Iteration 4500: Temp = 10533.99, Current = 27.34, Best = 26.78
[2026-01-22T06:05:00.741Z] [INFO] [Phase 2] Iteration 5000: Temp = 8203.37, Current = 27.21, Best = 26.78
[2026-01-22T06:05:02.077Z] [INFO] [Phase 2] Iteration 5500: Temp = 6388.39, Current = 27.29, Best = 26.78
[2026-01-22T06:05:00.905Z] [INFO] [Phase 2] Iteration 6000: Temp = 4974.97, Current = 27.27, Best = 26.78
[2026-01-22T06:05:02.204Z] [INFO] [Phase 2] Iteration 6500: Temp = 3874.27, Current = 27.43, Best = 26.78
[2026-01-22T06:05:03.511Z] [INFO] [Phase 2] Iteration 7000: Temp = 3017.10, Current = 27.30, Best = 26.78
[2026-01-22T06:05:04.883Z] [INFO] [Phase 2] Iteration 7500: Temp = 2349.57, Current = 27.28, Best = 26.78
[2026-01-22T06:05:06.284Z] [INFO] [Phase 2] Iteration 8000: Temp = 1829.73, Current = 27.36, Best = 26.78
[2026-01-22T06:05:07.706Z] [INFO] [Phase 2] Iteration 8500: Temp = 1424.91, Current = 27.25, Best = 26.78
[2026-01-22T06:05:09.080Z] [INFO] [Phase 2] Iteration 9000: Temp = 1109.65, Current = 27.44, Best = 26.78
[2026-01-22T06:05:09.654Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 26.78
[2026-01-22T06:05:10.470Z] [INFO] [Phase 2] Iteration 9500: Temp = 129621.36, Current = 27.39, Best = 26.78
[2026-01-22T06:05:11.854Z] [INFO] [Phase 2] Iteration 10000: Temp = 100942.91, Current = 27.33, Best = 26.78
[2026-01-22T06:05:13.216Z] [INFO] [Phase 2] Iteration 10500: Temp = 78609.50, Current = 27.27, Best = 26.78
[2026-01-22T06:05:14.599Z] [INFO] [Phase 2] Iteration 11000: Temp = 61217.31, Current = 27.29, Best = 26.78
[2026-01-22T06:05:15.984Z] [INFO] [Phase 2] Iteration 11500: Temp = 47673.11, Current = 27.24, Best = 26.78
[2026-01-22T06:05:17.367Z] [INFO] [Phase 2] Iteration 12000: Temp = 37125.53, Current = 27.18, Best = 26.78
[2026-01-22T06:05:18.738Z] [INFO] [Phase 2] Iteration 12500: Temp = 28911.59, Current = 27.25, Best = 26.78
[2026-01-22T06:05:20.112Z] [INFO] [Phase 2] Iteration 13000: Temp = 22514.96, Current = 27.25, Best = 26.78
[2026-01-22T06:05:21.505Z] [INFO] [Phase 2] Iteration 13500: Temp = 17533.57, Current = 27.24, Best = 26.78
[2026-01-22T06:05:22.880Z] [INFO] [Phase 2] Iteration 14000: Temp = 13654.31, Current = 27.26, Best = 26.78
[2026-01-22T06:05:24.253Z] [INFO] [Phase 2] Iteration 14500: Temp = 10633.32, Current = 27.41, Best = 26.78
[2026-01-22T06:05:25.608Z] [INFO] [Phase 2] Iteration 15000: Temp = 8280.72, Current = 27.29, Best = 26.78
[2026-01-22T06:05:26.958Z] [INFO] [Phase 2] Iteration 15500: Temp = 6448.63, Current = 27.18, Best = 26.78
[2026-01-22T06:05:28.339Z] [INFO] [Phase 2] Iteration 16000: Temp = 5021.88, Current = 27.30, Best = 26.78
[2026-01-22T06:05:29.707Z] [INFO] [Phase 2] Iteration 16500: Temp = 3910.80, Current = 27.22, Best = 26.78
[2026-01-22T06:05:31.115Z] [INFO] [Phase 2] Iteration 17000: Temp = 3045.54, Current = 27.42, Best = 26.78
[2026-01-22T06:05:32.554Z] [INFO] [Phase 2] Iteration 17500: Temp = 2371.72, Current = 27.39, Best = 26.78
[2026-01-22T06:05:31.416Z] [INFO] [Phase 2] Iteration 18000: Temp = 1846.99, Current = 27.38, Best = 26.78
[2026-01-22T06:05:32.774Z] [INFO] [Phase 2] Iteration 18500: Temp = 1438.34, Current = 27.38, Best = 26.78
[2026-01-22T06:05:34.176Z] [INFO] [Phase 2] Iteration 19000: Temp = 1120.11, Current = 27.35, Best = 26.78
[2026-01-22T06:05:34.835Z] [INFO] [Phase 2] Reheating #2: Temperature = 149985.20, Fitness = 26.78
[2026-01-22T06:05:35.631Z] [INFO] [Phase 2] Iteration 19500: Temp = 130843.57, Current = 27.26, Best = 26.78
[2026-01-22T06:05:37.062Z] [INFO] [Phase 2] Iteration 20000: Temp = 101894.70, Current = 27.43, Best = 26.78
[2026-01-22T06:05:37.065Z] [INFO] Optimization complete {"iterations":20000,"reheats":2,"finalTemperature":"101894.7014","fitness":"26.78","hardViolations":0,"softViolations":8}
[2026-01-22T06:05:37.065Z] [INFO] Operator Statistics:
[2026-01-22T06:05:37.065Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:05:37.065Z] [INFO]   Swap Friday with Non-Friday: Attempts = 1, Improvements = 1, Accepted = 1, Success Rate = 100.00%
[2026-01-22T06:05:37.065Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:05:37.065Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:05:37.065Z] [INFO]   Fix Max Daily Periods: Attempts = 8, Improvements = 8, Accepted = 8, Success Rate = 100.00%
[2026-01-22T06:05:37.065Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:05:37.065Z] [INFO]   Change Time Slot and Room: Attempts = 4926, Improvements = 252, Accepted = 4786, Success Rate = 5.12%
[2026-01-22T06:05:37.065Z] [INFO]   Change Time Slot: Attempts = 4987, Improvements = 103, Accepted = 4735, Success Rate = 2.07%
[2026-01-22T06:05:37.065Z] [INFO]   Change Room: Attempts = 5058, Improvements = 216, Accepted = 5058, Success Rate = 4.27%
[2026-01-22T06:05:37.065Z] [INFO]   Swap Classes: Attempts = 5020, Improvements = 43, Accepted = 323, Success Rate = 0.86%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 277,
  prayerOverlapCache: 277,
  totalEntries: 591,
}
📊 RESULTS:
   Final fitness: 26.78
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 2
   Final temperature: 101894.7014
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Swap Friday with Non-Friday:
      Attempts: 1
      Improvements: 1
      Success rate: 100.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 8
      Improvements: 8
      Success rate: 100.00%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 4926
      Improvements: 252
      Success rate: 5.12%
   Change Time Slot:
      Attempts: 4987
      Improvements: 103
      Success rate: 2.07%
   Change Room:
      Attempts: 5058
      Improvements: 216
      Success rate: 4.27%
   Swap Classes:
      Attempts: 5020
      Improvements: 43
      Success rate: 0.86%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:05:46.599Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:05:46.600Z] [INFO] Starting optimization...
[2026-01-22T06:05:46.600Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:05:46.613Z] [INFO] Initial state {"fitness":"162525.75","hardViolations":10}
[2026-01-22T06:05:48.151Z] [INFO] [Phase 1] Iteration 500: Temp = 77875.21, Hard violations = 2, Best = 2
[2026-01-22T06:05:49.539Z] [INFO] [Phase 1] Iteration 1000: Temp = 60645.48, Hard violations = 1, Best = 1
[2026-01-22T06:05:50.881Z] [INFO] [Phase 1] Iteration 1500: Temp = 47227.80, Hard violations = 1, Best = 1
[2026-01-22T06:05:51.812Z] [INFO] Phase 1 complete: Hard violations = 0
[2026-01-22T06:05:51.812Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:05:52.238Z] [INFO] [Phase 2] Iteration 2000: Temp = 36778.75, Current = 27.22, Best = 27.18
[2026-01-22T06:05:53.578Z] [INFO] [Phase 2] Iteration 2500: Temp = 28641.52, Current = 27.42, Best = 27.18
[2026-01-22T06:05:54.934Z] [INFO] [Phase 2] Iteration 3000: Temp = 22304.65, Current = 27.36, Best = 27.18
[2026-01-22T06:05:56.290Z] [INFO] [Phase 2] Iteration 3500: Temp = 17369.79, Current = 27.44, Best = 27.18
[2026-01-22T06:05:57.653Z] [INFO] [Phase 2] Iteration 4000: Temp = 13526.76, Current = 27.32, Best = 27.18
[2026-01-22T06:05:59.012Z] [INFO] [Phase 2] Iteration 4500: Temp = 10533.99, Current = 27.40, Best = 27.18
[2026-01-22T06:06:00.379Z] [INFO] [Phase 2] Iteration 5000: Temp = 8203.37, Current = 27.42, Best = 27.18
[2026-01-22T06:06:01.752Z] [INFO] [Phase 2] Iteration 5500: Temp = 6388.39, Current = 27.38, Best = 27.18
[2026-01-22T06:06:03.115Z] [INFO] [Phase 2] Iteration 6000: Temp = 4974.97, Current = 27.31, Best = 27.18
[2026-01-22T06:06:04.483Z] [INFO] [Phase 2] Iteration 6500: Temp = 3874.27, Current = 27.47, Best = 27.18
[2026-01-22T06:06:05.911Z] [INFO] [Phase 2] Iteration 7000: Temp = 3017.10, Current = 27.56, Best = 27.18
[2026-01-22T06:06:07.266Z] [INFO] [Phase 2] Iteration 7500: Temp = 2349.57, Current = 27.47, Best = 27.18
[2026-01-22T06:06:08.638Z] [INFO] [Phase 2] Iteration 8000: Temp = 1829.73, Current = 27.52, Best = 27.18
[2026-01-22T06:06:10.015Z] [INFO] [Phase 2] Iteration 8500: Temp = 1424.91, Current = 27.35, Best = 27.18
[2026-01-22T06:06:11.381Z] [INFO] [Phase 2] Iteration 9000: Temp = 1109.65, Current = 27.48, Best = 27.18
[2026-01-22T06:06:11.962Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 27.18
[2026-01-22T06:06:12.754Z] [INFO] [Phase 2] Iteration 9500: Temp = 129621.36, Current = 27.47, Best = 27.18
[2026-01-22T06:06:14.124Z] [INFO] [Phase 2] Iteration 10000: Temp = 100942.91, Current = 27.56, Best = 27.18
[2026-01-22T06:06:15.476Z] [INFO] [Phase 2] Iteration 10500: Temp = 78609.50, Current = 27.42, Best = 27.18
[2026-01-22T06:06:16.869Z] [INFO] [Phase 2] Iteration 11000: Temp = 61217.31, Current = 27.29, Best = 27.18
[2026-01-22T06:06:18.222Z] [INFO] [Phase 2] Iteration 11500: Temp = 47673.11, Current = 27.26, Best = 27.18
[2026-01-22T06:06:15.878Z] [INFO] [Phase 2] Iteration 12000: Temp = 37125.53, Current = 27.31, Best = 27.18
[2026-01-22T06:06:17.219Z] [INFO] [Phase 2] Iteration 12500: Temp = 28911.59, Current = 27.26, Best = 27.18
[2026-01-22T06:06:18.578Z] [INFO] [Phase 2] Iteration 13000: Temp = 22514.96, Current = 27.48, Best = 27.18
[2026-01-22T06:06:20.000Z] [INFO] [Phase 2] Iteration 13500: Temp = 17533.57, Current = 27.44, Best = 27.18
[2026-01-22T06:06:21.417Z] [INFO] [Phase 2] Iteration 14000: Temp = 13654.31, Current = 27.63, Best = 27.18
[2026-01-22T06:06:22.806Z] [INFO] [Phase 2] Iteration 14500: Temp = 10633.32, Current = 27.49, Best = 27.18
[2026-01-22T06:06:24.204Z] [INFO] [Phase 2] Iteration 15000: Temp = 8280.72, Current = 27.54, Best = 27.18
[2026-01-22T06:06:25.608Z] [INFO] [Phase 2] Iteration 15500: Temp = 6448.63, Current = 27.52, Best = 27.18
[2026-01-22T06:06:27.001Z] [INFO] [Phase 2] Iteration 16000: Temp = 5021.88, Current = 27.51, Best = 27.18
[2026-01-22T06:06:28.403Z] [INFO] [Phase 2] Iteration 16500: Temp = 3910.80, Current = 27.43, Best = 27.18
[2026-01-22T06:06:29.819Z] [INFO] [Phase 2] Iteration 17000: Temp = 3045.54, Current = 27.37, Best = 27.18
[2026-01-22T06:06:31.229Z] [INFO] [Phase 2] Iteration 17500: Temp = 2371.72, Current = 27.56, Best = 27.18
[2026-01-22T06:06:32.703Z] [INFO] [Phase 2] Iteration 18000: Temp = 1846.99, Current = 27.48, Best = 27.18
[2026-01-22T06:06:34.113Z] [INFO] [Phase 2] Iteration 18500: Temp = 1438.34, Current = 27.68, Best = 27.18
[2026-01-22T06:06:35.564Z] [INFO] [Phase 2] Iteration 19000: Temp = 1120.11, Current = 27.52, Best = 27.18
[2026-01-22T06:06:36.279Z] [INFO] [Phase 2] Reheating #2: Temperature = 149985.20, Fitness = 27.18
[2026-01-22T06:06:37.044Z] [INFO] [Phase 2] Iteration 19500: Temp = 130843.57, Current = 27.41, Best = 27.18
[2026-01-22T06:06:38.490Z] [INFO] [Phase 2] Iteration 20000: Temp = 101894.70, Current = 27.43, Best = 27.18
[2026-01-22T06:06:38.493Z] [INFO] Optimization complete {"iterations":20000,"reheats":2,"finalTemperature":"101894.7014","fitness":"27.18","hardViolations":0,"softViolations":8}
[2026-01-22T06:06:38.494Z] [INFO] Operator Statistics:
[2026-01-22T06:06:38.494Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:06:38.494Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:06:38.494Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:06:38.494Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:06:38.494Z] [INFO]   Fix Max Daily Periods: Attempts = 4, Improvements = 4, Accepted = 4, Success Rate = 100.00%
[2026-01-22T06:06:38.494Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:06:38.494Z] [INFO]   Change Time Slot and Room: Attempts = 5078, Improvements = 276, Accepted = 4910, Success Rate = 5.44%
[2026-01-22T06:06:38.494Z] [INFO]   Change Time Slot: Attempts = 4926, Improvements = 117, Accepted = 4598, Success Rate = 2.38%
[2026-01-22T06:06:38.494Z] [INFO]   Change Room: Attempts = 4880, Improvements = 182, Accepted = 4880, Success Rate = 3.73%
[2026-01-22T06:06:38.494Z] [INFO]   Swap Classes: Attempts = 5112, Improvements = 41, Accepted = 327, Success Rate = 0.80%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 276,
  prayerOverlapCache: 276,
  totalEntries: 589,
}
📊 RESULTS:
   Final fitness: 27.18
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 2
   Final temperature: 101894.7014
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 4
      Improvements: 4
      Success rate: 100.00%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 5078
      Improvements: 276
      Success rate: 5.44%
   Change Time Slot:
      Attempts: 4926
      Improvements: 117
      Success rate: 2.38%
   Change Room:
      Attempts: 4880
      Improvements: 182
      Success rate: 3.73%
   Swap Classes:
      Attempts: 5112
      Improvements: 41
      Success rate: 0.80%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$
```

# result with tabu

```typescript
const config: SAConfig<TimetableState> = {
  initialTemperature: 100000, // Higher for better exploration at start
  minTemperature: 0.0000001,
  coolingRate: 0.9995, // Slower cooling for thorough search
  maxIterations: 20_000, // Increased for better convergence (15-30 min runtime)
  hardConstraintWeight: 100000, // Very high penalty for hard violations

  // State cloning function - optimized for performance
  // Only clone schedule array (mutable), keep references to static data (rooms, lecturers, classes)
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry }))
  }),

  // Reheating to escape local minima
  reheatingThreshold: 500, // Reheat if no improvement for 500 iterations
  reheatingFactor: 150, // Strong reheating boost
  maxReheats: 10,

  // ============================================
  // NEW: Tabu Search Configuration
  // ============================================
  tabuSearchEnabled: true, // Enable to prevent cycling
  tabuTenure: 50, // How long a state stays tabu
  maxTabuListSize: 1000, // Memory limit for tabu list
  aspirationEnabled: true, // Allow overriding tabu if better solution found

  // ============================================
  // NEW: Intensification Configuration
  // ============================================
  enableIntensification: false, // Enable Phase 1.5 for stubborn hard violations
  intensificationIterations: 2000, // Iterations per intensification attempt
  maxIntensificationAttempts: 3, // Max restart attempts
  operatorSelectionMode: "hybrid",
  // Logging
  logging: {
    enabled: true,
    level: "info",
    logInterval: 500,
  },
};


```

```shell
emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:08:02.383Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:08:02.384Z] [INFO] Starting optimization...
[2026-01-22T06:08:02.384Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:08:02.396Z] [INFO] Initial state {"fitness":"181274.87","hardViolations":22}
[2026-01-22T06:08:03.779Z] [INFO] [Phase 1] Iteration 500: Temp = 84913.18, Hard violations = 5, Best = 5
[2026-01-22T06:08:07.243Z] [INFO] [Phase 1] Iteration 2000: Temp = 52405.35, Hard violations = 2, Best = 2
[2026-01-22T06:08:09.543Z] [INFO] [Phase 1] Iteration 3000: Temp = 38452.79, Hard violations = 2, Best = 2
[2026-01-22T06:08:10.660Z] [INFO] [Phase 1] Iteration 3500: Temp = 32897.35, Hard violations = 2, Best = 2
[2026-01-22T06:08:11.775Z] [INFO] [Phase 1] Iteration 4000: Temp = 28102.34, Hard violations = 2, Best = 2
[2026-01-22T06:08:14.025Z] [INFO] [Phase 1] Iteration 5000: Temp = 20445.71, Hard violations = 2, Best = 2
[2026-01-22T06:08:14.966Z] [INFO] [Phase 1] Iteration 6500: Temp = 12542.85, Hard violations = 2, Best = 2
[2026-01-22T06:08:16.065Z] [INFO] [Phase 1] Iteration 7000: Temp = 10720.01, Hard violations = 2, Best = 2
[2026-01-22T06:08:16.546Z] [INFO] Phase 1 complete: Hard violations = 2
[2026-01-22T06:08:16.546Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:08:17.131Z] [INFO] [Phase 2] Iteration 7500: Temp = 9194.21, Current = 66693.13, Best = 66693.07
[2026-01-22T06:08:18.214Z] [INFO] [Phase 2] Iteration 8000: Temp = 7925.11, Current = 66693.19, Best = 66693.07
[2026-01-22T06:08:19.282Z] [INFO] [Phase 2] Iteration 8500: Temp = 6886.07, Current = 66693.26, Best = 66693.07
[2026-01-22T06:08:20.425Z] [INFO] [Phase 2] Iteration 9000: Temp = 5879.44, Current = 50026.76, Best = 50026.52
[2026-01-22T06:08:21.541Z] [INFO] [Phase 2] Iteration 9500: Temp = 5014.94, Current = 50026.73, Best = 50026.52
[2026-01-22T06:08:22.631Z] [INFO] [Phase 2] Iteration 10000: Temp = 4316.24, Current = 50026.84, Best = 50026.52
[2026-01-22T06:08:24.729Z] [INFO] [Phase 2] Iteration 11000: Temp = 3244.02, Current = 26.81, Best = 26.81
[2026-01-22T06:08:25.753Z] [INFO] [Phase 2] Iteration 11500: Temp = 2855.60, Current = 27.10, Best = 26.81
[2026-01-22T06:08:26.926Z] [INFO] [Phase 2] Iteration 12000: Temp = 2425.99, Current = 27.02, Best = 26.81
[2026-01-22T06:08:29.119Z] [INFO] [Phase 2] Iteration 13000: Temp = 1808.81, Current = 26.89, Best = 26.81
[2026-01-22T06:08:30.208Z] [INFO] [Phase 2] Iteration 13500: Temp = 1563.82, Current = 26.91, Best = 26.81
[2026-01-22T06:08:31.369Z] [INFO] [Phase 2] Iteration 14000: Temp = 1335.21, Current = 26.90, Best = 26.75
[2026-01-22T06:08:33.531Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 26.75
[2026-01-22T06:08:34.689Z] [INFO] [Phase 2] Iteration 15500: Temp = 127691.07, Current = 27.04, Best = 26.75
[2026-01-22T06:08:35.842Z] [INFO] [Phase 2] Iteration 16000: Temp = 108318.15, Current = 27.15, Best = 26.75
[2026-01-22T06:08:36.942Z] [INFO] [Phase 2] Iteration 16500: Temp = 93413.48, Current = 27.00, Best = 26.75
[2026-01-22T06:08:38.122Z] [INFO] [Phase 2] Iteration 17000: Temp = 79439.46, Current = 26.75, Best = 26.75
[2026-01-22T06:08:41.563Z] [INFO] [Phase 2] Iteration 18500: Temp = 49149.92, Current = 26.95, Best = 26.73
[2026-01-22T06:08:45.029Z] [INFO] [Phase 2] Iteration 20000: Temp = 30531.41, Current = 27.13, Best = 26.73
[2026-01-22T06:08:45.032Z] [INFO] Optimization complete {"iterations":20000,"reheats":1,"finalTemperature":"30531.4130","fitness":"26.73","hardViolations":0,"softViolations":8}
[2026-01-22T06:08:45.032Z] [INFO] Operator Statistics:
[2026-01-22T06:08:45.032Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Fix Max Daily Periods: Attempts = 13, Improvements = 13, Accepted = 13, Success Rate = 100.00%
[2026-01-22T06:08:45.032Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Change Time Slot and Room: Attempts = 2263, Improvements = 279, Accepted = 2108, Success Rate = 12.33%
[2026-01-22T06:08:45.032Z] [INFO]   Change Time Slot: Attempts = 1809, Improvements = 125, Accepted = 1546, Success Rate = 6.91%
[2026-01-22T06:08:45.032Z] [INFO]   Change Room: Attempts = 3391, Improvements = 236, Accepted = 3391, Success Rate = 6.96%
[2026-01-22T06:08:45.032Z] [INFO]   Swap Classes: Attempts = 4915, Improvements = 47, Accepted = 275, Success Rate = 0.96%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 19,
    minutesToTime: 16,
  },
  endTimeCache: 273,
  prayerOverlapCache: 273,
  totalEntries: 581,
}
📊 RESULTS:
   Final fitness: 26.73
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 1
   Final temperature: 30531.4130
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 13
      Improvements: 13
      Success rate: 100.00%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 2263
      Improvements: 279
      Success rate: 12.33%
   Change Time Slot:
      Attempts: 1809
      Improvements: 125
      Success rate: 6.91%
   Change Room:
      Attempts: 3391
      Improvements: 236
      Success rate: 6.96%
   Swap Classes:
      Attempts: 4915
      Improvements: 47
      Success rate: 0.96%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:09:46.926Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:09:46.927Z] [INFO] Starting optimization...
[2026-01-22T06:09:46.927Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:09:46.939Z] [INFO] Initial state {"fitness":"170858.42","hardViolations":12}
[2026-01-22T06:09:48.393Z] [INFO] [Phase 1] Iteration 500: Temp = 83189.75, Hard violations = 3, Best = 3
[2026-01-22T06:09:49.593Z] [INFO] [Phase 1] Iteration 1000: Temp = 71671.05, Hard violations = 3, Best = 3
[2026-01-22T06:09:53.198Z] [INFO] [Phase 1] Iteration 2500: Temp = 44100.25, Hard violations = 1, Best = 1
[2026-01-22T06:09:57.836Z] [INFO] [Phase 1] Iteration 4500: Temp = 23460.25, Hard violations = 1, Best = 1
[2026-01-22T06:09:59.046Z] [INFO] [Phase 1] Iteration 5000: Temp = 20050.79, Hard violations = 1, Best = 1
[2026-01-22T06:10:00.144Z] [INFO] [Phase 1] Iteration 5500: Temp = 17448.15, Hard violations = 1, Best = 1
[2026-01-22T06:10:01.322Z] [INFO] [Phase 1] Iteration 6000: Temp = 14912.42, Hard violations = 1, Best = 1
[2026-01-22T06:10:02.257Z] [INFO] Phase 1 complete: Hard violations = 0
[2026-01-22T06:10:02.257Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:10:02.508Z] [INFO] [Phase 2] Iteration 6500: Temp = 12783.51, Current = 26.93, Best = 26.91
[2026-01-22T06:10:04.813Z] [INFO] [Phase 2] Iteration 7500: Temp = 9469.55, Current = 26.71, Best = 26.67
[2026-01-22T06:10:05.987Z] [INFO] [Phase 2] Iteration 8000: Temp = 8121.72, Current = 26.94, Best = 26.67
[2026-01-22T06:10:11.782Z] [INFO] [Phase 2] Iteration 10500: Temp = 3750.35, Current = 26.96, Best = 26.67
[2026-01-22T06:10:12.936Z] [INFO] [Phase 2] Iteration 11000: Temp = 3206.92, Current = 26.99, Best = 26.67
[2026-01-22T06:10:15.189Z] [INFO] [Phase 2] Iteration 12000: Temp = 2373.19, Current = 26.95, Best = 26.67
[2026-01-22T06:10:16.099Z] [INFO] [Phase 2] Iteration 13500: Temp = 1519.87, Current = 27.02, Best = 26.67
[2026-01-22T06:10:17.291Z] [INFO] [Phase 2] Iteration 14000: Temp = 1308.77, Current = 26.96, Best = 26.67
[2026-01-22T06:10:18.400Z] [INFO] [Phase 2] Iteration 14500: Temp = 1130.38, Current = 26.92, Best = 26.67
[2026-01-22T06:10:19.310Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 26.67
[2026-01-22T06:10:19.615Z] [INFO] [Phase 2] Iteration 15000: Temp = 144119.68, Current = 27.01, Best = 26.67
[2026-01-22T06:10:21.937Z] [INFO] [Phase 2] Iteration 16000: Temp = 105748.82, Current = 27.13, Best = 26.67
[2026-01-22T06:10:26.544Z] [INFO] [Phase 2] Iteration 18000: Temp = 56481.32, Current = 27.08, Best = 26.67
[2026-01-22T06:10:27.667Z] [INFO] [Phase 2] Iteration 18500: Temp = 48514.94, Current = 27.19, Best = 26.67
[2026-01-22T06:10:28.802Z] [INFO] [Phase 2] Iteration 19000: Temp = 41568.11, Current = 27.21, Best = 26.67
[2026-01-22T06:10:29.977Z] [INFO] [Phase 2] Iteration 19500: Temp = 35349.80, Current = 27.15, Best = 26.67
[2026-01-22T06:10:31.137Z] [INFO] [Phase 2] Iteration 20000: Temp = 30242.67, Current = 27.21, Best = 26.67
[2026-01-22T06:10:31.139Z] [INFO] Optimization complete {"iterations":20000,"reheats":1,"finalTemperature":"30242.6661","fitness":"26.67","hardViolations":0,"softViolations":8}
[2026-01-22T06:10:31.139Z] [INFO] Operator Statistics:
[2026-01-22T06:10:31.139Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:10:31.139Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:10:31.139Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:10:31.140Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:10:31.140Z] [INFO]   Fix Max Daily Periods: Attempts = 7, Improvements = 7, Accepted = 7, Success Rate = 100.00%
[2026-01-22T06:10:31.140Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:10:31.140Z] [INFO]   Change Time Slot and Room: Attempts = 2167, Improvements = 233, Accepted = 2034, Success Rate = 10.75%
[2026-01-22T06:10:31.140Z] [INFO]   Change Time Slot: Attempts = 1846, Improvements = 112, Accepted = 1556, Success Rate = 6.07%
[2026-01-22T06:10:31.140Z] [INFO]   Change Room: Attempts = 3436, Improvements = 239, Accepted = 3436, Success Rate = 6.96%
[2026-01-22T06:10:31.140Z] [INFO]   Swap Classes: Attempts = 4954, Improvements = 39, Accepted = 270, Success Rate = 0.79%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 273,
  prayerOverlapCache: 273,
  totalEntries: 583,
}
📊 RESULTS:
   Final fitness: 26.67
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 1
   Final temperature: 30242.6661
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 7
      Improvements: 7
      Success rate: 100.00%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 2167
      Improvements: 233
      Success rate: 10.75%
   Change Time Slot:
      Attempts: 1846
      Improvements: 112
      Success rate: 6.07%
   Change Room:
      Attempts: 3436
      Improvements: 239
      Success rate: 6.96%
   Swap Classes:
      Attempts: 4954
      Improvements: 39
      Success rate: 0.79%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:22:36.268Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:22:36.269Z] [INFO] Starting optimization...
[2026-01-22T06:22:36.269Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:22:36.282Z] [INFO] Initial state {"fitness":"185739.36","hardViolations":8}
[2026-01-22T06:22:39.747Z] [INFO] [Phase 1] Iteration 1500: Temp = 68208.86, Hard violations = 1, Best = 1
[2026-01-22T06:22:40.837Z] [INFO] [Phase 1] Iteration 2000: Temp = 60373.12, Hard violations = 1, Best = 1
[2026-01-22T06:22:42.946Z] [INFO] [Phase 1] Iteration 3000: Temp = 47062.75, Hard violations = 1, Best = 1
[2026-01-22T06:22:43.920Z] [INFO] [Phase 1] Iteration 3500: Temp = 42243.68, Hard violations = 1, Best = 1
[2026-01-22T06:22:47.918Z] [INFO] [Phase 1] Iteration 5500: Temp = 26811.77, Hard violations = 1, Best = 1
[2026-01-22T06:22:48.945Z] [INFO] [Phase 1] Iteration 6000: Temp = 23898.42, Hard violations = 1, Best = 1
[2026-01-22T06:22:50.480Z] [INFO] Phase 1 complete: Hard violations = 0
[2026-01-22T06:22:50.481Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:22:52.168Z] [INFO] [Phase 2] Iteration 7500: Temp = 16203.30, Current = 26.91, Best = 26.84
[2026-01-22T06:22:55.635Z] [INFO] [Phase 2] Iteration 9000: Temp = 10361.57, Current = 26.80, Best = 26.73
[2026-01-22T06:22:56.905Z] [INFO] [Phase 2] Iteration 9500: Temp = 8838.03, Current = 26.93, Best = 26.73
[2026-01-22T06:22:58.057Z] [INFO] [Phase 2] Iteration 10000: Temp = 7656.29, Current = 26.91, Best = 26.73
[2026-01-22T06:22:59.198Z] [INFO] [Phase 2] Iteration 10500: Temp = 6622.62, Current = 26.91, Best = 26.73
[2026-01-22T06:23:00.328Z] [INFO] [Phase 2] Iteration 11000: Temp = 5705.63, Current = 26.72, Best = 26.70
[2026-01-22T06:23:03.369Z] [INFO] [Phase 2] Iteration 13500: Temp = 2820.12, Current = 26.79, Best = 26.68
[2026-01-22T06:23:05.678Z] [INFO] [Phase 2] Iteration 14500: Temp = 2132.31, Current = 26.95, Best = 26.68
[2026-01-22T06:23:07.992Z] [INFO] [Phase 2] Iteration 15500: Temp = 1574.02, Current = 27.21, Best = 26.68
[2026-01-22T06:23:09.134Z] [INFO] [Phase 2] Iteration 16000: Temp = 1358.79, Current = 27.10, Best = 26.68
[2026-01-22T06:23:11.529Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 26.68
[2026-01-22T06:23:13.780Z] [INFO] [Phase 2] Iteration 18000: Temp = 111729.46, Current = 27.22, Best = 26.68
[2026-01-22T06:23:16.288Z] [INFO] [Phase 2] Iteration 19000: Temp = 82146.44, Current = 27.43, Best = 26.68
[2026-01-22T06:23:17.444Z] [INFO] [Phase 2] Iteration 19500: Temp = 71269.47, Current = 27.39, Best = 26.68
[2026-01-22T06:23:18.581Z] [INFO] Optimization complete {"iterations":20000,"reheats":1,"finalTemperature":"61894.5897","fitness":"26.68","hardViolations":0,"softViolations":8}
[2026-01-22T06:23:18.581Z] [INFO] Operator Statistics:
[2026-01-22T06:23:18.582Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 1, Improvements = 1, Accepted = 1, Success Rate = 100.00%
[2026-01-22T06:23:18.582Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:23:18.582Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:23:18.582Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:23:18.582Z] [INFO]   Fix Max Daily Periods: Attempts = 102, Improvements = 5, Accepted = 102, Success Rate = 4.90%
[2026-01-22T06:23:18.582Z] [INFO]   Fix Room Capacity: Attempts = 168, Improvements = 0, Accepted = 168, Success Rate = 0.00%
[2026-01-22T06:23:18.582Z] [INFO]   Change Time Slot and Room: Attempts = 1834, Improvements = 233, Accepted = 1704, Success Rate = 12.70%
[2026-01-22T06:23:18.582Z] [INFO]   Change Time Slot: Attempts = 1476, Improvements = 105, Accepted = 1268, Success Rate = 7.11%
[2026-01-22T06:23:18.582Z] [INFO]   Change Room: Attempts = 2766, Improvements = 174, Accepted = 2766, Success Rate = 6.29%
[2026-01-22T06:23:18.582Z] [INFO]   Swap Classes: Attempts = 4631, Improvements = 49, Accepted = 222, Success Rate = 1.06%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 273,
  prayerOverlapCache: 273,
  totalEntries: 583,
}
📊 RESULTS:
   Final fitness: 26.68
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 1
   Final temperature: 61894.5897
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 1
      Improvements: 1
      Success rate: 100.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 102
      Improvements: 5
      Success rate: 4.90%
   Fix Room Capacity:
      Attempts: 168
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 1834
      Improvements: 233
      Success rate: 12.70%
   Change Time Slot:
      Attempts: 1476
      Improvements: 105
      Success rate: 7.11%
   Change Room:
      Attempts: 2766
      Improvements: 174
      Success rate: 6.29%
   Swap Classes:
      Attempts: 4631
      Improvements: 49
      Success rate: 1.06%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:23:28.336Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:23:28.337Z] [INFO] Starting optimization...
[2026-01-22T06:23:28.337Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:23:28.349Z] [INFO] Initial state {"fitness":"217524.60","hardViolations":12}
[2026-01-22T06:23:29.658Z] [INFO] [Phase 1] Iteration 500: Temp = 87019.78, Hard violations = 7, Best = 7
[2026-01-22T06:23:29.033Z] [INFO] [Phase 1] Iteration 1500: Temp = 71527.82, Hard violations = 6, Best = 6
[2026-01-22T06:23:30.000Z] [INFO] [Phase 1] Iteration 2000: Temp = 63819.44, Hard violations = 5, Best = 5
[2026-01-22T06:23:33.123Z] [INFO] [Phase 1] Iteration 3500: Temp = 43205.18, Hard violations = 3, Best = 3
[2026-01-22T06:23:34.166Z] [INFO] [Phase 1] Iteration 4000: Temp = 38433.56, Hard violations = 3, Best = 3
[2026-01-22T06:23:36.262Z] [INFO] [Phase 1] Iteration 5000: Temp = 29840.54, Hard violations = 3, Best = 3
[2026-01-22T06:23:37.307Z] [INFO] [Phase 1] Iteration 5500: Temp = 26425.71, Hard violations = 2, Best = 2
[2026-01-22T06:23:38.389Z] [INFO] [Phase 1] Iteration 6000: Temp = 23261.64, Hard violations = 2, Best = 2
[2026-01-22T06:23:41.658Z] [INFO] [Phase 1] Iteration 7500: Temp = 15692.88, Hard violations = 1, Best = 1
[2026-01-22T06:23:44.897Z] [INFO] [Phase 1] Iteration 9000: Temp = 10768.37, Hard violations = 1, Best = 1
[2026-01-22T06:23:45.530Z] [INFO] Phase 1 complete: Hard violations = 1
[2026-01-22T06:23:45.530Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:23:47.034Z] [INFO] [Phase 2] Iteration 10000: Temp = 8402.68, Current = 50026.32, Best = 50026.09
[2026-01-22T06:23:48.137Z] [INFO] [Phase 2] Iteration 10500: Temp = 7437.39, Current = 50026.37, Best = 50026.09
[2026-01-22T06:23:49.230Z] [INFO] [Phase 2] Iteration 11000: Temp = 6599.48, Current = 50026.43, Best = 50026.09
[2026-01-22T06:23:50.348Z] [INFO] [Phase 2] Iteration 11500: Temp = 5809.29, Current = 50026.35, Best = 50026.09
[2026-01-22T06:23:58.192Z] [INFO] [Phase 2] Iteration 15000: Temp = 2409.06, Current = 50026.29, Best = 50026.09
[2026-01-22T06:23:59.297Z] [INFO] [Phase 2] Iteration 15500: Temp = 2132.31, Current = 26.19, Best = 26.19
[2026-01-22T06:24:00.493Z] [INFO] [Phase 2] Iteration 16000: Temp = 1807.00, Current = 26.37, Best = 26.19
[2026-01-22T06:23:59.090Z] [INFO] [Phase 2] Iteration 16500: Temp = 1556.80, Current = 26.43, Best = 26.19
[2026-01-22T06:24:01.238Z] [INFO] [Phase 2] Iteration 17500: Temp = 1160.74, Current = 26.63, Best = 26.19
[2026-01-22T06:24:02.349Z] [INFO] [Phase 2] Iteration 18000: Temp = 1000.52, Current = 26.61, Best = 26.19
[2026-01-22T06:24:02.358Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 26.19
[2026-01-22T06:24:03.495Z] [INFO] [Phase 2] Iteration 18500: Temp = 128910.22, Current = 26.69, Best = 26.19
[2026-01-22T06:24:04.670Z] [INFO] [Phase 2] Iteration 19000: Temp = 110562.15, Current = 26.62, Best = 26.19
[2026-01-22T06:24:05.855Z] [INFO] [Phase 2] Iteration 19500: Temp = 94920.50, Current = 26.52, Best = 26.19
[2026-01-22T06:24:07.058Z] [INFO] [Phase 2] Iteration 20000: Temp = 81491.73, Current = 26.62, Best = 26.19
[2026-01-22T06:24:07.061Z] [INFO] Optimization complete {"iterations":20000,"reheats":1,"finalTemperature":"81491.7302","fitness":"26.19","hardViolations":0,"softViolations":8}
[2026-01-22T06:24:07.061Z] [INFO] Operator Statistics:
[2026-01-22T06:24:07.061Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 1, Improvements = 1, Accepted = 1, Success Rate = 100.00%
[2026-01-22T06:24:07.061Z] [INFO]   Swap Friday with Non-Friday: Attempts = 44, Improvements = 0, Accepted = 44, Success Rate = 0.00%
[2026-01-22T06:24:07.061Z] [INFO]   Fix Lecturer Conflict: Attempts = 206, Improvements = 0, Accepted = 206, Success Rate = 0.00%
[2026-01-22T06:24:07.061Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:24:07.061Z] [INFO]   Fix Max Daily Periods: Attempts = 389, Improvements = 3, Accepted = 389, Success Rate = 0.77%
[2026-01-22T06:24:07.061Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:24:07.061Z] [INFO]   Change Time Slot and Room: Attempts = 1668, Improvements = 204, Accepted = 1538, Success Rate = 12.23%
[2026-01-22T06:24:07.061Z] [INFO]   Change Time Slot: Attempts = 1253, Improvements = 92, Accepted = 1023, Success Rate = 7.34%
[2026-01-22T06:24:07.061Z] [INFO]   Change Room: Attempts = 2685, Improvements = 193, Accepted = 2685, Success Rate = 7.19%
[2026-01-22T06:24:07.061Z] [INFO]   Swap Classes: Attempts = 4182, Improvements = 28, Accepted = 208, Success Rate = 0.67%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 269,
  prayerOverlapCache: 269,
  totalEntries: 575,
}
📊 RESULTS:
   Final fitness: 26.19
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 1
   Final temperature: 81491.7302
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 1
      Improvements: 1
      Success rate: 100.00%
   Swap Friday with Non-Friday:
      Attempts: 44
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 206
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 389
      Improvements: 3
      Success rate: 0.77%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 1668
      Improvements: 204
      Success rate: 12.23%
   Change Time Slot:
      Attempts: 1253
      Improvements: 92
      Success rate: 7.34%
   Change Room:
      Attempts: 2685
      Improvements: 193
      Success rate: 7.19%
   Swap Classes:
      Attempts: 4182
      Improvements: 28
      Success rate: 0.67%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================

💾 Results saved to: timetable-result.json

emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:24:11.052Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:24:11.053Z] [INFO] Starting optimization...
[2026-01-22T06:24:11.053Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:24:11.065Z] [INFO] Initial state {"fitness":"165025.25","hardViolations":12}
[2026-01-22T06:24:12.436Z] [INFO] [Phase 1] Iteration 500: Temp = 85168.36, Hard violations = 2, Best = 2
[2026-01-22T06:24:14.693Z] [INFO] [Phase 1] Iteration 1500: Temp = 62243.35, Hard violations = 1, Best = 1
[2026-01-22T06:24:15.778Z] [INFO] [Phase 1] Iteration 2000: Temp = 54245.35, Hard violations = 1, Best = 1
[2026-01-22T06:24:18.858Z] [INFO] Phase 1 complete: Hard violations = 0
[2026-01-22T06:24:18.858Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:24:19.158Z] [INFO] [Phase 2] Iteration 3500: Temp = 34446.37, Current = 26.96, Best = 26.96
[2026-01-22T06:24:20.284Z] [INFO] [Phase 2] Iteration 4000: Temp = 29661.99, Current = 26.94, Best = 26.88
[2026-01-22T06:24:21.440Z] [INFO] [Phase 2] Iteration 4500: Temp = 25452.86, Current = 26.76, Best = 26.76
[2026-01-22T06:24:24.781Z] [INFO] [Phase 2] Iteration 6000: Temp = 16374.38, Current = 26.92, Best = 26.76
[2026-01-22T06:24:25.910Z] [INFO] [Phase 2] Iteration 6500: Temp = 13987.70, Current = 26.95, Best = 26.76
[2026-01-22T06:24:29.232Z] [INFO] [Phase 2] Iteration 8000: Temp = 9007.60, Current = 27.02, Best = 26.76
[2026-01-22T06:24:30.370Z] [INFO] [Phase 2] Iteration 8500: Temp = 7733.26, Current = 26.82, Best = 26.76
[2026-01-22T06:24:29.103Z] [INFO] [Phase 2] Iteration 9000: Temp = 6569.84, Current = 27.06, Best = 26.76
[2026-01-22T06:24:33.381Z] [INFO] [Phase 2] Iteration 11000: Temp = 3665.06, Current = 26.82, Best = 26.76
[2026-01-22T06:24:41.286Z] [INFO] [Phase 2] Iteration 14500: Temp = 1287.34, Current = 26.84, Best = 26.76
[2026-01-22T06:24:42.420Z] [INFO] [Phase 2] Iteration 15000: Temp = 1107.43, Current = 26.98, Best = 26.75
[2026-01-22T06:24:43.508Z] [INFO] [Phase 2] Iteration 15500: Temp = 961.28, Current = 27.01, Best = 26.75
[2026-01-22T06:24:43.635Z] [INFO] [Phase 2] Reheating #1: Temperature = 141689.75, Fitness = 26.75
[2026-01-22T06:24:45.826Z] [INFO] [Phase 2] Iteration 16500: Temp = 105326.57, Current = 27.04, Best = 26.75
[2026-01-22T06:24:47.075Z] [INFO] [Phase 2] Iteration 17000: Temp = 89034.48, Current = 26.91, Best = 26.75
[2026-01-22T06:24:49.386Z] [INFO] [Phase 2] Iteration 18000: Temp = 65460.49, Current = 27.11, Best = 26.75
[2026-01-22T06:24:50.540Z] [INFO] [Phase 2] Iteration 18500: Temp = 56031.16, Current = 27.12, Best = 26.75
[2026-01-22T06:24:52.761Z] [INFO] [Phase 2] Iteration 19500: Temp = 41464.29, Current = 27.00, Best = 26.75
[2026-01-22T06:24:53.952Z] [INFO] Optimization complete {"iterations":20000,"reheats":1,"finalTemperature":"35598.1787","fitness":"26.75","hardViolations":0,"softViolations":8}
[2026-01-22T06:24:53.953Z] [INFO] Operator Statistics:
[2026-01-22T06:24:53.953Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:24:53.953Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:24:53.953Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:24:53.953Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:24:53.953Z] [INFO]   Fix Max Daily Periods: Attempts = 8, Improvements = 8, Accepted = 8, Success Rate = 100.00%
[2026-01-22T06:24:53.953Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:24:53.953Z] [INFO]   Change Time Slot and Room: Attempts = 2120, Improvements = 245, Accepted = 1996, Success Rate = 11.56%
[2026-01-22T06:24:53.953Z] [INFO]   Change Time Slot: Attempts = 1686, Improvements = 113, Accepted = 1470, Success Rate = 6.70%
[2026-01-22T06:24:53.953Z] [INFO]   Change Room: Attempts = 3248, Improvements = 211, Accepted = 3248, Success Rate = 6.50%
[2026-01-22T06:24:53.953Z] [INFO]   Swap Classes: Attempts = 5022, Improvements = 36, Accepted = 228, Success Rate = 0.72%
======================================================================

✨ OPTIMIZATION COMPLETE!

Cache stats: {
  timeCache: {
    timeToMinutes: 20,
    minutesToTime: 17,
  },
  endTimeCache: 273,
  prayerOverlapCache: 273,
  totalEntries: 583,
}
📊 RESULTS:
   Final fitness: 26.75
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 1
   Final temperature: 35598.1787
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 8
      Improvements: 8
      Success rate: 100.00%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 2120
      Improvements: 245
      Success rate: 11.56%
   Change Time Slot:
      Attempts: 1686
      Improvements: 113
      Success rate: 6.70%
   Change Room:
      Attempts: 3248
      Improvements: 211
      Success rate: 6.50%
   Swap Classes:
      Attempts: 5022
      Improvements: 36
      Success rate: 0.72%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================
💾 Results saved to: timetable-result.json
```