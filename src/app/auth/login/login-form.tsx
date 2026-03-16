"use client";

import { useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Force full page load so middleware re-evaluates with the new session cookie.
      // router.push() does a soft client-side navigation that may not pick up
      // the freshly-set auth cookie, causing the user to stay on the login page.
      window.location.href = callbackUrl;
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-lg p-8">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4">
          <span className="text-white font-bold text-xl">B</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">BillFlow</h1>
        <p className="text-muted-foreground mt-1">Billing Management</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full h-12 px-4 rounded-lg border-2 border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full h-12 px-4 rounded-lg border-2 border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <span className="font-medium text-foreground">Contact your administrator.</span>
      </p>
    </div>
  );
}
