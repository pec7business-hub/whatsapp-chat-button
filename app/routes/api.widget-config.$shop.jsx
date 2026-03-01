import { json } from "@remix-run/node";
import db from "../db.server";

// Calculate if we're within availability hours
function isWithinAvailabilityHours(settings) {
    if (!settings.availabilityEnabled) return true;

    try {
        const days = JSON.parse(settings.availabilityDays || "[1,2,3,4,5]");
        const now = new Date();

        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: settings.timezone || "Europe/Rome",
            hour: "2-digit",
            minute: "2-digit",
            weekday: "short",
            hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const hourStr = parts.find((p) => p.type === "hour")?.value || "0";
        const minuteStr = parts.find((p) => p.type === "minute")?.value || "0";
        const weekdayStr = parts.find((p) => p.type === "weekday")?.value;
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const currentDay = weekdays.indexOf(weekdayStr);

        if (!days.includes(currentDay)) return false;

        const currentMins = parseInt(hourStr) * 60 + parseInt(minuteStr);
        const [startH, startM] = (settings.startTime || "09:00").split(":").map(Number);
        const [endH, endM] = (settings.endTime || "18:00").split(":").map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        return currentMins >= startMins && currentMins <= endMins;
    } catch {
        return true;
    }
}

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export async function loader({ params }) {
    const shop = params.shop;

    if (!shop) {
        return json({ error: "Missing shop parameter" }, { status: 400, headers: CORS_HEADERS });
    }

    try {
        const settings = await db.settings.findUnique({ where: { shop } });

        if (!settings || !settings.isEnabled) {
            return json({ isEnabled: false }, { headers: CORS_HEADERS });
        }

        const isAvailable = isWithinAvailabilityHours(settings);
        let agents = [];
        try { agents = JSON.parse(settings.agents || "[]"); } catch { }

        return json({
            isEnabled: true,
            isAvailable,
            offlineMessage: settings.offlineMessage,
            phoneNumber: settings.phoneNumber,
            defaultMessage: settings.defaultMessage,
            buttonPosition: settings.buttonPosition,
            buttonSize: settings.buttonSize,
            buttonColor: settings.buttonColor,
            tooltipText: settings.tooltipText,
            tooltipEnabled: settings.tooltipEnabled,
            showOnMobile: settings.showOnMobile,
            showOnDesktop: settings.showOnDesktop,
            marginBottom: settings.marginBottom,
            marginSide: settings.marginSide,
            animation: settings.animation,
            agents,
            plan: settings.plan,
            language: settings.language || "it",
            productMessageTemplate: settings.productMessageTemplate || "Ciao! Sono interessato a: {{product}}",
        }, { headers: CORS_HEADERS });

    } catch (error) {
        return json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
    }
}

export async function action({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }
    return new Response("Method Not Allowed", { status: 405 });
}
