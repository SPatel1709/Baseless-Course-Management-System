-- =============================================
-- ENTITY TABLES
-- =============================================

-- University Table
CREATE TABLE University (
    Uni_id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Country VARCHAR(100) NOT NULL
);

-- Topic Table
CREATE TABLE Topic (
    Topic_id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL
);

-- Book Table
CREATE TABLE Book (
    Book_id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    ISBN VARCHAR(20)
);

-- Book_Author Table (for multivalued attribute Author)
CREATE TABLE Book_Author (
    Book_id INT,
    Author VARCHAR(255),
    PRIMARY KEY (Book_id, Author),
    FOREIGN KEY (Book_id) REFERENCES Book(Book_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Course Table
CREATE TABLE Course (
    Course_id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL UNIQUE,
    Price DECIMAL(10, 2) NOT NULL,
    Duration INT NOT NULL,  -- Duration in months
    Course_Type VARCHAR(20) CHECK (Course_Type IN ('Diploma', 'Degree', 'Certificate')), 
    Difficulty_level VARCHAR(20) CHECK (Difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
    Notes_URL VARCHAR(500),  -- Optional attribute
    Video_URL VARCHAR(500),  -- Optional attribute
    Book_id INT NOT NULL,  -- Foreign key for has_book relationship (M:1)
    Uni_id INT NOT NULL,  -- Foreign key for Partnered_with relationship (M:1)
    FOREIGN KEY (Book_id) REFERENCES Book(Book_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    FOREIGN KEY (Uni_id) REFERENCES University(Uni_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Course_Topic Table (M:M relationship - a course can cover multiple topics)
CREATE TABLE Course_Topic (
    Course_id INT,
    Topic_id INT,
    PRIMARY KEY (Course_id, Topic_id),
    FOREIGN KEY (Course_id) REFERENCES Course(Course_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (Topic_id) REFERENCES Topic(Topic_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);
-- here we will ensure that each course will have atleast 1 topic in frontend


-- Pre-requisites Table (self-referencing relationship for Course)
CREATE TABLE Course_Prerequisites (
    Course_id INT,
    Prerequisite_Course_id INT,
    PRIMARY KEY (Course_id, Prerequisite_Course_id),
    FOREIGN KEY (Course_id) REFERENCES Course(Course_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (Prerequisite_Course_id) REFERENCES Course(Course_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CHECK (Course_id != Prerequisite_Course_id)  -- A course cannot be prerequisite of itself
);

-- Users Table (Super entity for Data_Analyst and Administrator)
-- MOVED HERE - Must be created before Student and Instructor
CREATE TABLE Users (
    Email_id VARCHAR(255) PRIMARY KEY,
    Category VARCHAR(15) NOT NULL CHECK (Category IN ('Student', 'Instructor', 'Data Analyst', 'Admin')),
    Password VARCHAR(255) NOT NULL 
);

-- Student Table
CREATE TABLE Student (
    Student_id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    DOB DATE NOT NULL,
    -- Age is derived attribute, can be calculated from DOB
    Country VARCHAR(100) NOT NULL,
    Skill_level VARCHAR(20) CHECK (Skill_level IN ('Beginner', 'Intermediate', 'Advanced')),
    FOREIGN KEY (Email) REFERENCES Users(Email_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Instructor Table
CREATE TABLE Instructor (
    Instructor_id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    FOREIGN KEY (Email) REFERENCES Users(Email_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Instructor_Expertise Table (for multivalued attribute Expertise_area)
CREATE TABLE Instructor_Expertise (
    Instructor_id INT,
    Expertise_area VARCHAR(255),
    PRIMARY KEY (Instructor_id, Expertise_area),
    FOREIGN KEY (Instructor_id) REFERENCES Instructor(Instructor_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Data_Analyst Table
CREATE TABLE Data_Analyst (
    Email_id VARCHAR(255) PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    FOREIGN KEY (Email_id) REFERENCES Users(Email_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Administrator Table
CREATE TABLE Administrator (
    Email_id VARCHAR(255) PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    FOREIGN KEY (Email_id) REFERENCES Users(Email_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- =============================================
-- RELATIONSHIP TABLES (M:M)
-- =============================================

-- Enrolled_in Table (M:M between Student and Course with attributes)
CREATE TABLE Enrolled_in (
    Student_id INT,
    Course_id INT,
    Evaluation_score DECIMAL(5, 2) CHECK (Evaluation_score >= 0 AND Evaluation_score <= 100),
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('Pending', 'Completed')),
    PRIMARY KEY (Student_id, Course_id),
    FOREIGN KEY (Student_id) REFERENCES Student(Student_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (Course_id) REFERENCES Course(Course_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Teaches Table (M:M between Instructor and Course)
CREATE TABLE Teaches (
    Instructor_id INT,
    Course_id INT,
    PRIMARY KEY (Instructor_id, Course_id),
    FOREIGN KEY (Instructor_id) REFERENCES Instructor(Instructor_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (Course_id) REFERENCES Course(Course_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);
