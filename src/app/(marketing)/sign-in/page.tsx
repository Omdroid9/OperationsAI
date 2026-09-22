import { redirect } from "next/navigation";

/** Legacy path — product entry lives at /access. */
export default async function SignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const qs = new URLSearchParams();
  if (next) qs.set("next", next);
  if (error) qs.set("error", error);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/access${suffix}`);
}
