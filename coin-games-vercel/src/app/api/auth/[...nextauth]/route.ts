import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { sql } from '@vercel/postgres';
import { JWT } from "next-auth/jwt";
import { User, Session } from "next-auth";

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "Enter your WebSim username" },
      },
      async authorize(credentials) {
        if (!credentials?.username) {
          return null;
        }

        try {
          const { rows: users } = await sql`
            SELECT id, username, userId FROM users_v2_1 WHERE username = ${credentials.username};
          `;

          if (users.length > 0) {
            const user = users[0];
            // Return the user object that matches the User type in next-auth.d.ts
            return {
              id: user.userid,
              name: user.username,
            };
          } else {
            return null;
          }
        } catch (error) {
          console.error("Error during authorization:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
