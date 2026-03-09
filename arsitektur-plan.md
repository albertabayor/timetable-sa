# Arsitektur Sistem Informasi Penjadwalan UISI

## Overview
Sistem informasi penjadwalan untuk kampus UISI menggunakan algoritma Simulated Annealing, dibangun dengan arsitektur terpisah antara API dan worker untuk optimalisasi resource.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         TanStack Start + React + shadcn/ui          │    │
│  │                                                     │    │
│  │  - Dashboard Admin Akademik                         │    │
│  │  - Form Konfigurasi Penjadwalan                     │    │
│  │  - Real-time Progress Monitor (WebSocket)           │    │
│  │  - Hasil Jadwal Viewer                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       VPS Server                            │
├──────────────────┬──────────────────┬───────────────────────┤
│                  │                  │                       │
│  Nginx (Reverse  │   NestJS API     │   Timetabling Worker  │
│     Proxy)       │   (Port 3000)    │   (Bun, Port 4000)    │
│                  │                  │                       │
│  - SSL/TLS       │  - Auth (JWT)    │  - SA Algorithm       │
│  - Load Balance  │  - CRUD Master   │  - Process Scheduler  │
│  - Static Files  │  - Job Queue     │  - Progress Emitter   │
│                  │  - WebSocket     │  - Result Processor   │
│                  │  - Prisma ORM    │                       │
└──────────────────┴──────────────────┴───────────────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   MySQL Database  │
                    │  (Shared Schema)  │
                    └───────────────────┘
```

---

## Service Breakdown

### 1. Frontend (TanStack Start)
**Tech Stack:**
- TanStack Start (Full-stack React)
- shadcn/ui components
- TanStack Query (Data fetching)
- Socket.io-client (Real-time updates)

**Key Features:**
- Dashboard admin akademik
- Upload data master (Excel)
- Konfigurasi parameter SA
- Monitor progress real-time
- View dan export jadwal

### 2. NestJS API Service
**Tech Stack:**
- NestJS (Node.js)
- Prisma ORM
- Socket.io (WebSocket gateway)
- JWT Authentication
- Class Validator

**Responsibilities:**
- Authentication & Authorization
- CRUD master data (Dosen, Ruang, Kelas, dll)
- Job queue management
- WebSocket progress broadcasting
- API untuk frontend

### 3. Timetabling Worker
**Tech Stack:**
- Bun Runtime
- timetable-sa library
- Socket.io-client
- MySQL2 (direct query untuk update progress)

**Responsibilities:**
- Execute Simulated Annealing algorithm
- Report progress via WebSocket
- Save results to database
- Handle multiple job requests

---

## Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// Master Data
model Room {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  capacity  Int
  roomType  String   // TEORI, PRAKTIKUM, LAB
  exclusive Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  scheduleEntries ScheduleEntry[]
}

model Lecturer {
  id        String   @id @default(uuid())
  nidn      String   @unique
  name      String
  email     String?
  department String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  scheduleEntries ScheduleEntry[]
}

model Course {
  id          String @id @default(uuid())
  code        String @unique
  name        String
  credits     Int
  department  String
  semester    Int
  courseType  String // TEORI, PRAKTIKUM, RESPONSI
  students    Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  classRequirements ClassRequirement[]
}

model ClassRequirement {
  id          String   @id @default(uuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  lecturerId  String
  lecturer    Lecturer @relation(fields: [lecturerId], references: [id])
  students    Int
  classType   String   // TEORI, PRAKTIKUM
  duration    Int      // dalam slot (misal: 2 slot = 100 menit)
  preferredDays String? // JSON array ["Monday", "Tuesday"]
  preferredRooms String? // JSON array room IDs
  createdAt   DateTime @default(now())
  
  scheduleEntries ScheduleEntry[]
}

// Scheduling System
model ScheduleJob {
  id              String   @id @default(uuid())
  name            String
  description     String?
  status          JobStatus @default(PENDING)
  
  // Konfigurasi SA
  config          Json     // { initialTemp, coolingRate, maxIterations, ... }
  
  // Progress tracking
  progress        Float    @default(0)    // 0-100
  currentPhase    String?                 // "Phase 1", "Phase 2", dll
  currentIteration Int    @default(0)
  totalIterations Int
  
  // Results
  fitness         Float?
  hardViolations  Int?
  softViolations  Int?
  startedAt       DateTime?
  completedAt     DateTime?
  
  // Relations
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  logs            ScheduleLog[]
  result          ScheduleResult?
}

model ScheduleLog {
  id        String   @id @default(uuid())
  jobId     String
  job       ScheduleJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  level     String   // INFO, WARN, ERROR
  message   String
  metadata  Json?    // additional data
  timestamp DateTime @default(now())
}

model ScheduleResult {
  id        String   @id @default(uuid())
  jobId     String   @unique
  job       ScheduleJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  fitness   Float
  hardViolations Int
  softViolations Int
  executionTime Int    // dalam detik
  createdAt DateTime   @default(now())
  
  entries   ScheduleEntry[]
}

model ScheduleEntry {
  id          String   @id @default(uuid())
  resultId    String
  result      ScheduleResult @relation(fields: [resultId], references: [id], onDelete: Cascade)
  
  classReqId  String
  classReq    ClassRequirement @relation(fields: [classReqId], references: [id])
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id])
  
  day         String   // Monday, Tuesday, dll
  startSlot   Int      // 1-11 (slot per hari)
  duration    Int      // 1-4 slot
  
  createdAt   DateTime @default(now())
}

// Users & Auth
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // hashed
  name      String
  role      UserRole @default(ADMIN)
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum JobStatus {
  PENDING
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum UserRole {
  ADMIN
  SUPER_ADMIN
}
```

