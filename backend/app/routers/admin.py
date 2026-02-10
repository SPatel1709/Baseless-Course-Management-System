from fastapi import APIRouter, HTTPException, status
from app.models import (
    UniversityCreate, BookCreate, CourseCreate, CourseUpdate,
    AddInstructorToCourse, MessageResponse, DataAnalystCreate
)
from app.database import get_db_cursor

router = APIRouter(prefix="/admin", tags=["System Admin"])

# ==================== UNIVERSITY MANAGEMENT ====================

@router.post("/university", response_model=MessageResponse)
async def add_university(university: UniversityCreate):
    """Add a partner university"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "INSERT INTO University (Name, Country) VALUES (%s, %s)",
                (university.name, university.country)
            )
            return MessageResponse(message="University added successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# Remove university not used 
# @router.delete("/university/{uni_id}", response_model=MessageResponse)
# async def remove_university(uni_id: int):
#     """Remove a partner university"""
#     try:
#         with get_db_cursor() as cursor:
#             # Check if university has courses
#             cursor.execute(
#                 "SELECT COUNT(*) FROM Course WHERE Uni_id = %s",
#                 (uni_id,)
#             )
#             count = cursor.fetchone()[0]
#             if count > 0:
#                 raise HTTPException(
#                     status_code=status.HTTP_400_BAD_REQUEST,
#                     detail="Cannot delete university with associated courses"
#                 )
            
#             cursor.execute("DELETE FROM University WHERE Uni_id = %s", (uni_id,))
#             if cursor.rowcount == 0:
#                 raise HTTPException(
#                     status_code=status.HTTP_404_NOT_FOUND,
#                     detail="University not found"
#                 )
#             return MessageResponse(message="University removed successfully")
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Database error: {str(e)}"
#         )

@router.get("/universities")
async def get_all_universities():
    """Get all universities"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT Uni_id, Name, Country FROM University ORDER BY Name")
            results = cursor.fetchall()
            return [
                {"uni_id": row[0], "name": row[1], "country": row[2]}
                for row in results
            ]
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

