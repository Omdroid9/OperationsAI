"use client";

import { ErrorState } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { isAuthRequired } from "@/lib/supabase/client";
import Link from "next/link";

const STEPS = [
  {
    title: "Create the Auth user",
    body: "In Supabase → Authentication → Users → Add user. Set email and a temporary password, or send an invite email.",
  },
  {
    title: "Link a staff profile",
    body: "Run the SQL below in the Supabase SQL Editor (postgres role). Replace the UUID, display name, role, and staff_key.",
  },
  {
    title: "User signs in",
    body: "They open /access, set a password if needed, and land in the product. Profile name and role appear in the top bar.",
  },
] as const;

export default function TeamAccessPage() {
  const authRequired = isAuthRequired();
  const authProfile = useAuthProfile();
  const role = authProfile.data?.profile?.role;
  const isAdmin = role === "admin";

  if (authRequired && authProfile.isLoading) {
    return (
      <PageBody>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageBody>
    );
  }

  if (authRequired && !isAdmin) {
    return (
      <PageBody>
        <ErrorState
          title="Admin access required"
          description="Only administrators can view team provisioning steps. Contact your administrator if you need a SkyOS account."
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <div className="max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-1 text-[22px] font-medium tracking-tight">Grant team access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          SkyOS does not offer public sign-up. Administrators provision staff in Supabase, then
          link a profile row.
        </p>

        <ol className="mt-8 space-y-6">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <p className="font-mono text-[11px] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-1 text-sm font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-8">
          <h2 className="text-sm font-medium">Profile SQL template</h2>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-[12px] leading-relaxed text-foreground">
            {`insert into public.profiles (id, display_name, role, staff_key)
values (
  'PASTE-USER-UUID-HERE'::uuid,
  'L. Ortega',
  'staff',
  'staff_ortega'
)
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    staff_key = excluded.staff_key,
    updated_at = now();`}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">
            Roles: <span className="font-mono text-foreground">admin</span>,{" "}
            <span className="font-mono text-foreground">staff</span>, or{" "}
            <span className="font-mono text-foreground">readonly</span>. Full setup notes live in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">docs/D0-AUTH-SETUP.md</code>
            .
          </p>
        </section>

        <p className="mt-8 text-sm text-muted-foreground">
          <Link href="/app" className="text-foreground underline-offset-2 hover:underline">
            Back to overview
          </Link>
        </p>
      </div>
    </PageBody>
  );
}
