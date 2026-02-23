import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
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

  const { pathname } = request.nextUrl;

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
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Only set redirect for relative paths to prevent open redirect attacks
    const redirectPath = pathname + request.nextUrl.search;
    if (redirectPath.startsWith("/") && !redirectPath.startsWith("//")) {
      url.searchParams.set("redirect", redirectPath);
    }
    return NextResponse.redirect(url);
  }

  // Auth routes — redirect to dashboard if already logged in
  const authPaths = ["/login", "/register"];
  const isAuthPage = authPaths.some((p) => pathname === p);

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
