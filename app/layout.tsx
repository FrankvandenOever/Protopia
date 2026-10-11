import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Protopia",
  description: "See a place. Picture it better. Build it together.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <header className="top">
          <Link href="/" className="brand">
            <span className="orb" aria-hidden="true" />
            Protopia
          </Link>
          <span className="tagline">See a place. Picture it better. Build it together.</span>
          <nav className="nav">
            <Link href="/new" className="btn primary">
              + New vision
            </Link>
            {user ? (
              <form action="/auth/signout" method="post">
                <button className="btn ghost" type="submit" title={user.email ?? ""}>
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/login" className="btn ghost">
                Sign in
              </Link>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
