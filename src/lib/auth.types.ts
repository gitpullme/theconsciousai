import { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    state?: string | null;
    hospital?: string | null;
    dateOfBirth?: string | Date | null;
    gender?: string | null;
    phone?: string | null;
    address?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    state?: string | null;
    hospital?: string | null;
    dateOfBirth?: string | Date | null;
    gender?: string | null;
    phone?: string | null;
    address?: string | null;
  }
} 