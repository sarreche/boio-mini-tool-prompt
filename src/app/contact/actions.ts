"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ContactFormState = {
  status: "idle" | "success" | "validation_error" | "server_error";
};

export async function submitAccessRequest(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const requestType = readField(formData, "requestType");
  const name = normalizeName(readField(formData, "name"));
  const email = readField(formData, "email").toLowerCase();
  const message = readField(formData, "message");
  const locale = readField(formData, "locale") === "en" ? "en" : "es";

  if (
    !["free_access", "support"].includes(requestType)
    || name.length < 2
    || name.length > 120
    || !isValidEmail(email)
    || message.length < 10
    || message.length > 2000
  ) {
    return { status: "validation_error" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("access_requests").insert({
      request_type: requestType,
      name,
      email,
      message,
      locale,
      source: "login_contact_form",
    });

    if (error) {
      console.error("Could not create access request:", error.code);
      return { status: "server_error" };
    }

    return { status: "success" };
  } catch (error) {
    console.error(
      "Could not create access request:",
      error instanceof Error ? error.message : "unknown error",
    );
    return { status: "server_error" };
  }
}

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeName(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}
