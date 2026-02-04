import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: Request) {
  return await updateSession(request as import('next/server').NextRequest);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
