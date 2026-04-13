import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;
        if (!user.isActive) return null;

        const isValid = compareSync(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        if (user.isBanned) return null;

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          karma: user.karma,
          isBanned: user.isBanned,
        } as never;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/giris",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.username = (user as unknown as { username: string }).username;
        token.role = (user as unknown as { role: string }).role;
        token.karma = (user as unknown as { karma: number }).karma;
        token.isBanned = (user as unknown as { isBanned: boolean }).isBanned;
        token.iat = Math.floor(Date.now() / 1000);
      }
      if (trigger === "update" && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, karma: true, isBanned: true, username: true },
        });
        if (u) {
          token.role = u.role;
          token.karma = u.karma;
          token.isBanned = u.isBanned;
          token.username = u.username;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = session.user as any;
      u.id = token.id;
      u.username = token.username;
      u.role = token.role;
      u.karma = token.karma;
      u.isBanned = token.isBanned;
      u.iat = token.iat;
      return session;
    },
  },
});