---

## API Flow & Communication

### 1. Trigger Penjadwalan

```
Frontend → NestJS API → Timetabling Worker
```

**Sequence:**
1. Admin klik "Generate Jadwal"
2. Frontend POST `/api/schedules` dengan konfigurasi
3. NestJS create `ScheduleJob` (status: PENDING)
4. NestJS HTTP POST ke Worker: `/worker/execute`
5. Worker response: `{ jobId, accepted: true }`
6. NestJS update status: QUEUED → RUNNING

### 2. Real-time Progress (WebSocket)

**Architecture:**
```
Timetabling Worker → Socket.io → NestJS Gateway → Frontend
```

**Events:**

**Worker → NestJS:**
```typescript
// Worker emits progress
socket.emit('job:progress', {
  jobId: 'uuid',
  progress: 45.5, // percentage
  phase: 'Phase 2',
  iteration: 9500,
  totalIterations: 20000,
  fitness: 26.52,
  hardViolations: 0,
  softViolations: 12
});
```

**NestJS Gateway → Frontend:**
```typescript
// NestJS broadcasts to room
@WebSocketGateway()
export class ScheduleGateway {
  @SubscribeMessage('join:job')
  handleJoin(client: Socket, jobId: string) {
    client.join(`job:${jobId}`);
  }
  
  // Forward progress from worker
  handleWorkerProgress(data: ProgressData) {
    this.server.to(`job:${data.jobId}`).emit('job:progress', data);
  }
}
```

### 3. Job Completion

```
Worker selesai → Save result → Emit completion → NestJS update DB
```

**Events:**
```typescript
// Worker completion
socket.emit('job:completed', {
  jobId: 'uuid',
  success: true,
  result: {
    fitness: 26.52,
    hardViolations: 0,
    softViolations: 12,
    executionTime: 285,
    schedule: [...] // array of entries
  }
});
```

---

## API Endpoints (NestJS)

### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
```

### Master Data
```
GET    /api/rooms
POST   /api/rooms
PUT    /api/rooms/:id
DELETE /api/rooms/:id

