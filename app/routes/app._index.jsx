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
  IndexTable,
  EmptySearchResult
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getTranslations } from "../translations";

// Recharts for graphs
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts";

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
    // ClickEvent table may not exist yet
  }

  const lang = settings.language || "it";
  const localeMap = { it: "it-IT", en: "en-US", es: "es-ES", de: "de-DE", fr: "fr-FR", pt: "pt-PT" };
  const locale = localeMap[lang] || "it-IT";

  // Group by day for Chart
  const clicksMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString(locale, { weekday: "short", day: "numeric" });
    clicksMap[key] = 0;
  }

  clickEvents.forEach((e) => {
    const key = new Date(e.createdAt).toLocaleDateString(locale, { weekday: "short", day: "numeric" });
    if (clicksMap[key] !== undefined) clicksMap[key]++;
  });

  const chartData = Object.entries(clicksMap).map(([name, clicks]) => ({ name, clicks }));

  const mobileClicks = clickEvents.filter((e) => e.deviceType === "mobile").length;
  const desktopClicks = clickEvents.filter((e) => e.deviceType === "desktop").length;

  // Analytics: Top Products
  const productsMap = {};
  clickEvents.forEach((e) => {
    if (e.productTitle) {
      productsMap[e.productTitle] = (productsMap[e.productTitle] || 0) + 1;
    }
  });

  const topProducts = Object.entries(productsMap)
    .map(([title, clicks]) => ({ title, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return json({
    totalClicks: settings.clickCount || 0,
    recentClicks: clickEvents.length,
    mobileClicks,
    desktopClicks,
    chartData,
    topProducts,
    isEnabled: settings.isEnabled,
    hasPhoneNumber: !!settings.phoneNumber,
    language: settings.language || "it",
    shop,
  });
};

export default function Index() {
  const {
    totalClicks, recentClicks, mobileClicks, desktopClicks,
    chartData, topProducts, isEnabled, hasPhoneNumber, language, shop,
  } = useLoaderData();
  const navigate = useNavigate();

  const t = getTranslations(language).dashboard;
  const tNav = getTranslations(language).nav;
  const mobilePct = recentClicks > 0 ? Math.round((mobileClicks / recentClicks) * 100) : 0;

  // Custom texts for the top products table
  const tProductsTitle = language === "it" ? "I 5 Prodotti più richiesti" : "Top 5 Requested Products";
  const tProductsSub = language === "it" ? "Prodotti che generano più chat su WhatsApp" : "Products generating the most WhatsApp chats";

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
                    {isEnabled ? "Attivo ✓" : "Disattivato ✗"}
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
                    "No WhatsApp number configured. The button won't be visible!"}{" "}
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
                  <Text tone="subdued" as="p">🎯 {t.totalClicks}</Text>
                  <Text variant="heading2xl" as="p" fontWeight="bold">{totalClicks}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text tone="subdued" as="p">🔥 {t.last7Days}</Text>
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

          {/* Area Chart with Recharts */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">📈 {t.last7Days}</Text>
                {recentClicks === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <Text tone="subdued">{t.noData}</Text>
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#25D366" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#128C7E" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Top Products Table */}
          <Layout.Section>
            <Card padding="0">
              <div style={{ padding: "16px 20px" }}>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">🛍️ {tProductsTitle}</Text>
                  <Text as="p" tone="subdued">{tProductsSub}</Text>
                </BlockStack>
              </div>
              <Divider />
              {topProducts.length === 0 ? (
                <div style={{ padding: "40px" }}>
                  <EmptySearchResult
                    title={language === "it" ? "Nessun dato sui prodotti" : "No product data yet"}
                    description={language === "it" ? "I clic sui prodotti appariranno qui." : "Clicks from product pages will show up here."}
                    withIllustration
                  />
                </div>
              ) : (
                <IndexTable
                  resourceName={{ singular: 'prodotto', plural: 'prodotti' }}
                  itemCount={topProducts.length}
                  headings={[
                    { title: language === "it" ? 'Prodotto' : 'Product' },
                    { title: language === "it" ? 'Chat Ricevute' : 'Chats Received', alignment: 'end' },
                  ]}
                  selectable={false}
                >
                  {topProducts.map(({ title, clicks }, index) => (
                    <IndexTable.Row id={title} key={title} position={index}>
                      <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">{title}</Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                          <Text variant="bodyMd" as="span">{clicks}</Text>
                          <Badge tone="success">Click</Badge>
                        </div>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Card>
          </Layout.Section>

        </Layout>
      </BlockStack>
    </Page>
  );
}
