import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

// Route prefix → roles that may access it (most specific first)
const ROUTE_ROLES: [string, string[]][] = [
  ['/engineer',                ['admin', 'engineer']],
  ['/management',              ['admin', 'coordinator']],
  ['/finance',                 ['admin', 'accounts']],
  ['/hr-team',                 ['admin', 'hr']],
  ['/analytics',               ['admin', 'coordinator']],
  ['/system',                  ['admin']],
  ['/dashboard',               ['admin', 'coordinator', 'verifier', 'hr', 'accounts']],
  ['/operations/case-board',   ['admin', 'coordinator']],
  ['/operations/cases/new',    ['admin', 'coordinator']],
  ['/operations/verification', ['admin', 'verifier']],
  ['/ai-tools/insights',       ['admin', 'coordinator']],
];

// If no role in Clerk metadata → treat as admin (dev / demo mode)
const DEFAULT_ROLE = 'admin';

// Role → landing page after login
export const ROLE_HOME: Record<string, string> = {
  admin:       '/dashboard',
  coordinator: '/dashboard',
  engineer:    '/engineer',
  verifier:    '/operations/verification',
  hr:          '/hr-team/employees',
  accounts:    '/finance/billing-invoices',
};

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    await auth.protect();
    return;
  }

  const role: string = (sessionClaims?.metadata as any)?.role ?? DEFAULT_ROLE;
  const path = req.nextUrl.pathname;

  // Root → role-appropriate home
  if (path === '/') {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/dashboard', req.url));
  }

  // Check each restricted prefix
  for (const [prefix, allowed] of ROUTE_ROLES) {
    if (path.startsWith(prefix) && !allowed.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/dashboard', req.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
