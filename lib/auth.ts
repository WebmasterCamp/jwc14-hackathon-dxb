import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;
      if (!email || !password) return null;

      // ---- Test access (demo, no registration required) -------------------
      // Entering the test code in BOTH email and password signs in to a shared
      // demo account. Disable in production by setting ENABLE_TEST_LOGIN=false.
      const testCode = process.env.TEST_LOGIN_CODE || "12345678";
      const testEnabled = process.env.ENABLE_TEST_LOGIN !== "false";
      if (testEnabled && credentials?.email === testCode && password === testCode) {
        const demo = await prisma.user.upsert({
          where: { email: "demo@roomue.test" },
          update: {},
          create: {
            email: "demo@roomue.test",
            firstName: "Demo",
            lastName: "User",
            emailVerified: new Date(),
          },
        });
        return {
          id: demo.id,
          email: demo.email,
          name: "Demo User",
          image: null,
        };
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        image: user.image,
      };
    },
  }),
];

// Only enable Google when credentials are present so local dev runs without it.
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (googleEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
