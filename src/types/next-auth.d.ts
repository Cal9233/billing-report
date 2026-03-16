import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: string;
    organizationId?: string;
    organizationName?: string;
    organizationSlug?: string;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    organizationId?: string;
    organizationName?: string;
    organizationSlug?: string;
    mustChangePassword?: boolean;
  }
}
