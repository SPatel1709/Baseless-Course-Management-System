from fastapi import APIRouter, HTTPException, status, Query
from app.models import StatisticsFilter
from app.database import get_db_cursor
from typing import List, Optional

router = APIRouter(prefix="/analyst", tags=["Data Analyst"])

# ==================== COURSE STATISTICS ====================

@router.post("/statistics/courses")
async def get_course_statistics(filters: StatisticsFilter):
    """Get comprehensive course statistics with filters"""
    try:
        with get_db_cursor() as cursor:
            # Build base query
            query = """
                SELECT 
                    c.Course_id,
                    c.Name as course_name,
                    c.Course_Type,
                    c.Difficulty_level,
                    c.Price,
                    c.Duration,
                    u.Name as university_name,
                    COUNT(DISTINCT e.Student_id) as enrolled_students,
                    AVG(e.Evaluation_score) as avg_score,
                    COUNT(CASE WHEN e.Status = 'Completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN e.Status = 'Pending' THEN 1 END) as pending_count
                FROM Course c
                LEFT JOIN Enrolled_in e ON c.Course_id = e.Course_id
                JOIN University u ON c.Uni_id = u.Uni_id
                WHERE 1=1
            """
            params = []
            
            # Apply filters
            if filters.course_ids:
                placeholders = ','.join(['%s'] * len(filters.course_ids))
                query += f" AND c.Course_id IN ({placeholders})"
                params.extend(filters.course_ids)
            
            if filters.difficulty_level:
                query += " AND c.Difficulty_level = %s"
                params.append(filters.difficulty_level)
            
            if filters.course_type:
                query += " AND c.Course_Type = %s"
                params.append(filters.course_type)
            
            if filters.university_id:
                query += " AND c.Uni_id = %s"
                params.append(filters.university_id)
            
            if filters.instructor_id:
                query += " AND EXISTS (SELECT 1 FROM Teaches t WHERE t.Course_id = c.Course_id AND t.Instructor_id = %s)"
                params.append(filters.instructor_id)
            
            query += " GROUP BY c.Course_id, c.Name, c.Course_Type, c.Difficulty_level, c.Price, c.Duration, u.Name"
            
            # Apply student count filters
            if filters.min_students is not None:
                query += " HAVING COUNT(DISTINCT e.Student_id) >= %s"
                params.append(filters.min_students)
            
            if filters.max_students is not None:
                if filters.min_students is not None:
                    query += " AND COUNT(DISTINCT e.Student_id) <= %s"
                else:
                    query += " HAVING COUNT(DISTINCT e.Student_id) <= %s"
                params.append(filters.max_students)
            
            query += " ORDER BY enrolled_students DESC, course_name"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            courses = []
            for row in results:
                course_id = row[0]
                avg_score = float(row[8]) if row[8] else None
                
                # Apply avg score filter
                if filters.min_avg_score is not None and (avg_score is None or avg_score < float(filters.min_avg_score)):
                    continue
                if filters.max_avg_score is not None and (avg_score is None or avg_score > float(filters.max_avg_score)):
                    continue
                
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
                
                courses.append({
                    "course_id": row[0],
                    "course_name": row[1],
                    "course_type": row[2],
                    "difficulty_level": row[3],
                    "price": float(row[4]),
                    "duration": row[5],
                    "university_name": row[6],
                    "enrolled_students": row[7],
                    "avg_score": avg_score,
                    "completed_count": row[9],
                    "pending_count": row[10],
                    "instructors": instructors,
                    "topics": topics
                })
            
            return courses
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== ENROLLMENT TRENDS ====================

@router.get("/statistics/enrollment-by-difficulty")
async def get_enrollment_by_difficulty(
    university_id: Optional[int] = None,
    instructor_id: Optional[int] = None
):
    """Get enrollment statistics grouped by difficulty level"""
    try:
        with get_db_cursor() as cursor:
            query = """
                SELECT 
                    c.Difficulty_level,
                    COUNT(DISTINCT c.Course_id) as course_count,
                    COUNT(e.Student_id) as total_enrollments,
                    AVG(e.Evaluation_score) as avg_score,
                    COUNT(CASE WHEN e.Status = 'Completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN e.Status = 'Pending' THEN 1 END) as pending
                FROM Course c
                LEFT JOIN Enrolled_in e ON c.Course_id = e.Course_id
                WHERE 1=1
            """
            params = []
            
            if university_id:
                query += " AND c.Uni_id = %s"
                params.append(university_id)
            if instructor_id:
                query += " AND EXISTS (SELECT 1 FROM Teaches t WHERE t.Course_id = c.Course_id AND t.Instructor_id = %s)"
                params.append(instructor_id)
            
            query += " GROUP BY c.Difficulty_level ORDER BY c.Difficulty_level"
            
            cursor.execute(query, params)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    "difficulty_level": row[0],
                    "course_count": row[1],
                    "total_enrollments": row[2],
                    "avg_score": float(row[3]) if row[3] else None,
                    "completed": row[4],
                    "pending": row[5]
                })
            
            return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/statistics/enrollment-by-type")
