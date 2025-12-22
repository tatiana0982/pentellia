
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { GoogleIcon } from './icons';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.').trim(),
  password: z
    .string()
    .min(1, 'Password is required.'),
});

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').trim(),
  lastName: z.string().min(1, 'Last name is required.').trim(),
  email: z.string().email('Invalid email address.').trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

type AuthView = 'login' | 'signup';

export default function AuthForm({
  initialView = 'login',
}: {
  initialView?: AuthView;
}) {
  const [view, setView] = useState<AuthView>(initialView);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOauthSubmitting, setOauthSubmitting] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  async function handleLogin(values: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    console.log('Signing in with:', values);
    // **BACKEND INTEGRATION POINT**
    // TODO: Replace with Firebase signInWithEmailAndPassword
    // Example:
    // try {
    //   const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
    //   // On success, the auth state listener will redirect to /dashboard
    // } catch (error) {
    //   // Handle errors (e.g., wrong password, user not found)
    //   console.error("Firebase Login Error:", error);
    //   // Optionally, set a form error:
    //   // loginForm.setError("root.serverError", { type: "manual", message: "Invalid credentials" });
    // } finally {
    //   setIsSubmitting(false);
    // }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  }

  async function handleSignup(values: z.infer<typeof signupSchema>) {
    setIsSubmitting(true);
    console.log('Signing up with:', values);
    // **BACKEND INTEGRATION POINT**
    // TODO: Replace with Firebase createUserWithEmailAndPassword & updateProfile
    // Example:
    // try {
    //   const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
    //   await updateProfile(userCredential.user, {
    //     displayName: `${values.firstName} ${values.lastName}`
    //   });
    //   // On success, the auth state listener will redirect to /dashboard
    // } catch (error) {
    //   // Handle errors (e.g., email already in use)
    //   console.error("Firebase Signup Error:", error);
    // } finally {
    //   setIsSubmitting(false);
    // }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  }

  async function handleGoogleSignIn() {
    setOauthSubmitting(true);
     // **BACKEND INTEGRATION POINT**
    // TODO: Replace with Firebase signInWithPopup(new GoogleAuthProvider())
    // Example:
    // try {
    //    const provider = new GoogleAuthProvider();
    //    const result = await signInWithPopup(auth, provider);
    //    // On success, the auth state listener will redirect to /dashboard
    // } catch (error) {
    //    console.error("Google Sign-In Error:", error);
    // } finally {
    //    setOauthSubmitting(false);
    // }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setOauthSubmitting(false);
  }

  const isLoginView = view === 'login';

  const AuthProviders = () => (
    <>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <div className="grid gap-3">
          <Button variant="outline" className="w-full justify-center" onClick={handleGoogleSignIn} disabled={isSubmitting || isOauthSubmitting}>
             {isOauthSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
            Sign in with Google
          </Button>
        </div>
    </>
  );

  return (
    <Card className="relative w-full max-w-md overflow-hidden border-border bg-card text-card-foreground shadow-lg">
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
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="grid gap-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="m@example.com"
                          autoComplete="email"
                          {...field}
                          className="bg-input border-border focus:ring-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => alert('Forgot password clicked')}
                          className="ml-auto inline-block text-sm text-muted-foreground hover:text-foreground underline"
                        >
                          Forgot your password?
                        </button>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          {...field}
                          className="bg-input border-border focus:ring-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || isOauthSubmitting}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </form>
            </Form>
            <AuthProviders />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setView('signup')}
                className="font-semibold text-accent hover:text-accent/90 underline"
                disabled={isSubmitting || isOauthSubmitting}
              >
                Sign up
              </button>
            </p>
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
            <Form {...signupForm}>
              <form
                onSubmit={signupForm.handleSubmit(handleSignup)}
                className="grid gap-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={signupForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Max"
                            autoComplete="given-name"
                            {...field}
                            className="bg-input border-border focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Robinson"
                            autoComplete="family-name"
                            {...field}
                            className="bg-input border-border focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="m@example.com"
                          autoComplete="email"
                          {...field}
                           className="bg-input border-border focus:ring-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          {...field}
                           className="bg-input border-border focus:ring-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || isOauthSubmitting}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create an account
                </Button>
              </form>
            </Form>
            <AuthProviders />
             <p className="mt-6 px-4 text-center text-xs text-muted-foreground">
                By signing up, you agree to our{' '}
                <a href="#" className="underline hover:text-foreground">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="underline hover:text-foreground">
                  Privacy Policy
                </a>
                , and consent to data processing and hosting in accordance with applicable Indian data protection laws.
            </p>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setView('login')}
                className="font-semibold text-accent hover:text-accent/90 underline"
                disabled={isSubmitting || isOauthSubmitting}
              >
                Login
              </button>
            </p>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

    