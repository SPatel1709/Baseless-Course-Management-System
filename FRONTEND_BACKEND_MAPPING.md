# Frontend-Backend Integration Map

This document provides a complete mapping of how the frontend connects to the backend in the Baseless Course Management System.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│                     http://localhost:3000                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages (src/app/*)                                               │
│  ├── login/page.tsx                                              │
│  ├── register/page.tsx                                           │
│  ├── admin/page.tsx                                              │
│  ├── student/page.tsx                                            │
│  ├── instructor/page.tsx                                         │
│  └── analyst/page.tsx                                            │
│                                                                   │
│  API Client (src/lib/api.ts)                                     │
│  └── apiRequest() wrapper + role-based API objects              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP Requests (fetch API)
                            │ JSON format
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│                     http://localhost:8000                        │
├─────────────────────────────────────────────────────────────────┤
│  Main App (app/main.py)                                          │
│  ├── CORS: allows localhost:3000, localhost:3001                │
│  └── Routers:                                                    │
│      ├── /auth → routers/auth.py                                │
│      ├── /admin → routers/admin.py                              │
│      ├── /student → routers/student.py                          │
│      ├── /instructor → routers/instructor.py                    │
│      └── /analyst → routers/analyst.py                          │
│                                                                   │
│  Database (database.py)                                          │
│  └── PostgreSQL connection pool                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Login & Registration Flow

### Frontend: `src/app/login/page.tsx`

**Purpose**: User authentication for all roles (Student, Instructor, Admin, Data Analyst)

**Backend Endpoints Used**:
- `POST /auth/login`
  - Request: `{ email, password, role }`
  - Response: `{ message, email, role, user_id, name }`
  - Validates credentials and returns user info
  - Stores response in `localStorage`
  - Redirects to role-specific dashboard

### Frontend: `src/app/register/page.tsx`

**Purpose**: New user registration (Students & Instructors only)

**Backend Endpoints Used**:
- `POST /auth/register/student`
  - Request: `{ email, password, name, dob, country, skill_level }`
  - Creates user in `Users` table + `Student` table
  
- `POST /auth/register/instructor`
  - Request: `{ email, password, name, expertise_areas[] }`
  - Creates user in `Users` table + `Instructor` table + `Instructor_Expertise` table

---

## 2. Admin Dashboard

### Frontend: `src/app/admin/page.tsx`

**Purpose**: System administration - manage universities, books, courses, users, and analysts

**Backend Endpoints Used**:

#### University Management
- `POST /admin/university`
  - Request: `{ name, country }`
  - Adds new partner university

- `GET /admin/universities`
  - Response: Array of `{ uni_id, name, country }`
  - Lists all universities

#### Book Management
- `POST /admin/book`
  - Request: `{ name, isbn, authors[] }`
  - Adds book with authors to database

- `GET /admin/books`
  - Response: Array of `{ book_id, name, isbn, authors[] }`
  - Lists all books with authors

- `DELETE /admin/book/{book_id}`
  - Removes book (fails if used by courses)

#### Course Management
- `POST /admin/course`
  - Request: `{ name, price, duration, course_type, difficulty_level, notes_url, video_url, book_id, uni_id, instructor_id, prerequisite_course_ids[], topic_names[] }`
  - Creates course with topics and prerequisites
  - Validates circular dependencies

- `GET /admin/courses`
  - Response: Array of courses with full details
  - Lists all courses

- `PUT /admin/course/{course_id}`
  - Updates course details

- `DELETE /admin/course/{course_id}?force={bool}&replace_with={course_id}`
  - Deletes course
  - Checks for dependent courses (prerequisites)
  - Can force delete or replace prerequisites

#### User Management
- `DELETE /admin/user/{email}`
  - Removes user from system

#### Analyst Management
- `POST /admin/analyst`
  - Request: `{ email, password, name }`
  - Creates Data Analyst account

#### Helper Endpoints
- `GET /admin/instructors`
  - Response: Array of all instructors
  
- `GET /admin/topics`
  - Response: Array of all topics

---

## 3. Student Dashboard

### Frontend: `src/app/student/page.tsx`

**Purpose**: Course search, enrollment, progress tracking, profile management

**Backend Endpoints Used**:

#### Profile Management
- `GET /student/profile/{email}`
  - Response: `{ student_id, name, email, dob, country, skill_level }`

- `PUT /student/profile/{email}`
  - Request: `{ name?, dob?, country?, skill_level? }`
  - Updates student profile

#### Course Discovery & Enrollment
- `POST /student/search-courses`
  - Request: `{ name?, course_type?, difficulty_level?, min_price?, max_price?, university_name?, topic_name? }`
  - Response: Array of matching courses with full details
  - Supports filtering by multiple criteria

