import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getTranslations } from "../translations";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  let language = "en";

  try {
    const fallbackSettings = await db.settings.findUnique({ where: { shop: session.shop } });
    if (fallbackSettings) {
      language = fallbackSettings.language || "en";

      // Ensure all users are marked as free plan in DB
      if (fallbackSettings.plan !== "free") {
        await db.settings.update({
          where: { shop: session.shop },
          data: { plan: "free" },
        });
      }
    }
  } catch (e) { }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
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

