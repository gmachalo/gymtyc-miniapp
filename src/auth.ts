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
        if (!credentials?.email) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const name  = String(credentials.name ?? "Dev Trainer").trim();

        const user = await prisma.user.upsert({
          where:  { email },
          update: {},
          create: {
            email,
            name,
            displayName: name,
            onboardingDone: false,
            mode: "SOLO",
          },
        });

        return { id: user.id, email: user.email ?? "", name: user.name };
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
        await prisma.streak
          .findUnique({ where: { userId: user.id } })
          .then(async (streak) => {
            if (!streak) {
              await prisma.streak.create({ data: { userId: user.id } });
            }
          })
          .catch(() => {});
      }
    },
  },
});
