const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Auth APIs
export const authAPI = {
  login: (email: string, password: string, role: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),

  registerStudent: (data: any) =>
    apiRequest('/auth/register/student', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  registerInstructor: (data: any) =>
    apiRequest('/auth/register/instructor', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Admin APIs
export const adminAPI = {
  addUniversity: (data: { name: string; country: string }) =>
    apiRequest('/admin/university', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addBook: (data: any) =>
    apiRequest('/admin/book', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createCourse: (data: any) =>
    apiRequest('/admin/course', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCourse: (courseId: number, data: any) =>
    apiRequest(`/admin/course/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCourse: (courseId: number, force: boolean = false, replaceWith?: number) => {
    let url = `/admin/course/${courseId}?force=${force}`;
    if (replaceWith) url += `&replace_with=${replaceWith}`;
    return apiRequest(url, { method: 'DELETE' });
  },

  deleteUser: (email: string) =>
    apiRequest(`/admin/user/${email}`, {
      method: 'DELETE',
    }),

  deleteBook: (bookId: number) =>
    apiRequest(`/admin/book/${bookId}`, {
      method: 'DELETE',
    }),

  createAnalyst: (data: any) =>
    apiRequest('/admin/analyst', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUniversities: () =>
    apiRequest('/admin/universities'),

  getBooks: () =>
    apiRequest('/admin/books'),

  getInstructors: () =>
    apiRequest('/admin/instructors'),

  getTopics: () =>
    apiRequest('/admin/topics'),

  getCourses: () =>
    apiRequest('/admin/courses'),
};

// Student APIs
export const studentAPI = {
  searchCourses: (params: any) =>
    apiRequest('/student/search-courses', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  enrollInCourse: (email: string, courseId: number) =>
    apiRequest(`/student/enroll?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    }),

  getMyCourses: (email: string) =>
    apiRequest(`/student/my-courses/${email}`),

  updateProfile: (email: string, data: any) =>
    apiRequest(`/student/profile/${email}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Instructor APIs
export const instructorAPI = {
  getMyCourses: (email: string) =>
    apiRequest(`/instructor/my-courses/${email}`),

  getProfile: (email: string) =>
    apiRequest(`/instructor/profile/${email}`),

  addCourseContent: (email: string, data: any) =>
    apiRequest(`/instructor/course/content?email=${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  evaluateStudent: (email: string, data: any) =>
    apiRequest(`/instructor/evaluate?email=${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changeCourseBook: (email: string, courseId: number, bookId: number) =>
    apiRequest(`/instructor/course/book?email=${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify({ course_id: courseId, book_id: bookId }),
    }),

  getCourseStudents: (email: string, courseId: number) =>
    apiRequest(`/instructor/course/${courseId}/students?email=${encodeURIComponent(email)}`),

  getBooks: () =>
    apiRequest('/instructor/books'),

  getTopics: () =>
    apiRequest('/instructor/topics'),

  addBook: (data: any) =>
    apiRequest('/instructor/book', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProfile: (email: string, data: any) =>
    apiRequest(`/instructor/profile/${email}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addExpertise: (email: string, area: string) =>
    apiRequest(`/instructor/profile/${email}/expertise/add?area=${encodeURIComponent(area)}`, {
      method: 'POST',
    }),

  removeExpertise: (email: string, area: string) =>
    apiRequest(`/instructor/profile/${email}/expertise/${encodeURIComponent(area)}`, {
      method: 'DELETE',
    }),
};

// Analyst APIs
export const analystAPI = {
  getCourseStatistics: (params: any) =>
    apiRequest('/analyst/statistics/courses', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getEnrollmentByDifficulty: (params: any) => {
    const query = new URLSearchParams();
    if (params.university_id) query.set('university_id', params.university_id);
    if (params.instructor_id) query.set('instructor_id', params.instructor_id);
    const qs = query.toString();
    return apiRequest(`/analyst/statistics/enrollment-by-difficulty${qs ? '?' + qs : ''}`);
  },

  getEnrollmentByType: (params: any) => {
    const query = new URLSearchParams();
    if (params.university_id) query.set('university_id', params.university_id);
    if (params.instructor_id) query.set('instructor_id', params.instructor_id);
    const qs = query.toString();
    return apiRequest(`/analyst/statistics/enrollment-by-type${qs ? '?' + qs : ''}`);
  },

  getUniversityStatistics: () =>
    apiRequest('/analyst/statistics/universities'),

  getInstructorStatistics: () =>
    apiRequest('/analyst/statistics/instructors'),

  getStudentStatistics: () =>
    apiRequest('/analyst/statistics/students'),

  getTopicStatistics: () =>
    apiRequest('/analyst/statistics/topics'),

  getCompletionRates: () =>
    apiRequest('/analyst/statistics/completion-rates'),

  getUniversities: () =>
    apiRequest('/analyst/universities'),

  getInstructors: () =>
    apiRequest('/analyst/instructors'),

  getCoursesList: () =>
    apiRequest('/analyst/statistics/courses-list'),

  getCourseStudents: (courseId: number) =>
    apiRequest(`/analyst/statistics/course/${courseId}/students`),
};
