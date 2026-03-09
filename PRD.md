# Product Requirements Document (PRD)
## Sistem Informasi Penjadwalan Kuliah UISI (SIJAKU)

---

## 1. Executive Summary

### 1.1 Tujuan Produk
Sistem informasi penjadwalan kuliah berbasis web untuk Universitas Internasional Semen Indonesia (UISI) yang menggunakan algoritma optimasi metaheuristik (Simulated Annealing + Tabu Search) untuk menghasilkan jadwal perkuliahan yang optimal dengan mempertimbangkan constraint keras dan lunak.

### 1.2 Target Pengguna
- **Admin Akademik**: Mengelola data master dan proses optimasi
- **Admin Program Studi**: Melihat dan memvalidasi jadwal prodi masing-masing

### 1.3 Timeline Pengembangan
**3-4 Bulan** dengan pembagian:
- Bulan 1: Foundation & Database
- Bulan 2: API Core & Worker Integration
- Bulan 3: Frontend & Optimization Module
- Bulan 4: Testing, Polish & Deployment

---

## 2. Arsitektur Sistem

### 2.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Layer                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         TanStack Start + React + shadcn/ui               │   │
│  │                                                          │   │
│  │  • Dashboard Analytics                          [KF-02]  │   │
│  │  • Master Data CRUD (Dosen, MK, Ruang)          [KF-03-05]│  │
│  │  • Import/Export Excel                          [KF-06-07]│  │
│  │  • Manual Schedule Editor (Drag-Drop)           [KF-08]  │   │
│  │  • Real-time Optimization Monitor               [KF-12]  │   │
│  │  • Schedule Visualization & Filter              [KF-14-15]│  │
│  │  • System Performance Monitor                   [KF-16]  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       VPS Server                                │
│  ┌────────────────┬──────────────────┬────────────────────────┐ │
│  │   Nginx        │   NestJS API     │   Optimization Worker  │ │
│  │  (Reverse      │   (Port 3000)    │   (Bun, Port 4000)     │ │
│  │   Proxy)       │                  │                        │ │
│  │                │  • Better Auth   │  • SA + TS Algorithm   │ │
│  │  • SSL/TLS     │  • CRUD APIs     │  • Job Queue           │ │
│  │  • WebSocket   │  • Job Queue     │  • Progress Emitter    │ │
│  │    Upgrade     │  • Socket.io GW  │  • Result Processor    │ │
│  │  • Static      │  • Prisma ORM    │                        │ │
│  │    Assets      │                  │                        │ │
│  └────────────────┴──────────────────┴────────────────────────┘ │
│           │              │                   │                  │
│           └──────────────┴───────────────────┘                  │
│                          │                                      │
│                  ┌───────┴────────┐                            │
│                  │   MySQL 8.0    │                            │
│                  │ (Shared Schema)│                            │
│                  └────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack Decision Matrix

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | TanStack Start + React | Full-stack React, SSR, type-safe routing |
| **UI Components** | shadcn/ui | Accessible, customizable, consistent design |
| **State Management** | TanStack Query | Server state caching, optimistic updates |
| **API Framework** | NestJS | Enterprise-grade, modular, excellent DI |
| **Auth** | Better Auth | Complete auth solution, session management |
| **ORM** | Prisma | Type-safe, migration support, great DX |
| **Database** | MySQL 8.0 | ACID compliance, JSON support, proven |
| **Worker Runtime** | Bun | 3x faster than Node for CPU-intensive SA |
| **Algorithm** | SA + TS Hybrid | KF-10 requirement, better convergence |
| **Monorepo** | Turborepo + Bun | Build caching, parallel execution |
| **Real-time** | Socket.io | Bidirectional, room-based, fallback support |
| **Deployment** | Docker Compose | Consistent environment, easy scaling |

### 2.3 Service Responsibilities

#### 2.3.1 Frontend (TanStack Start)
**Routes & Features:**
| Route | Feature | KF Reference |
|-------|---------|--------------|
| `/` | Login page | KF-01 |
| `/dashboard` | Statistics & preview | KF-02, KF-19 |
| `/lecturers` | CRUD + preferensi | KF-03 |
| `/courses` | CRUD + pengampu | KF-04 |
| `/rooms` | CRUD ruangan | KF-05 |
| `/schedule` | Drag-drop manual | KF-08, KF-09 |
| `/timetable` | View & filter jadwal | KF-14, KF-15 |
| `/optimization` | Run & monitor SA+TS | KF-10, KF-11, KF-12 |
| `/history` | Riwayat optimasi | KF-13 |
| `/monitor` | CPU/Memory stats | KF-16 |
| `/settings` | App configuration | KF-17 |

#### 2.3.2 NestJS API Service
**Modules:**
```
api/
├── src/
│   ├── auth/              # Better Auth integration
│   ├── users/             # User management
│   ├── program-studi/     # Program studi CRUD
│   ├── lecturers/         # Dosen + preferensi
│   ├── courses/           # Mata kuliah
│   ├── rooms/             # Ruangan
│   ├── schedules/         # Manual schedule editor
│   ├── optimization/      # Job queue & results
│   ├── websocket/         # Socket.io gateway
│   ├── import-export/     # Excel handlers
│   └── monitoring/        # System metrics
```

**API Endpoints:**

**Auth (Better Auth)**
```
POST   /api/auth/sign-in/email          # Login
POST   /api/auth/sign-up/email          # Register
POST   /api/auth/sign-out               # Logout
GET    /api/auth/session                # Get session
POST   /api/auth/forget-password        # Reset password
```

**Master Data**
```
GET    /api/program-studi               # List all prodi
POST   /api/program-studi               # Create prodi
PUT    /api/program-studi/:id           # Update prodi
DELETE /api/program-studi/:id           # Delete prodi

GET    /api/lecturers                   # List dosen
POST   /api/lecturers                   # Create dosen
PUT    /api/lecturers/:id               # Update dosen
DELETE /api/lecturers/:id               # Delete dosen
GET    /api/lecturers/:id/research-days # Get hari riset
POST   /api/lecturers/:id/research-days # Set hari riset
GET    /api/lecturers/:id/preferred-times
POST   /api/lecturers/:id/preferred-times

GET    /api/courses                     # List mata kuliah
POST   /api/courses                     # Create MK
PUT    /api/courses/:id                 # Update MK
DELETE /api/courses/:id                 # Delete MK
POST   /api/courses/:id/lecturers       # Assign dosen
POST   /api/courses/:id/rooms           # Set room preferences

GET    /api/rooms                       # List ruangan
POST   /api/rooms                       # Create ruangan
PUT    /api/rooms/:id                   # Update ruangan
DELETE /api/rooms/:id                   # Delete ruangan
```

**Schedule & Optimization**
```
GET    /api/schedule-entries            # Get current schedule
POST   /api/schedule-entries            # Create manual entry
PUT    /api/schedule-entries/:id        # Update entry
DELETE /api/schedule-entries/:id        # Delete entry
POST   /api/schedule-entries/validate   # Validate conflicts

GET    /api/optimization-results        # List optimization history
POST   /api/optimization-results        # Start new optimization
GET    /api/optimization-results/:id    # Get result details
GET    /api/optimization-results/:id/iterations  # Get iteration data
POST   /api/optimization-results/:id/apply       # Apply to schedule
POST   /api/optimization-results/:id/cancel      # Cancel running
```

**Import/Export**
```
POST   /api/import/lecturers            # Upload Excel dosen
POST   /api/import/courses              # Upload Excel MK
POST   /api/import/rooms                # Upload Excel ruangan
POST   /api/import/schedule-entries     # Upload Excel jadwal

GET    /api/export/lecturers            # Download Excel dosen
GET    /api/export/courses              # Download Excel MK
GET    /api/export/rooms                # Download Excel ruangan
GET    /api/export/schedule/:id/pdf     # Export PDF jadwal
GET    /api/export/schedule/:id/excel   # Export Excel jadwal
```

**WebSocket Events**
```typescript
// Client → Server
'join:optimization'  - Join room untuk monitoring
'cancel:optimization' - Cancel running job

// Server → Client
'optimization:progress' - Progress update (real-time)
'optimization:completed' - Job finished
'optimization:error'     - Error occurred
'optimization:cancelled' - Job cancelled
```