async def get_enrollment_by_type(
    university_id: Optional[int] = None,
    instructor_id: Optional[int] = None
):
    """Get enrollment statistics grouped by course type"""
    try:
        with get_db_cursor() as cursor:
            query = """
                SELECT 
                    c.Course_Type,
                    COUNT(DISTINCT c.Course_id) as course_count,
                    COUNT(e.Student_id) as total_enrollments,
                    AVG(e.Evaluation_score) as avg_score,
                    AVG(c.Price) as avg_price,
                    AVG(c.Duration) as avg_duration
                FROM Course c
                LEFT JOIN Enrolled_in e ON c.Course_id = e.Course_id
                WHERE 1=1
            """
            params = []
            
            if university_id:
                query += " AND c.Uni_id = %s"
                params.append(university_id)
            if instructor_id:
                query += " AND EXISTS (SELECT 1 FROM Teaches t WHERE t.Course_id = c.Course_id AND t.Instructor_id = %s)"
                params.append(instructor_id)
            
            query += " GROUP BY c.Course_Type ORDER BY c.Course_Type"
            
            cursor.execute(query, params)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    "course_type": row[0],
                    "course_count": row[1],
                    "total_enrollments": row[2],
                    "avg_score": float(row[3]) if row[3] else None,
                    "avg_price": float(row[4]) if row[4] else None,
                    "avg_duration": float(row[5]) if row[5] else None
                })
            
            return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== UNIVERSITY STATISTICS ====================

@router.get("/statistics/universities")
async def get_university_statistics():
    """Get statistics for all universities"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    u.Uni_id,
                    u.Name,
                    u.Country,
                    COUNT(DISTINCT c.Course_id) as course_count,
                    COUNT(e.Student_id) as total_enrollments,
                    AVG(e.Evaluation_score) as avg_score,
                    AVG(c.Price) as avg_price
                FROM University u
                LEFT JOIN Course c ON u.Uni_id = c.Uni_id
                LEFT JOIN Enrolled_in e ON c.Course_id = e.Course_id
                GROUP BY u.Uni_id, u.Name, u.Country
                ORDER BY total_enrollments DESC
            """)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    "uni_id": row[0],
                    "name": row[1],
                    "country": row[2],
                    "course_count": row[3],
                    "total_enrollments": row[4],
                    "avg_score": float(row[5]) if row[5] else None,
                    "avg_price": float(row[6]) if row[6] else None
                })
            
            return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== INSTRUCTOR STATISTICS ====================

@router.get("/statistics/instructors")
async def get_instructor_statistics():
    """Get statistics for all instructors"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    i.Instructor_id,
                    i.Name,
                    i.Email,
                    COUNT(DISTINCT t.Course_id) as courses_taught,
                    COUNT(DISTINCT e.Student_id) as total_students,
                    AVG(e.Evaluation_score) as avg_student_score
                FROM Instructor i
                LEFT JOIN Teaches t ON i.Instructor_id = t.Instructor_id
                LEFT JOIN Enrolled_in e ON t.Course_id = e.Course_id
                GROUP BY i.Instructor_id, i.Name, i.Email
                ORDER BY total_students DESC
            """)
            
            results = []
            for row in cursor.fetchall():
                instructor_id = row[0]
                
                # Get expertise areas
                cursor.execute("""
                    SELECT Expertise_area
                    FROM Instructor_Expertise
                    WHERE Instructor_id = %s
                """, (instructor_id,))
                expertise = [r[0] for r in cursor.fetchall()]
                
                results.append({
                    "instructor_id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "courses_taught": row[3],
                    "total_students": row[4],
                    "avg_student_score": float(row[5]) if row[5] else None,
                    "expertise_areas": expertise
                })
            
            return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== STUDENT STATISTICS ====================

