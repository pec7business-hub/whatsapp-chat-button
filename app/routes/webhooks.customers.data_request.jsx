import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    try {
        const { webhook } = await authenticate.webhook(request);

        if (webhook.topic !== "CUSTOMERS_DATA_REQUEST") {
            return new Response("Invalid topic", { status: 400 });
        }

        // The payload contains the customer info. Since we don't store customer PII, 
        // we don't need to return any data.
        console.log("Received CUSTOMERS_DATA_REQUEST for shop", webhook.shop);

        return new Response("OK", { status: 200 });
    } catch (error) {
        console.error("Webhook authentication failed:", error);
        return new Response("Unauthorized", { status: 401 });
    }
};
