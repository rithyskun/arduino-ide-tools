import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/lib/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember', type: 'text' },
      },

      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        const rememberMe = credentials?.rememberMe === 'true';

        if (!email || !password) return null;

        try {
          await connectDB();

          // Select passwordHash explicitly (excluded by default)
          const user = await User.findOne({ email, isActive: true }).select(
            '+passwordHash'
          );

          if (!user) return null;

          const valid = await user.comparePassword(password);
          if (!valid) return null;

          // Touch last-active (fire-and-forget, non-blocking)
          User.updateOne(
            { _id: user._id },
            { 'stats.lastActiveAt': new Date() }
          ).exec();

          // Return the user object — NextAuth stores these fields in its JWT
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.displayName,
            username: user.username,
            role: user.role,
            rememberMe, // passed through to jwt() callback
          };
        } catch (err) {
          console.error('[NextAuth authorize]', err);
          return null;
        }
      },
    }),
  ],

  // ── Callbacks ────────────────────────────────────────────────
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // First sign-in — persist fields into the NextAuth JWT
        token.sub = user.id;
        token.username = (user as { username?: string }).username ?? '';
        token.role = (user as { role?: string }).role ?? 'user';
        token.rememberMe =
          (user as { rememberMe?: boolean }).rememberMe ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  // ── Pages ────────────────────────────────────────────────────
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/login',
  },

  // ── Session — use JWT strategy (no server-side session store) ─
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days max; actual expiry set per-user below
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
