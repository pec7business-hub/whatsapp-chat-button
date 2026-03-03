import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import db from "../db.server";
import { getTranslations } from "../translations";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  let language = "en";

  // Check billing status
  let billingStatus = { hasActivePayment: false, trialDaysLeft: null };
  try {
    const { hasActivePayment, appSubscriptions } = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true,
    });
    billingStatus.hasActivePayment = hasActivePayment;

    const sub = appSubscriptions?.[0];
    if (sub?.currentPeriodEnd) {
      const diff = new Date(sub.currentPeriodEnd) - new Date();
      billingStatus.trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Sync billing state with our database
    try {
      const currentSettings = await db.settings.findUnique({ where: { shop: session.shop } });
      if (currentSettings) {
        language = currentSettings.language || "en";
        const newPlan = hasActivePayment ? "pro" : "free";
        if (currentSettings.plan !== newPlan) {
          await db.settings.update({
            where: { shop: session.shop },
            data: { plan: newPlan },
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync billing state:", e);
    }
  } catch {
    // billing not configured yet, allow access
    billingStatus.hasActivePayment = true;
    try {
      const fallbackSettings = await db.settings.findUnique({ where: { shop: session.shop } });
      if (fallbackSettings) {
        language = fallbackSettings.language || "en";
      }
    } catch (e) { }
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    hasActivePayment: billingStatus.hasActivePayment,
    trialDaysLeft: billingStatus.trialDaysLeft,
    language,
  };
};

export default function App() {
  const { apiKey, language } = useLoaderData();
  const t = getTranslations(language || "en").nav;

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          {t.dashboard}
        </Link>
        <Link to="/app/settings">{t.settings}</Link>
        {/* <Link to="/app/pricing">{t.pricing}</Link> - Hidden for 100% Free Launch */}
        <Link to="/app/support">{t.support || "Support"}</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

