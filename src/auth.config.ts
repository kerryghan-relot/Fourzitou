import type { NextAuthConfig } from "next-auth";

// Shared config — no DB imports, safe for Edge Runtime (middleware).
// Credentials provider is added in auth.ts (Node.js only).
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.locale = (user as { locale: string }).locale;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.locale = token.locale as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  providers: [],
};