#### 2.3.3 Optimization Worker (Bun)
**Architecture:**
```
worker/
├── src/
│   ├── main.ts                    # Entry point
│   ├── algorithm/
│   │   ├── hybrid-optimizer.ts    # SA + TS orchestrator
│   │   ├── simulated-annealing.ts # SA implementation
│   │   ├── tabu-search.ts         # TS implementation
│   │   ├── solution.ts            # Solution representation
│   │   └── fitness.ts             # Fitness function
│   ├── constraints/
│   │   ├── hard-constraints.ts    # HC-01 to HC-06
│   │   └── soft-constraints.ts    # SC-01 to SC-05
│   ├── database/
│   │   └── prisma-client.ts       # Direct DB access
│   ├── websocket/
│   │   └── progress-emitter.ts    # Socket.io client
│   └── types/
       └── optimization.types.ts
```

**Worker API:**
```
POST   /worker/execute                # Start optimization job
POST   /worker/cancel/:id             # Cancel job
GET    /worker/health                 # Health check
GET    /worker/status                 # Active jobs status
```

**Execute Job Payload:**
```typescript
{
  optimizationId: string;
  config: {
    algorithmType: 'SA' | 'TS' | 'HYBRID';
    // SA Parameters
    initialTemperature: number;
    minTemperature: number;
    coolingRate: number;
    maxIterations: number;
    // TS Parameters
    tabuListSize: number;
    maxIterationsTS: number;
    // Hybrid Parameters
    saIterations: number;
    tsIterations: number;
    switchThreshold: number;
  };
  data: {
    courses: Course[];
    lecturers: Lecturer[];
    rooms: Room[];
    constraints: {
      researchDays: LecturerResearchDay[];
      preferredTimes: LecturerPreferredTime[];
      courseRooms: CourseRoom[];
    };
  };
  webhookUrl: string;
}
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BETTER AUTH CORE                             │
├─────────────────────────────────────────────────────────────────────┤
│  User ◄──── Session                                                 │
│    │                                                                │
│    ├──► Account (OAuth)                                             │
│    ├──► Verification                                                │
│    ├──► ProgramStudi (createdBy/updatedBy)                          │
│    ├──► Course (createdBy/updatedBy)                                │
│    ├──► Lecturer (createdBy/updatedBy)                              │
│    ├──► Room (createdBy/updatedBy)                                  │
│    ├──► ScheduleEntry (createdBy/updatedBy)                         │
│    └──► OptimizationResult                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     MASTER DATA TABLES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ProgramStudi ◄──────────── Course                                  │
│       │                         │                                   │
│       └────────────► Lecturer   │ ◄──────► LecturerResearchDay      │
│                            │    │           [HC-01]                 │
│                            │    │                                   │
│                            │    └──► LecturerPreferredTime          │
│                            │                [SC-01]                  │
│                            │                                        │
│                            └──► CourseLecturer ◄───┐                │
│                                   (M:N)            │                │
│                                                    │                │
│  Room ◄────────────────────────────────────────────┘                │
│    │                                                                │
│    └──► CourseRoom (M:N)                 [SC-02]                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SCHEDULE & OPTIMIZATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  OptimizationResult ◄── User                                        │
│         │                                                           │
│         ├──► OptimizationIteration (per-iteration tracking)         │
│         │         [KF-12]                                           │
│         │                                                           │
│         └──► ScheduleEntry ◄── Course                               │
│                   │           ◄── Lecturer                          │
│                   │           ◄── Room                              │
│                   │                                                 │
│                   └── isOptimized, isManualEdit                     │
│                       [KF-08, KF-18]                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Complete Prisma Schema

```prisma
// ============================================
// GENERATOR & DATASOURCE
// ============================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ============================================
// BETTER AUTH CORE TABLES
// ============================================

model User {
  id            String    @id @default(uuid()) @db.VarChar(36)
  name          String    @db.VarChar(255)
  email         String    @unique @db.VarChar(255)
  emailVerified Boolean   @default(false)
  image         String?   @db.Text
  role          UserRole  @default(ADMIN)
  banned        Boolean   @default(false)
  banReason     String?   @db.Text
  banExpires    DateTime? @db.DateTime(0)
  createdAt     DateTime  @default(now()) @db.DateTime(0)
  updatedAt     DateTime  @updatedAt @db.DateTime(0)

  // Better Auth Relations
  sessions     Session[]
  accounts     Account[]
  
  // UCTP Relations - Audit Trail
  programStudisCreated    ProgramStudi[] @relation("ProdiCreatedBy")
  programStudisUpdated    ProgramStudi[] @relation("ProdiUpdatedBy")
  coursesCreated          Course[]       @relation("CourseCreatedBy")
  coursesUpdated          Course[]       @relation("CourseUpdatedBy")
  lecturersCreated        Lecturer[]     @relation("LecturerCreatedBy")
  lecturersUpdated        Lecturer[]     @relation("LecturerUpdatedBy")
  roomsCreated            Room[]         @relation("RoomCreatedBy")
  roomsUpdated            Room[]         @relation("RoomUpdatedBy")
  scheduleEntriesCreated  ScheduleEntry[] @relation("ScheduleCreatedBy")
  scheduleEntriesUpdated  ScheduleEntry[] @relation("ScheduleUpdatedBy")
  optimizationResults     OptimizationResult[]

  @@map("users")
}

model Session {
  id        String   @id @default(uuid()) @db.VarChar(36)
  userId    String   @db.VarChar(36)
  token     String   @unique @db.VarChar(255)
  expiresAt DateTime @db.DateTime(0)
  ipAddress String?  @db.VarChar(255)
  userAgent String?  @db.Text
  createdAt DateTime @default(now()) @db.DateTime(0)
  updatedAt DateTime @updatedAt @db.DateTime(0)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model Account {
  id                    String    @id @default(uuid()) @db.VarChar(36)
  userId                String    @db.VarChar(36)
  accountId             String    @db.VarChar(255)
  providerId            String    @db.VarChar(255)
  accessToken           String?   @db.Text
  refreshToken          String?   @db.Text
  accessTokenExpiresAt  DateTime? @db.DateTime(0)
  refreshTokenExpiresAt DateTime? @db.DateTime(0)
  scope                 String?   @db.Text
  idToken               String?   @db.Text
  password              String?   @db.VarChar(255)
  createdAt             DateTime  @default(now()) @db.DateTime(0)
  updatedAt             DateTime  @updatedAt @db.DateTime(0)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("accounts")
}

model Verification {
  id         String   @id @default(uuid()) @db.VarChar(36)
  identifier String   @db.VarChar(255)
  value      String   @db.VarChar(255)
  expiresAt  DateTime @db.DateTime(0)
  createdAt  DateTime @default(now()) @db.DateTime(0)
  updatedAt  DateTime @updatedAt @db.DateTime(0)

  @@index([identifier])
  @@map("verifications")
}

// ============================================
// MASTER DATA TABLES
// ============================================

model ProgramStudi {
  id        String   @id @default(uuid()) @db.VarChar(36)
  code      String   @unique @db.VarChar(10)
  name      String   @db.VarChar(255)
  createdAt DateTime @default(now()) @db.DateTime(0)
  updatedAt DateTime @updatedAt @db.DateTime(0)
  createdBy String?  @db.VarChar(36)
  updatedBy String?  @db.VarChar(36)

  creator   User?      @relation("ProdiCreatedBy", fields: [createdBy], references: [id])
  updater   User?      @relation("ProdiUpdatedBy", fields: [updatedBy], references: [id])
  courses   Course[]
  lecturers Lecturer[]

  @@index([code])
  @@map("program_studi")
}

model Course {
  id             String      @id @default(uuid()) @db.VarChar(36)
  prodiId        String      @db.VarChar(36)
  kelas          String      @db.VarChar(20)
  code           String      @db.VarChar(20)
  name           String      @db.VarChar(255)
  sks            Int
  jenis          CourseJenis @default(WAJIB)
  peserta        Int
  classType      ClassType   @default(PAGI)
  shouldOnTheLab Boolean     @default(false)
  createdAt      DateTime    @default(now()) @db.DateTime(0)
  updatedAt      DateTime    @updatedAt @db.DateTime(0)
  createdBy      String?     @db.VarChar(36)
  updatedBy      String?     @db.VarChar(36)

  prodi           ProgramStudi    @relation(fields: [prodiId], references: [id], onDelete: Cascade)
  creator         User?           @relation("CourseCreatedBy", fields: [createdBy], references: [id])
  updater         User?           @relation("CourseUpdatedBy", fields: [updatedBy], references: [id])
  lecturers       CourseLecturer[]
  rooms           CourseRoom[]
  scheduleEntries ScheduleEntry[]

  @@unique([code, kelas, prodiId])
  @@index([code])
  @@index([prodiId])
  @@index([classType])
  @@index([shouldOnTheLab])
  @@map("courses")
}

model Lecturer {
  id              String   @id @default(uuid()) @db.VarChar(36)
  code            String   @unique @db.VarChar(20)
  name            String   @db.VarChar(255)
  prodiId         String   @db.VarChar(36)
  transitTime     Int      @default(0)
  maxDailyPeriods Int      @default(8)
  preferredRoom   String?  @db.VarChar(255)
  createdAt       DateTime @default(now()) @db.DateTime(0)
  updatedAt       DateTime @updatedAt @db.DateTime(0)
  createdBy       String?  @db.VarChar(36)
  updatedBy       String?  @db.VarChar(36)

  prodi           ProgramStudi           @relation(fields: [prodiId], references: [id], onDelete: Cascade)
  creator         User?                  @relation("LecturerCreatedBy", fields: [createdBy], references: [id])
  updater         User?                  @relation("LecturerUpdatedBy", fields: [updatedBy], references: [id])
  researchDays    LecturerResearchDay[]   // [HC-01]
  preferredTimes  LecturerPreferredTime[] // [SC-01]
  courses         CourseLecturer[]
  scheduleEntries ScheduleEntry[]

  @@index([code])
  @@index([prodiId])
  @@map("lecturers")
}

model Room {
  id        String   @id @default(uuid()) @db.VarChar(36)
  code      String   @unique @db.VarChar(20)
  name      String   @db.VarChar(255)
  type      RoomType @default(THEORY)
  capacity  Int
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now()) @db.DateTime(0)
  updatedAt DateTime @updatedAt @db.DateTime(0)
  createdBy String?  @db.VarChar(36)
  updatedBy String?  @db.VarChar(36)

  creator         User?           @relation("RoomCreatedBy", fields: [createdBy], references: [id])
  updater         User?           @relation("RoomUpdatedBy", fields: [updatedBy], references: [id])
  courses         CourseRoom[]    // [SC-02]
  scheduleEntries ScheduleEntry[]

  @@index([code])
  @@index([type])
  @@index([capacity])
  @@map("rooms")
}

