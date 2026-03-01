import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    const { webhook } = await authenticate.webhook(request);

    if (webhook.topic !== "CUSTOMERS_REDACT") {
        return new Response("Invalid topic", { status: 400 });
    }

    // The payload contains the customer info to delete. Since we don't store customer PII, 
    // we just acknowledge the request.
    console.log("Received CUSTOMERS_REDACT for shop", webhook.shop);

    return new Response("OK", { status: 200 });
};
