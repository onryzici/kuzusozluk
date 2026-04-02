import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      karma: number;
    };
  }

  interface User {
    id?: string;
    username: string;
    role: string;
    karma: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    karma: number;
  }
}