// ============================================
// CONSTRAINTS & PREFERENCES
// ============================================

model LecturerResearchDay {
  id         String   @id @default(uuid()) @db.VarChar(36)
  lecturerId String   @db.VarChar(36)
  day        DayOfWeek
  createdAt  DateTime @default(now()) @db.DateTime(0)

  lecturer Lecturer @relation(fields: [lecturerId], references: [id], onDelete: Cascade)

  @@unique([lecturerId, day])
  @@index([lecturerId])
  @@index([day])
  @@map("lecturer_research_days")
}

model LecturerPreferredTime {
  id              String           @id @default(uuid()) @db.VarChar(36)
  lecturerId      String           @db.VarChar(36)
  day             DayOfWeek
  startSlot       Int              // 1-11 (slot per hari)
  endSlot         Int              // 1-11
  preferenceLevel PreferenceLevel  @default(HIGH)
  createdAt       DateTime         @default(now()) @db.DateTime(0)

  lecturer Lecturer @relation(fields: [lecturerId], references: [id], onDelete: Cascade)

  @@index([lecturerId])
  @@index([day])
  @@map("lecturer_preferred_times")
}

// ============================================
// JUNCTION TABLES (M:N)
// ============================================

model CourseLecturer {
  id           String       @id @default(uuid()) @db.VarChar(36)
  courseId     String       @db.VarChar(36)
  lecturerId   String       @db.VarChar(36)
  lecturerType LecturerType
  createdAt    DateTime     @default(now()) @db.DateTime(0)

  course   Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lecturer Lecturer @relation(fields: [lecturerId], references: [id], onDelete: Cascade)

  @@unique([courseId, lecturerId, lecturerType])
  @@index([courseId])
  @@index([lecturerId])
  @@map("course_lecturers")
}

model CourseRoom {
  id        String   @id @default(uuid()) @db.VarChar(36)
  courseId  String   @db.VarChar(36)
  roomId    String   @db.VarChar(36)
  priority  Int      @default(1)  // 1-5, lower = higher priority
  createdAt DateTime @default(now()) @db.DateTime(0)

  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  room   Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([courseId, roomId])
  @@index([courseId])
  @@index([roomId])
  @@map("course_rooms")
}

// ============================================
// SCHEDULE & OPTIMIZATION
// ============================================

model ScheduleEntry {
  id             String   @id @default(uuid()) @db.VarChar(36)
  courseId       String   @db.VarChar(36)
  lecturerId     String   @db.VarChar(36)
  roomId         String   @db.VarChar(36)
  day            DayOfWeek
  startSlot      Int      // 1-11 (slot 50 menit)
  duration       Int      // 1-4 slot (50-200 menit)
  isOptimized    Boolean  @default(true)   // [KF-08]
  isManualEdit   Boolean  @default(false)  // [KF-08]
  optimizationId String?  @db.VarChar(36)
  conflictInfo   Json?    // [KF-09] Store conflict details
  createdAt      DateTime @default(now()) @db.DateTime(0)
  updatedAt      DateTime @updatedAt @db.DateTime(0)
  createdBy      String?  @db.VarChar(36)
  updatedBy      String?  @db.VarChar(36)

  course       Course             @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lecturer     Lecturer           @relation(fields: [lecturerId], references: [id], onDelete: Cascade)
  room         Room               @relation(fields: [roomId], references: [id], onDelete: Cascade)
  optimization OptimizationResult? @relation(fields: [optimizationId], references: [id])
  creator      User?              @relation("ScheduleCreatedBy", fields: [createdBy], references: [id])
  updater      User?              @relation("ScheduleUpdatedBy", fields: [updatedBy], references: [id])

  @@index([courseId])
  @@index([lecturerId])
  @@index([roomId])
  @@index([day])
  @@index([startSlot])
  @@index([optimizationId])
  @@index([isOptimized])
  @@map("schedule_entries")
}

model OptimizationResult {
  id                String              @id @default(uuid()) @db.VarChar(36)
  userId            String              @db.VarChar(36)
  name              String              @db.VarChar(255)
  algorithmType     AlgorithmType       @default(HYBRID)  // [KF-10]
  parameters        Json                // Store SA+TS params
  initialCost       Decimal?            @db.Decimal(10, 4)
  finalCost         Decimal?            @db.Decimal(10, 4)
  improvement       Decimal?            @db.Decimal(5, 2)
  hardViolations    Int                 @default(0)
  softViolations    Int                 @default(0)
  executionTime     Int?                // milliseconds
  iterations        Int?
  status            OptimizationStatus  @default(RUNNING)
  errorMessage      String?             @db.Text
  appliedToSchedule Boolean             @default(false)
  appliedAt         DateTime?           @db.DateTime(0)
  createdAt         DateTime            @default(now()) @db.DateTime(0)
  updatedAt         DateTime            @updatedAt @db.DateTime(0)

  user            User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  iterationsData  OptimizationIteration[] // [KF-12] Real-time tracking
  scheduleEntries ScheduleEntry[]

  @@index([userId])
  @@index([status])
  @@index([algorithmType])
  @@index([appliedToSchedule])
  @@map("optimization_results")
}

model OptimizationIteration {
  id             String   @id @default(uuid()) @db.VarChar(36)
  optimizationId String   @db.VarChar(36)
  iteration      Int
  cost           Decimal  @db.Decimal(10, 4)
  temperature    Decimal? @db.Decimal(10, 4)  // For SA
  hardViolations Int      @default(0)
  softViolations Int      @default(0)
  tabuHits       Int      @default(0)         // For TS
  acceptedMove   Boolean?
  moveType       String?  @db.VarChar(50)     // swap, move, insert
  createdAt      DateTime @default(now()) @db.DateTime(0)

  optimization OptimizationResult @relation(fields: [optimizationId], references: [id], onDelete: Cascade)

  @@unique([optimizationId, iteration])
  @@index([optimizationId])
  @@index([iteration])
  @@map("optimization_iterations")
}

// ============================================
// ENUMS
// ============================================

enum UserRole {
  ADMIN
  SUPER_ADMIN
}

enum CourseJenis {
  WAJIB
  PILIHAN
}

enum ClassType {
  PAGI
  SORE
}

enum RoomType {
  THEORY
  LAB_MULTIMEDIA
}

