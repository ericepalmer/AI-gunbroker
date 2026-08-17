"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: nextPath,
    });

    if (authError) {
      setPending(false);
      if (authError.status === 403) {
        setError("Verify your email before signing in. Check the inbox for a confirmation link.");
        return;
      }
      setError(authError.message ?? "Could not sign in.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) {
      setPending(false);
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPending(false);
      setError("Use at least 8 characters.");
      return;
    }

    const { error: authError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/app",
    });

    if (authError) {
      setPending(false);
      setError(authError.message ?? "Could not create the account.");
      return;
    }

    router.push(`/check-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        By signing up you agree to the{" "}
        <Link href="/legal/terms" className="text-accent hover:underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="text-accent hover:underline">
          privacy policy
        </Link>
        .
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    setMessage("If that email is registered, a reset link is on its way.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (newPassword !== confirm) {
      setPending(false);
      setError("Passwords do not match.");
      return;
    }

    const { error: authError } = await authClient.resetPassword({
      newPassword,
      token,
    });

    if (authError) {
      setPending(false);
      setError(authError.message ?? "Could not reset the password.");
      return;
    }

    router.push("/login?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
