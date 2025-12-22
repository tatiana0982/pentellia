
'use client';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  async function signUp(formData: FormData) {
    // Fake sign-up logic
    console.log('Signing up with:', {
      firstName: formData.get('first-name'),
      lastName: formData.get('last-name'),
      email: formData.get('email'),
      password: '[redacted]',
    });
    redirect('/dashboard');
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50 text-white backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Enter your information to create your Pentellia account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signUp} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                name="first-name"
                placeholder="Max"
                required
                className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                name="last-name"
                placeholder="Robinson"
                required
                className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="m@example.com"
              required
              className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              required
              className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
            />
          </div>
          <Button type="submit" className="w-full bg-cyan-500 text-slate-900 hover:bg-cyan-400">
            Create an account
          </Button>
        </form>
      </CardContent>
       <CardFooter className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="underline ml-1">
          Login
        </Link>
      </CardFooter>
    </Card>
  );
}
