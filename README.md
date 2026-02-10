# Baseless Course Management System

An online course management platform built with FastAPI (backend) and Next.js (frontend).

## Online Course Management Platform

A comprehensive web-based system for managing online courses with separate backend (FastAPI) and frontend (Next.js) applications.

## Project Structure

```
DBMS Project/
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── main.py         # FastAPI application entry
│   │   ├── database.py     # Database connection
│   │   ├── models.py       # Pydantic models
│   │   └── routers/        # API route handlers
│   │       ├── auth.py
│   │       ├── admin.py
│   │       ├── student.py
│   │       ├── instructor.py
│   │       └── analyst.py
│   ├── requirements.txt
│   └── README.md
│
├── database/                # Database schema
│   └── schema.sql
│
└── frontend/                # Next.js frontend (to be created)

```

## Quick Start

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

### Database Setup

```bash
psql -U 23CS10051 -d postgres
CREATE DATABASE "Premidsem";
\c Premidsem
\i database/schema.sql
```

## Features

- **4 User Roles**: Admin, Student, Instructor, Data Analyst
- **Authentication**: Secure login with bcrypt password hashing
- **Course Management**: Create, edit, delete courses with prerequisites
- **Enrollment System**: Automatic prerequisite checking
- **Analytics Dashboard**: Comprehensive statistics and reports

See `backend/README.md` for detailed documentation.

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
