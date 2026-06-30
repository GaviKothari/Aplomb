import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

// Route prefix → roles allowed (most specific first)
const ROUTE_ROLES: [string, string[]][] = [
  // Engineer-only area
  ['/engineer',                ['admin', 'engineer']],

  // Management
  ['/management',              ['admin', 'coordinator']],

  // Finance
  ['/finance',                 ['admin', 'accounts']],

  // HR
  ['/hr-team',                 ['admin', 'hr']],

  // Analytics / MIS
  ['/analytics',               ['admin', 'coordinator', 'mis_executive']],

  // System admin
  ['/system',                  ['admin']],

  // Operations sub-routes (most specific first)
  ['/operations/verification', ['admin', 'verifier', 'finalizer']],
  ['/operations/case-board',   ['admin', 'coordinator']],
  ['/operations/import',       ['admin', 'coordinator']],
  ['/operations/reports',      ['admin', 'coordinator', 'verifier', 'finalizer', 'report_maker', 'engineer']],
  ['/operations/cases',        ['admin', 'coordinator', 'engineer', 'report_maker', 'verifier', 'finalizer']],

  // Dashboard — broad access
  ['/dashboard',               ['admin', 'coordinator', 'engineer', 'report_maker', 'verifier', 'finalizer', 'hr', 'accounts', 'mis_executive', 'viewer']],

  // AI tools
  ['/ai-tools',                ['admin', 'coordinator', 'report_maker']],
];

// Role → where to land after login
export const ROLE_HOME: Record<string, string> = {
  admin:        '/dashboard',
  coordinator:  '/dashboard',
  engineer:     '/engineer',
  report_maker: '/operations/cases',
  verifier:     '/operations/verification',
  finalizer:    '/operations/verification',
  hr:           '/hr-team/employees',
  accounts:     '/finance/billing-invoices',
  mis_executive:'/analytics',
  viewer:       '/dashboard',
};

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    await auth.protect();
    return;
  }

  // Normalise to lowercase — Clerk stores ENGINEER, backend stores ENGINEER
  const raw: string = (sessionClaims?.metadata as any)?.role ?? 'admin';
  const role = raw.toLowerCase();
  const path = req.nextUrl.pathname;

  // Root → role home
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
