import { createClient } from "@/lib/supabase/client";

export async function signIn(email: string, password: string) {
  return createClient().auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return createClient().auth.signOut();
}

export async function changePassword(password: string) {
  return createClient().auth.updateUser({ password });
}
