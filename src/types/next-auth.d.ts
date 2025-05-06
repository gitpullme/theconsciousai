import "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      role?: string;
      hospital?: string | null;
      state?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
      phone?: string | null;
      address?: string | null;
    };
  }

  interface User {
    id: string;
    name?: string;
    email: string;
    image?: string;
    role?: string;
    hospital?: string | null;
    state?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    phone?: string | null;
    address?: string | null;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    role?: string;
    isHospital?: boolean;
    hospital?: string | null;
    state?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    phone?: string | null;
    address?: string | null;
  }
} 