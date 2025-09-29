import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Borrar la cookie isAuthenticated
  response.cookies.set("isAuthenticated", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0), // o maxAge: 0
    path: "/",
  });

  return response;
}
