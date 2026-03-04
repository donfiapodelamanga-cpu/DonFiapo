import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_KEY = process.env.ADMIN_API_KEY;

function isAuthenticated(req: NextRequest) {
    if (!ADMIN_KEY) return false;
    return req.headers.get("x-admin-key") === ADMIN_KEY;
}

export async function GET(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const nobles = await db.noble.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(nobles);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch nobles" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, email, walletAddress, tier, status, solanaWallet } = body;

        // Validation
        if (!name || !email || !walletAddress) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newNoble = await db.noble.create({
            data: {
                name,
                email,
                walletAddress,
                tier: tier || "Silver",
                status: status || "Probation",
                solanaWallet,
                referralCode: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`
            }
        });

        return NextResponse.json(newNoble, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create noble" }, { status: 500 });
    }
}