GET    /api/lecturers
POST   /api/lecturers
PUT    /api/lecturers/:id
DELETE /api/lecturers/:id

GET    /api/courses
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id

GET    /api/class-requirements
POST   /api/class-requirements
PUT    /api/class-requirements/:id
DELETE /api/class-requirements/:id
```

### Scheduling
```
GET    /api/schedules              // List all jobs
POST   /api/schedules              // Create new job
GET    /api/schedules/:id          // Get job detail
GET    /api/schedules/:id/logs     // Get job logs
GET    /api/schedules/:id/result   // Get final result
POST   /api/schedules/:id/cancel   // Cancel running job
DELETE /api/schedules/:id          // Delete job
```

### Data Import
```
POST   /api/import/rooms           // Upload Excel
POST   /api/import/lecturers       // Upload Excel
POST   /api/import/courses         // Upload Excel
POST   /api/import/class-requirements // Upload Excel
```

### Export
```
GET    /api/export/schedule/:id/pdf
GET    /api/export/schedule/:id/excel
```

---

## Worker API (Bun Service)

### Endpoints
```
POST   /worker/execute             // Start job execution
POST   /worker/cancel/:jobId       // Cancel specific job
GET    /worker/health              // Health check
GET    /worker/status              // Active jobs status
```

### Execute Job Request
```typescript
POST /worker/execute
{
  jobId: "uuid",
  config: {
    initialTemperature: 100000,
    minTemperature: 0.0000001,
    coolingRate: 0.9995,
    maxIterations: 20000,
    // ... other SA config
  },
  data: {
    rooms: [...],
    lecturers: [...],
    classes: [...]
  },
  webhookUrl: "http://nestjs:3000/webhook/job-progress"
}
```

---

## Project Structure

### Repository Structure
```
/uisi-scheduling-system
├── apps/
│   ├── web/                     # TanStack Start Frontend
│   │   ├── app/
│   │   ├── components/
│   │   └── package.json
│   │
│   ├── api/                     # NestJS API
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── rooms/
│   │   │   ├── lecturers/
│   │   │   ├── schedules/
│   │   │   └── websocket/
│   │   ├── prisma/
│   │   └── package.json
│   │
│   └── worker/                  # Bun Timetabling Worker
│       ├── src/
│       │   ├── main.ts
│       │   ├── scheduler/
│       │   └── websocket/
│       └── package.json
│
├── packages/
│   ├── shared-types/            # Shared TypeScript types
│   └── database/                # Prisma schema & client
│
├── docker-compose.yml
└── turbo.json                   # Monorepo config
```

---

## Deployment Strategy

### VPS Setup (Single Server)

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
      - web

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: uisi_scheduling
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: mysql://root:${DB_PASSWORD}@mysql:3306/uisi_scheduling
      JWT_SECRET: ${JWT_SECRET}
      WORKER_URL: http://worker:4000
    ports:
      - "3000:3000"
    depends_on:
      - mysql

  worker:
    build: ./apps/worker
    environment:
      DATABASE_URL: mysql://root:${DB_PASSWORD}@mysql:3306/uisi_scheduling
      API_URL: http://api:3000
    ports:
      - "4000:4000"
    # Resource limits untuk SA
    deploy:
      resources:
        limits:
          cpus: '1.0'      # Max 1 core
          memory: 2G       # Max 2GB RAM
    depends_on:
      - mysql

  web:
    build: ./apps/web
    environment:
      API_URL: http://api:3000
    ports:
      - "3001:3000"

volumes:
  mysql_data:
```

