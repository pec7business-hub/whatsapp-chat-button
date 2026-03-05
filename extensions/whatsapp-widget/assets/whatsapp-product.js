document.addEventListener("DOMContentLoaded", async function () {
    const shop = window.Shopify && window.Shopify.shop;
    if (!shop) return;

    // We use the Shopify App Proxy relative URL for all calls
    const proxyUrl = "/apps/whatsapp/api/proxy";

    const container = document.getElementById("wa-product-button-container");
    if (!container) return;

    let config;
    try {
        const res = await fetch(`${proxyUrl}/widget-config/${shop}`);
        if (!res.ok) return;
        config = await res.json();
    } catch (e) {
        return;
    }

    if (!config.isEnabled || !config.productButtonEnabled) return;

    const button = document.getElementById("wa-product-button");
    const textSpan = document.getElementById("wa-product-button-text");

    if (!button || !textSpan) return;

    // Apply color and text
    const color = config.buttonColor || "#25D366";
    button.style.backgroundColor = color;
    textSpan.textContent = config.productButtonLabel || "Chiedi su WhatsApp";

    // Build standard WhatsApp URL
    const buildWaUrl = (phone, msg) => {
        const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    };

    const targetPhone = config.phoneNumber || "";

    // Read the product title stored in a data attribute
    const productName = container.getAttribute("data-product-title") || "questo prodotto";
    const productUrl = window.location.href;

    let baseMessage = config.defaultMessage || "";
    if (baseMessage) baseMessage += "\n\n";
    baseMessage += `Sono interessato a: ${productName}\n${productUrl}`;

    if (!config.isAvailable) {
        button.style.filter = "grayscale(100%)";
        button.style.opacity = "0.7";
        button.href = buildWaUrl(targetPhone, config.offlineMessage || "");
        button.removeAttribute("target");
    } else {
        button.href = buildWaUrl(targetPhone, baseMessage);

        // Track click
        button.addEventListener("click", () => {
            fetch(`${proxyUrl}/track-click`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shop,
                    deviceType: window.innerWidth <= 768 ? "mobile" : "desktop",
                    page: window.location.pathname,
                    productTitle: productName
                }),
            }).catch(() => { });
        });
    }

    // Configure Share Button if enabled
    const shareButton = document.getElementById("wa-share-button");
    const shareTextSpan = document.getElementById("wa-share-button-text");
    if (config.shareButtonEnabled && shareButton && shareTextSpan) {
        shareButton.style.display = "flex";
        shareTextSpan.textContent = config.shareButtonLabel || "Condividi con un amico";
        // Pre-fill a native WhatsApp share message without a target phone number
        const shareMessage = `Guarda questo prodotto, secondo me ti piace!\n\n${productName}\n${productUrl}`;
        shareButton.href = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    }

    // Show button container
    container.style.display = "block";
});
