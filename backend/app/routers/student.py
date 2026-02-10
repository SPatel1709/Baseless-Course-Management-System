from fastapi import APIRouter, HTTPException, status
from app.models import (
    StudentProfileUpdate, CourseSearch, EnrollInCourse,
    MessageResponse, CourseResponse, StudentCourseResponse
)
from app.database import get_db_cursor
from typing import List

router = APIRouter(prefix="/student", tags=["Student"])

# ==================== PROFILE MANAGEMENT ====================

@router.get("/profile/{email}")
async def get_student_profile(email: str):
    """Get student profile"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT Student_id, Name, Email, DOB, Country, Skill_level
                FROM Student
                WHERE Email = %s
            """, (email,))
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            
            return {
                "student_id": result[0],
                "name": result[1],
                "email": result[2],
                "dob": result[3].isoformat() if result[3] else None,
                "country": result[4],
                "skill_level": result[5]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/profile/{email}", response_model=MessageResponse)
async def update_student_profile(email: str, profile: StudentProfileUpdate):
    """Update student profile (cannot change email)"""
    try:
        with get_db_cursor() as cursor:
            # Check if student exists
            cursor.execute("SELECT Student_id FROM Student WHERE Email = %s", (email,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            
            # Build dynamic update query
            update_fields = []
            params = []
            
            if profile.name is not None:
                update_fields.append("Name = %s")
                params.append(profile.name)
            if profile.dob is not None:
                update_fields.append("DOB = %s")
                params.append(profile.dob)
            if profile.country is not None:
                update_fields.append("Country = %s")
                params.append(profile.country)
            if profile.skill_level is not None:
                update_fields.append("Skill_level = %s")
                params.append(profile.skill_level)
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            params.append(email)
            query = f"UPDATE Student SET {', '.join(update_fields)} WHERE Email = %s"
            cursor.execute(query, params)
            
            return MessageResponse(message="Profile updated successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== COURSE SEARCH AND ENROLLMENT ====================

@router.post("/search-courses", response_model=List[CourseResponse])
async def search_courses(search: CourseSearch):
    """Search for courses based on various criteria"""
    try:
        with get_db_cursor() as cursor:
            # Build dynamic query
            query = """
                SELECT DISTINCT c.Course_id, c.Name, c.Price, c.Duration, c.Course_Type,
                       c.Difficulty_level, c.Notes_URL, c.Video_URL,
                       u.Name as uni_name, b.Name as book_name
                FROM Course c
                JOIN University u ON c.Uni_id = u.Uni_id
                JOIN Book b ON c.Book_id = b.Book_id
                LEFT JOIN Course_Topic ct ON c.Course_id = ct.Course_id
                LEFT JOIN Topic t ON ct.Topic_id = t.Topic_id
                WHERE 1=1
            """
            params = []
            
            if search.name:
                query += " AND c.Name ILIKE %s"
                params.append(f"%{search.name}%")
            
            if search.course_type:
                query += " AND c.Course_Type = %s"
                params.append(search.course_type)
            
            if search.difficulty_level:
                query += " AND c.Difficulty_level = %s"
                params.append(search.difficulty_level)
            
            if search.min_price is not None:
                query += " AND c.Price >= %s"
                params.append(search.min_price)
            
            if search.max_price is not None:
                query += " AND c.Price <= %s"
                params.append(search.max_price)
            
            if search.university_name:
                query += " AND u.Name ILIKE %s"
                params.append(f"%{search.university_name}%")
            
            if search.topic_name:
                query += " AND t.Name ILIKE %s"
                params.append(f"%{search.topic_name}%")
            
            query += " ORDER BY c.Name"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            courses = []
            for row in results:
                course_id = row[0]
                
                # Get instructors
                cursor.execute("""
                    SELECT i.Name
                    FROM Teaches t
                    JOIN Instructor i ON t.Instructor_id = i.Instructor_id
                    WHERE t.Course_id = %s
                """, (course_id,))
                instructors = [r[0] for r in cursor.fetchall()]
                
                # Get topics
                cursor.execute("""
                    SELECT t.Name
                    FROM Course_Topic ct
                    JOIN Topic t ON ct.Topic_id = t.Topic_id
                    WHERE ct.Course_id = %s
                """, (course_id,))
                topics = [r[0] for r in cursor.fetchall()]
                
                # Get prerequisites
                cursor.execute("""
                    SELECT c.Name
                    FROM Course_Prerequisites cp
                    JOIN Course c ON cp.Prerequisite_Course_id = c.Course_id
                    WHERE cp.Course_id = %s
                """, (course_id,))
                prerequisites = [r[0] for r in cursor.fetchall()]
                
                courses.append(CourseResponse(
                    course_id=row[0],
                    course_name=row[1],
                    price=row[2],
                    duration=row[3],
                    course_type=row[4],
                    difficulty_level=row[5],
                    notes_url=row[6],
                    video_url=row[7],
                    university_name=row[8],
                    book_name=row[9],
                    instructors=instructors,
                    topics=topics,
                    prerequisites=prerequisites
                ))
            
            return courses
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/enroll", response_model=MessageResponse)
async def enroll_in_course(email: str, enrollment: EnrollInCourse):
    """Enroll in a course (checks prerequisites)"""
    try:
        with get_db_cursor() as cursor:
            # Get student ID
            cursor.execute("SELECT Student_id FROM Student WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            student_id = result[0]
            
            # Check if course exists
            cursor.execute("SELECT Course_id FROM Course WHERE Course_id = %s", (enrollment.course_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Course not found"
                )
            
            # Check if already enrolled
            cursor.execute("""
                SELECT * FROM Enrolled_in
                WHERE Student_id = %s AND Course_id = %s
            """, (student_id, enrollment.course_id))
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Already enrolled in this course"
                )
            
            # Get prerequisites for the course
            cursor.execute("""
                SELECT Prerequisite_Course_id
                FROM Course_Prerequisites
                WHERE Course_id = %s
            """, (enrollment.course_id,))
            prerequisites = [row[0] for row in cursor.fetchall()]
            
            # Check if student has completed all prerequisites
            for prereq_id in prerequisites:
                cursor.execute("""
                    SELECT Status
                    FROM Enrolled_in
                    WHERE Student_id = %s AND Course_id = %s
                """, (student_id, prereq_id))
                result = cursor.fetchone()
                
                if not result:
                    # Get course name for error message
                    cursor.execute("SELECT Name FROM Course WHERE Course_id = %s", (prereq_id,))
                    prereq_name = cursor.fetchone()[0]
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Prerequisite not completed: {prereq_name}"
                    )
                
                if result[0] != 'Completed':
                    # Get course name for error message
                    cursor.execute("SELECT Name FROM Course WHERE Course_id = %s", (prereq_id,))
                    prereq_name = cursor.fetchone()[0]
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Prerequisite not completed: {prereq_name}"
                    )
            
            # Enroll the student
            cursor.execute("""
                INSERT INTO Enrolled_in (Student_id, Course_id, Status)
                VALUES (%s, %s, 'Pending')
            """, (student_id, enrollment.course_id))
            
            return MessageResponse(message="Successfully enrolled in course")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/my-courses/{email}", response_model=List[StudentCourseResponse])
async def get_my_courses(email: str):
    """Get all courses the student is enrolled in with scores"""
    try:
        with get_db_cursor() as cursor:
            # Get student ID
            cursor.execute("SELECT Student_id FROM Student WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            student_id = result[0]
            
            # Get enrolled courses
            cursor.execute("""
                SELECT e.Course_id, c.Name, e.Evaluation_score, e.Status,
                       c.Difficulty_level, c.Duration, c.Course_Type, u.Name
                FROM Enrolled_in e
                JOIN Course c ON e.Course_id = c.Course_id
                JOIN University u ON c.Uni_id = u.Uni_id
                WHERE e.Student_id = %s
                ORDER BY e.Status, c.Name
            """, (student_id,))
            
            courses = []
            for row in cursor.fetchall():
                course_id = row[0]
                
                # Get instructors
                cursor.execute("""
                    SELECT i.Name
                    FROM Teaches t
                    JOIN Instructor i ON t.Instructor_id = i.Instructor_id
                    WHERE t.Course_id = %s
                """, (course_id,))
                instructors = [r[0] for r in cursor.fetchall()]
                
                courses.append(StudentCourseResponse(
                    course_id=row[0],
                    course_name=row[1],
                    evaluation_score=row[2],
                    status=row[3],
                    instructor_names=instructors,
                    difficulty_level=row[4],
                    duration=row[5],
                    course_type=row[6],
                    university_name=row[7]
                ))
            
            return courses
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