### Nginx Config
```nginx
# nginx.conf
upstream api {
    server api:3000;
}

upstream worker {
    server worker:4000;
}

upstream web {
    server web:3000;
}

server {
    listen 80;
    server_name scheduling.uisi.ac.id;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name scheduling.uisi.ac.id;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Frontend
    location / {
        proxy_pass http://web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API
    location /api {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Development Timeline (3-4 Bulan)

### Bulan 1: Foundation
- **Minggu 1-2:** Setup project structure, database schema, Prisma
- **Minggu 3-4:** Master data CRUD (Rooms, Lecturers, Courses)

### Bulan 2: Core Features
- **Minggu 1-2:** Integrasi timetable-sa library ke Bun Worker
- **Minggu 3-4:** Job queue system + WebSocket real-time progress

### Bulan 3: Integration & UI
- **Minggu 1-2:** Frontend dashboard + form konfigurasi
- **Minggu 3-4:** Import/Export Excel, hasil jadwal viewer

### Bulan 4: Polish & Deployment
- **Minggu 1-2:** Testing, bug fixes, optimization
- **Minggu 3-4:** Deployment, documentation, training

---

## Keuntungan Arsitektur Ini

1. **Resource Isolation**
   - SA algorithm tidak ganggu API responsiveness
   - Bisa scale worker independent dari API

2. **Real-time Experience**
   - Admin bisa monitor progress secara live
   - Bisa cancel job kapan saja

3. **Tech Stack Optimal**
   - Bun untuk SA (performance)
   - Node.js untuk API (ecosystem)
   - MySQL + Prisma (type-safe)

4. **Maintainability**
   - Clear separation of concerns
   - Shared types antar services
   - Docker untuk consistency

5. **Scalability**
   - Bisa deploy multiple workers di kemudian hari
   - Queue-based processing
   - Stateless API design

---

## Monorepo Architecture

Sistem ini menggunakan **Turborepo dengan Bun Workspaces** untuk mengelola multiple services dalam satu repository.

### Kenapa Turborepo + Bun?

#### Perbandingan: Bun Workspaces vs Turborepo

| Fitur | Bun Workspaces (Native) | Turborepo + Bun |
|-------|------------------------|-----------------|
| Package Management | ✅ Fast install & linking | ✅ Uses Bun for install |
| Task Orchestration | ❌ Manual | ✅ Intelligent pipeline |
| Build Caching | ❌ None | ✅ Automatic caching |
| Parallel Execution | ❌ Sequential | ✅ Optimized concurrency |
| Remote Caching | ❌ None | ✅ Share cache via Vercel |
| Task Dependencies | ❌ Manual | ✅ Dependency graph |

**Kesimpulan:** Untuk project dengan 3+ services + shared packages + mixed runtimes, **Turborepo + Bun** adalah pilihan optimal.

### Struktur Monorepo

```
uisi-scheduling-system/           # Root
├── package.json                  # Bun workspaces + turbo config
├── turbo.json                    # Task pipeline
├── bun.lockb                     # Bun lockfile
├── .gitignore
├── README.md
│
├── apps/                         # Applications
│   ├── web/                      # TanStack Start Frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── package.json          # "name": "@uisi/web"
│   │   └── tsconfig.json
│   │
│   ├── api/                      # NestJS API
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── package.json          # "name": "@uisi/api"
│   │   └── tsconfig.json
│   │
│   └── worker/                   # Bun Timetabling Worker
│       ├── src/
│       ├── package.json          # "name": "@uisi/worker"
│       └── tsconfig.json
│
├── packages/                     # Shared libraries
│   ├── shared-types/             # TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── models/
│   │   │   └── api/
│   │   ├── package.json          # "name": "@uisi/types"
│   │   └── tsconfig.json
│   │
│   └── database/                 # Prisma schema & client
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       ├── package.json          # "name": "@uisi/database"
│       └── tsconfig.json
│
└── docker-compose.yml            # Local development
```

### Root Configuration

#### `package.json` (Root)
```json
{
  "name": "uisi-scheduling-system",
  "private": true,
  "packageManager": "bun@1.1.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:studio": "turbo run db:studio",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

#### `turbo.json` (Pipeline Configuration)
```json
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
      "outputs": ["prisma/client/**", "node_modules/.prisma/client/**"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Workspace Interdependencies

#### Shared Packages
```json
// packages/shared-types/package.json
{
  "name": "@uisi/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}

// packages/database/package.json
{
  "name": "@uisi/database",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc && prisma generate",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0"
  }
}
```

#### Apps using Shared Packages
```json
// apps/api/package.json
{
  "name": "@uisi/api",
  "dependencies": {
    "@uisi/types": "workspace:*",
    "@uisi/database": "workspace:*",
    "@nestjs/common": "^10.0.0",
    // ... other deps
  }
}

// apps/worker/package.json
{
  "name": "@uisi/worker",
  "dependencies": {
    "@uisi/types": "workspace:*",
    "@uisi/database": "workspace:*",
    "timetable-sa": "file:../../timetable-sa"
  }
}
```

### Commands Usage

#### Development
```bash
# Install dependencies for all workspaces
bun install

# Run all dev servers concurrently
bun run dev

# Run specific app
bun run dev --filter=@uisi/api

# Run database and API only
bun run dev --filter=@uisi/database --filter=@uisi/api
```

#### Building
```bash
# Build all packages and apps (with caching)
bun run build

# Build specific package
bun run build --filter=@uisi/types

# Force rebuild (ignore cache)
bun run build --force
```

#### Database Operations
```bash
# Generate Prisma client
bun run db:generate

# Run migrations
bun run db:migrate

# Open Prisma Studio
bun run db:studio
```

### Task Pipeline Flow

```
build (all apps)
├── @uisi/types (build first)
├── @uisi/database (depends on types)
│   └── db:generate (prisma client)
├── @uisi/api (depends on database)
│   └── build
├── @uisi/worker (depends on database)
│   └── build
└── @uisi/web (depends on types)
    └── build
```

### Keuntungan untuk Project Ini

1. **Mixed Runtimes Management**
   - NestJS (Node.js) dan Bun Worker berjalan optimal
   - Turborepo handle task dependencies otomatis
   - Caching prevents redundant builds

2. **Shared Code Management**
   - Types, database schema di satu tempat
   - Changes propagate ke semua apps
   - Type-safe communication antar services

3. **Development Experience**
   - `bun run dev` jalan semua services
   - Hot reload untuk semua apps
   - Consistent tooling

4. **Deployment Optimization**
   - `turbo prune` untuk minimal Docker context
   - Independent scaling per service
   - Cache sharing di CI/CD

5. **CI/CD Integration**
   ```yaml
   # .github/workflows/ci.yml
   - name: Build
     run: bun run build
     
   - name: Test
     run: bun run test
     
   - name: Deploy
     run: |
       turbo prune --docker
       docker build -t api ./apps/api
       docker build -t worker ./apps/worker
   ```

### Resources untuk Belajar

#### Bun Workspaces
- [Bun Workspaces Guide](https://bun.sh/docs/install/workspaces)
- [Workspace Configuration](https://bun.sh/docs/pm/workspaces)

#### Turborepo
- [Getting Started](https://turbo.build/repo/docs)
- [Core Concepts](https://turbo.build/repo/docs/core-concepts)
- [Bun Integration](https://turbo.build/repo/docs/getting-started/installation)

#### Monorepo Patterns
- [Turborepo Handbook](https://turbo.build/repo/docs/handbook)
- [Package Dependencies](https://turbo.build/repo/docs/handbook/workspaces)

---

## Catatan Penting

### CPU Throttling untuk Worker
Gunakan Docker resource limits:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # Limit ke 1 core
      memory: 2G
```

Atau pakai cgroups langsung di VPS tanpa Docker.

### Database Connection
- Worker butuh connection pool terpisah dari API
- Monitor long-running queries
- Setup connection timeout

### Error Handling
- Implement retry mechanism untuk failed jobs
- Log semua errors ke database
- Alert system untuk critical failures

### Security
- JWT authentication untuk semua endpoints
- Rate limiting untuk job creation
- Validate all inputs (especially Excel uploads)
- Sanitize file uploads
