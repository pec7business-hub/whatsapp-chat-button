import { json } from "@remix-run/node";
import db from "../db.server";

// Re-use logic for availability
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

export async function loader({ request }) {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const path = url.pathname;

    // The proxy forwards to /api/proxy/...
    // Example: /api/proxy/widget-config/STORE_DOMAIN

    if (path.includes("/widget-config/")) {
        const urlShop = path.split("/widget-config/")[1];
        const targetShop = urlShop || shop;

        if (!targetShop) return json({ error: "Missing shop" }, { status: 400 });

        const settings = await db.settings.findUnique({ where: { shop: targetShop } });
        if (!settings || !settings.isEnabled) return json({ isEnabled: false });

        const isAvailable = isWithinAvailabilityHours(settings);
        let agents = [];
        try { agents = JSON.parse(settings.agents || "[]"); } catch { }
        let faqItems = [];
        try { faqItems = JSON.parse(settings.faqItems || "[]"); } catch { }

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
            faqEnabled: settings.faqEnabled,
            faqItems,
            plan: settings.plan,
            language: settings.language || "en",
            productButtonEnabled: settings.productButtonEnabled && settings.plan === "pro",
            productButtonLabel: settings.productButtonLabel || "Ask on WhatsApp",
            shareButtonEnabled: settings.shareButtonEnabled ?? true,
            shareButtonLabel: settings.shareButtonLabel || "Share with a friend",
        });
    }

    return json({ error: "Not found" }, { status: 404 });
}

export async function action({ request }) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.endsWith("/track-click")) {
        try {
            const body = await request.json();
            const { shop, deviceType = "unknown", page = "/" } = body;

            if (!shop) return json({ error: "Missing shop" }, { status: 400 });

            await db.clickEvent.create({
                data: {
                    shop,
                    deviceType: deviceType || "unknown",
                    page: page || "/",
                },
            });

            await db.settings.updateMany({
                where: { shop },
                data: { clickCount: { increment: 1 } },
            });

            return json({ success: true });
        } catch (error) {
            console.error("Proxy track error:", error);
            return json({ error: "Server error" }, { status: 500 });
        }
    }

    return json({ error: "Not found" }, { status: 404 });
}
