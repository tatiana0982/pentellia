'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { redirect } from 'next/navigation';

type AuthView = 'login' | 'signup';

export default function AuthForm({
  initialView = 'login',
}: {
  initialView?: AuthView;
}) {
  const [view, setView] = useState<AuthView>(initialView);

  async function handleAction(formData: FormData) {
    if (view === 'login') {
      console.log('Signing in with:', {
        email: formData.get('email'),
        password: '[redacted]',
      });
    } else {
      console.log('Signing up with:', {
        firstName: formData.get('first-name'),
        lastName: formData.get('last-name'),
        email: formData.get('email'),
        password: '[redacted]',
      });
    }
    // Fake action
    redirect('/dashboard');
  }

  const isLoginView = view === 'login';

  return (
    <Card className="relative w-full max-w-md overflow-hidden border-slate-800 bg-slate-900/50 text-white backdrop-blur-lg">
      <div
        className={cn(
          'flex transition-transform duration-300 ease-in-out',
          !isLoginView && '-translate-x-full'
        )}
      >
        {/* Login Form */}
        <div className="w-full flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="m@example.com"
                  required
                  className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => alert('Forgot password clicked')}
                    className="ml-auto inline-block text-sm underline"
                  >
                    Forgot your password?
                  </button>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  name="password"
                  required
                  className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-cyan-500 text-slate-900 hover:bg-cyan-400"
              >
                Login
              </Button>
              <p className="mt-4 text-center text-sm">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('signup')}
                  className="underline"
                >
                  Sign up
                </button>
              </p>
            </form>
          </CardContent>
        </div>

        {/* Signup Form */}
        <div className="w-full flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Enter your information to create your Pentellia account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleAction} className="grid gap-4">
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
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  name="email"
                  placeholder="m@example.com"
                  required
                  className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  name="password"
                  required
                  className="bg-slate-800 border-slate-700 focus:ring-cyan-500 text-white"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-cyan-500 text-slate-900 hover:bg-cyan-400"
              >
                Create an account
              </Button>
              <p className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="underline"
                >
                  Login
                </button>
              </p>
            </form>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