enum DayOfWeek {
  SENIN
  SELASA
  RABU
  KAMIS
  JUMAT
  SABTU
  MINGGU
}

enum PreferenceLevel {
  HIGH
  MEDIUM
  LOW
}

enum LecturerType {
  PRIMARY_1
  PRIMARY_2
  EXTERNAL_1
  EXTERNAL_2
}

enum AlgorithmType {
  SA
  TS
  HYBRID
}

enum OptimizationStatus {
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

## 4. Constraint System

### 4.1 Hard Constraints (Tidak Boleh Dilanggar)

| Kode | Constraint | Implementasi | Penalti |
|------|-----------|--------------|---------|
| **HC-01** | No Lecturer Conflict | Dosen tidak double-booked pada slot yang sama | ∞ (Forbidden) |
| **HC-02** | No Room Conflict | Ruangan tidak double-booked pada slot yang sama | ∞ (Forbidden) |
| **HC-03** | Room Capacity | `course.peserta <= room.capacity` | ∞ (Forbidden) |
| **HC-04** | No Prodi Conflict | Mahasiswa prodi yang sama tidak punya kelas bersamaan | ∞ (Forbidden) |
| **HC-05** | Max Daily Periods | Dosen tidak melebihi batas jam mengajar per hari | ∞ (Forbidden) |
| **HC-06** | Class Type Time | Kelas pagi di slot pagi, kelas sore di slot sore | ∞ (Forbidden) |
| **HC-07** | Saturday Restriction | Hanya prodi tertentu yang boleh ada kelas hari Sabtu | ∞ (Forbidden) |
| **HC-08** | Friday Time Restriction | Kelas Jumat hanya sampai pukul 11:40 atau mulai setelah 13:10 | ∞ (Forbidden) |
| **HC-09** | No Friday Pray Conflict | Kelas tidak overlap dengan waktu sholat Jumat (11:40-13:10) | ∞ (Forbidden) |
| **HC-10** | Prayer Time Start | Kelas tidak boleh dimulai selama waktu sholat | ∞ (Forbidden) |
| **HC-11** | Exclusive Room | Ruang tertentu hanya untuk mata kuliah tertentu | ∞ (Forbidden) |

### 4.2 Soft Constraints (Preferensi, Bisa Dilanggar dengan Penalti)

| Kode | Constraint | Implementasi | Penalti |
|------|-----------|--------------|---------|
| **SC-01** | Preferred Time | Preferensi waktu mengajar dosen | 10/slot |
| **SC-02** | Preferred Room | Preferensi ruangan dosen/mata kuliah | 10/violation |
| **SC-03** | Transit Time | Jeda antar kelas >= `lecturer.transitTime` | 5/minute |
| **SC-04** | Compactness | Minimalkan gap dalam jadwal harian (bonus jika kompak) | -15/kompak |
| **SC-05** | Prayer Time Overlap | Minimalkan overlap kelas dengan waktu sholat | 20/overlap |
| **SC-06** | Evening Class Priority | Kelas sore di slot optimal | 20/non-optimal |
| **SC-07** | Research Day | Hindari jadwal pada hari riset dosen | 10/violation |
| **SC-08** | Overflow Penalty | Penalti jika kapasitas ruangan terlalu penuh | 10/violation |

### 4.3 Fitness Function

```typescript
function calculateFitness(solution: TimetableState, constraints: Constraint<TimetableState>[]): number {
  let totalPenalty = 0;
  let hardViolations = 0;
  let softViolations = 0;
  
  for (const constraint of constraints) {
    const violationScore = 1 - constraint.evaluate(solution); // 0 = no violation, 1+ = violation
    
    if (constraint.type === 'hard') {
      if (violationScore > 0) {
        hardViolations++;
        totalPenalty += hardConstraintWeight * violationScore;
      }
    } else {
      if (violationScore > 0) {
        softViolations++;
        totalPenalty += constraint.weight * violationScore;
      }
    }
  }
  
  return totalPenalty;
}

// Target: Minimize fitness (0 = perfect solution)
// Hard violations must be 0 for valid timetable
// Soft violations are minimized based on weights
```

---

## 5. Algorithm Specification

### 5.1 Algorithm Architecture (SA + Tabu Search + Intensification)

Sistem menggunakan **Simulated Annealing v2.0** dari `timetable-sa` library dengan fitur-fitur modern:

```
┌─────────────────────────────────────────────────────────────────┐
│                 SIMULATED ANNEALING v2.0                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CORE SA LOOP                                                   │
│  ─────────────────────────────────────────────                  │
│  • Temperature: 100000 → 0.0000001                              │
│  • Cooling: T = T * 0.9995 (slow cooling)                       │
│  • Iterations: 20,000 (15-30 min runtime)                       │
│  • Metropolis Criterion: Accept bad moves probabilistically     │
│                                                                 │
│  EMBEDDED TABU SEARCH                                           │
│  ─────────────────────────────────────────────                  │
│  • Tabu Tenure: 50 iterations                                   │
│  • Max List Size: 1000 states                                   │
│  • Aspiration: Override tabu if improves global best            │
│  • Purpose: Prevent cycling, escape local optima                │
│                                                                 │
│  REHEATING MECHANISM                                            │
│  ─────────────────────────────────────────────                  │
│  • Trigger: No improvement for 500 iterations                   │
│  • Action: T = T * 150 (strong boost)                           │
│  • Max Reheats: 10                                              │
│  • Purpose: Escape deep local minima                            │
│                                                                 │
│  INTENSIFICATION (Optional)                                     │
│  ─────────────────────────────────────────────                  │
│  • Phase 1.5: Targeted fixes for stubborn violations          │
│  • Iterations: 2000 per attempt                                 │
│  • Max Attempts: 3                                              │
│  • Purpose: Force-fix remaining hard violations                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- ✅ Single-phase SA dengan embedded tabu (bukan hybrid phase)
- ✅ Adaptive reheating untuk escape local optima
- ✅ Targeted fix operators untuk intensification
- ✅ State caching untuk performa
- ✅ Operator statistics tracking

### 5.2 Neighborhood Operators (Move Generators)

```typescript
// General Move Operators (Exploration)
const moveGenerators: MoveGenerator<TimetableState>[] = [
  // BEST operator - 10-13% success rate
  new ChangeTimeSlotAndRoom(),    // Ganti slot waktu DAN ruang sekaligus
  
  // Single-change operators
  new ChangeTimeSlot(),           // Ganti slot waktu saja
  new ChangeRoom(),               // Ganti ruang saja
  new SwapClasses(),              // Tukar slot/ruang antar 2 kelas (diversity)
];

// Targeted Fix Operators (Intensification)
const fixOperators: MoveGenerator<TimetableState>[] = [
  new FixFridayPrayerConflict(),  // Fix overlap dengan sholat Jumat
  new FixLecturerConflict(),      // Fix dosen double-booked
  new FixRoomConflict(),          // Fix ruang double-booked
  new FixMaxDailyPeriods(),       // Fix melebihi batas jam mengajar
  new FixRoomCapacity(),          // Fix kapasitas ruang terlampaui
];

// Operator Priority Configuration
const config = {
  operatorSelectionMode: "hybrid",  // "adaptive" | "random" | "hybrid"
  targetedPriority: 0.7,            // 70% chance to use targeted fix when violation exists
};
```

**Operator Effectiveness (from actual runs):**
| Operator | Success Rate | Purpose |
|----------|--------------|---------|
| ChangeTimeSlotAndRoom | 10-13% | Best for exploration |
| FixFridayPrayerConflict | 8-12% | Targeted fix |
| FixLecturerConflict | 6-10% | Targeted fix |
| ChangeTimeSlot | 3-5% | Single change |
| ChangeRoom | 2-4% | Single change |
| SwapClasses | 0.5-1% | Diversity only |

### 5.3 Algorithm Configuration

```typescript
// Default SA Configuration (from examples/timetabling/example-basic.ts)
const defaultConfig: SAConfig<TimetableState> = {
  // Core SA Parameters
  initialTemperature: 100000,        // Higher for better exploration at start
  minTemperature: 0.0000001,         // Very low for fine-tuning
  coolingRate: 0.9995,               // Slower cooling for thorough search
  maxIterations: 20000,              // 15-30 minutes runtime
  hardConstraintWeight: 100000,      // Very high penalty for hard violations
  
  // State Cloning - optimized for performance
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry }))
  }),
  
  // Reheating to escape local minima
  reheatingThreshold: 500,           // Reheat if no improvement for 500 iterations
  reheatingFactor: 150,              // Strong reheating boost
  maxReheats: 10,
  
  // Tabu Search Configuration (NEW in v2.0)
  tabuSearchEnabled: true,           // Enable to prevent cycling
  tabuTenure: 50,                    // How long a state stays tabu
  maxTabuListSize: 1000,             // Memory limit for tabu list
  aspirationEnabled: true,           // Allow overriding tabu if better solution found
  
  // Intensification Configuration
  enableIntensification: false,      // Phase 1.5 for stubborn violations
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,
  operatorSelectionMode: "hybrid",
  
  // Logging
  logging: {
    enabled: true,
    level: "info",
    logInterval: 500,
  },
};
```

---

## 6. Frontend Specification

### 6.1 Page Specifications

#### Dashboard (`/dashboard`)
```typescript
interface DashboardProps {
  stats: {
    totalLecturers: number;
    totalCourses: number;
    totalRooms: number;
    activeSchedules: number;
    pendingOptimizations: number;
    completedOptimizations: number;
  };
  recentOptimizations: OptimizationResult[];
  weeklySchedule: ScheduleEntry[];
}

