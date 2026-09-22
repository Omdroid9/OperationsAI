"use client";

import { MarketingButton } from "@/components/marketing/marketing-button";
import { Input } from "@/components/ui/input";
import {
  createSupabaseBrowserClient,
  isAuthConfigured,
  isAuthRequired,
} from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const fieldClass = "mkt-field-line focus-visible:ring-0";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const callbackError = searchParams.get("error");
  const authEnabled = isAuthRequired() && isAuthConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  if (!authEnabled) {
    return (
      <div className="mt-8">
        <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">Evaluation access</p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
          Authentication is not required in this environment. Enter the product to continue.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <MarketingButton href="/app">Enter product</MarketingButton>
          <Link href="/#product" className="mkt-text-link">
            See product screens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mt-8 space-y-7"
      onSubmit={async (event) => {
        event.preventDefault();
        setFormError(null);
        setResetNotice(null);
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          setFormError("Sign-in is not configured. Contact your administrator.");
          return;
        }
        setBusy(true);
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          router.push(next.startsWith("/") ? next : "/app");
          router.refresh();
        } catch (error) {
          setFormError(error instanceof Error ? error.message : "Sign in failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {callbackError ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          Sign-in session could not be established. Try again.
        </p>
      ) : null}

      {formError ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      {resetNotice ? (
        <p className="font-sans text-sm text-[var(--mkt-ink-muted)]">{resetNotice}</p>
      ) : null}

      <div>
        <label htmlFor="sign-in-email" className="block font-sans text-sm text-[var(--mkt-ink-muted)]">
          Email
        </label>
        <Input
          id="sign-in-email"
          type="email"
          className={fieldClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={busy}
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="sign-in-password" className="block font-sans text-sm text-[var(--mkt-ink-muted)]">
          Password
        </label>
        <Input
          id="sign-in-password"
          type="password"
          className={fieldClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={busy}
          autoComplete="current-password"
        />
      </div>

      <div className="flex flex-wrap items-center gap-5 pt-2">
        <MarketingButton type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </MarketingButton>
        <button
          type="button"
          className="mkt-text-link"
          disabled={busy}
          onClick={async () => {
            setFormError(null);
            setResetNotice(null);
            if (!email.trim()) {
              setFormError("Enter your email address to reset your password.");
              return;
            }
            const supabase = createSupabaseBrowserClient();
            if (!supabase) {
              setFormError("Sign-in is not configured.");
              return;
            }
            setBusy(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/auth/callback?next=/access`,
              });
              if (error) throw error;
              setResetNotice("If an account exists for that email, a reset link has been sent.");
            } catch (error) {
              setFormError(error instanceof Error ? error.message : "Could not send reset email.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}
