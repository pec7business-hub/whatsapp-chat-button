import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
    const { webhook } = await authenticate.webhook(request);

    if (webhook.topic !== "SHOP_REDACT") {
        return new Response("Invalid topic", { status: 400 });
    }

    console.log("Received SHOP_REDACT for shop", webhook.shop);

    // Delete the shop's settings in our database as requested by GDPR
    try {
        await db.settings.delete({
            where: { shop: webhook.shop },
        });
    } catch (error) {
        // Ignore if not found
    }

    return new Response("OK", { status: 200 });
};