// Features:
// - Cards: Statistik cepat [KF-02]
// - Chart: Optimasi minggu ini
// - Table: Riwayat optimasi terakhir [KF-13]
// - Preview: Grid jadwal hari ini [KF-19]
```

#### Master Data Pages
```typescript
// Lecturers (/lecturers)
interface LecturersPageProps {
  lecturers: Lecturer[];
  filters: {
    prodiId?: string;
    search?: string;
  };
}
// Features:
// - Data table dengan pagination
// - Form modal create/edit [KF-03]
// - Tab: Detail, Research Days, Preferred Times
// - Bulk import button [KF-06]

// Courses (/courses)
interface CoursesPageProps {
  courses: Course[];
  filters: {
    prodiId?: string;
    classType?: 'PAGI' | 'SORE';
    search?: string;
  };
}
// Features:
// - Data table dengan filter
// - Form: Assign multiple lecturers [KF-04]
// - Form: Room preferences with priority
// - Excel import [KF-06]

// Rooms (/rooms)
interface RoomsPageProps {
  rooms: Room[];
}
// Features:
// - Grid/card view
// - Capacity visualization
// - Availability calendar
```

#### Schedule Editor (`/schedule`)
```typescript
interface SchedulePageProps {
  entries: ScheduleEntry[];
  filters: {
    prodiId?: string;
    day?: DayOfWeek;
    lecturerId?: string;
    roomId?: string;
  };
}

// Features:
// - Weekly grid view (Monday-Sunday, 07:00-20:00) [KF-14]
// - Drag & drop untuk manual scheduling [KF-08]
// - Real-time conflict detection [KF-09]
// - Color coding: by course/prodi/lecturer/room
// - Context menu: Edit, Delete, Show conflicts
// - Conflict highlighting (red border + tooltip)
// - Save/Validate buttons [KF-18]
```

#### Optimization Page (`/optimization`)
```typescript
interface OptimizationPageProps {
  config: OptimizationConfig;
  runningJobs: OptimizationResult[];
  history: OptimizationResult[];
}

// Features:
// - Card: Algorithm selection (SA / TS / Hybrid) [KF-10]
// - Accordion: Parameter configuration [KF-11]
//   - SA: Temperature, cooling rate, iterations
//   - TS: Tabu list size, iterations
//   - Weights: Hard/soft constraint weights
// - Button: Start optimization
// - Section: Running jobs
//   - Progress bar + percentage [KF-12]
//   - Live chart: Fitness vs iteration
//   - Stats: Current temp, violations, time elapsed
//   - Button: Cancel job
// - Section: History table [KF-13]
//   - Columns: Name, algorithm, status, cost, violations, actions
//   - Actions: View details, Apply to schedule, Delete
```

#### Monitoring Page (`/monitor`)
```typescript
interface MonitorPageProps {
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
  };
  optimizationHistory: {
    date: Date;
    count: number;
    avgDuration: number;
    successRate: number;
  }[];
}

// Features:
// - Real-time gauges: CPU, Memory [KF-16]
// - Line chart: Optimization frequency
// - Table: Recent optimization details
// - Alert cards: Failed jobs, system warnings
```

### 6.2 Component Library (shadcn/ui)

```typescript
// Base Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Accordion } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Toast } from '@/components/ui/toast';
import { Calendar } from '@/components/ui/calendar';
import { Chart } from '@/components/ui/chart';

// Custom Components
import { ScheduleGrid } from '@/components/schedule/schedule-grid';
import { DraggableEntry } from '@/components/schedule/draggable-entry';
import { ConflictIndicator } from '@/components/schedule/conflict-indicator';
import { OptimizationProgress } from '@/components/optimization/progress-chart';
import { DataTable } from '@/components/data-table';
import { ImportDialog } from '@/components/import-export/import-dialog';
import { ExportButton } from '@/components/import-export/export-button';
```

### 6.3 State Management

```typescript
// TanStack Query Hooks
// Lecturers
const { data: lecturers } = useQuery({
  queryKey: ['lecturers'],
  queryFn: fetchLecturers,
});

const createLecturer = useMutation({
  mutationFn: api.lecturers.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['lecturers'] });
    toast.success('Dosen berhasil ditambahkan');
  },
});

// Real-time Optimization
const { data: progress } = useQuery({
  queryKey: ['optimization', optimizationId, 'progress'],
  queryFn: () => fetchOptimizationProgress(optimizationId),
  refetchInterval: 1000, // Poll every second
  enabled: status === 'RUNNING',
});

