'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Online Course Management</CardTitle>
          <CardDescription className="text-base">
            Welcome! Choose an option to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Link href="/login" className="block">
            <Button className="w-full h-12 text-lg" size="lg">
              Login
            </Button>
          </Link>
          <Link href="/register" className="block">
            <Button variant="outline" className="w-full h-12 text-lg" size="lg">
              Create Account
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
