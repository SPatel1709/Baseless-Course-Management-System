from fastapi import APIRouter, HTTPException, status
from app.models import (
    InstructorProfileUpdate, AddCourseContent, EvaluateStudent,
    ChangeCourseBook, BookCreate, MessageResponse
)
from app.database import get_db_cursor
from typing import List

router = APIRouter(prefix="/instructor", tags=["Instructor"])

# ==================== PROFILE MANAGEMENT ====================

@router.get("/profile/{email}")
async def get_instructor_profile(email: str):
    """Get instructor profile"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT i.Instructor_id, i.Name, i.Email
                FROM Instructor i
                WHERE i.Email = %s
            """, (email,))
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            
            instructor_id = result[0]
            
            # Get expertise areas
            cursor.execute("""
                SELECT Expertise_area
                FROM Instructor_Expertise
                WHERE Instructor_id = %s
            """, (instructor_id,))
            expertise = [row[0] for row in cursor.fetchall()]
            
            return {
                "instructor_id": result[0],
                "name": result[1],
                "email": result[2],
                "expertise_areas": expertise
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/profile/{email}", response_model=MessageResponse)
async def update_instructor_profile(email: str, profile: InstructorProfileUpdate):
    """Update instructor profile (cannot change email)"""
    try:
        with get_db_cursor() as cursor:
            # Get instructor ID
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            instructor_id = result[0]
            
            # Update name if provided
            if profile.name is not None:
                cursor.execute(
                    "UPDATE Instructor SET Name = %s WHERE Email = %s",
                    (profile.name, email)
                )
            
            # Update expertise areas if provided
            if profile.expertise_areas is not None:
                # Remove old expertise areas
                cursor.execute(
                    "DELETE FROM Instructor_Expertise WHERE Instructor_id = %s",
                    (instructor_id,)
                )
                
                # Add new expertise areas
                for expertise in profile.expertise_areas:
                    cursor.execute(
                        """
                        INSERT INTO Instructor_Expertise (Instructor_id, Expertise_area)
                        VALUES (%s, %s)
                        """,
                        (instructor_id, expertise)
                    )
            
            return MessageResponse(message="Profile updated successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== COURSE MANAGEMENT ====================

@router.get("/my-courses/{email}")
async def get_my_courses(email: str):
    """Get all courses taught by this instructor"""
    try:
        with get_db_cursor() as cursor:
            # Get instructor ID
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            instructor_id = result[0]
            
            # Get courses
            cursor.execute("""
                SELECT c.Course_id, c.Name, c.Price, c.Duration, c.Course_Type,
                       c.Difficulty_level, c.Notes_URL, c.Video_URL,
                       u.Name as uni_name, b.Name as book_name, c.Book_id
                FROM Teaches t
                JOIN Course c ON t.Course_id = c.Course_id
                JOIN University u ON c.Uni_id = u.Uni_id
                JOIN Book b ON c.Book_id = b.Book_id
                WHERE t.Instructor_id = %s
                ORDER BY c.Name
            """, (instructor_id,))
            
            courses = []
            for row in cursor.fetchall():
                course_id = row[0]
                
                # Get topics
                cursor.execute("""
                    SELECT t.Name
                    FROM Course_Topic ct
                    JOIN Topic t ON ct.Topic_id = t.Topic_id
                    WHERE ct.Course_id = %s
                """, (course_id,))
                topics = [r[0] for r in cursor.fetchall()]
                
                # Get student count
                cursor.execute("""
                    SELECT COUNT(*) FROM Enrolled_in WHERE Course_id = %s
                """, (course_id,))
                student_count = cursor.fetchone()[0]
                
                courses.append({
                    "course_id": row[0],
                    "course_name": row[1],
                    "price": float(row[2]),
                    "duration": row[3],
                    "course_type": row[4],
                    "difficulty_level": row[5],
                    "notes_url": row[6],
                    "video_url": row[7],
                    "university_name": row[8],
                    "book_name": row[9],
                    "book_id": row[10],
                    "topics": topics,
                    "student_count": student_count
                })
            
            return courses
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/course/content", response_model=MessageResponse)
async def add_course_content(email: str, content: AddCourseContent):
    """Add content (topics, notes, video) to a course"""
    try:
        with get_db_cursor() as cursor:
            # Get instructor ID
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            instructor_id = result[0]
            
            # Check if instructor teaches this course
            cursor.execute("""
                SELECT * FROM Teaches
                WHERE Instructor_id = %s AND Course_id = %s
            """, (instructor_id, content.course_id))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not teach this course"
                )
            
            # Update notes and video URLs if provided
            update_fields = []
            params = []
            
            if content.notes_url is not None:
                update_fields.append("Notes_URL = %s")
                params.append(content.notes_url)
            
            if content.video_url is not None:
                update_fields.append("Video_URL = %s")
                params.append(content.video_url)
            
            if update_fields:
                params.append(content.course_id)
                query = f"UPDATE Course SET {', '.join(update_fields)} WHERE Course_id = %s"
                cursor.execute(query, params)
            
            # Add topics if provided
            if content.topic_names:
                for topic_name in content.topic_names:
                    # Check if topic exists (case-insensitive)
                    cursor.execute(
                        "SELECT Topic_id FROM Topic WHERE LOWER(Name) = LOWER(%s)",
                        (topic_name,)
                    )
                    result = cursor.fetchone()
                    
                    if result:
                        topic_id = result[0]
                    else:
                        # Create new topic
                        cursor.execute(
                            "INSERT INTO Topic (Name) VALUES (%s) RETURNING Topic_id",
                            (topic_name,)
                        )
                        topic_id = cursor.fetchone()[0]
                    
                    # Check if topic already associated with course
                    cursor.execute("""
                        SELECT * FROM Course_Topic
                        WHERE Course_id = %s AND Topic_id = %s
                    """, (content.course_id, topic_id))
                    
                    if not cursor.fetchone():
                        # Add topic to course
                        cursor.execute("""
                            INSERT INTO Course_Topic (Course_id, Topic_id)
                            VALUES (%s, %s)
                        """, (content.course_id, topic_id))
            
            return MessageResponse(message="Course content updated successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== BOOK MANAGEMENT ====================

@router.post("/book", response_model=MessageResponse)
async def add_book(book: BookCreate):
    """Add a book to the database"""
    try:
        with get_db_cursor() as cursor:
            # Insert book
            cursor.execute(
                "INSERT INTO Book (Name, ISBN) VALUES (%s, %s) RETURNING Book_id",
                (book.name, book.isbn)
            )
            book_id = cursor.fetchone()[0]
            
            # Insert authors
            for author in book.authors:
                cursor.execute(
                    "INSERT INTO Book_Author (Book_id, Author) VALUES (%s, %s)",
                    (book_id, author)
                )
            
            return MessageResponse(message=f"Book added successfully with ID {book_id}")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/course/book", response_model=MessageResponse)
async def change_course_book(email: str, data: ChangeCourseBook):
    """Change the book for a course"""
    try:
        with get_db_cursor() as cursor:
            # Get instructor ID
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            instructor_id = result[0]
            
            # Check if instructor teaches this course
            cursor.execute("""
                SELECT * FROM Teaches
                WHERE Instructor_id = %s AND Course_id = %s
            """, (instructor_id, data.course_id))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not teach this course"
                )
            
            # Check if book exists
            cursor.execute("SELECT Book_id FROM Book WHERE Book_id = %s", (data.book_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )
            
            # Update course book
            cursor.execute(
                "UPDATE Course SET Book_id = %s WHERE Course_id = %s",
                (data.book_id, data.course_id)
            )
            
            return MessageResponse(message="Course book updated successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== STUDENT EVALUATION ====================

@router.get("/course/{course_id}/students")
async def get_course_students(email: str, course_id: int):
    """Get all students enrolled in a course"""
    try:
        with get_db_cursor() as cursor:
            # Get instructor ID
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            instructor_id = result[0]
            
            # Check if instructor teaches this course
            cursor.execute("""
                SELECT * FROM Teaches
                WHERE Instructor_id = %s AND Course_id = %s
            """, (instructor_id, course_id))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not teach this course"
                )
            
            # Get enrolled students
            cursor.execute("""
                SELECT s.Student_id, s.Name, s.Email, e.Evaluation_score, e.Status
                FROM Enrolled_in e
                JOIN Student s ON e.Student_id = s.Student_id
                WHERE e.Course_id = %s
                ORDER BY s.Name
            """, (course_id,))
            
            students = []
            for row in cursor.fetchall():
                students.append({
                    "student_id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "evaluation_score": float(row[3]) if row[3] else None,
                    "status": row[4]
                })
            
            return students
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/evaluate", response_model=MessageResponse)
async def evaluate_student(email: str, evaluation: EvaluateStudent):
    """Evaluate a student in a course"""
    try:
        with get_db_cursor() as cursor:
            # Get instructor ID
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            instructor_id = result[0]
            
            # Check if instructor teaches this course
            cursor.execute("""
                SELECT * FROM Teaches
                WHERE Instructor_id = %s AND Course_id = %s
            """, (instructor_id, evaluation.course_id))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not teach this course"
                )
            
            # Check if student is enrolled
            cursor.execute("""
                SELECT * FROM Enrolled_in
                WHERE Student_id = %s AND Course_id = %s
            """, (evaluation.student_id, evaluation.course_id))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student is not enrolled in this course"
                )
            
            # Update evaluation
            cursor.execute("""
                UPDATE Enrolled_in
                SET Evaluation_score = %s, Status = %s
                WHERE Student_id = %s AND Course_id = %s
            """, (evaluation.evaluation_score, evaluation.status, 
                  evaluation.student_id, evaluation.course_id))
            
            return MessageResponse(message="Student evaluated successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== LOOKUP ENDPOINTS ====================

@router.get("/books")
async def get_all_books():
    """Get all books with authors"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT b.Book_id, b.Name, b.ISBN, 
                       ARRAY_AGG(ba.Author) as authors
                FROM Book b
                LEFT JOIN Book_Author ba ON b.Book_id = ba.Book_id
                GROUP BY b.Book_id, b.Name, b.ISBN
                ORDER BY b.Name
            """)
            results = cursor.fetchall()
            return [
                {
                    "book_id": row[0],
                    "name": row[1],
                    "isbn": row[2],
                    "authors": row[3] if row[3][0] is not None else []
                }
                for row in results
            ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/topics")
async def get_all_topics():
    """Get all topics"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT Topic_id, Name FROM Topic ORDER BY Name")
            results = cursor.fetchall()
            return [
                {"topic_id": row[0], "name": row[1]}
                for row in results
            ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== EXPERTISE MANAGEMENT ====================

@router.post("/profile/{email}/expertise/add", response_model=MessageResponse)
async def add_expertise_area(email: str, area: str):
    """Add an expertise area to instructor profile"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Instructor not found")
            instructor_id = result[0]
            
            # Check if already exists
            cursor.execute("""
                SELECT * FROM Instructor_Expertise 
                WHERE Instructor_id = %s AND Expertise_area = %s
            """, (instructor_id, area))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Expertise area already exists")
            
            cursor.execute("""
                INSERT INTO Instructor_Expertise (Instructor_id, Expertise_area)
                VALUES (%s, %s)
            """, (instructor_id, area))
            
            return MessageResponse(message="Expertise area added successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.delete("/profile/{email}/expertise/{area}", response_model=MessageResponse)
async def remove_expertise_area(email: str, area: str):
    """Remove an expertise area from instructor profile"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT Instructor_id FROM Instructor WHERE Email = %s", (email,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Instructor not found")
            instructor_id = result[0]
            
            cursor.execute("""
                DELETE FROM Instructor_Expertise 
                WHERE Instructor_id = %s AND Expertise_area = %s
            """, (instructor_id, area))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Expertise area not found")
            
            return MessageResponse(message="Expertise area removed successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