@router.get("/statistics/students")
async def get_student_statistics():
    """Get overall student statistics"""
    try:
        with get_db_cursor() as cursor:
            # Overall stats
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_students,
                    AVG(course_count) as avg_courses_per_student,
                    AVG(avg_score) as overall_avg_score
                FROM (
                    SELECT 
                        s.Student_id,
                        COUNT(e.Course_id) as course_count,
                        AVG(e.Evaluation_score) as avg_score
                    FROM Student s
                    LEFT JOIN Enrolled_in e ON s.Student_id = e.Student_id
                    GROUP BY s.Student_id
                ) subquery
            """)
            overall = cursor.fetchone()
            
            # By skill level
            cursor.execute("""
                SELECT 
                    s.Skill_level,
                    COUNT(DISTINCT s.Student_id) as student_count,
                    AVG(course_count) as avg_courses,
                    AVG(avg_score) as avg_score
                FROM Student s
                LEFT JOIN (
                    SELECT 
                        Student_id,
                        COUNT(Course_id) as course_count,
                        AVG(Evaluation_score) as avg_score
                    FROM Enrolled_in
                    GROUP BY Student_id
                ) e ON s.Student_id = e.Student_id
                GROUP BY s.Skill_level
                ORDER BY s.Skill_level
            """)
            
            by_skill = []
            for row in cursor.fetchall():
                by_skill.append({
                    "skill_level": row[0],
                    "student_count": row[1],
                    "avg_courses": float(row[2]) if row[2] else 0,
                    "avg_score": float(row[3]) if row[3] else None
                })
            
            # By country
            cursor.execute("""
                SELECT 
                    s.Country,
                    COUNT(DISTINCT s.Student_id) as student_count
                FROM Student s
                GROUP BY s.Country
                ORDER BY student_count DESC
                LIMIT 10
            """)
            
            by_country = []
            for row in cursor.fetchall():
                by_country.append({
                    "country": row[0],
                    "student_count": row[1]
                })
            
            return {
                "overall": {
                    "total_students": overall[0],
                    "avg_courses_per_student": float(overall[1]) if overall[1] else 0,
                    "overall_avg_score": float(overall[2]) if overall[2] else None
                },
                "by_skill_level": by_skill,
                "top_countries": by_country
            }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== TOPIC STATISTICS ====================

@router.get("/statistics/topics")
async def get_topic_statistics():
    """Get statistics for all topics"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    t.Topic_id,
                    t.Name,
                    COUNT(DISTINCT ct.Course_id) as course_count,
                    COUNT(DISTINCT e.Student_id) as student_count
                FROM Topic t
                LEFT JOIN Course_Topic ct ON t.Topic_id = ct.Topic_id
                LEFT JOIN Enrolled_in e ON ct.Course_id = e.Course_id
                GROUP BY t.Topic_id, t.Name
                ORDER BY course_count DESC, student_count DESC
            """)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    "topic_id": row[0],
                    "name": row[1],
                    "course_count": row[2],
                    "student_count": row[3]
                })
            
            return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# ==================== LOOKUP ENDPOINTS ====================

@router.get("/universities")
async def get_universities():
    """Get all universities for analyst dropdowns"""
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

@router.get("/instructors")
async def get_instructors():
    """Get all instructors for analyst dropdowns"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT i.Instructor_id, i.Name, i.Email
                FROM Instructor i
                ORDER BY i.Name
            """)
            results = cursor.fetchall()
            return [
                {"instructor_id": row[0], "name": row[1], "email": row[2]}
                for row in results
            ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/statistics/completion-rates")
async def get_completion_rates():
    """Get completion rates for courses"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    c.Course_id,
                    c.Name,
                    c.Difficulty_level,
                    COUNT(e.Student_id) as total_enrolled,
                    COUNT(CASE WHEN e.Status = 'Completed' THEN 1 END) as completed,
                    CASE 
                        WHEN COUNT(e.Student_id) > 0 
                        THEN ROUND(100.0 * COUNT(CASE WHEN e.Status = 'Completed' THEN 1 END) / COUNT(e.Student_id), 2)
                        ELSE 0 
                    END as completion_rate
                FROM Course c
                LEFT JOIN Enrolled_in e ON c.Course_id = e.Course_id
                GROUP BY c.Course_id, c.Name, c.Difficulty_level
                HAVING COUNT(e.Student_id) > 0
                ORDER BY completion_rate DESC
            """)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    "course_id": row[0],
                    "course_name": row[1],
                    "difficulty_level": row[2],
                    "total_enrolled": row[3],
                    "completed": row[4],
                    "completion_rate": float(row[5])
                })
            
            return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


# ==================== DETAILED LOOKUPS ====================

@router.get("/statistics/course/{course_id}/students")
async def get_course_students(course_id: int):
    """Get detailed student list for a specific course"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    s.Student_id, s.Name, s.Email, s.Country, s.Skill_level,
                    e.Evaluation_score, e.Status
                FROM Enrolled_in e
                JOIN Student s ON e.Student_id = s.Student_id
                WHERE e.Course_id = %s
                ORDER BY s.Name
            """, (course_id,))
            results = []
            for row in cursor.fetchall():
                results.append({
                    "student_id": row[0], "name": row[1], "email": row[2],
                    "country": row[3], "skill_level": row[4],
                    "score": float(row[5]) if row[5] else None,
                    "status": row[6]
                })
            return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/statistics/courses-list")
async def get_courses_list():
    """Get all courses with names for dropdowns"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT c.Course_id, c.Name, c.Course_Type, c.Difficulty_level, u.Name
                FROM Course c
                JOIN University u ON c.Uni_id = u.Uni_id
                ORDER BY c.Name
            """)
            return [
                {"course_id": row[0], "name": row[1], "course_type": row[2],
                 "difficulty_level": row[3], "university_name": row[4]}
                for row in cursor.fetchall()
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
