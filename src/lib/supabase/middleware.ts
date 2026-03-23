import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Protected routes — require auth
const protectedPaths = [
  "/dashboard",
  "/admin",
  "/onboarding",
  "/settings",
  "/profile/edit",
  "/events/create",
  "/hackathons/create",
  "/judge",
  "/mentor",
];

// Auth routes — redirect to dashboard if already logged in
const authPaths = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => normalizedPath === p);

  // Skip auth check entirely for public routes — saves ~50-150ms per request
  if (!isProtected && !isAuthPage) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Only set redirect for relative paths to prevent open redirect attacks
    const redirectPath = pathname + request.nextUrl.search;
    if (redirectPath.startsWith("/") && !redirectPath.startsWith("//") && !redirectPath.includes("\\")) {
      url.searchParams.set("redirect", redirectPath);
    }
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