- `POST /student/enroll?email={email}`
  - Request: `{ course_id }`
  - Enrolls student in course
  - Validates prerequisites automatically

#### My Courses
- `GET /student/my-courses/{email}`
  - Response: Array of enrolled courses with status, evaluation score, enrollment date
  - Shows: Pending, In-Progress, Completed courses

---

## 4. Instructor Dashboard

### Frontend: `src/app/instructor/page.tsx`

**Purpose**: Course management, content updates, student evaluation, book management

**Backend Endpoints Used**:

#### Profile Management
- `GET /instructor/profile/{email}`
  - Response: `{ instructor_id, name, email, expertise_areas[] }`

- `PUT /instructor/profile/{email}`
  - Request: `{ name?, expertise_areas[]? }`
  - Updates instructor profile

- `POST /instructor/profile/{email}/expertise/add?area={area}`
  - Adds single expertise area

- `DELETE /instructor/profile/{email}/expertise/{area}`
  - Removes expertise area

#### Course Management
- `GET /instructor/my-courses/{email}`
  - Response: Array of courses taught by instructor
  - Includes: course details, topics, student count, book info

- `PUT /instructor/course/content?email={email}`
  - Request: `{ course_id, notes_url?, video_url?, topic_names[]? }`
  - Updates course content (notes, videos, topics)
  - Only for courses taught by this instructor

- `PUT /instructor/course/book?email={email}`
  - Request: `{ course_id, book_id }`
  - Changes course textbook

#### Student Management
- `GET /instructor/course/{course_id}/students?email={email}`
  - Response: Array of students enrolled in course
  - Includes: student details, status, evaluation score

- `PUT /instructor/evaluate?email={email}`
  - Request: `{ course_id, student_id, evaluation_score, status }`
  - Evaluates student performance
  - Updates status: Pending → In-Progress → Completed

#### Book Management
- `POST /instructor/book`
  - Request: `{ name, isbn, authors[] }`
  - Instructors can add books to the system

- `GET /instructor/books`
  - Response: Array of all available books

#### Helper Endpoints
- `GET /instructor/topics`
  - Response: Array of all topics

---

## 5. Analyst Dashboard

### Frontend: `src/app/analyst/page.tsx`

**Purpose**: Data analytics, statistics, and reporting across the platform

**Backend Endpoints Used**:

#### Course Statistics
- `POST /analyst/statistics/courses`
  - Request: `{ course_ids[]?, difficulty_level?, course_type?, university_id?, instructor_id?, min_students?, max_students?, min_avg_score?, max_avg_score? }`
  - Response: Detailed course statistics with filters
  - Includes: enrollment counts, completion rates, average scores

- `GET /analyst/statistics/courses-list`
  - Response: List of all courses (for dropdowns/filters)

- `GET /analyst/statistics/course/{course_id}/students`
  - Response: Student enrollment details for specific course

#### Enrollment Trends
- `GET /analyst/statistics/enrollment-by-difficulty?university_id={id}&instructor_id={id}`
  - Response: Enrollment grouped by difficulty level
  - Shows: course count, total enrollments, avg score, completion stats

- `GET /analyst/statistics/enrollment-by-type?university_id={id}&instructor_id={id}`
  - Response: Enrollment grouped by course type
  - Shows: course count, enrollments, avg score, avg price, avg duration

#### University Analytics
- `GET /analyst/statistics/universities`
  - Response: Statistics for all universities
  - Metrics: course count, total enrollments, avg score, avg price

#### Instructor Analytics
- `GET /analyst/statistics/instructors`
  - Response: Statistics for all instructors
  - Metrics: courses taught, total students, avg student score, expertise areas

#### Student Analytics
- `GET /analyst/statistics/students`
  - Response: Student statistics
  - Metrics: enrollment patterns, skill levels, completion rates

#### Topic Analytics
- `GET /analyst/statistics/topics`
  - Response: Topic popularity and performance
  - Metrics: courses per topic, enrollments, avg scores

#### Completion Rates
- `GET /analyst/statistics/completion-rates`
  - Response: Overall platform completion statistics
  - Grouped by various dimensions

#### Helper Endpoints
- `GET /analyst/universities`
  - Response: List of all universities (for filters)

- `GET /analyst/instructors`
  - Response: List of all instructors (for filters)

---

## API Client Architecture (`src/lib/api.ts`)

### Configuration
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

### Request Wrapper
```typescript
async function apiRequest(endpoint: string, options: RequestInit = {})
```
- Automatically adds `Content-Type: application/json`
- Handles errors and throws with detail messages
- Parses JSON responses

