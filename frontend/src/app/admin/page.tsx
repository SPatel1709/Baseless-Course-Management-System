'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminAPI } from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // University form
  const [universityName, setUniversityName] = useState('');
  const [universityLocation, setUniversityLocation] = useState('');

  // Book form
  const [bookName, setBookName] = useState('');
  const [bookISBN, setBookISBN] = useState('');
  const [bookAuthors, setBookAuthors] = useState('');

  // Course form
  const [courseName, setCourseName] = useState('');
  const [coursePrice, setCoursePrice] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [courseType, setCourseType] = useState('');
  const [duration, setDuration] = useState('');
  const [notesURL, setNotesURL] = useState('');
  const [videoURL, setVideoURL] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [bookId, setBookId] = useState('');
  const [topics, setTopics] = useState<string[]>(['']);
  const [selectedPrereqs, setSelectedPrereqs] = useState<number[]>([]);

  // Dropdown data
  const [universities, setUniversities] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);

  // Data Analyst form
  const [analystEmail, setAnalystEmail] = useState('');
  const [analystPassword, setAnalystPassword] = useState('');
  const [analystName, setAnalystName] = useState('');

  // Delete
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteBookId, setDeleteBookId] = useState('');
  const [deleteCourseId, setDeleteCourseId] = useState('');
  const [deleteWarning, setDeleteWarning] = useState('');
  const [forceDelete, setForceDelete] = useState(false);
  const [replaceCourseId, setReplaceCourseId] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'Admin') {
      router.push('/login');
      return;
    }

    setUser(userData);
    loadDropdownData();
  }, [router]);

  const loadDropdownData = async () => {
    try {
      const [universitiesData, booksData, instructorsData, coursesData] = await Promise.all([
        adminAPI.getUniversities(),
        adminAPI.getBooks(),
        adminAPI.getInstructors(),
        adminAPI.getCourses(),
      ]);
      setUniversities(universitiesData);
      setBooks(booksData);
      setInstructors(instructorsData);
      setAllCourses(coursesData);
    } catch (err: any) {
      console.error('Failed to load dropdown data:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setMessage('');
    } else {
      setMessage(msg);
      setError('');
    }
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  const handleAddUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.addUniversity({ name: universityName, country: universityLocation });
      showMessage('University added successfully!');
      setUniversityName('');
      setUniversityLocation('');
      loadDropdownData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const authorsArray = bookAuthors.split(',').map(a => a.trim()).filter(a => a);
      if (authorsArray.length === 0) {
        showMessage('Please enter at least one author', true);
        return;
      }
      await adminAPI.addBook({ name: bookName, isbn: bookISBN || null, authors: authorsArray });
      showMessage('Book added successfully!');
      setBookName('');
      setBookISBN('');
      setBookAuthors('');
      loadDropdownData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const topicNamesArray = topics.filter(t => t.trim());
      if (topicNamesArray.length === 0) {
        showMessage('Please enter at least one topic', true);
        return;
      }

      await adminAPI.createCourse({
        name: courseName,
        price: parseFloat(coursePrice),
        duration: parseInt(duration),
        course_type: courseType,
        difficulty_level: difficulty,
        notes_url: notesURL || null,
        video_url: videoURL || null,
        book_id: parseInt(bookId),
        uni_id: parseInt(universityId),
        instructor_id: parseInt(instructorId),
        prerequisite_course_ids: selectedPrereqs,
        topic_names: topicNamesArray,
      });
      showMessage('Course created successfully!');
      setCourseName('');
      setCoursePrice('');
      setDifficulty('');
      setCourseType('');
      setDuration('');
      setNotesURL('');
      setVideoURL('');
      setUniversityId('');
      setInstructorId('');
      setBookId('');
      setTopics(['']);
      setSelectedPrereqs([]);
      loadDropdownData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.deleteUser(deleteUserId);
      showMessage('User deleted successfully!');
      setDeleteUserId('');
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleCreateAnalyst = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createAnalyst({
        email: analystEmail,
        password: analystPassword,
        name: analystName,
      });
      showMessage('Data Analyst account created successfully!');
      setAnalystEmail('');
      setAnalystPassword('');
      setAnalystName('');
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleDeleteBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.deleteBook(parseInt(deleteBookId));
      showMessage('Book deleted successfully!');
      setDeleteBookId('');
      loadDropdownData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleDeleteCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const courseToDelete = allCourses.find(c => c.course_id.toString() === deleteCourseId);

      // Check if it has dependent courses
      if (courseToDelete?.dependent_courses?.length > 0 && !forceDelete) {
        const depNames = courseToDelete.dependent_courses.map((d: any) => d.name).join(', ');
        setDeleteWarning(
          `Warning: This course is a prerequisite for: ${depNames}. ` +
          `You can force delete (removes prereq entries), replace with another course, or cancel.`
        );
        return;
      }

      const replaceWith = replaceCourseId ? parseInt(replaceCourseId) : undefined;
      await adminAPI.deleteCourse(parseInt(deleteCourseId), forceDelete, replaceWith);
      showMessage('Course deleted successfully!');
      setDeleteCourseId('');
      setDeleteWarning('');
      setForceDelete(false);
      setReplaceCourseId('');
      loadDropdownData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const togglePrereq = (courseId: number) => {
    setSelectedPrereqs(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">System Admin Dashboard</h1>
            <p className="text-gray-600">Welcome, {user.name}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>

        {message && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">{message}</div>}
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <Tabs defaultValue="universities" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="delete">Delete</TabsTrigger>
          </TabsList>

          {/* Universities */}
          <TabsContent value="universities">
            <Card>
              <CardHeader>
                <CardTitle>Add Partner University</CardTitle>
                <CardDescription>Add a new university to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUniversity} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="uni-name">University Name *</Label>
                    <Input id="uni-name" placeholder="Harvard University" value={universityName} onChange={(e) => setUniversityName(e.target.value)} required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uni-location">Country *</Label>
                    <Input id="uni-location" placeholder="United States" value={universityLocation} onChange={(e) => setUniversityLocation(e.target.value)} required maxLength={100} />
                  </div>
                  <Button type="submit">Add University</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Books */}
          <TabsContent value="books">
            <Card>
              <CardHeader>
                <CardTitle>Add Book</CardTitle>
                <CardDescription>Add a new book to the library</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddBook} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="book-name">Book Name *</Label>
                    <Input id="book-name" placeholder="Introduction to Algorithms" value={bookName} onChange={(e) => setBookName(e.target.value)} required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="book-isbn">ISBN (optional)</Label>
                    <Input id="book-isbn" placeholder="978-0-262-03384-8" value={bookISBN} onChange={(e) => setBookISBN(e.target.value)} maxLength={20} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="book-authors">Authors * (comma-separated)</Label>
                    <Input id="book-authors" placeholder="Thomas H. Cormen, Charles E. Leiserson" value={bookAuthors} onChange={(e) => setBookAuthors(e.target.value)} required />
                  </div>
                  <Button type="submit">Add Book</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Create Course</CardTitle>
                <CardDescription>Create a new course with all details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Course Name *</Label>
                    <Input placeholder="Data Structures and Algorithms" value={courseName} onChange={(e) => setCourseName(e.target.value)} required maxLength={255} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price ($) *</Label>
                      <Input type="number" step="0.01" placeholder="99.99" value={coursePrice} onChange={(e) => setCoursePrice(e.target.value)} required min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (months) *</Label>
                      <Input type="number" placeholder="3" value={duration} onChange={(e) => setDuration(e.target.value)} required min="1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Difficulty Level *</Label>
                      <Select value={difficulty} onValueChange={setDifficulty} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Course Type *</Label>
                      <Select value={courseType} onValueChange={setCourseType} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Degree">Degree</SelectItem>
                          <SelectItem value="Certificate">Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Notes URL (optional)</Label>
                      <Input placeholder="https://example.com/notes.pdf" value={notesURL} onChange={(e) => setNotesURL(e.target.value)} maxLength={500} />
                    </div>
                    <div className="space-y-2">
                      <Label>Video URL (optional)</Label>
                      <Input placeholder="https://youtube.com/watch?v=..." value={videoURL} onChange={(e) => setVideoURL(e.target.value)} maxLength={500} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>University *</Label>
                      <Select value={universityId} onValueChange={setUniversityId} required>
                        <SelectTrigger><SelectValue placeholder="Select University" /></SelectTrigger>
                        <SelectContent>
                          {universities.map((uni) => (
                            <SelectItem key={uni.uni_id} value={uni.uni_id.toString()}>{uni.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Instructor *</Label>
                      <Select value={instructorId} onValueChange={setInstructorId} required>
                        <SelectTrigger><SelectValue placeholder="Select Instructor" /></SelectTrigger>
                        <SelectContent>
                          {instructors.map((inst) => (
                            <SelectItem key={inst.instructor_id} value={inst.instructor_id.toString()}>{inst.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Book *</Label>
                      <Select value={bookId} onValueChange={setBookId} required>
                        <SelectTrigger><SelectValue placeholder="Select Book" /></SelectTrigger>
                        <SelectContent>
                          {books.map((book) => (
                            <SelectItem key={book.book_id} value={book.book_id.toString()}>{book.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Topics * (at least one required)</Label>
                    {topics.map((topic, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Enter topic name"
                          value={topic}
                          onChange={(e) => {
                            const newTopics = [...topics];
                            newTopics[index] = e.target.value;
                            setTopics(newTopics);
                          }}
                          required={index === 0}
                          maxLength={255}
                        />
                        {topics.length > 1 && (
                          <Button type="button" variant="outline" size="icon" onClick={() => setTopics(topics.filter((_, i) => i !== index))}>✕</Button>
                        )}
                        {index === topics.length - 1 && (
                          <Button type="button" variant="outline" size="icon" onClick={() => setTopics([...topics, ''])}>+</Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Prerequisites - Multiselect with course names */}
                  <div className="space-y-2">
                    <Label>Prerequisites (optional - select from existing courses)</Label>
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                      {allCourses.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {allCourses.map((course) => (
                            <Badge
                              key={course.course_id}
                              variant={selectedPrereqs.includes(course.course_id) ? "default" : "outline"}
                              className="cursor-pointer hover:bg-primary/80 transition-colors"
                              onClick={() => togglePrereq(course.course_id)}
                            >
                              {course.name} {selectedPrereqs.includes(course.course_id) ? '✓' : '+'}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No existing courses to set as prerequisites</p>
                      )}
                    </div>
                    {selectedPrereqs.length > 0 && (
                      <div className="text-sm text-gray-600">
                        Selected prerequisites: {selectedPrereqs.map(id => allCourses.find(c => c.course_id === id)?.name).filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>

                  <Button type="submit">Create Course</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Create Data Analyst Account</CardTitle>
                <CardDescription>Add a new data analyst user to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAnalyst} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="analyst@example.com" value={analystEmail} onChange={(e) => setAnalystEmail(e.target.value)} required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" placeholder="********" value={analystPassword} onChange={(e) => setAnalystPassword(e.target.value)} required minLength={8} maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input placeholder="John Doe" value={analystName} onChange={(e) => setAnalystName(e.target.value)} required maxLength={255} />
                  </div>
                  <Button type="submit">Create Data Analyst</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delete */}
          <TabsContent value="delete">
            <div className="grid gap-4">
              {/* Delete User */}
              <Card>
                <CardHeader>
                  <CardTitle>Delete User</CardTitle>
                  <CardDescription>Remove a user by email</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDeleteUser} className="flex gap-4">
                    <Input placeholder="user@example.com" type="email" value={deleteUserId} onChange={(e) => setDeleteUserId(e.target.value)} required />
                    <Button type="submit" variant="destructive">Delete User</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Delete Book - Dropdown with names */}
              <Card>
                <CardHeader>
                  <CardTitle>Delete Book</CardTitle>
                  <CardDescription>Remove a book from the library</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDeleteBook} className="space-y-4">
                    <Select value={deleteBookId} onValueChange={setDeleteBookId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a book to delete" />
                      </SelectTrigger>
                      <SelectContent>
                        {books.map((book) => (
                          <SelectItem key={book.book_id} value={book.book_id.toString()}>
                            {book.name} {book.isbn ? `(ISBN: ${book.isbn})` : ''} — {book.authors?.join(', ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {deleteBookId && (() => {
                      const book = books.find(b => b.book_id.toString() === deleteBookId);
                      return book ? (
                        <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                          <p><span className="font-medium">Name:</span> {book.name}</p>
                          {book.isbn && <p><span className="font-medium">ISBN:</span> {book.isbn}</p>}
                          <p><span className="font-medium">Authors:</span> {book.authors?.join(', ') || 'N/A'}</p>
                        </div>
                      ) : null;
                    })()}
                    <Button type="submit" variant="destructive" disabled={!deleteBookId}>Delete Book</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Delete Course - Dropdown with names and prereq warning */}
              <Card>
                <CardHeader>
                  <CardTitle>Delete Course</CardTitle>
                  <CardDescription>Remove a course from the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="deleteCourseForm" onSubmit={handleDeleteCourse} className="space-y-4">
                    <Select value={deleteCourseId} onValueChange={(val) => {
                      setDeleteCourseId(val);
                      setDeleteWarning('');
                      setForceDelete(false);
                      setReplaceCourseId('');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course to delete" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCourses.map((course) => (
                          <SelectItem key={course.course_id} value={course.course_id.toString()}>
                            {course.name} ({course.course_type} — {course.difficulty_level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {deleteCourseId && (() => {
                      const course = allCourses.find(c => c.course_id.toString() === deleteCourseId);
                      return course ? (
                        <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                          <p><span className="font-medium">Name:</span> {course.name}</p>
                          <p><span className="font-medium">Type:</span> {course.course_type} | <span className="font-medium">Difficulty:</span> {course.difficulty_level}</p>
                          <p><span className="font-medium">University:</span> {course.university_name}</p>
                          {course.prerequisites?.length > 0 && (
                            <p><span className="font-medium">Prerequisites:</span> {course.prerequisites.map((p: any) => p.name).join(', ')}</p>
                          )}
                          {course.dependent_courses?.length > 0 && (
                            <p className="text-amber-600 font-medium">
                              ⚠ This course is a prerequisite for: {course.dependent_courses.map((d: any) => d.name).join(', ')}
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {deleteWarning && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                        <p className="text-amber-800 text-sm">{deleteWarning}</p>
                        <div className="space-y-2">
                          <Label>Replace prerequisite with another course (optional)</Label>
                          <Select value={replaceCourseId} onValueChange={setReplaceCourseId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select replacement course (or leave empty to just remove)" />
                            </SelectTrigger>
                            <SelectContent>
                              {allCourses
                                .filter(c => c.course_id.toString() !== deleteCourseId)
                                .map((course) => (
                                  <SelectItem key={course.course_id} value={course.course_id.toString()}>
                                    {course.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              setForceDelete(true);
                              setTimeout(() => {
                                const form = document.getElementById('deleteCourseForm') as HTMLFormElement;
                                form?.requestSubmit();
                              }, 0);
                            }}
                          >
                            {replaceCourseId ? 'Replace & Delete' : 'Force Delete'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => {
                            setDeleteWarning('');
                            setForceDelete(false);
                            setReplaceCourseId('');
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {!deleteWarning && (
                      <Button type="submit" variant="destructive" disabled={!deleteCourseId}>Delete Course</Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
