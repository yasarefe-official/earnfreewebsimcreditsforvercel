import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { sql } from '@vercel/postgres';

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "Enter your WebSim username" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username) {
          return null;
        }

        try {
          // Check the real database for the user.
          const { rows: users } = await sql`
            SELECT id, username, userId FROM users_v2_1 WHERE username = ${credentials.username};
          `;

          if (users.length > 0) {
            // This is a migrated user, log them in without a password.
            const user = users[0];
            return {
              id: user.userid, // Use the user's UUID for the session ID
              name: user.username,
            };
          } else {
            // This user does not exist in the migrated data.
            // For now, we deny login. A registration flow would be needed for new users.
            return null;
          }
        } catch (error) {
          console.error("Error during authorization:", error);
          return null; // Return null in case of a database error
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }: { token: any, user: any }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
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
