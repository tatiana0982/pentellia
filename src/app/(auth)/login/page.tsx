
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldIcon } from "@/components/icons";

export default function LoginPage() {
  async function signIn(formData: FormData) {
    "use server";
    // Fake sign-in logic
    console.log("Signing in with:", {
      email: formData.get("email"),
      password: "[redacted]",
    });
    redirect("/dashboard");
  }

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="flex items-center gap-2 mb-2">
          <ShieldIcon className="w-8 h-8 text-gray-800" />
          <h1 className="text-xl font-semibold text-foreground">Pentest Tools</h1>
        </div>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signIn} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="m@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" name="password" required />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