// WebSocket for real-time
useEffect(() => {
  const socket = io('/optimization');
  socket.emit('join:optimization', optimizationId);
  
  socket.on('optimization:progress', (data) => {
    queryClient.setQueryData(
      ['optimization', optimizationId, 'progress'],
      data
    );
  });
  
  return () => socket.disconnect();
}, [optimizationId]);
```

---

## 7. API Specification

### 7.1 REST API

#### Lecturers
```typescript
// GET /api/lecturers
interface GetLecturersResponse {
  data: Lecturer[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// POST /api/lecturers
interface CreateLecturerRequest {
  code: string;
  name: string;
  prodiId: string;
  transitTime?: number;
  maxDailyPeriods?: number;
  preferredRoom?: string;
}

// GET /api/lecturers/:id/research-days
interface GetResearchDaysResponse {
  data: LecturerResearchDay[];
}

// POST /api/lecturers/:id/research-days
interface CreateResearchDayRequest {
  day: DayOfWeek;
}

// GET /api/lecturers/:id/preferred-times
interface GetPreferredTimesResponse {
  data: LecturerPreferredTime[];
}

// POST /api/lecturers/:id/preferred-times
interface CreatePreferredTimeRequest {
  day: DayOfWeek;
  startSlot: number;
  endSlot: number;
  preferenceLevel: PreferenceLevel;
}
```

#### Optimization
```typescript
// POST /api/optimization-results
interface StartOptimizationRequest {
  name: string;
  algorithmType: AlgorithmType;
  parameters: {
    // SA params
    initialTemperature: number;
    minTemperature: number;
    coolingRate: number;
    maxIterationsSA: number;
    // TS params
    tabuListSize: number;
    maxIterationsTS: number;
    // Hybrid params
    switchThreshold: number;
  };
  filters?: {
    prodiIds?: string[];
    classType?: ClassType;
  };
}

interface StartOptimizationResponse {
  id: string;
  status: OptimizationStatus;
  message: string;
}

// GET /api/optimization-results/:id
interface GetOptimizationResponse {
  id: string;
  name: string;
  algorithmType: AlgorithmType;
  parameters: object;
  initialCost: number;
  finalCost: number;
  improvement: number;
  hardViolations: number;
  softViolations: number;
  executionTime: number;
  iterations: number;
  status: OptimizationStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// GET /api/optimization-results/:id/iterations
interface GetIterationsResponse {
  data: OptimizationIteration[];
}

// POST /api/optimization-results/:id/apply
interface ApplyOptimizationRequest {
  replaceExisting: boolean; // true = replace, false = merge
}

// POST /api/optimization-results/:id/cancel
// No body required
```

### 7.2 WebSocket Protocol

```typescript
// Client → Server
interface ClientEvents {
  'join:optimization': (optimizationId: string) => void;
  'leave:optimization': (optimizationId: string) => void;
  'cancel:optimization': (optimizationId: string) => void;
}

// Server → Client
interface ServerEvents {
  'optimization:progress': (data: {
    optimizationId: string;
    iteration: number;
    totalIterations: number;
    progress: number; // 0-100
    currentCost: number;
    temperature?: number; // SA only
    hardViolations: number;
    softViolations: number;
    phase: 'SA' | 'TS' | 'HYBRID';
    estimatedTimeRemaining: number; // seconds
  }) => void;
  
  'optimization:completed': (data: {
    optimizationId: string;
    finalCost: number;
    hardViolations: number;
    softViolations: number;
    executionTime: number;
    improvement: number;
  }) => void;
  
  'optimization:error': (data: {
    optimizationId: string;
    error: string;
    iteration: number;
  }) => void;
  
  'optimization:cancelled': (data: {
    optimizationId: string;
    iteration: number;
  }) => void;
}
```

---

## 8. Worker Algorithm Implementation

### 8.1 Worker Architecture (Based on timetable-sa v2.0)

Worker menggunakan library `timetable-sa` v2.0 yang menyediakan core Simulated Annealing dengan fitur embedded Tabu Search. Tidak perlu implementasi custom SA/TS.

```
worker/
├── src/
│   ├── main.ts                           # HTTP server entry point
│   ├── config/
│   │   └── optimization.config.ts        # SAConfig default values
│   ├── types/
│   │   ├── Domain.ts                     # Room, Lecturer, ClassRequirement
│   │   ├── State.ts                      # TimetableState, ScheduleEntry
│   │   └── index.ts
│   ├── constraints/
│   │   ├── hard/                         # Hard constraint classes
│   │   │   ├── NoLecturerConflict.ts
│   │   │   ├── NoRoomConflict.ts
│   │   │   ├── RoomCapacity.ts
│   │   │   ├── NoProdiConflict.ts
│   │   │   ├── MaxDailyPeriods.ts
│   │   │   ├── ClassTypeTime.ts
│   │   │   ├── SaturdayRestriction.ts
│   │   │   ├── FridayTimeRestriction.ts
│   │   │   ├── NoFridayPrayConflict.ts
│   │   │   ├── PrayerTimeStart.ts
│   │   │   ├── ExclusiveRoom.ts
│   │   │   └── index.ts
│   │   └── soft/                         # Soft constraint classes
│   │       ├── PreferredTime.ts
│   │       ├── PreferredRoom.ts
│   │       ├── TransitTime.ts
│   │       ├── Compactness.ts
│   │       ├── PrayerTimeOverlap.ts
│   │       ├── EveningClassPriority.ts
│   │       ├── ResearchDay.ts
│   │       ├── OverflowPenalty.ts
│   │       └── index.ts
│   ├── moves/
│   │   ├── ChangeTimeSlot.ts             # Ganti slot waktu
│   │   ├── ChangeRoom.ts                 # Ganti ruang
│   │   ├── SwapClasses.ts                # Tukar antar kelas
│   │   ├── ChangeTimeSlotAndRoom.ts      # Ganti keduanya
│   │   ├── FixFridayPrayerConflict.ts    # Fix sholat Jumat
│   │   ├── FixLecturerConflict.ts        # Fix dosen bentrok
│   │   ├── FixRoomConflict.ts            # Fix ruang bentrok
│   │   ├── FixMaxDailyPeriods.ts         # Fix max daily
│   │   ├── FixRoomCapacity.ts            # Fix kapasitas
│   │   └── index.ts
│   ├── utils/
│   │   ├── time.ts                       # Time calculations
│   │   ├── timeslot-generator.ts         # Generate time slots
│   │   ├── initial-solution.ts           # Greedy initial solution
│   │   ├── prayer-times.ts               # Prayer time config
│   │   └── index.ts
│   ├── data/
│   │   ├── excel-loader.ts               # Load from Excel
│   │   ├── json-loader.ts                # Load from JSON
│   │   └── index.ts
│   ├── database/
│   │   └── db.ts                         # Prisma client
│   └── websocket/
│       └── progress-emitter.ts           # Socket.io client
├── package.json
└── tsconfig.json
```

### 8.2 Core Worker Implementation

```typescript
// src/main.ts

import { SimulatedAnnealing } from 'timetable-sa';
import type { SAConfig, Constraint, MoveGenerator } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from './types/index.js';
import { loadDataFromExcel } from './data/index.js';
import { generateInitialSolution } from './utils/initial-solution.js';
import { ProgressEmitter } from './websocket/progress-emitter.js';

// Import all constraints
import {
  NoLecturerConflict, NoRoomConflict, RoomCapacity, NoProdiConflict,
  MaxDailyPeriods, ClassTypeTime, SaturdayRestriction, FridayTimeRestriction,
  PrayerTimeStart, ExclusiveRoom
} from './constraints/hard/index.js';

import {
  PreferredTime, PreferredRoom, TransitTime, Compactness,
  PrayerTimeOverlap, EveningClassPriority, ResearchDay, OverflowPenalty
} from './constraints/soft/index.js';

// Import all move operators
import {
  ChangeTimeSlot, ChangeRoom, SwapClasses, ChangeTimeSlotAndRoom,
  FixFridayPrayerConflict, FixLecturerConflict, FixRoomConflict,
  FixMaxDailyPeriods, FixRoomCapacity
} from './moves/index.js';

export async function executeOptimization(
  optimizationId: string,
  data: OptimizationData,
  config: OptimizationConfig,
  emitter: ProgressEmitter
): Promise<OptimizationResult> {
  
  console.log(`🚀 Starting optimization ${optimizationId}`);
  
  // 1. Generate initial solution using greedy algorithm
  const initialState = generateInitialSolution(data, { randomize: true });
  
  // 2. Define constraints (hard + soft)
  const constraints: Constraint<TimetableState>[] = [
    // Hard constraints
    new NoLecturerConflict(),
    new NoRoomConflict(),
    new RoomCapacity(),
    new NoProdiConflict(),
    new MaxDailyPeriods(),
    new ClassTypeTime(),
    new SaturdayRestriction(),
    new FridayTimeRestriction(),
    new PrayerTimeStart(),
    new ExclusiveRoom(),
    
    // Soft constraints with weights
    new PreferredTime(10),
    new PreferredRoom(10),
    new TransitTime(5),
    new Compactness(15),
    new PrayerTimeOverlap(20),
    new EveningClassPriority(20),
    new ResearchDay(10),
    new OverflowPenalty(10),
  ];
  
  // 3. Define move operators
  const moveGenerators: MoveGenerator<TimetableState>[] = [
    // Targeted fix operators (priority for violations)
    new FixFridayPrayerConflict(),
    new FixLecturerConflict(),
    new FixRoomConflict(),
    new FixMaxDailyPeriods(),
    new FixRoomCapacity(),
    
    // General exploration operators
    new ChangeTimeSlotAndRoom(), // BEST: 10-13% success rate
    new ChangeTimeSlot(),
    new ChangeRoom(),
    new SwapClasses(),
  ];
  
  // 4. Configure SA
  const saConfig: SAConfig<TimetableState> = {
    initialTemperature: config.initialTemperature || 100000,
    minTemperature: 0.0000001,
    coolingRate: 0.9995,
    maxIterations: config.maxIterations || 20000,
    hardConstraintWeight: 100000,
    
    // Optimized state cloning
    cloneState: (state) => ({
      ...state,
      schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry }))
    }),
    
    // Reheating
    reheatingThreshold: 500,
    reheatingFactor: 150,
    maxReheats: 10,
    
    // Tabu Search
    tabuSearchEnabled: true,
    tabuTenure: 50,
    maxTabuListSize: 1000,
    aspirationEnabled: true,
    
    // Intensification
    enableIntensification: false,
    intensificationIterations: 2000,
    maxIntensificationAttempts: 3,
    operatorSelectionMode: "hybrid",
    
    // Progress callback
    onIteration: async (iteration, state, fitness) => {
      if (iteration % 100 === 0) {
        await emitter.emitProgress({
          optimizationId,
          iteration,
          totalIterations: config.maxIterations,
          progress: (iteration / config.maxIterations) * 100,
          currentCost: fitness,
          hardViolations: countHardViolations(state, constraints),
          softViolations: countSoftViolations(state, constraints),
        });
      }
    },
    
    logging: {
      enabled: true,
      level: "info",
      logInterval: 500,
    },
  };
  
  // 5. Run optimization
  const solver = new SimulatedAnnealing(
    initialState,
    constraints,
    moveGenerators,
    saConfig
  );
  
  const solution = solver.solve();
  
