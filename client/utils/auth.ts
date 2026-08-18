"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserApi } from "@/lib/client/auth";

async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    try {
        const data = await getUserApi(token);
        return data.user;
    } catch {
        return null;
    }
}

export const requireSession = async () => {
    const user = await getSession();
    if (!user) redirect("/sign-in");
    return user;
};

export const requireNotSession = async () => {
    const user = await getSession();
    if (user) redirect("/dashboard");
    return user;
};