@router.delete("/book/{book_id}", response_model=MessageResponse)
async def remove_book(book_id: int):
    """Remove a book from the database"""
    try:
        with get_db_cursor() as cursor:
            # Check if book is used by any course
            cursor.execute(
                "SELECT COUNT(*) FROM Course WHERE Book_id = %s",
                (book_id,)
            )
            count = cursor.fetchone()[0]
            if count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete book that is associated with courses"
                )
            
            # Delete book (authors will be deleted via CASCADE)
            cursor.execute("DELETE FROM Book WHERE Book_id = %s", (book_id,))
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )
            return MessageResponse(message="Book removed successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

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

# ==================== COURSE MANAGEMENT ====================

def check_circular_dependency(cursor, course_id: int, prereq_id: int) -> bool:
    """Check if adding prereq_id as prerequisite of course_id creates a circular dependency"""
    # BFS to check if course_id is a prerequisite of prereq_id
    visited = set()
    queue = [prereq_id]
    
    while queue:
        current = queue.pop(0)
        if current == course_id:
            return True  # Circular dependency found
        
        if current in visited:
            continue
        visited.add(current)
        
        cursor.execute(
            "SELECT Prerequisite_Course_id FROM Course_Prerequisites WHERE Course_id = %s",
            (current,)
        )
        for row in cursor.fetchall():
            queue.append(row[0])
    
    return False

@router.post("/course", response_model=MessageResponse)
async def create_course(course: CourseCreate):
    """Create a new course"""
    try:
        with get_db_cursor() as cursor:
            # Verify university exists
            cursor.execute("SELECT Uni_id FROM University WHERE Uni_id = %s", (course.uni_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="University not found"
                )
            
            # Verify book exists
            cursor.execute("SELECT Book_id FROM Book WHERE Book_id = %s", (course.book_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )
            
            # Verify instructor exists
            cursor.execute(
                "SELECT Instructor_id FROM Instructor WHERE Instructor_id = %s",
                (course.instructor_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            
            # Verify topics exist or create them
            topic_ids = []
            for topic_name in course.topic_names:
                # Check if topic exists (case-insensitive)
                cursor.execute(
                    "SELECT Topic_id FROM Topic WHERE LOWER(Name) = LOWER(%s)",
                    (topic_name,)
                )
                result = cursor.fetchone()
                if result:
                    topic_ids.append(result[0])
                else:
                    # Create new topic
                    cursor.execute(
                        "INSERT INTO Topic (Name) VALUES (%s) RETURNING Topic_id",
                        (topic_name,)
                    )
                    topic_ids.append(cursor.fetchone()[0])
            
            # Verify prerequisite courses exist
            for prereq_id in course.prerequisite_course_ids:
                cursor.execute("SELECT Course_id FROM Course WHERE Course_id = %s", (prereq_id,))
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Prerequisite course with ID {prereq_id} not found"
                    )
            
            # Insert course
            cursor.execute(
                """
                INSERT INTO Course (Name, Price, Duration, Course_Type, Difficulty_level,
                                   Notes_URL, Video_URL, Book_id, Uni_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING Course_id
                """,
                (course.name, course.price, course.duration, course.course_type,
                 course.difficulty_level, course.notes_url, course.video_url,
                 course.book_id, course.uni_id)
            )
            course_id = cursor.fetchone()[0]
            
            # Add instructor to course
            cursor.execute(
                "INSERT INTO Teaches (Instructor_id, Course_id) VALUES (%s, %s)",
                (course.instructor_id, course_id)
            )
            
            # Add topics
            for topic_id in topic_ids:
                cursor.execute(
                    "INSERT INTO Course_Topic (Course_id, Topic_id) VALUES (%s, %s)",
                    (course_id, topic_id)
                )
            
            # Add prerequisites
            for prereq_id in course.prerequisite_course_ids:
                cursor.execute(
                    """
                    INSERT INTO Course_Prerequisites (Course_id, Prerequisite_Course_id)
                    VALUES (%s, %s)
                    """,
                    (course_id, prereq_id)
                )
            
            return MessageResponse(message=f"Course created successfully with ID {course_id}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/course/{course_id}", response_model=MessageResponse)
async def update_course(course_id: int, course: CourseUpdate):
    """Update a course"""
    try:
        with get_db_cursor() as cursor:
            # Check if course exists
            cursor.execute("SELECT Course_id FROM Course WHERE Course_id = %s", (course_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Course not found"
                )
            
            # Build dynamic update query
            update_fields = []
            params = []
            
            if course.name is not None:
                update_fields.append("Name = %s")
                params.append(course.name)
            if course.price is not None:
                update_fields.append("Price = %s")
                params.append(course.price)
            if course.duration is not None:
                update_fields.append("Duration = %s")
                params.append(course.duration)
            if course.course_type is not None:
                update_fields.append("Course_Type = %s")
                params.append(course.course_type)
            if course.difficulty_level is not None:
                update_fields.append("Difficulty_level = %s")
                params.append(course.difficulty_level)
            if course.notes_url is not None:
                update_fields.append("Notes_URL = %s")
                params.append(course.notes_url)
            if course.video_url is not None:
                update_fields.append("Video_URL = %s")
                params.append(course.video_url)
            if course.book_id is not None:
                # Verify book exists
                cursor.execute("SELECT Book_id FROM Book WHERE Book_id = %s", (course.book_id,))
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Book not found"
                    )
                update_fields.append("Book_id = %s")
                params.append(course.book_id)
            if course.uni_id is not None:
                # Verify university exists
                cursor.execute("SELECT Uni_id FROM University WHERE Uni_id = %s", (course.uni_id,))
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="University not found"
                    )
                update_fields.append("Uni_id = %s")
                params.append(course.uni_id)
            
            # Update course basic info
            if update_fields:
                params.append(course_id)
                query = f"UPDATE Course SET {', '.join(update_fields)} WHERE Course_id = %s"
                cursor.execute(query, params)
            
            # Update prerequisites if provided
            if course.prerequisite_course_ids is not None:
                # Verify all prerequisite courses exist
                for prereq_id in course.prerequisite_course_ids:
                    cursor.execute("SELECT Course_id FROM Course WHERE Course_id = %s", (prereq_id,))
                    if not cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Prerequisite course with ID {prereq_id} not found"
                        )
                
                # Check for circular dependencies
                for prereq_id in course.prerequisite_course_ids:
                    if check_circular_dependency(cursor, course_id, prereq_id):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Adding prerequisite {prereq_id} creates a circular dependency"
                        )
                
                # Remove old prerequisites
                cursor.execute(
                    "DELETE FROM Course_Prerequisites WHERE Course_id = %s",
                    (course_id,)
                )
                
                # Add new prerequisites
                for prereq_id in course.prerequisite_course_ids:
                    cursor.execute(
                        """
                        INSERT INTO Course_Prerequisites (Course_id, Prerequisite_Course_id)
                        VALUES (%s, %s)
                        """,
                        (course_id, prereq_id)
                    )
            
            # Update topics if provided
            if course.topic_ids is not None:
                if len(course.topic_ids) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Course must have at least one topic"
                    )
                
                # Remove old topics
                cursor.execute(
                    "DELETE FROM Course_Topic WHERE Course_id = %s",
                    (course_id,)
                )
                
                # Add new topics
                for topic_id in course.topic_ids:
                    cursor.execute(
                        "INSERT INTO Course_Topic (Course_id, Topic_id) VALUES (%s, %s)",
                        (course_id, topic_id)
                    )
            
            return MessageResponse(message="Course updated successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/courses")
