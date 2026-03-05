import { NextResponse } from "next/server";
import { destruirSesion } from "@/lib/auth";

export async function POST() {
    await destruirSesion();
    return NextResponse.json({ ok: true });
}
