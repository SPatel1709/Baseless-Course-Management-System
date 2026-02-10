# Online Course Management Platform - Backend

A comprehensive FastAPI-based backend for managing online courses, instructors, students, and analytics.

## Features

### 4 User Roles:
1. **System Administrator**: Manage universities, books, courses, and users
2. **Student**: Browse courses, enroll (with prerequisite checking), view progress
3. **Instructor**: Manage course content, add books, evaluate students
4. **Data Analyst**: View comprehensive statistics and analytics

## Setup Instructions

### 1. Database Setup

First, create the PostgreSQL database and apply the schema:

```bash
# Connect to PostgreSQL
psql -U 23CS10051 -d postgres

# Create database
CREATE DATABASE "Premidsem";

# Connect to the database
\c Premidsem

# Apply schema (run from project root)
\i database/schema.sql
```

### 2. Python Environment Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Linux/Mac
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Database Connection

Set your database password as an environment variable:

```bash
export DB_PASSWORD="your_password_here"
```

Or edit `app/database.py` to hardcode your credentials (not recommended for production).

### 4. Run the Application

```bash
# From the backend directory, run with Python
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

### 5. API Documentation

FastAPI provides automatic interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints Overview

### Authentication (`/auth`)
- `POST /auth/login` - Login for all user types
- `POST /auth/register/student` - Register new student
- `POST /auth/register/instructor` - Register new instructor

### System Admin (`/admin`)
- Universities: Add, remove, list
- Books: Add, remove, list
- Courses: Create, update, delete
- Users: Delete users
- Instructors: Add to courses, list all

### Student (`/student`)
- `GET /student/profile/{email}` - Get profile
- `PUT /student/profile/{email}` - Update profile
- `POST /student/search-courses` - Search courses
- `POST /student/enroll` - Enroll in course (checks prerequisites)
- `GET /student/my-courses/{email}` - View enrolled courses with scores

### Instructor (`/instructor`)
- `GET /instructor/profile/{email}` - Get profile
- `PUT /instructor/profile/{email}` - Update profile
- `GET /instructor/my-courses/{email}` - View teaching courses
- `PUT /instructor/course/content` - Add content to course
- `POST /instructor/book` - Add book to database
- `PUT /instructor/course/book` - Change course book
- `GET /instructor/course/{course_id}/students` - View course students
- `PUT /instructor/evaluate` - Evaluate student

### Data Analyst (`/analyst`)
- `POST /analyst/statistics/courses` - Comprehensive course statistics with filters
- `GET /analyst/statistics/enrollment-by-difficulty` - Stats by difficulty
- `GET /analyst/statistics/enrollment-by-type` - Stats by course type
- `GET /analyst/statistics/universities` - University performance
- `GET /analyst/statistics/instructors` - Instructor statistics
- `GET /analyst/statistics/students` - Student demographics and performance
- `GET /analyst/statistics/topics` - Popular topics
- `GET /analyst/statistics/completion-rates` - Course completion rates

## Key Features Implemented

### Security
- Password hashing using bcrypt
- Email validation
- Input validation with Pydantic models
- SQL injection prevention (parameterized queries)

### Business Logic
- **Prerequisite checking**: Students can only enroll if prerequisites are completed
- **Circular dependency detection**: Prevents circular course prerequisites
- **Case-insensitive topic matching**: Topics are matched case-insensitively
- **Cascade deletion**: Proper foreign key handling
- **Data validation**: Email length, password length (min 8 chars), field constraints

### Database Operations
- Connection pooling for efficient database access
- Transaction management with rollback on errors
- Context managers for safe resource handling

## File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database connection and utilities
│   ├── models.py            # Pydantic models for request/response
│   └── routers/
│       ├── __init__.py
│       ├── auth.py          # Authentication and registration
│       ├── admin.py         # System administrator operations
│       ├── student.py       # Student operations
│       ├── instructor.py    # Instructor operations
│       └── analyst.py       # Data analyst statistics
├── requirements.txt         # Python dependencies
├── README.md
└── .gitignore

database/
└── schema.sql              # PostgreSQL database schema
```

## Next Steps: Frontend Development

The backend is designed to work with a Next.js frontend with the following structure:

### Pages:
1. **Landing Page** (`/`)
   - Login button → Select role → Enter credentials
   - Create Account button → Select Student/Instructor → Registration form

2. **Role-specific Dashboards**
   - Admin Dashboard: Manage all entities
   - Student Dashboard: Browse and enroll in courses
   - Instructor Dashboard: Manage courses and evaluate students
   - Analyst Dashboard: View statistics with filters

### Frontend Integration:
- Use `fetch` or `axios` to call API endpoints
- Store user session (email, role) in context/state
- Implement role-based routing
- Create forms with validation matching backend Pydantic models

## Development Notes

- Default CORS allows `localhost:3000` and `localhost:3001` (Next.js ports)
- Database password can be set via `DB_PASSWORD` environment variable
- All endpoints return JSON responses
- Error responses include descriptive messages
- Use the Swagger UI at `/docs` for testing endpoints

## Testing

You can test the API using:
1. Swagger UI at http://localhost:8000/docs
2. curl commands
3. Postman
4. Your Next.js frontend

Example curl command:
```bash
# Register a student
curl -X POST "http://localhost:8000/auth/register/student" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "name": "John Doe",
    "dob": "2000-01-01",
    "country": "USA",
    "skill_level": "Beginner"
  }'
```
