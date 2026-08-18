"use client";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLogin } from "@/hooks/use-auth";
import Link from "next/link";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const login = useLogin();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      return toast.error("All Inputs Required");
    };

    try {
      await login.mutateAsync({
        email,
        password
      })
    } catch { }
  };

  return (
    <form onSubmit={handleLogin} className={cn("flex flex-col gap-4", className)} {...props}>
      <FieldGroup className="gap-4">
        <div className="flex flex-col items-center gap-1.5 text-center mb-4">
          <h1 className="text-[28px] font-bold tracking-tight">Unlock the Future</h1>
          <p className="text-[14px] text-muted-foreground font-medium">
            Log in and let AI supercharge your workflow.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <Field>
            <Button variant="outline" type="button" className="w-full flex items-center justify-center gap-3 rounded-3xl h-11 font-medium text-[13px]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </Field>

          <Field>
            <Button variant="outline" type="button" className="w-full flex items-center justify-center gap-3 rounded-3xl h-11 font-medium text-[13px]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                <path d="M2.38 6.945L9.67 9.87l.01 4.54-7.3-2.925z" fill="#0072C6" />
                <path d="M9.68 9.87l11.94-4.83v9.84l-11.94 4.83z" fill="#0072C6" />
                <path d="M21.62 14.88l-11.94 4.83v-4.54l11.94-4.83z" fill="#28A8EA" />
                <path d="M2.38 11.485l7.3 2.925v-4.54l-7.3-2.925z" fill="#28A8EA" />
              </svg>
              Sign in with Outlook
            </Button>
          </Field>

          <Field>
            <Button variant="outline" type="button" className="w-full flex items-center justify-center gap-3 rounded-3xl h-11 font-medium text-[13px]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                <path d="M17.05 13.92c-.03-2.9 2.37-4.32 2.48-4.39-1.35-1.97-3.44-2.24-4.18-2.28-1.77-.18-3.45 1.05-4.36 1.05-.91 0-2.31-1.02-3.8-1-1.95.03-3.75 1.14-4.75 2.88-2.03 3.52-.52 8.7 1.45 11.55.97 1.4 2.1 2.96 3.63 2.9 1.47-.05 2.04-.94 3.82-.94 1.77 0 2.29.94 3.83.91 1.58-.03 2.56-1.42 3.52-2.82 1.1-1.6 1.56-3.15 1.58-3.23-.03-.02-2.88-1.1-2.92-4.07zM14.65 6.2c.8-1.01 1.34-2.4 1.2-3.8-1.2.05-2.65.8-3.47 1.81-.66.8-.131 2.25.131 3.65 1.35.1 2.62-.65 3.44-1.66z" fill="currentColor" />
              </svg>
              Log in with Apple
            </Button>
          </Field>
        </div>

        <FieldSeparator className="text-muted-foreground font-medium my-0">Or</FieldSeparator>

        <div className="flex flex-col gap-2">
          <Field>
            <Input id="email" type="email" placeholder="E-mail" required className="h-11 rounded-3xl px-4 text-[13px]" onChange={(e) => setEmail(e.target.value)} />
          </Field>

          <Field>
            <Input id="password" type="password" placeholder="Password" required className="h-11 rounded-3xl px-4 text-[13px]" onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>

        <div className="mt-2 flex justify-center">
          <Button type="submit" className="rounded-full px-37 h-11 text-[14px] font-medium shadow-[0_8px_16px_rgba(0,0,0,0.15)] transition-all hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
            Sign In Now
          </Button>
        </div>

      </FieldGroup>

      <div className="text-center mt-6">
        <Link href="/sign-up" className="text-[12px] text-muted-foreground font-medium hover:text-foreground transition-colors underline-offset-4 hover:underline">
          New here? Create your account and get started.
        </Link>
      </div>
    </form>
  )
}