export type User = {
    id: string;
    email: string;
    role: "user" | "admin";
    timezone: string;
    createdAt: string;
    updatedAt: string;
};

export type Credentials = { email: string; password: string };
export type RegisterInput = Credentials & { name?: string };
export type AuthResponse = { token: string; user: User };
export type UserResponse = { user: User };
