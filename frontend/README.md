# Online Course Management Platform - Frontend

A Next.js 14 frontend application with shadcn/ui components for managing online courses with role-based dashboards.

## Features

### 🔐 Authentication
- **Login Page**: Role-based login (Student, Instructor, System Admin, Data Analyst)
- **Registration**: Create accounts for Students and Instructors
- Email validation and password requirements (minimum 8 characters)

### 👥 User Roles & Dashboards

#### 1. **System Admin**
- Add/remove partner universities
- Add/remove books from library
- Create/edit/delete courses with prerequisites
- Circular dependency checking for course prerequisites
- Delete users, books, and courses

#### 2. **Student**
- Search and enroll in courses (with prerequisite validation)
- View enrolled courses and scores
- Edit profile (except email)
- View assignment, quiz, and attendance scores

#### 3. **Instructor**
- View teaching courses
- Add course content (topics, subtopics, notes, videos)
- Evaluate students (assignments, quizzes, attendance)
- Change course textbooks
- Edit profile (except email)

#### 4. **Data Analyst**
- View comprehensive statistics with filters:
  - Course enrollment statistics
  - Enrollment by difficulty level
  - Enrollment by course type
  - University statistics
  - Instructor statistics
  - Student performance statistics
- Apply multiple filters (university, instructor, student count ranges)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend API**: FastAPI (http://localhost:8000)


## Getting Started

### Prerequisites
- Node.js 18.19.1 or higher (20.9.0+ recommended)
- npm 9.2.0 or higher
- Backend server running on http://localhost:8000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home page (Login/Register options)
│   │   ├── login/page.tsx        # Login page with role selection
│   │   ├── register/page.tsx     # Registration for Students/Instructors
│   │   ├── admin/page.tsx        # System Admin dashboard
│   │   ├── student/page.tsx      # Student dashboard
│   │   ├── instructor/page.tsx   # Instructor dashboard
│   │   └── analyst/page.tsx      # Data Analyst dashboard
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   └── lib/
│       ├── api.ts                # API utility functions
│       └── utils.ts              # Helper functions
├── .env.local                    # Environment variables
└── package.json
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Backend Requirements

Ensure your FastAPI backend is running with these endpoints:

- POST `/auth/login`
- POST `/auth/register/student`
- POST `/auth/register/instructor`
- GET/POST/PUT/DELETE `/admin/*`
- GET/POST/PUT `/student/*`
- GET/POST/PUT `/instructor/*`
- GET `/analyst/statistics/*`

