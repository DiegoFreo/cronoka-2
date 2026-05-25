// types/next-auth.d.ts
import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Estende o objeto 'user' retornado no callback 'session' e 'jwt'
   */
  interface User {
    nivelUser?: "A" | "S" | "C";
    
  }
  interface Usuario {
    _id: string;
    emailUser: string;
    nivelUser: "A" | "S" | "C";
  }

  /**
   * Estende a sessão do NextAuth para incluir o campo 'nivelUser'
   */
  interface Session {
    user: {
      nivelUser?: "A" | "S" | "C";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Estende o token JWT para que possamos acessar o 'nivelUser' no Middleware
   */
  interface JWT {
    nivelUser?: "A" | "S" | "C";
  }
}