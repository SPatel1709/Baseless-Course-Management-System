'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { analystAPI } from '@/lib/api';

export default function AnalystDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');

  // lookup data
  const [universities, setUniversities] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);

  // filters
  const [filterUni, setFilterUni] = useState('');
  const [filterInst, setFilterInst] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [filterType, setFilterType] = useState('');

  // course drill-down (cascading: type → university → course)
  const [drillType, setDrillType] = useState('');
  const [drillUni, setDrillUni] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseStudents, setCourseStudents] = useState<any[]>([]);

  // data
  const [courseStats, setCourseStats] = useState<any[]>([]);
  const [diffStats, setDiffStats] = useState<any[]>([]);
  const [typeStats, setTypeStats] = useState<any[]>([]);
  const [uniStats, setUniStats] = useState<any[]>([]);
  const [instStats, setInstStats] = useState<any[]>([]);
  const [stuStats, setStuStats] = useState<any>(null);
  const [topicStats, setTopicStats] = useState<any[]>([]);
  const [completionStats, setCompletionStats] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { router.push('/login'); return; }
    const userData = JSON.parse(userStr);
    if (userData.role !== 'Data Analyst') { router.push('/login'); return; }
    setUser(userData);
    boot();
  }, [router]);

  const boot = async () => {
    try {
      const [unis, insts, courses, stu, topics, completion, uniSt, instSt] = await Promise.all([
        analystAPI.getUniversities(),
        analystAPI.getInstructors(),
        analystAPI.getCoursesList(),
        analystAPI.getStudentStatistics(),
        analystAPI.getTopicStatistics(),
        analystAPI.getCompletionRates(),
        analystAPI.getUniversityStatistics(),
        analystAPI.getInstructorStatistics(),
      ]);
      setUniversities(unis);
      setInstructors(insts);
      setCoursesList(courses);
      setStuStats(stu);
      setTopicStats(topics);
      setCompletionStats(completion);
      setUniStats(uniSt);
      setInstStats(instSt);
      setLoaded(true);
    } catch (err: any) { console.error(err); }
  };

  const handleLogout = () => { localStorage.removeItem('user'); router.push('/'); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 4000); };

  const handleFilter = async () => {
    try {
      const p: any = {};
      if (filterUni) p.university_id = parseInt(filterUni);
      if (filterInst) p.instructor_id = parseInt(filterInst);
      if (filterDiff) p.difficulty_level = filterDiff;
      if (filterType) p.course_type = filterType;

      const ep: any = {};
      if (filterUni) ep.university_id = filterUni;
      if (filterInst) ep.instructor_id = filterInst;

      const [courses, diff, type] = await Promise.all([
        analystAPI.getCourseStatistics(p),
        analystAPI.getEnrollmentByDifficulty(ep),
        analystAPI.getEnrollmentByType(ep),
      ]);
      setCourseStats(courses);
      setDiffStats(diff);
      setTypeStats(type);
    } catch (err: any) { showError(err.message); }
  };

  const handleCourseStudents = async () => {
    if (!selectedCourseId) return;
    try {
      const students = await analystAPI.getCourseStudents(parseInt(selectedCourseId));
      setCourseStudents(students);
    } catch (err: any) { showError(err.message); }
  };

  const clearFilters = () => {
    setFilterUni('');
    setFilterInst('');
    setFilterDiff('');
    setFilterType('');
    setCourseStats([]);
    setDiffStats([]);
    setTypeStats([]);
  };

  if (!user) return null;
  const overall = stuStats?.overall;
  const selectedCourseName = coursesList.find(c => String(c.course_id) === selectedCourseId)?.name;

  // cascading filtered lists for drill-down
  const drillUniversities = drillType
    ? [...new Map(coursesList.filter(c => c.course_type === drillType).map(c => [c.university_name, c])).values()]
    : [];
  const drillCourses = coursesList.filter(c =>
    (!drillType || c.course_type === drillType) &&
    (!drillUni || c.university_name === drillUni)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user.name}</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* ── Key Metrics ── */}
        {loaded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">{overall?.total_students ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Total Students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-violet-600">{coursesList.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Courses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{uniStats.length}</p>
                <p className="text-xs text-gray-500 mt-1">Universities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{overall?.overall_avg_score ? `${Number(overall.overall_avg_score).toFixed(0)}%` : '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Avg Score</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Filter Section ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Course & Enrollment Filters</CardTitle>
            <CardDescription>Select any combination and click Apply to get filtered statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">University</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={filterUni}
                  onChange={e => setFilterUni(e.target.value)}
                >
                  <option value="">All Universities</option>
                  {universities.map(u => (
                    <option key={u.uni_id} value={u.uni_id}>{u.name} ({u.country})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Instructor</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={filterInst}
                  onChange={e => setFilterInst(e.target.value)}
                >
                  <option value="">All Instructors</option>
                  {instructors.map(i => (
                    <option key={i.instructor_id} value={i.instructor_id}>{i.name} ({i.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Difficulty</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={filterDiff}
                  onChange={e => setFilterDiff(e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Course Type</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Degree">Degree</option>
                  <option value="Certificate">Certificate</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleFilter} size="sm">Apply Filters</Button>
              <Button onClick={clearFilters} size="sm" variant="outline">Clear</Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Filtered: Course Results ── */}
        {courseStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Course Statistics</CardTitle>
              <CardDescription>{courseStats.length} courses match your filters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Instructors</TableHead>
                      <TableHead className="text-right">Enrolled</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Avg Score</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseStats.map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.course_name}</TableCell>
                        <TableCell>{s.university_name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{s.course_type}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.difficulty_level}</Badge></TableCell>
                        <TableCell className="text-xs">{s.instructors?.join(', ') || '—'}</TableCell>
                        <TableCell className="text-right">{s.enrolled_students}</TableCell>
                        <TableCell className="text-right">{s.completed_count}</TableCell>
                        <TableCell className="text-right">{s.pending_count}</TableCell>
                        <TableCell className="text-right">{s.avg_score ? `${Number(s.avg_score).toFixed(1)}%` : '—'}</TableCell>
                        <TableCell className="text-right">${Number(s.price).toFixed(0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Filtered: Enrollment Breakdown ── */}
        {(diffStats.length > 0 || typeStats.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {diffStats.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Enrollment by Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Difficulty</TableHead>
                          <TableHead className="text-right">Courses</TableHead>
                          <TableHead className="text-right">Enrolled</TableHead>
                          <TableHead className="text-right">Completed</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                          <TableHead className="text-right">Avg Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diffStats.map((s: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.difficulty_level}</TableCell>
                            <TableCell className="text-right">{s.course_count}</TableCell>
                            <TableCell className="text-right">{s.total_enrollments}</TableCell>
                            <TableCell className="text-right">{s.completed}</TableCell>
                            <TableCell className="text-right">{s.pending}</TableCell>
                            <TableCell className="text-right">{s.avg_score ? `${Number(s.avg_score).toFixed(1)}%` : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
            {typeStats.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Enrollment by Course Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Courses</TableHead>
                          <TableHead className="text-right">Enrolled</TableHead>
                          <TableHead className="text-right">Avg Score</TableHead>
                          <TableHead className="text-right">Avg Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeStats.map((s: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.course_type}</TableCell>
                            <TableCell className="text-right">{s.course_count}</TableCell>
                            <TableCell className="text-right">{s.total_enrollments}</TableCell>
                            <TableCell className="text-right">{s.avg_score ? `${Number(s.avg_score).toFixed(1)}%` : '—'}</TableCell>
                            <TableCell className="text-right">{s.avg_price ? `$${Number(s.avg_price).toFixed(0)}` : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Separator />

        {/* ── Course Student Drill-Down ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Course Student Details</CardTitle>
            <CardDescription>Select course type, then university, then course to view enrolled students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">1. Course Type</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={drillType}
                  onChange={e => { setDrillType(e.target.value); setDrillUni(''); setSelectedCourseId(''); setCourseStudents([]); }}
                >
                  <option value="">Select type...</option>
                  <option value="Degree">Degree</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Certificate">Certificate</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">2. University</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={drillUni}
                  onChange={e => { setDrillUni(e.target.value); setSelectedCourseId(''); setCourseStudents([]); }}
                  disabled={!drillType}
                >
                  <option value="">{drillType ? 'Select university...' : 'Select type first'}</option>
                  {drillUniversities.map((c: any, i: number) => (
                    <option key={i} value={c.university_name}>{c.university_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">3. Course</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedCourseId}
                  onChange={e => { setSelectedCourseId(e.target.value); setCourseStudents([]); }}
                  disabled={!drillType}
                >
                  <option value="">{drillType ? 'Select course...' : 'Select type first'}</option>
                  {drillCourses.map(c => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.name} ({c.difficulty_level})
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCourseStudents} size="sm" disabled={!selectedCourseId}>View Students</Button>
            </div>

            {courseStudents.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">{selectedCourseName}</span> — {courseStudents.length} students enrolled
                </p>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Skill Level</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseStudents.map((s: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-xs">{s.email}</TableCell>
                          <TableCell>{s.country}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{s.skill_level}</Badge></TableCell>
                          <TableCell className="text-right">{s.score !== null ? `${s.score}%` : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={s.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">
                              {s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* ── University & Instructor (side by side, auto-loaded) ── */}
        {loaded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">University Performance</CardTitle>
                <CardDescription>{uniStats.length} universities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>University</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Courses</TableHead>
                        <TableHead className="text-right">Students</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uniStats.map((s: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.country}</TableCell>
                          <TableCell className="text-right">{s.course_count}</TableCell>
                          <TableCell className="text-right">{s.total_enrollments}</TableCell>
                          <TableCell className="text-right">{s.avg_score ? `${Number(s.avg_score).toFixed(1)}%` : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Instructor Performance</CardTitle>
                <CardDescription>{instStats.length} instructors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Expertise</TableHead>
                        <TableHead className="text-right">Courses</TableHead>
                        <TableHead className="text-right">Students</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instStats.map((s: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {s.expertise_areas?.slice(0, 2).map((e: string, j: number) => (
                                <Badge key={j} variant="outline" className="text-xs">{e}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{s.courses_taught}</TableCell>
                          <TableCell className="text-right">{s.total_students}</TableCell>
                          <TableCell className="text-right">{s.avg_student_score ? `${Number(s.avg_student_score).toFixed(1)}%` : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Students & Topics (side by side, auto-loaded) ── */}
        {loaded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Student Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="border rounded-lg p-3 text-center bg-indigo-50">
                    <p className="text-xl font-bold text-indigo-700">{overall?.total_students ?? 0}</p>
                    <p className="text-xs text-indigo-500">Total</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-violet-50">
                    <p className="text-xl font-bold text-violet-700">{overall?.avg_courses_per_student ? Number(overall.avg_courses_per_student).toFixed(1) : '0'}</p>
                    <p className="text-xs text-violet-500">Avg Courses</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-emerald-50">
                    <p className="text-xl font-bold text-emerald-700">{overall?.overall_avg_score ? `${Number(overall.overall_avg_score).toFixed(0)}%` : '—'}</p>
                    <p className="text-xs text-emerald-500">Avg Score</p>
                  </div>
                </div>

                {stuStats?.by_skill_level?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">By Skill Level</p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Skill Level</TableHead>
                            <TableHead className="text-right">Students</TableHead>
                            <TableHead className="text-right">Avg Courses</TableHead>
                            <TableHead className="text-right">Avg Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stuStats.by_skill_level.map((s: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{s.skill_level || 'Unknown'}</TableCell>
                              <TableCell className="text-right">{s.student_count}</TableCell>
                              <TableCell className="text-right">{Number(s.avg_courses).toFixed(1)}</TableCell>
                              <TableCell className="text-right">{s.avg_score ? `${Number(s.avg_score).toFixed(0)}%` : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {stuStats?.top_countries?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top Countries</p>
                    <div className="flex flex-wrap gap-1.5">
                      {stuStats.top_countries.map((c: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c.country} ({c.student_count})</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Topic Coverage</CardTitle>
                <CardDescription>{topicStats.length} topics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead className="text-right">Courses</TableHead>
                        <TableHead className="text-right">Students</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicStats.map((s: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right">{s.course_count}</TableCell>
                          <TableCell className="text-right">{s.student_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Completion Rates (auto-loaded) ── */}
        {loaded && completionStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Completion Rates</CardTitle>
              <CardDescription>{completionStats.length} courses with enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead className="text-right">Enrolled</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completionStats.map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.course_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.difficulty_level}</Badge></TableCell>
                        <TableCell className="text-right">{s.total_enrolled}</TableCell>
                        <TableCell className="text-right">{s.completed}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={s.completion_rate >= 75 ? 'default' : s.completion_rate >= 50 ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {s.completion_rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
