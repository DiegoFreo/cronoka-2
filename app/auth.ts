// auth.ts
import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import conectDB from "./lib/mongodb";
import Credentials from "next-auth/providers/credentials";
import { loginUsuario } from "./controller/usuarioController";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(conectDB),
  providers: [
    Credentials({
      async authorize(credentials) {
        // Sua lógica de busca no MongoDB e comparação de senha com bcrypt aqui
        // Exemplo de retorno:
        const user= await loginUsuario({emailUser: credentials?.emailUser, passworUser: credentials?.passworUser});
        console.log("Resultado do login:", user);
        if (!user) return null;

        
        return {
                _id: user.data?.usuario.idUser,
                emailUser: user.data?.usuario.emailUser,
                nivelUser: user.data?.usuario.nivelUser,
                avatarUser: user.data?.usuario.avatarUser,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.nivelUser = (user as any).nivelUser;
      return token;
    },
    session({ session, token }) {
      if (token?.nivelUser) session.user.nivelUser = token.nivelUser as "A" | "S" | "C";
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});