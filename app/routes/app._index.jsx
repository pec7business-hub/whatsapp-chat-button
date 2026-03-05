import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getTranslations } from "../translations";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await db.settings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await db.settings.create({ data: { shop } });
  }

  // Analytics: click events per day (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let clickEvents = [];
  try {
    clickEvents = await db.clickEvent.findMany({
      where: { shop, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    // ClickEvent table may not exist yet if migration hasn't run
  }

  // Determine locale for date formatting based on language
  const lang = settings.language || "it";
  const localeMap = { it: "it-IT", en: "en-US", es: "es-ES", de: "de-DE", fr: "fr-FR", pt: "pt-PT" };
  const locale = localeMap[lang] || "it-IT";

  // Group by day
  const clicksByDay = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString(locale, { weekday: "short", day: "numeric" });
    clicksByDay[key] = 0;
  }
  clickEvents.forEach((e) => {
    const key = new Date(e.createdAt).toLocaleDateString(locale, { weekday: "short", day: "numeric" });
    if (clicksByDay[key] !== undefined) clicksByDay[key]++;
  });

  const mobileClicks = clickEvents.filter((e) => e.deviceType === "mobile").length;
  const desktopClicks = clickEvents.filter((e) => e.deviceType === "desktop").length;

  return json({
    totalClicks: settings.clickCount || 0,
    recentClicks: clickEvents.length,
    mobileClicks,
    desktopClicks,
    clicksByDay,
    isEnabled: settings.isEnabled,
    hasPhoneNumber: !!settings.phoneNumber,
    plan: settings.plan || "free",
    language: settings.language || "it",
    shop,
  });
};

// Simple bar chart component using pure CSS
function BarChart({ data }) {
  const entries = Object.entries(data);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px", padding: "0 4px" }}>
      {entries.map(([label, value]) => (
        <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              width: "100%",
              height: `${Math.max((value / maxVal) * 100, 4)}px`,
              backgroundColor: "#25D366",
              borderRadius: "4px 4px 0 0",
              transition: "height 0.3s ease",
              minHeight: "4px",
              position: "relative",
            }}
            title={`${value} click`}
          >
            {value > 0 && (
              <span style={{
                position: "absolute", top: "-18px", left: "50%", transform: "translateX(-50%)",
                fontSize: "10px", fontWeight: "600", color: "#25D366", whiteSpace: "nowrap",
              }}>{value}</span>
            )}
          </div>
          <span style={{ fontSize: "10px", color: "#6b7280", textAlign: "center" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Index() {
  const {
    totalClicks, recentClicks, mobileClicks, desktopClicks,
    clicksByDay, isEnabled, hasPhoneNumber, plan, language, shop,
  } = useLoaderData();
  const navigate = useNavigate();

  const t = getTranslations(language).dashboard;
  const tNav = getTranslations(language).nav;
  const mobilePct = recentClicks > 0 ? Math.round((mobileClicks / recentClicks) * 100) : 0;

  return (
    <Page>
      <TitleBar title={`WhatsApp Chat Button – ${t.title}`} />
      <BlockStack gap="500">
        {/* Status Banner */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" gap="400">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">📱 WhatsApp Chat Button</Text>
                <InlineStack gap="200">
                  <Badge tone={isEnabled ? "success" : "warning"}>
                    {isEnabled ? "✓" : "✗"}
                  </Badge>
                </InlineStack>
              </BlockStack>
              <InlineStack gap="200">
                <Button onClick={() => navigate("/app/settings")}>{tNav.settings}</Button>
              </InlineStack>
            </InlineStack>
            {!hasPhoneNumber && (
              <>
                <Divider />
                <Text tone="caution">
                  ⚠️ {language === "it" ? "Nessun numero WhatsApp configurato. Il pulsante non sarà visibile!" :
                    language === "en" ? "No WhatsApp number configured. The button won't be visible!" :
                      language === "es" ? "Ningún número de WhatsApp configurado. ¡El botón no será visible!" :
                        language === "de" ? "Keine WhatsApp-Nummer konfiguriert. Der Button wird nicht sichtbar sein!" :
                          language === "fr" ? "Aucun numéro WhatsApp configuré. Le bouton ne sera pas visible !" :
                            "Nenhum número WhatsApp configurado. O botão não será visível!"}{" "}
                  <Button variant="plain" onClick={() => navigate("/app/settings")}>
                    {tNav.settings} →
                  </Button>
                </Text>
              </>
            )}
          </BlockStack>
        </Card>

        <Layout>
          {/* KPI Cards */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text tone="subdued" as="p">{t.totalClicks}</Text>
                  <Text variant="heading2xl" as="p" fontWeight="bold">{totalClicks}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text tone="subdued" as="p">{t.last7Days}</Text>
                  <Text variant="heading2xl" as="p" fontWeight="bold">{recentClicks}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text tone="subdued" as="p">📱 {t.mobilePercent}</Text>
                  <Text variant="headingXl" as="p" fontWeight="bold">{mobilePct}%</Text>
                  <Text tone="subdued" as="p">{mobileClicks} mobile · {desktopClicks} desktop</Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Chart */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">📊 {t.last7Days}</Text>
                {recentClicks === 0 ? (
                  <Text tone="subdued">{t.noData}</Text>
                ) : (
                  <BarChart data={clicksByDay} />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>


      </BlockStack>
    </Page>
  );
}
