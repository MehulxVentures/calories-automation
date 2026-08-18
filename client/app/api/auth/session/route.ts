import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { token } = await request.json() as { token?: string };
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });
    const store = await cookies();
    store.set("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE() {
    const store = await cookies();
    store.delete("token");
    return NextResponse.json({ ok: true });
}
