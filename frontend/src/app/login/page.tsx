'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authAPI } from '@/lib/api';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Map display role to database role
  const getRoleForAPI = (displayRole: string) => {
    const roleMap: { [key: string]: string } = {
      'Student': 'Student',
      'Instructor': 'Instructor',
      'Admin': 'Admin',
      'Analyst': 'Data Analyst'
    };
    return roleMap[displayRole] || displayRole;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiRole = getRoleForAPI(selectedRole);
      const response = await authAPI.login(email, password, apiRole);
      
      // Check if the role matches
      if (response.role !== apiRole) {
        setError(`This account is not a ${selectedRole} account. Please select the correct role.`);
        setLoading(false);
        return;
      }

      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(response));

      // Redirect based on role
      switch (response.role) {
        case 'Student':
          router.push('/student');
          break;
        case 'Instructor':
          router.push('/instructor');
          break;
        case 'Admin':
          router.push('/admin');
          break;
        case 'Data Analyst':
          router.push('/analyst');
          break;
        default:
          setError('Invalid role');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login to Your Account</CardTitle>
          <CardDescription>Select your role and enter your credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Student">Student</TabsTrigger>
              <TabsTrigger value="Instructor">Instructor</TabsTrigger>
              <TabsTrigger value="Admin">Admin</TabsTrigger>
              <TabsTrigger value="Analyst">Analytics</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
