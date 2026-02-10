'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authAPI } from '@/lib/api';
import Link from 'next/link';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 
  'India', 'China', 'Japan', 'Singapore', 'Brazil', 'Mexico', 'South Korea', 
  'Netherlands', 'Sweden', 'Switzerland', 'Italy', 'Spain', 'Other'
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // Step 1: Email/Password, Step 2: Role-specific
  const [userType, setUserType] = useState('Student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 - Common fields
  const [name, setName] = useState('');

  // Student specific fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  // Instructor specific fields
  const [expertiseAreas, setExpertiseAreas] = useState('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError('');
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (userType === 'Student') {
        await authAPI.registerStudent({
          email,
          password,
          name,
          dob: dateOfBirth,
          country,
          skill_level: skillLevel,
        });
      } else {
        // Split expertise areas by comma
        const areasArray = expertiseAreas.split(',').map(area => area.trim()).filter(area => area);
        
        if (areasArray.length === 0) {
          setError('Please enter at least one expertise area');
          setLoading(false);
          return;
        }

        await authAPI.registerInstructor({
          email,
          password,
          name,
          expertise_areas: areasArray,
        });
      }

      // Redirect to login page on success
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-xl font-bold">
            {step === 1 ? 'Create an Account' : 'Complete Your Profile'}
          </CardTitle>
          <CardDescription className="text-xs">
            {step === 1 ? 'Step 1: Enter your credentials' : `Step 2: ${userType} details`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">{step === 1 ? (
            // STEP 1: Email and Password
            <form onSubmit={handleNext} className="space-y-3">
              <Tabs value={userType} onValueChange={setUserType}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="Student">Student</TabsTrigger>
                  <TabsTrigger value="Instructor">Instructor</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm">Password * (min 8 characters)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={255}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full">
                  Next
                </Button>
              </div>
            </form>
          ) : (
            // STEP 2: Role-specific fields
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-sm">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={255}
                />
              </div>

              {/* Student Specific Fields */}
              {userType === 'Student' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="dob" className="text-sm">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="skill" className="text-sm">Skill Level *</Label>
                      <Select value={skillLevel} onValueChange={setSkillLevel} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="country" className="text-sm">Country *</Label>
                    <Select value={country} onValueChange={setCountry} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Instructor Specific Fields */}
              {userType === 'Instructor' && (
                <div className="space-y-1">
                  <Label htmlFor="expertise" className="text-sm">Areas of Expertise * (comma-separated)</Label>
                  <Input
                    id="expertise"
                    placeholder="e.g. Machine Learning, Data Science"
                    value={expertiseAreas}
                    onChange={(e) => setExpertiseAreas(e.target.value)}
                    required
                  />
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button type="submit" size="sm" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-3 text-center text-xs text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