  // 6. Return result
  return {
    optimizationId,
    fitness: solution.fitness,
    hardViolations: solution.hardViolations,
    softViolations: solution.softViolations,
    iterations: solution.iterations,
    executionTime: solution.executionTime,
    schedule: solution.state.schedule,
    violations: solution.violations,
    operatorStats: solution.operatorStats,
  };
}
```

### 8.3 Example Constraint Implementation

```typescript
// src/constraints/hard/NoFridayPrayConflict.ts

import { Constraint } from 'timetable-sa';
import { TimetableState } from '../../types';

/**
 * NoFridayPrayConflict: Classes cannot overlap with Friday prayer time (11:40 - 13:10)
 */
export class NoFridayPrayConflict implements Constraint<TimetableState> {
  name = 'No Friday Pray Conflict';
  type = 'hard' as const;

  private readonly PRAYER_START = 11 * 60 + 40; // 11:40 in minutes
  private readonly PRAYER_END = 13 * 60 + 10;   // 13:10 in minutes

  private overlapsWithPrayerTime(entry: any): boolean {
    if (entry.timeSlot.day !== 'Friday') {
      return false;
    }

    const [startHour, startMin] = entry.timeSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = entry.timeSlot.endTime.split(':').map(Number);
    const classStart = startHour * 60 + startMin;
    const classEnd = endHour * 60 + endMin;

    // Check if time ranges overlap
    return classStart < this.PRAYER_END && classEnd >= this.PRAYER_START;
  }

  evaluate(state: TimetableState): number {
    const violations = state.schedule.filter(entry => 
      this.overlapsWithPrayerTime(entry)
    ).length;
    
    if (violations === 0) return 1;
    return 1 / (1 + violations);
  }

  describe(state: TimetableState): string | undefined {
    for (const entry of state.schedule) {
      if (this.overlapsWithPrayerTime(entry)) {
        return `Class ${entry.classId} overlaps with Friday prayer time (11:40-13:10)`;
      }
    }
    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    return state.schedule
      .filter(entry => this.overlapsWithPrayerTime(entry))
      .map(entry => `Class ${entry.classId} overlaps with Friday prayer time`);
  }
}
```

### 8.4 Example Move Operator

```typescript
// src/moves/ChangeTimeSlotAndRoom.ts

import { MoveGenerator, Move } from 'timetable-sa';
import { TimetableState, ScheduleEntry } from '../types';

/**
 * ChangeTimeSlotAndRoom: Change both time slot AND room simultaneously
 * BEST operator - 10-13% success rate
 */
export class ChangeTimeSlotAndRoom implements MoveGenerator<TimetableState> {
  name = 'ChangeTimeSlotAndRoom';

  generate(state: TimetableState): Move<TimetableState> | null {
    if (state.schedule.length === 0) return null;
    
    // Pick random entry
    const entryIndex = Math.floor(Math.random() * state.schedule.length);
    const entry = state.schedule[entryIndex];
    
    // Pick random new time slot
    const newTimeSlot = state.availableTimeSlots[
      Math.floor(Math.random() * state.availableTimeSlots.length)
    ];
    
    // Pick random new room
    const newRoom = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    
    return {
      apply: (s: TimetableState) => {
        const newSchedule = [...s.schedule];
        newSchedule[entryIndex] = {
          ...entry,
          timeSlot: newTimeSlot,
          room: newRoom.Code,
        };
        return { ...s, schedule: newSchedule };
      },
      revert: (s: TimetableState) => {
        const newSchedule = [...s.schedule];
        newSchedule[entryIndex] = entry;
        return { ...s, schedule: newSchedule };
      },
      description: `Change ${entry.classId} to ${newTimeSlot.day} ${newTimeSlot.startTime} in ${newRoom.Code}`,
    };
  }
}
```

---

## 9. Monorepo Configuration

### 9.1 Root Configuration

```json
// package.json (root)
{
  "name": "uisi-scheduling-system",
  "private": true,
  "packageManager": "bun@1.1.38",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:studio": "turbo run db:studio",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:build": "docker-compose build",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build", "^db:generate"],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "db:generate": {
      "outputs": [
        "prisma/client/**",
        "node_modules/.prisma/client/**"
      ]
    },
    "db:migrate": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 9.2 Workspace Packages