### Organized API Objects
- **`authAPI`**: Login, registration
- **`adminAPI`**: University, book, course, user, analyst management
- **`studentAPI`**: Profile, course search, enrollment, my courses
- **`instructorAPI`**: Profile, course management, student evaluation, books
- **`analystAPI`**: All statistics and analytics endpoints

---

## Data Flow Examples

### Example 1: Student Enrolling in a Course

```
1. Frontend (student/page.tsx)
   └─> User clicks "Enroll" button
   
2. API Call (lib/api.ts)
   └─> studentAPI.enrollInCourse(email, course_id)
   └─> POST /student/enroll?email={email}
   └─> Body: { course_id }
   
3. Backend (routers/student.py)
   └─> Validates student exists
   └─> Validates course exists
   └─> Checks if already enrolled
   └─> Validates all prerequisites completed
   └─> Inserts into Enrolled_in table
   └─> Returns success message
   
4. Frontend Updates
   └─> Shows success notification
   └─> Refreshes course list
   └─> Updates UI state
```

### Example 2: Instructor Evaluating a Student

```
1. Frontend (instructor/page.tsx)
   └─> Instructor enters evaluation score and status
   
2. API Call (lib/api.ts)
   └─> instructorAPI.evaluateStudent(email, data)
   └─> PUT /instructor/evaluate?email={email}
   └─> Body: { course_id, student_id, evaluation_score, status }
   
3. Backend (routers/instructor.py)
   └─> Validates instructor teaches this course
   └─> Validates student enrolled in course
   └─> Updates Enrolled_in table
   └─> Returns success message
   
4. Frontend Updates
   └─> Shows success notification
   └─> Updates student list with new score/status
```

### Example 3: Admin Creating a Course

```
1. Frontend (admin/page.tsx)
   └─> Admin fills course form with all details
   └─> Selects prerequisites from multi-select
   
2. API Call (lib/api.ts)
   └─> adminAPI.createCourse(data)
   └─> POST /admin/course
   └─> Body: { name, price, duration, course_type, difficulty_level,
              notes_url, video_url, book_id, uni_id, instructor_id,
              prerequisite_course_ids[], topic_names[] }
   
3. Backend (routers/admin.py)
   └─> Validates university exists
   └─> Validates book exists
   └─> Validates instructor exists
   └─> Creates/validates topics
   └─> Checks circular dependency in prerequisites
   └─> Inserts into Course table
   └─> Inserts into Course_Topic table
   └─> Inserts into Course_Prerequisites table
   └─> Inserts into Teaches table
   └─> Returns success with course_id
   
4. Frontend Updates
   └─> Shows success notification
   └─> Refreshes course list
   └─> Resets form
```

### Example 4: Analyst Viewing Statistics

```
1. Frontend (analyst/page.tsx)
   └─> Analyst selects filters (difficulty, university, etc.)
   
2. API Call (lib/api.ts)
   └─> analystAPI.getCourseStatistics(filters)
   └─> POST /analyst/statistics/courses
   └─> Body: { difficulty_level?, university_id?, instructor_id?, 
              min_students?, max_students? }
   
3. Backend (routers/analyst.py)
   └─> Builds dynamic SQL query with filters
   └─> Joins: Course, Enrolled_in, University, Instructor, Topic
   └─> Aggregates: COUNT(students), AVG(score), completion counts
   └─> Returns array of course statistics
   
4. Frontend Updates
   └─> Renders tables/charts with statistics
   └─> Shows enrollment trends
   └─> Displays completion rates
```

---

## Authentication & Authorization

### Frontend (localStorage)
```typescript
// After successful login
localStorage.setItem('user', JSON.stringify({
  email: "user@example.com",
  role: "Student",
  user_id: 123,
  name: "John Doe"
}));

// On protected pages
const user = JSON.parse(localStorage.getItem('user'));
if (!user || user.role !== 'Student') {
  router.push('/login');
}
```

### Backend (Email-based)
- Most endpoints accept `email` as query parameter or in path
- Backend queries database to get `student_id` or `instructor_id`
- Validates user has permission for the action
- Example: Instructor can only evaluate students in their courses

---

## CORS Configuration

### Backend (`app/main.py`)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

This allows the Next.js frontend to make cross-origin requests to the FastAPI backend.

---

## Error Handling

### Frontend Pattern
```typescript
try {
  const response = await adminAPI.createCourse(data);
  showMessage('Success!');
} catch (err: any) {
  showMessage(err.message, true);  // Display error to user
}
```

### Backend Pattern
```python
try:
    # Database operation
    cursor.execute(query, params)
except HTTPException:
    raise  # Re-raise HTTP exceptions
except Exception as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Database error: {str(e)}"
    )
```