async def get_all_courses():
    """Get all courses with details for dropdowns"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT c.Course_id, c.Name, c.Course_Type, c.Difficulty_level,
                       u.Name as uni_name, b.Name as book_name
                FROM Course c
                JOIN University u ON c.Uni_id = u.Uni_id
                JOIN Book b ON c.Book_id = b.Book_id
                ORDER BY c.Name
            """)
            results = cursor.fetchall()
            courses = []
            for row in results:
                course_id = row[0]
                cursor.execute("""
                    SELECT cp.Prerequisite_Course_id, c2.Name
                    FROM Course_Prerequisites cp
                    JOIN Course c2 ON cp.Prerequisite_Course_id = c2.Course_id
                    WHERE cp.Course_id = %s
                """, (course_id,))
                prereqs = [{"course_id": r[0], "name": r[1]} for r in cursor.fetchall()]
                
                cursor.execute("""
                    SELECT cp.Course_id, c2.Name
                    FROM Course_Prerequisites cp
                    JOIN Course c2 ON cp.Course_id = c2.Course_id
                    WHERE cp.Prerequisite_Course_id = %s
                """, (course_id,))
                dependent = [{"course_id": r[0], "name": r[1]} for r in cursor.fetchall()]
                
                courses.append({
                    "course_id": row[0],
                    "name": row[1],
                    "course_type": row[2],
                    "difficulty_level": row[3],
                    "university_name": row[4],
                    "book_name": row[5],
                    "prerequisites": prereqs,
                    "dependent_courses": dependent
                })
            return courses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.delete("/course/{course_id}", response_model=MessageResponse)