```json
// packages/database/package.json
{
  "name": "@uisi/database",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc && prisma generate",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "clean": "rm -rf dist node_modules"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

```json
// packages/types/package.json
{
  "name": "@uisi/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist node_modules"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

### 9.3 Application Packages

```json
// apps/api/package.json
{
  "name": "@uisi/api",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "db:generate": "prisma generate",
    "clean": "rm -rf dist node_modules"
  },
  "dependencies": {
    "@uisi/database": "workspace:*",
    "@uisi/types": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/platform-socket.io": "^10.3.0",
    "@nestjs/websockets": "^10.3.0",
    "better-auth": "^0.2.0",
    "class-validator": "^0.14.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

```json
// apps/worker/package.json
{
  "name": "@uisi/worker",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/main.ts",
    "start": "bun dist/main.js",
    "lint": "eslint \"src/**/*.ts\" --fix",
    "test": "bun test",
    "clean": "rm -rf dist node_modules"
  },
  "dependencies": {
    "@uisi/database": "workspace:*",
    "@uisi/types": "workspace:*",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "bun-types": "latest",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@uisi/web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "vinxi build",
    "dev": "vinxi dev",
    "start": "vinxi start",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "clean": "rm -rf dist node_modules .vinxi"
  },
  "dependencies": {
    "@uisi/types": "workspace:*",
    "@tanstack/react-query": "^5.17.0",
    "@tanstack/react-router": "^1.0.0",
    "@tanstack/react-start": "^1.0.0",
    "@tanstack/router-devtools": "^1.0.0",
    "better-auth": "^0.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "socket.io-client": "^4.7.0",
    "vinxi": "^0.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  }
}
```

---

## 10. Deployment Configuration

### 10.1 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: uisi-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./apps/web/dist:/usr/share/nginx/html:ro
    depends_on:
      - api
    networks:
      - uisi-network

  mysql:
    image: mysql:8.0
    container_name: uisi-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: uisi_scheduling
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "3306:3306"
    networks:
      - uisi-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: uisi-api
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://${DB_USER}:${DB_PASSWORD}@mysql:3306/uisi_scheduling
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      WORKER_URL: http://worker:4000
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - uisi-network
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    container_name: uisi-worker
    environment:
      DATABASE_URL: mysql://${DB_USER}:${DB_PASSWORD}@mysql:3306/uisi_scheduling
      API_URL: http://api:3000
      WEBSOCKET_URL: ws://api:3000
    ports:
      - "4000:4000"
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - uisi-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'        # Limit CPU untuk SA
          memory: 2G         # Limit memory
        reservations:
          cpus: '0.5'
          memory: 1G

  redis:
    image: redis:7-alpine
    container_name: uisi-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - uisi-network

networks:
  uisi-network:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
```

### 10.2 Nginx Configuration

```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/rss+xml application/atom+xml image/svg+xml;

    upstream api {
        server api:3000;
    }

    upstream worker {
        server worker:4000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name scheduling.uisi.ac.id;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name scheduling.uisi.ac.id;
        
        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Frontend static files
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # API proxy
        location /api {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeout for long optimization requests
            proxy_connect_timeout 600s;
            proxy_send_timeout 600s;
            proxy_read_timeout 600s;
        }
        
        # WebSocket proxy
        location /socket.io {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket specific timeouts
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }
        
        # Worker API (internal only)
        location /worker {
            allow 172.16.0.0/12;
            deny all;
            proxy_pass http://worker;
        }
    }
}
```

### 10.3 Environment Variables

```bash
# .env.example

# Database
DB_ROOT_PASSWORD=your_secure_root_password
DB_USER=uisi_user
DB_PASSWORD=your_secure_password
DATABASE_URL=mysql://uisi_user:password@localhost:3306/uisi_scheduling

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

# API
API_PORT=3000
API_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-key

# Worker
WORKER_PORT=4000
WORKER_URL=http://localhost:4000
WEBSOCKET_URL=ws://localhost:3000

# Frontend
WEB_PORT=3001
VITE_API_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379

# Optimization Worker Limits
WORKER_CPU_LIMIT=1.0
WORKER_MEMORY_LIMIT=2G

# Feature Flags
ENABLE_REGISTRATION=false
ENABLE_OAUTH=false
```

---

## 11. Development Workflow

### 11.1 Getting Started

```bash
# 1. Clone repository
git clone https://github.com/uisi/sijaku.git
cd sijaku

# 2. Install dependencies
bun install

# 3. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start database
docker-compose up -d mysql redis

# 5. Run database migrations
bun run db:migrate

# 6. Seed initial data (optional)
bun run db:seed

# 7. Start development servers
bun run dev
```

### 11.2 Development Commands

```bash
# Run all services in development mode
bun run dev

# Run specific service
bun run dev --filter=@uisi/api
bun run dev --filter=@uisi/web
bun run dev --filter=@uisi/worker

# Build all packages
bun run build

# Run tests
bun run test

# Database operations
bun run db:generate   # Generate Prisma client
bun run db:migrate    # Run migrations
bun run db:studio     # Open Prisma Studio

# Docker operations
bun run docker:up     # Start all services
bun run docker:down   # Stop all services
bun run docker:build  # Rebuild containers

# Clean everything
bun run clean
```

### 11.3 Git Workflow

```
main
 ├── develop
 │   ├── feature/KF-03-lecturer-crud
 │   ├── feature/KF-10-optimization-module
 │   └── feature/KF-12-realtime-monitor
 │
 └── hotfix/constraint-checking
```

**Branch Naming:**
- `feature/KF-{number}-{description}` - New features
- `bugfix/{description}` - Bug fixes
- `hotfix/{description}` - Critical fixes
- `refactor/{description}` - Code refactoring

**Commit Convention:**
```
feat(KF-03): add lecturer CRUD endpoints
fix(KF-09): resolve room conflict detection
docs: update API documentation
refactor: optimize database queries
test(KF-10): add optimization algorithm tests
```

---

## 12. Quality Assurance

### 12.1 Testing Strategy

```
Test Pyramid:
                    ┌─────────┐
                    │   E2E   │  (5%)  - Critical paths
                    │ (Cypress)│
                   ┌┴─────────┴┐
                   │ Integration│ (15%) - API + Worker
                   │   (Jest)   │
                  ┌┴────────────┴┐
                  │    Unit       │ (80%) - Business logic
                  │  (Jest/Vitest)│
                  └───────────────┘
```

**Test Coverage Targets:**
- API: >80% coverage
- Worker: >90% coverage (algorithm critical)
- Frontend: >70% coverage

### 12.2 Code Quality Tools

```json
// Quality stack
{
  "linting": {
    "api": "ESLint + @nestjs/eslint-plugin",
    "web": "ESLint + @tanstack/eslint-plugin",
    "worker": "Biome (faster for Bun)"
  },
  "formatting": {
    "all": "Prettier"
  },
  "typeChecking": {
    "all": "TypeScript strict mode"
  },
  "preCommit": {
    "tool": "Husky + lint-staged",
    "hooks": ["lint", "typecheck", "test:staged"]
  }
}
```

### 12.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response** | <200ms (p95) | KNF-01 |
| **Page Load** | <2s (First Contentful Paint) | KNF-01 |
| **Optimization Progress** | <1s latency | KF-12 |
| **SA Convergence** | <5 menit (100 MK) | KNF-07 |
| **Database Query** | <50ms (p95) | KNF-07 |

---

## 13. Security Considerations

### 13.1 Authentication & Authorization

```typescript
// Better Auth configuration
export const authConfig = {
  // Session management
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Update every 24h
  },
  
  // Password policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireNumbers: true,
    requireSpecialChars: true,
    requireUppercase: true,
  },
  
  // Rate limiting
  rateLimit: {
    window: 60 * 1000, // 1 minute
    max: 5,            // 5 attempts
  },
  
  // Role-based access
  roles: ['ADMIN', 'SUPER_ADMIN'],
};
```

### 13.2 Data Protection

```typescript
// Sensitive data handling
class DataProtection {
  // Encrypt sensitive fields
  static encryptPII(data: string): string {
    return crypto.aes256Encrypt(data, process.env.ENCRYPTION_KEY);
  }
  
  // Mask data for logs
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }
  
  // Sanitize exports
  static sanitizeExport(data: any[]): any[] {
    return data.map(item => ({
      ...item,
      createdBy: undefined,
      updatedBy: undefined,
    }));
  }
}
```

### 13.3 Input Validation

```typescript
// Validation decorators (NestJS)
export class CreateLecturerDto {
  @IsString()
  @Length(2, 20)
  @Matches(/^[A-Z0-9]+$/)
  code: string;
  
  @IsString()
  @Length(3, 255)
  name: string;
  
  @IsUUID()
  prodiId: string;
  
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  transitTime?: number;
  
  @IsInt()
  @Min(1)
  @Max(11)
  @IsOptional()
  maxDailyPeriods?: number;
}
```

---

## 14. Monitoring & Logging

### 14.1 Application Monitoring

```typescript
// Logging configuration
export const loggerConfig = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: 'json',
  transports: [
    'console',
    'file:logs/app.log',
    'file:logs/error.log',
  ],
};

// Metrics collection
export const metrics = {
  // Performance
  httpRequestDuration: new Histogram('http_request_duration_ms'),
  dbQueryDuration: new Histogram('db_query_duration_ms'),
  
  // Business
  optimizationCount: new Counter('optimization_total'),
  optimizationDuration: new Histogram('optimization_duration_seconds'),
  constraintViolations: new Counter('constraint_violations_total'),
  
  // System
  cpuUsage: new Gauge('cpu_usage_percent'),
  memoryUsage: new Gauge('memory_usage_bytes'),
};
```

### 14.2 Health Checks

```typescript
// Health check endpoints
@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        worker: await this.checkWorker(),
        diskSpace: await this.checkDiskSpace(),
      },
    };
  }
}
```

---

## 15. Appendix

### 15.1 Glossary

| Term | Definition |
|------|-----------|
| **SA** | Simulated Annealing - Algoritma optimasi metaheuristik |
| **TS** | Tabu Search - Algoritma optimasi metaheuristik dengan memory |
| **HC** | Hard Constraint - Constraint yang tidak boleh dilanggar |
| **SC** | Soft Constraint - Constraint yang dihindari tapi bisa dilanggar |
| **MK** | Mata Kuliah - Course/Subject |
| **SKS** | Satuan Kredit Semester - Credit hours |
| **Slot** | Unit waktu (50 menit) untuk penjadwalan |
| **Fitness** | Nilai kualitas solusi (semakin kecil semakin baik) |

### 15.2 References

1. **TanStack Start**: https://tanstack.com/start
2. **Better Auth**: https://better-auth.com
3. **Prisma**: https://prisma.io
4. **NestJS**: https://nestjs.com
5. **shadcn/ui**: https://ui.shadcn.com
6. **Simulated Annealing**: Kirkpatrick, S., et al. (1983)
7. **Tabu Search**: Glover, F. (1986)

### 15.3 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial PRD |
| 1.1.0 | 2024-01-20 | Added Hybrid Algorithm (SA+TS) |
| 1.2.0 | 2024-01-25 | Updated Database Schema with Better Auth |

---

## 16. Kesimpulan

PRD ini mendokumentasikan sistem penjadwalan kuliah UISI dengan spesifikasi lengkap:

### ✅ **Fitur Utama:**
- **20 Kebutuhan Fungsional** (KF-01 sampai KF-20)
- **10 Kebutuhan Non-Fungsional** (KNF-01 sampai KNF-10)
- **6 Hard Constraints** + **5 Soft Constraints**
- **Algoritma Hybrid SA+TS** untuk optimasi
- **Real-time monitoring** dengan WebSocket
- **Drag-drop manual editing**

### ✅ **Arsitektur Modern:**
- **Monorepo Turborepo** dengan Bun workspaces
- **API + Worker terpisah** untuk resource isolation
- **Better Auth** untuk autentikasi lengkap
- **Prisma + MySQL** untuk database type-safe
- **TanStack Start + shadcn/ui** untuk frontend

### ✅ **Database Lengkap:**
- **20 Tabel** (4 Better Auth + 16 Custom)
- **Audit trail** (createdBy/updatedBy)
- **Preferensi dosen** (Research Day, Preferred Time)
- **Optimization tracking** per iterasi

### ✅ **Deployment Ready:**
- **Docker Compose** untuk single VPS
- **Nginx reverse proxy** dengan SSL
- **Resource limits** untuk worker CPU/memory
- **Health checks** dan monitoring

---

**Document Version**: 1.2.0  
**Last Updated**: 2024-01-25  
**Status**: Ready for Development
