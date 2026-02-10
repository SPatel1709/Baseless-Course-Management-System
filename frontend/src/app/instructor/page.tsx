'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { instructorAPI } from '@/lib/api';

export default function InstructorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // My courses
  const [myCourses, setMyCourses] = useState<any[]>([]);

  // Add content
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [existingTopics, setExistingTopics] = useState<any[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [notesUrl, setNotesUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Evaluate student
  const [evalCourseId, setEvalCourseId] = useState('');
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evaluationScore, setEvaluationScore] = useState('');
  const [evalStatus, setEvalStatus] = useState('Pending');

  // Change book
  const [bookCourseId, setBookCourseId] = useState('');
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookISBN, setNewBookISBN] = useState('');
  const [newBookAuthors, setNewBookAuthors] = useState('');

  // Profile
  const [profileData, setProfileData] = useState<any>(null);
  const [newExpertise, setNewExpertise] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'Instructor') {
      router.push('/login');
      return;
    }

    setUser(userData);
    loadMyCourses(userData.email);
    loadBooks();
    loadTopics();
    loadProfile(userData.email);
  }, [router]);

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
    setTimeout(() => { setMessage(''); setError(''); }, 3000);
  };

  const loadMyCourses = async (email: string) => {
    try {
      const courses = await instructorAPI.getMyCourses(email);
      setMyCourses(courses);
    } catch (err: any) {
      showMessage('Failed to load courses: ' + err.message, true);
    }
  };

  const loadBooks = async () => {
    try {
      const books = await instructorAPI.getBooks();
      setAllBooks(books);
    } catch (err: any) {
      console.error('Failed to load books:', err);
    }
  };

  const loadTopics = async () => {
    try {
      const topics = await instructorAPI.getTopics();
      setExistingTopics(topics);
    } catch (err: any) {
      console.error('Failed to load topics:', err);
    }
  };

  const loadProfile = async (email: string) => {
    try {
      const profile = await instructorAPI.getProfile(email);
      setProfileData(profile);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    }
  };

  const loadCourseStudents = async (courseId: string) => {
    if (!courseId) { setCourseStudents([]); return; }
    try {
      const students = await instructorAPI.getCourseStudents(user.email, parseInt(courseId));
      setCourseStudents(students);
    } catch (err: any) {
      showMessage('Failed to load students: ' + err.message, true);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const topicNames = [...selectedTopics];
      if (newTopicName.trim()) {
        topicNames.push(newTopicName.trim());
      }

      await instructorAPI.addCourseContent(user.email, {
        course_id: parseInt(selectedCourseId),
        topic_names: topicNames.length > 0 ? topicNames : undefined,
        notes_url: notesUrl || undefined,
        video_url: videoUrl || undefined,
      });
      showMessage('Course content added successfully!');
      setSelectedTopics([]);
      setNewTopicName('');
      setNotesUrl('');
      setVideoUrl('');
      loadMyCourses(user.email);
      loadTopics();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await instructorAPI.evaluateStudent(user.email, {
        student_id: parseInt(evalStudentId),
        course_id: parseInt(evalCourseId),
        evaluation_score: parseFloat(evaluationScore),
        status: evalStatus,
      });
      showMessage('Student evaluated successfully!');
      setEvalStudentId('');
      setEvaluationScore('');
      setEvalStatus('Pending');
      loadCourseStudents(evalCourseId);
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleChangeBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await instructorAPI.changeCourseBook(user.email, parseInt(bookCourseId), parseInt(selectedBookId));
      showMessage('Course book changed successfully!');
      setBookCourseId('');
      setSelectedBookId('');
      loadMyCourses(user.email);
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleAddNewBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const authorsArray = newBookAuthors.split(',').map(a => a.trim()).filter(a => a);
      if (authorsArray.length === 0) {
        showMessage('Please enter at least one author', true);
        return;
      }
      await instructorAPI.addBook({
        name: newBookName,
        isbn: newBookISBN || null,
        authors: authorsArray,
      });
      showMessage('Book added successfully!');
      setNewBookName('');
      setNewBookISBN('');
      setNewBookAuthors('');
      setShowAddBook(false);
      loadBooks();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleAddExpertise = async () => {
    if (!newExpertise.trim()) return;
    try {
      await instructorAPI.addExpertise(user.email, newExpertise.trim());
      showMessage('Expertise area added!');
      setNewExpertise('');
      loadProfile(user.email);
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleRemoveExpertise = async (area: string) => {
    try {
      await instructorAPI.removeExpertise(user.email, area);
      showMessage('Expertise area removed!');
      loadProfile(user.email);
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const toggleTopicSelection = (topicName: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicName) ? prev.filter(t => t !== topicName) : [...prev, topicName]
    );
  };

  const getCurrentBookForCourse = (courseId: string) => {
    const course = myCourses.find(c => c.course_id.toString() === courseId);
    return course ? { name: course.book_name, id: course.book_id } : null;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
            <p className="text-gray-600">Welcome, {user.name}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>

        {message && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">{message}</div>}
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="content">Add Content</TabsTrigger>
            <TabsTrigger value="evaluate">Evaluate</TabsTrigger>
            <TabsTrigger value="book">Change Book</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* My Courses - Card UI */}
          <TabsContent value="courses">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">My Teaching Courses</h2>
              {myCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myCourses.map((course: any) => (
                    <Card key={course.course_id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{course.course_name}</CardTitle>
                        <CardDescription>{course.university_name}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{course.difficulty_level}</Badge>
                          <Badge variant="secondary">{course.course_type}</Badge>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-1 font-medium">{course.duration} months</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <span className="ml-1 font-medium">${course.price}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Students:</span>
                            <span className="ml-1 font-medium">{course.student_count}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Book:</span>
                            <span className="ml-1 font-medium">{course.book_name}</span>
                          </div>
                        </div>
                        {course.topics && course.topics.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <span className="text-sm text-gray-500">Topics:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {course.topics.map((topic: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">{topic}</Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        {(course.notes_url || course.video_url) && (
                          <>
                            <Separator />
                            <div className="flex gap-2 text-sm">
                              {course.notes_url && (
                                <a href={course.notes_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Notes</a>
                              )}
                              {course.video_url && (
                                <a href={course.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Video</a>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-gray-500">You are not teaching any courses yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Add Content */}
          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Add Course Content</CardTitle>
                <CardDescription>Add topics, notes, and videos to your courses</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddContent} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select Course *</Label>
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {myCourses.map((course) => (
                          <SelectItem key={course.course_id} value={course.course_id.toString()}>
                            {course.course_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Add Topics from Existing List</Label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                      {existingTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {existingTopics.map((topic) => (
                            <Badge
                              key={topic.topic_id}
                              variant={selectedTopics.includes(topic.name) ? "default" : "outline"}
                              className="cursor-pointer hover:bg-primary/80 transition-colors"
                              onClick={() => toggleTopicSelection(topic.name)}
                            >
                              {topic.name} {selectedTopics.includes(topic.name) ? '✓' : '+'}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No existing topics found</p>
                      )}
                    </div>
                    {selectedTopics.length > 0 && (
                      <div className="text-sm text-gray-600">
                        Selected: {selectedTopics.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-topic">Add New Topic</Label>
                    <Input
                      id="new-topic"
                      placeholder="Enter a new topic name"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes URL</Label>
                      <Input
                        id="notes"
                        type="url"
                        placeholder="https://example.com/notes"
                        value={notesUrl}
                        onChange={(e) => setNotesUrl(e.target.value)}
                        maxLength={500}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="video">Video URL</Label>
                      <Input
                        id="video"
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        maxLength={500}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={!selectedCourseId}>Add Content</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluate Student */}
          <TabsContent value="evaluate">
            <Card>
              <CardHeader>
                <CardTitle>Evaluate Student</CardTitle>
                <CardDescription>Select a course, then choose a student to evaluate</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEvaluate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Course *</Label>
                      <Select value={evalCourseId} onValueChange={(val) => {
                        setEvalCourseId(val);
                        setEvalStudentId('');
                        loadCourseStudents(val);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a course" />
                        </SelectTrigger>
                        <SelectContent>
                          {myCourses.map((course) => (
                            <SelectItem key={course.course_id} value={course.course_id.toString()}>
                              {course.course_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Student *</Label>
                      <Select value={evalStudentId} onValueChange={setEvalStudentId} disabled={!evalCourseId}>
                        <SelectTrigger>
                          <SelectValue placeholder={evalCourseId ? "Choose a student" : "Select a course first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {courseStudents.map((student) => (
                            <SelectItem key={student.student_id} value={student.student_id.toString()}>
                              {student.name} ({student.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {evalStudentId && courseStudents.length > 0 && (() => {
                    const student = courseStudents.find((s: any) => s.student_id.toString() === evalStudentId);
                    return student && student.evaluation_score !== null ? (
                      <div className="p-3 bg-blue-50 rounded-lg text-sm">
                        <span className="font-medium">Current Score:</span> {student.evaluation_score}% |{' '}
                        <span className="font-medium">Status:</span> {student.status}
                      </div>
                    ) : null;
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eval-score">Evaluation Score (0-100) *</Label>
                      <Input
                        id="eval-score"
                        type="number"
                        step="0.01"
                        placeholder="85.5"
                        value={evaluationScore}
                        onChange={(e) => setEvaluationScore(e.target.value)}
                        required
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select value={evalStatus} onValueChange={setEvalStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={!evalStudentId || !evaluationScore}>Evaluate Student</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Change Book */}
          <TabsContent value="book">
            <Card>
              <CardHeader>
                <CardTitle>Change Course Book</CardTitle>
                <CardDescription>Update the textbook for a course</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangeBook} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Course *</Label>
                    <Select value={bookCourseId} onValueChange={(val) => {
                      setBookCourseId(val);
                      setSelectedBookId('');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {myCourses.map((course) => (
                          <SelectItem key={course.course_id} value={course.course_id.toString()}>
                            {course.course_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {bookCourseId && (() => {
                    const currentBook = getCurrentBookForCourse(bookCourseId);
                    return currentBook ? (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <Label className="text-sm text-gray-500">Current Book</Label>
                        <p className="font-medium text-lg">{currentBook.name}</p>
                      </div>
                    ) : null;
                  })()}

                  <div className="space-y-2">
                    <Label>Select New Book *</Label>
                    <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a book" />
                      </SelectTrigger>
                      <SelectContent>
                        {allBooks.map((book) => (
                          <SelectItem key={book.book_id} value={book.book_id.toString()}>
                            {book.name} {book.authors?.length > 0 ? `(${book.authors.join(', ')})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={!bookCourseId || !selectedBookId}>Change Book</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddBook(!showAddBook)}>
                      {showAddBook ? 'Cancel' : 'Add New Book'}
                    </Button>
                  </div>
                </form>

                {showAddBook && (
                  <>
                    <Separator className="my-4" />
                    <form onSubmit={handleAddNewBook} className="space-y-4">
                      <h3 className="font-semibold">Add New Book to Database</h3>
                      <div className="space-y-2">
                        <Label htmlFor="new-book-name">Book Name *</Label>
                        <Input
                          id="new-book-name"
                          placeholder="Introduction to Algorithms"
                          value={newBookName}
                          onChange={(e) => setNewBookName(e.target.value)}
                          required
                          maxLength={255}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-book-isbn">ISBN (optional)</Label>
                        <Input
                          id="new-book-isbn"
                          placeholder="978-0-262-03384-8"
                          value={newBookISBN}
                          onChange={(e) => setNewBookISBN(e.target.value)}
                          maxLength={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-book-authors">Authors * (comma-separated)</Label>
                        <Input
                          id="new-book-authors"
                          placeholder="Author 1, Author 2"
                          value={newBookAuthors}
                          onChange={(e) => setNewBookAuthors(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit">Add Book</Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Manage your expertise areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Email (Read Only)</Label>
                  <Input value={user.email} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={profileData?.name || user.name} disabled />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Expertise Areas</Label>
                  {profileData?.expertise_areas && profileData.expertise_areas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileData.expertise_areas.map((area: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-sm py-1 px-3 flex items-center gap-1">
                          {area}
                          <button
                            onClick={() => handleRemoveExpertise(area)}
                            className="ml-1 text-red-500 hover:text-red-700 font-bold"
                            type="button"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No expertise areas added yet.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-expertise">Add New Expertise</Label>
                  <div className="flex gap-2">
                    <Input
                      id="add-expertise"
                      placeholder="e.g. Machine Learning"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      maxLength={255}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExpertise();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddExpertise} disabled={!newExpertise.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
