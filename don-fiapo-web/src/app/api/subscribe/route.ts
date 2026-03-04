import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, rateLimit, getClientIP } from "@/lib/security";

export async function POST(req: NextRequest) {
    try {
        // Rate limit: 5 subscribes per minute per IP
        const ip = getClientIP(req);
        const rl = rateLimit(`subscribe:${ip}`, 5, 60_000);
        if (rl) return rl;

        const body = await req.json();
        const { email, source = "modal" } = body;

        if (!email || !isValidEmail(email)) {
            return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
        }

        try {
            const subscriber = await db.subscriber.create({
                data: {
                    email,
                    source,
                },
            });
            return NextResponse.json(subscriber, { status: 200 });
        } catch (e: any) {
            // Prisma error for unique constraint violation (P2002)
            if (e.code === 'P2002') {
                return NextResponse.json(
                    { message: "Email already subscribed" },
                    { status: 200 } // Return 200 to not break the UI flow, just acknowledge
                );
            }
            throw e;
        }

    } catch (error) {
        console.error("[SUBSCRIBE_ERROR]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}
