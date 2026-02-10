from fastapi import APIRouter, HTTPException, status
from app.models import (
    UserLogin, StudentCreate, InstructorCreate, 
    LoginResponse, MessageResponse
)
from app.database import get_db_cursor

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(user: UserLogin):
    """Login endpoint for all user types"""
    try:
        with get_db_cursor() as cursor:
            # Check if user exists and password matches
            cursor.execute(
                "SELECT Email_id, Password, Category FROM Users WHERE Email_id = %s",
                (user.email,)
            )
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            email, stored_password, category = result
            
            # Verify password
            if user.password != stored_password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # Check if role matches
            if user.role != category:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"User is not a {user.role}"
                )
            
            # Get user details based on role
            user_id = None
            name = ""
            
            if category == "Student":
                cursor.execute(
                    "SELECT Student_id, Name FROM Student WHERE Email = %s",
                    (email,)
                )
                result = cursor.fetchone()
                if result:
                    user_id, name = result
            
            elif category == "Instructor":
                cursor.execute(
                    "SELECT Instructor_id, Name FROM Instructor WHERE Email = %s",
                    (email,)
                )
                result = cursor.fetchone()
                if result:
                    user_id, name = result
            
            elif category == "Data Analyst":
                cursor.execute(
                    "SELECT Name FROM Data_Analyst WHERE Email_id = %s",
                    (email,)
                )
                result = cursor.fetchone()
                if result:
                    name = result[0]
            
            elif category == "Admin":
                cursor.execute(
                    "SELECT Name FROM Administrator WHERE Email_id = %s",
                    (email,)
                )
                result = cursor.fetchone()
                if result:
                    name = result[0]
            
            return LoginResponse(
                message="Login successful",
                email=email,
                role=category,
                user_id=user_id,
                name=name
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/register/student", response_model=MessageResponse)
async def register_student(student: StudentCreate):
    """Register a new student"""
    try:
        # Validate email and password lengths
        if len(student.email) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is too long (max 255 characters)"
            )
        
        if len(student.password) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is too long (max 255 characters)"
            )
        
        if len(student.name) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name is too long (max 255 characters)"
            )
        
        with get_db_cursor() as cursor:
            # Check if email already exists
            cursor.execute(
                "SELECT Email_id FROM Users WHERE Email_id = %s",
                (student.email,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
            
            # Insert into Users table
            cursor.execute(
                "INSERT INTO Users (Email_id, Password, Category) VALUES (%s, %s, %s)",
                (student.email, student.password, "Student")
            )
            
            # Insert into Student table
            cursor.execute(
                """
                INSERT INTO Student (Name, Email, DOB, Country, Skill_level)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (student.name, student.email, student.dob, student.country, student.skill_level)
            )
            
            return MessageResponse(message="Student account created successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/register/instructor", response_model=MessageResponse)
async def register_instructor(instructor: InstructorCreate):
    """Register a new instructor"""
    try:
        # Validate email and password lengths
        if len(instructor.email) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is too long (max 255 characters)"
            )
        
        if len(instructor.password) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is too long (max 255 characters)"
            )
        
        if len(instructor.name) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name is too long (max 255 characters)"
            )
        
        with get_db_cursor() as cursor:
            # Check if email already exists
            cursor.execute(
                "SELECT Email_id FROM Users WHERE Email_id = %s",
                (instructor.email,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
            
            # Insert into Users table
            cursor.execute(
                "INSERT INTO Users (Email_id, Password, Category) VALUES (%s, %s, %s)",
                (instructor.email, instructor.password, "Instructor")
            )
            
            # Insert into Instructor table
            cursor.execute(
                "INSERT INTO Instructor (Name, Email) VALUES (%s, %s) RETURNING Instructor_id",
                (instructor.name, instructor.email)
            )
            instructor_id = cursor.fetchone()[0]
            
            # Insert expertise areas
            for expertise in instructor.expertise_areas:
                cursor.execute(
                    """
                    INSERT INTO Instructor_Expertise (Instructor_id, Expertise_area)
                    VALUES (%s, %s)
                    """,
                    (instructor_id, expertise)
                )
            
            return MessageResponse(message="Instructor account created successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
