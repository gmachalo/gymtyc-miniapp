import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";

const isDev = process.env.NODE_ENV === "development";

// Only activate OAuth providers when their keys are set
const oauthProviders = [
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      })
    : null,
  process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET
    ? Discord({
        clientId: process.env.AUTH_DISCORD_ID,
        clientSecret: process.env.AUTH_DISCORD_SECRET,
      })
    : null,
].filter(<T>(p: T | null): p is T => p !== null);

// Dev-only credentials bypass — works without any OAuth credentials
const devProvider = isDev
  ? Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "dev@gymtycoon.app" },
        name:  { label: "Name",  type: "text",  placeholder: "Dev Trainer" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          console.error("[v0] No email provided in dev login");
          return null;
        }
        
        const email = String(credentials.email).toLowerCase().trim();
        const name  = String(credentials.name ?? "Dev Trainer").trim();

        if (!email || email.length === 0) {
          console.error("[v0] Email is empty after processing");
          return null;
        }

        try {
          // Wrap with timeout to handle slow database connections
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database query timeout (30s)")), 30000)
          );

          // First try to find existing user
          let user = (await Promise.race([
            prisma.user.findUnique({ where: { email } }),
            timeoutPromise,
          ])) as any;

          // If not found, create new user
          if (!user) {
            user = await Promise.race([
              prisma.user.create({
                data: {
                  email,
                  name,
                  displayName: name,
                  onboardingDone: false,
                  mode: "SOLO",
                },
              }),
              timeoutPromise,
            ]);
          }

          return { 
            id: user.id, 
            email: user.email ?? "", 
            name: user.name ?? name,
          };
        } catch (error) {
          console.error("[v0] Dev login error:", error);
          if (error instanceof Error && error.message.includes("timeout")) {
            console.error(
              "[v0] Database connection timed out. " +
              "Make sure your DATABASE_URL uses Supabase Connection Pooler (port 6543), not direct connection (5432). " +
              "See https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler"
            );
          }
          return null;
        }
      },
    })
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
  ...oauthProviders,
  ...(devProvider ? [devProvider] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        // Ensure streak exists for all users
        try {
          const existingStreak = await prisma.streak.findUnique({
            where: { userId: user.id },
          });
          if (!existingStreak) {
            await prisma.streak.create({ data: { userId: user.id } });
          }
        } catch (error) {
          console.error("[v0] Streak creation error:", error);
        }
      }
    },
  },
});
