import { json } from "@remix-run/node";
import db from "../db.server";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export async function action({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    try {
        const body = await request.json();
        const { shop, deviceType = "unknown", page = "/" } = body;

        if (!shop) {
            return json({ error: "Missing shop" }, { status: 400, headers: CORS_HEADERS });
        }

        // Create detailed click event for analytics
        await db.clickEvent.create({
            data: {
                shop,
                deviceType: deviceType || "unknown",
                page: page || "/",
            },
        });

        // Also increment the total count on Settings for quick access
        await db.settings.updateMany({
            where: { shop },
            data: { clickCount: { increment: 1 } },
        });

        return json({ success: true }, { headers: CORS_HEADERS });
    } catch (error) {
        console.error("Track click error:", error);
        return json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
    }
}

export async function loader() {
    return new Response("Method Not Allowed", { status: 405 });
}