async def delete_course(course_id: int, force: bool = False, replace_with: int = None):
    """Delete a course with prerequisite handling"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT Name FROM Course WHERE Course_id = %s", (course_id,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Course not found"
                )
            
            # Check if this course is a prerequisite of other courses
            cursor.execute("""
                SELECT cp.Course_id, c.Name
                FROM Course_Prerequisites cp
                JOIN Course c ON cp.Course_id = c.Course_id
                WHERE cp.Prerequisite_Course_id = %s
            """, (course_id,))
            dependents = cursor.fetchall()
            
            if dependents and not force:
                dep_names = [f"{r[1]}" for r in dependents]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot delete: This course is a prerequisite for: {', '.join(dep_names)}. Use force deletion to proceed."
                )
            
            if dependents:
                if replace_with:
                    cursor.execute("SELECT Course_id FROM Course WHERE Course_id = %s", (replace_with,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Replacement course not found")
                    
                    for dep in dependents:
                        cursor.execute("""
                            SELECT 1 FROM Course_Prerequisites
                            WHERE Course_id = %s AND Prerequisite_Course_id = %s
                        """, (dep[0], replace_with))
                        if not cursor.fetchone():
                            cursor.execute("""
                                UPDATE Course_Prerequisites
                                SET Prerequisite_Course_id = %s
                                WHERE Course_id = %s AND Prerequisite_Course_id = %s
                            """, (replace_with, dep[0], course_id))
                        else:
                            cursor.execute("""
                                DELETE FROM Course_Prerequisites
                                WHERE Course_id = %s AND Prerequisite_Course_id = %s
                            """, (dep[0], course_id))
                else:
                    cursor.execute("""
                        DELETE FROM Course_Prerequisites
                        WHERE Prerequisite_Course_id = %s
                    """, (course_id,))
            
            cursor.execute("DELETE FROM Course WHERE Course_id = %s", (course_id,))
            return MessageResponse(message="Course deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/course/add-instructor", response_model=MessageResponse)
async def add_instructor_to_course(data: AddInstructorToCourse):
    """Add an instructor to a course"""
    try:
        with get_db_cursor() as cursor:
            # Verify course exists
            cursor.execute("SELECT Course_id FROM Course WHERE Course_id = %s", (data.course_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Course not found"
                )
            
            # Verify instructor exists
            cursor.execute(
                "SELECT Instructor_id FROM Instructor WHERE Instructor_id = %s",
                (data.instructor_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            
            # Check if already assigned
            cursor.execute(
                """
                SELECT * FROM Teaches 
                WHERE Instructor_id = %s AND Course_id = %s
                """,
                (data.instructor_id, data.course_id)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Instructor already assigned to this course"
                )
            
            # Add instructor to course
            cursor.execute(
                "INSERT INTO Teaches (Instructor_id, Course_id) VALUES (%s, %s)",
                (data.instructor_id, data.course_id)
            )
            
            return MessageResponse(message="Instructor added to course successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== USER MANAGEMENT ====================

@router.post("/analyst", response_model=MessageResponse)
async def create_data_analyst(analyst: DataAnalystCreate):
    """Create a new data analyst account"""
    try:
        with get_db_cursor() as cursor:
            # Check if email already exists
            cursor.execute(
                "SELECT Email_id FROM Users WHERE Email_id = %s",
                (analyst.email,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
            
            # Insert into Users table
            cursor.execute(
                "INSERT INTO Users (Email_id, Password, Category) VALUES (%s, %s, %s)",
                (analyst.email, analyst.password, "Data Analyst")
            )
            
            # Insert into Data_Analyst table
            cursor.execute(
                "INSERT INTO Data_Analyst (Email_id, Name) VALUES (%s, %s)",
                (analyst.email, analyst.name)
            )
            
            return MessageResponse(message="Data Analyst account created successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.delete("/user/{email}", response_model=MessageResponse)
async def delete_user(email: str):
    """Delete a student, instructor, or data analyst"""
    try:
        with get_db_cursor() as cursor:
            # Check user category
            cursor.execute(
                "SELECT Category FROM Users WHERE Email_id = %s",
                (email,)
            )
            result = cursor.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            category = result[0]
            
            if category == "Admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete administrator users"
                )
            
            # Delete from Users table (CASCADE will handle related tables)
            cursor.execute("DELETE FROM Users WHERE Email_id = %s", (email,))
            
            return MessageResponse(message=f"{category} deleted successfully")
    
    except HTTPException:
        raise
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

@router.get("/instructors")
async def get_all_instructors():
    """Get all instructors"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT i.Instructor_id, i.Name, i.Email,
                       ARRAY_AGG(ie.Expertise_area) as expertise
                FROM Instructor i
                LEFT JOIN Instructor_Expertise ie ON i.Instructor_id = ie.Instructor_id
                GROUP BY i.Instructor_id, i.Name, i.Email
                ORDER BY i.Name
            """)
            results = cursor.fetchall()
            return [
                {
                    "instructor_id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "expertise": row[3] if row[3][0] is not None else []
                }
                for row in results
            ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
