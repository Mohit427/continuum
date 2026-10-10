"use client";
/** Posts a form to an auth route handler; navigates on success, returns the error message otherwise. */
export async function submitAuth(op: "login" | "signup", form: HTMLFormElement): Promise<string | null> {
  try {
    const r = await fetch(`/auth/${op}`, { method: "POST", body: new FormData(form), headers: { "x-auth-fetch": "1" } });
    const j = (await r.json().catch(() => ({}))) as { to?: string; error?: string };
    if (j.to) { window.location.assign(j.to); return null; }
    return j.error ?? "Something went wrong. Please try again.";
  } catch {
    return "Could not reach the server. Check your connection and try again.";
  }
}
