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
import { studentAPI } from '@/lib/api';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Search state
  const [searchName, setSearchName] = useState('');
  const [searchDifficulty, setSearchDifficulty] = useState('all');
  const [searchType, setSearchType] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // My courses
  const [myCourses, setMyCourses] = useState<any[]>([]);

  // Profile update
  const [country, setCountry] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const COUNTRIES = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
    'India', 'China', 'Japan', 'Singapore', 'Brazil', 'Mexico', 'South Korea',
    'Netherlands', 'Sweden', 'Switzerland', 'Italy', 'Spain', 'Other'
  ];

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'Student') {
      router.push('/login');
      return;
    }

    setUser(userData);
    loadMyCourses(userData.email);
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
      const courses = await studentAPI.getMyCourses(email);
      setMyCourses(courses);
    } catch (err: any) {
      showMessage('Failed to load courses: ' + err.message, true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const params: any = {};
      if (searchName) params.name = searchName;
      if (searchDifficulty && searchDifficulty !== 'all') params.difficulty_level = searchDifficulty;
      if (searchType && searchType !== 'all') params.course_type = searchType;

      const results = await studentAPI.searchCourses(params);
      setSearchResults(results);
    } catch (err: any) {
      showMessage('Search failed: ' + err.message, true);
    }
  };

  const handleEnroll = async (courseId: number) => {
    try {
      await studentAPI.enrollInCourse(user.email, courseId);
      showMessage('Successfully enrolled in course!');
      loadMyCourses(user.email);
      setSearchResults(prev => prev.filter(c => c.course_id !== courseId));
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updates: any = {};
      if (country) updates.country = country;
      if (skillLevel) updates.skill_level = skillLevel;
      if (dateOfBirth) updates.dob = dateOfBirth;

      if (Object.keys(updates).length === 0) {
        showMessage('Please update at least one field', true);
        return;
      }

      await studentAPI.updateProfile(user.email, updates);
      showMessage('Profile updated successfully!');
      setCountry('');
      setSkillLevel('');
      setDateOfBirth('');
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-gray-600">Welcome, {user.name}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>

        {message && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">{message}</div>}
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <Tabs defaultValue="search" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search Courses</TabsTrigger>
            <TabsTrigger value="my-courses">My Courses</TabsTrigger>
            <TabsTrigger value="profile">Edit Profile</TabsTrigger>
          </TabsList>

          {/* Search Courses */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Search & Enroll in Courses</CardTitle>
                <CardDescription>Find courses and enroll if you meet the prerequisites</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-name">Course Name</Label>
                      <Input
                        id="search-name"
                        placeholder="Data Structures"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={searchDifficulty} onValueChange={setSearchDifficulty}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any</SelectItem>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Course Type</Label>
                      <Select value={searchType} onValueChange={setSearchType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Degree">Degree</SelectItem>
                          <SelectItem value="Certificate">Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit">Search Courses</Button>
                </form>

                {searchResults.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((course: any) => (
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
                              <span className="text-gray-500">Book:</span>
                              <span className="ml-1 font-medium">{course.book_name}</span>
                            </div>
                          </div>
                          {course.instructors && course.instructors.length > 0 && (
                            <div className="text-sm">
                              <span className="text-gray-500">Instructors:</span>
                              <span className="ml-1">{course.instructors.join(', ')}</span>
                            </div>
                          )}
                          {course.topics && course.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {course.topics.map((topic: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{topic}</Badge>
                              ))}
                            </div>
                          )}
                          {course.prerequisites && course.prerequisites.length > 0 && (
                            <div className="text-sm text-amber-600">
                              Prerequisites: {course.prerequisites.join(', ')}
                            </div>
                          )}
                          <Button size="sm" className="w-full" onClick={() => handleEnroll(course.course_id)}>
                            Enroll
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Courses */}
          <TabsContent value="my-courses">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">My Enrolled Courses</h2>
              {myCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myCourses.map((course: any) => (
                    <Card key={course.course_id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{course.course_name}</CardTitle>
                          <Badge variant={course.status === 'Completed' ? 'default' : 'secondary'}>
                            {course.status}
                          </Badge>
                        </div>
                        {course.university_name && (
                          <CardDescription>{course.university_name}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {course.difficulty_level && (
                            <Badge variant="outline">{course.difficulty_level}</Badge>
                          )}
                          {course.course_type && (
                            <Badge variant="secondary">{course.course_type}</Badge>
                          )}
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {course.duration && (
                            <div>
                              <span className="text-gray-500">Duration:</span>
                              <span className="ml-1 font-medium">{course.duration} months</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Score:</span>
                            <span className="ml-1 font-medium">
                              {course.evaluation_score !== null && course.evaluation_score !== undefined
                                ? `${course.evaluation_score}%`
                                : 'Not evaluated'}
                            </span>
                          </div>
                        </div>
                        {course.instructor_names && course.instructor_names.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-500">Instructors:</span>
                            <span className="ml-1">{course.instructor_names.join(', ')}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-gray-500">You are not enrolled in any courses yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal information (email cannot be changed)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email (Read Only)</Label>
                    <Input value={user.email} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Skill Level</Label>
                    <Select value={skillLevel} onValueChange={setSkillLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>

                  <Button type="submit">Update Profile</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
