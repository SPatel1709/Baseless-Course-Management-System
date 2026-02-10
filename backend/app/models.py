from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import date
from decimal import Decimal

# ==================== AUTH MODELS ====================

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str  # 'Student', 'Instructor', 'Data Analyst', 'Admin'

class StudentCreate(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=255)
    name: str = Field(..., max_length=255)
    dob: date
    country: str = Field(..., max_length=100)
    skill_level: str
    
    @field_validator('skill_level')
    def validate_skill_level(cls, v):
        if v not in ['Beginner', 'Intermediate', 'Advanced']:
            raise ValueError('Invalid skill level')
        return v

class InstructorCreate(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=255)
    name: str = Field(..., max_length=255)
    expertise_areas: List[str] = Field(..., max_items=20)
    
    @field_validator('expertise_areas')
    def validate_expertise(cls, v):
        for area in v:
            if len(area) > 255:
                raise ValueError('Expertise area too long')
        return v

class DataAnalystCreate(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=255)
    name: str = Field(..., max_length=255)

# ==================== ADMIN MODELS ====================

class UniversityCreate(BaseModel):
    name: str = Field(..., max_length=255)
    country: str = Field(..., max_length=100)

class BookCreate(BaseModel):
    name: str = Field(..., max_length=255)
    isbn: Optional[str] = Field(None, max_length=20)
    authors: List[str] = Field(..., min_items=1)
    
    @field_validator('authors')
    def validate_authors(cls, v):
        for author in v:
            if len(author) > 255:
                raise ValueError('Author name too long')
        return v

class CourseCreate(BaseModel):
    name: str = Field(..., max_length=255)
    price: Decimal = Field(..., ge=0)
    duration: int = Field(..., gt=0)
    course_type: str
    difficulty_level: str
    notes_url: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = Field(None, max_length=500)
    book_id: int
    uni_id: int
    instructor_id: int
    prerequisite_course_ids: List[int] = []
    topic_names: List[str] = Field(..., min_items=1)  # Changed from topic_ids to topic_names
    
    @field_validator('course_type')
    def validate_course_type(cls, v):
        if v not in ['Diploma', 'Degree', 'Certificate']:
            raise ValueError('Invalid course type')
        return v
    
    @field_validator('difficulty_level')
    def validate_difficulty(cls, v):
        if v not in ['Beginner', 'Intermediate', 'Advanced']:
            raise ValueError('Invalid difficulty level')
        return v

class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    price: Optional[Decimal] = Field(None, ge=0)
    duration: Optional[int] = Field(None, gt=0)
    course_type: Optional[str] = None
    difficulty_level: Optional[str] = None
    notes_url: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = Field(None, max_length=500)
    book_id: Optional[int] = None
    uni_id: Optional[int] = None
    prerequisite_course_ids: Optional[List[int]] = None
    topic_ids: Optional[List[int]] = None

class AddInstructorToCourse(BaseModel):
    instructor_id: int
    course_id: int

# ==================== STUDENT MODELS ====================

class StudentProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    dob: Optional[date] = None
    country: Optional[str] = Field(None, max_length=100)
    skill_level: Optional[str] = None
    
    @field_validator('skill_level')
    def validate_skill_level(cls, v):
        if v and v not in ['Beginner', 'Intermediate', 'Advanced']:
            raise ValueError('Invalid skill level')
        return v

class CourseSearch(BaseModel):
    name: Optional[str] = None
    course_type: Optional[str] = None
    difficulty_level: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    university_name: Optional[str] = None
    topic_name: Optional[str] = None

class EnrollInCourse(BaseModel):
    course_id: int

# ==================== INSTRUCTOR MODELS ====================

class InstructorProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    expertise_areas: Optional[List[str]] = None
    
    @field_validator('expertise_areas')
    def validate_expertise(cls, v):
        if v:
            for area in v:
                if len(area) > 255:
                    raise ValueError('Expertise area too long')
        return v

class AddCourseContent(BaseModel):
    course_id: int
    notes_url: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = Field(None, max_length=500)
    topic_names: Optional[List[str]] = None

class EvaluateStudent(BaseModel):
    student_id: int
    course_id: int
    evaluation_score: Decimal = Field(..., ge=0, le=100)
    status: str
    
    @field_validator('status')
    def validate_status(cls, v):
        if v not in ['Pending', 'Completed']:
            raise ValueError('Invalid status')
        return v

class ChangeCourseBook(BaseModel):
    course_id: int
    book_id: int

# ==================== DATA ANALYST MODELS ====================

class StatisticsFilter(BaseModel):
    course_ids: Optional[List[int]] = None  # None means all courses
    min_students: Optional[int] = None
    max_students: Optional[int] = None
    difficulty_level: Optional[str] = None
    course_type: Optional[str] = None
    university_id: Optional[int] = None
    instructor_id: Optional[int] = None
    min_avg_score: Optional[Decimal] = None
    max_avg_score: Optional[Decimal] = None

# ==================== RESPONSE MODELS ====================

class MessageResponse(BaseModel):
    message: str

class LoginResponse(BaseModel):
    message: str
    email: str
    role: str
    user_id: Optional[int] = None
    name: str

class CourseResponse(BaseModel):
    course_id: int
    course_name: str
    price: Decimal
    duration: int
    course_type: str
    difficulty_level: str
    notes_url: Optional[str]
    video_url: Optional[str]
    university_name: str
    book_name: str
    instructors: List[str]
    topics: List[str]
    prerequisites: List[str]

class StudentCourseResponse(BaseModel):
    course_id: int
    course_name: str
    evaluation_score: Optional[Decimal]
    status: str
    instructor_names: List[str]
    difficulty_level: Optional[str] = None
    duration: Optional[int] = None
    course_type: Optional[str] = None
    university_name: Optional[str] = None