---

## Key Design Patterns

1. **Centralized API Client**: All HTTP calls go through `src/lib/api.ts`
2. **Role-Based Routing**: Each role has dedicated page and API namespace
3. **Consistent Error Handling**: Errors bubble up from backend → API client → page component
4. **State Management**: Uses React hooks (`useState`, `useEffect`) with localStorage for auth
5. **Form Validation**: Basic validation on frontend, comprehensive validation on backend
6. **Dynamic SQL**: Backend builds queries based on optional filter parameters
7. **Database Transactions**: Backend uses context manager for automatic commit/rollback

---

## Development URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **API Redoc**: http://localhost:8000/redoc

---

## Complete Endpoint Reference

| Frontend Page | HTTP Method | Backend Endpoint | Purpose |
|---------------|-------------|------------------|---------|
| **Login** | POST | `/auth/login` | Authenticate user |
| **Register** | POST | `/auth/register/student` | Create student account |
| **Register** | POST | `/auth/register/instructor` | Create instructor account |
| **Admin** | POST | `/admin/university` | Add university |
| **Admin** | GET | `/admin/universities` | List universities |
| **Admin** | POST | `/admin/book` | Add book |
| **Admin** | GET | `/admin/books` | List books |
| **Admin** | DELETE | `/admin/book/{id}` | Delete book |
| **Admin** | POST | `/admin/course` | Create course |
| **Admin** | GET | `/admin/courses` | List courses |
| **Admin** | PUT | `/admin/course/{id}` | Update course |
| **Admin** | DELETE | `/admin/course/{id}` | Delete course |
| **Admin** | DELETE | `/admin/user/{email}` | Delete user |
| **Admin** | POST | `/admin/analyst` | Create analyst account |
| **Admin** | GET | `/admin/instructors` | List instructors |
| **Admin** | GET | `/admin/topics` | List topics |
| **Student** | GET | `/student/profile/{email}` | Get profile |
| **Student** | PUT | `/student/profile/{email}` | Update profile |
| **Student** | POST | `/student/search-courses` | Search courses |
| **Student** | POST | `/student/enroll` | Enroll in course |
| **Student** | GET | `/student/my-courses/{email}` | My enrolled courses |
| **Instructor** | GET | `/instructor/profile/{email}` | Get profile |
| **Instructor** | PUT | `/instructor/profile/{email}` | Update profile |
| **Instructor** | POST | `/instructor/profile/{email}/expertise/add` | Add expertise |
| **Instructor** | DELETE | `/instructor/profile/{email}/expertise/{area}` | Remove expertise |
| **Instructor** | GET | `/instructor/my-courses/{email}` | Courses I teach |
| **Instructor** | PUT | `/instructor/course/content` | Update course content |
| **Instructor** | PUT | `/instructor/course/book` | Change course book |
| **Instructor** | GET | `/instructor/course/{id}/students` | Course students |
| **Instructor** | PUT | `/instructor/evaluate` | Evaluate student |
| **Instructor** | POST | `/instructor/book` | Add book |
| **Instructor** | GET | `/instructor/books` | List books |
| **Instructor** | GET | `/instructor/topics` | List topics |
| **Analyst** | POST | `/analyst/statistics/courses` | Course statistics |
| **Analyst** | GET | `/analyst/statistics/courses-list` | List courses |
| **Analyst** | GET | `/analyst/statistics/course/{id}/students` | Course students |
| **Analyst** | GET | `/analyst/statistics/enrollment-by-difficulty` | Enrollment by difficulty |
| **Analyst** | GET | `/analyst/statistics/enrollment-by-type` | Enrollment by type |
| **Analyst** | GET | `/analyst/statistics/universities` | University statistics |
| **Analyst** | GET | `/analyst/statistics/instructors` | Instructor statistics |
| **Analyst** | GET | `/analyst/statistics/students` | Student statistics |
| **Analyst** | GET | `/analyst/statistics/topics` | Topic statistics |
| **Analyst** | GET | `/analyst/statistics/completion-rates` | Completion rates |
| **Analyst** | GET | `/analyst/universities` | List universities |
| **Analyst** | GET | `/analyst/instructors` | List instructors |

---

## Summary

The frontend (Next.js) and backend (FastAPI) communicate via RESTful JSON APIs. The frontend uses a centralized API client (`src/lib/api.ts`) that provides type-safe wrappers around all backend endpoints. Each user role has a dedicated dashboard page that consumes relevant API endpoints. The backend uses FastAPI routers to organize endpoints by role, validates all inputs, and interacts with a PostgreSQL database. CORS is configured to allow the frontend to make cross-origin requests during development.
