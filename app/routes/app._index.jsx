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
  EmptySearchResult,
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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let clickEvents = [];
  try {
    clickEvents = await db.clickEvent.findMany({
      where: { shop, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    // table may not exist yet
  }

  const lang = settings.language || "it";
  const localeMap = { it: "it-IT", en: "en-US", es: "es-ES", de: "de-DE", fr: "fr-FR", pt: "pt-PT" };
  const locale = localeMap[lang] || "it-IT";

  // Group by day
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

  // Top Products
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
  });
};

// Premium CSS-based area chart (SVG)
function PremiumAreaChart({ data }) {
  const W = 600;
  const H = 160;
  const PAD = { top: 20, right: 10, bottom: 30, left: 30 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.clicks), 1);

  const points = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1)) * chartW;
    const y = PAD.top + chartH - (d.clicks / maxVal) * chartH;
    return { x, y, ...d };
  });

  // Build SVG path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + chartH} L${points[0].x},${PAD.top + chartH} Z`;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#25D366" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#25D366" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD.top + chartH * (1 - frac);
          return (
            <g key={frac}>
              <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y} stroke="#E5E7EB" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">
                {Math.round(frac * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots + labels */}
        {points.map((p) => (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r="4" fill="#25D366" stroke="white" strokeWidth="2" />
            {p.clicks > 0 && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#128C7E" fontWeight="600">
                {p.clicks}
              </text>
            )}
            <text x={p.x} y={PAD.top + chartH + 16} textAnchor="middle" fontSize="10" fill="#6B7280">
              {p.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// KPI card with an optional colored highlight bar
function KpiCard({ label, value, sub, accentColor = "#25D366" }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 1px 3px rgba(0,0,0,.08)",
      borderTop: `3px solid ${accentColor}`,
    }}>
      <Text tone="subdued" as="p" variant="bodySm">{label}</Text>
      <Text variant="heading2xl" as="p" fontWeight="bold">{value}</Text>
      {sub && <Text tone="subdued" as="p" variant="bodySm">{sub}</Text>}
    </div>
  );
}

export default function Index() {
  const {
    totalClicks, recentClicks, mobileClicks, desktopClicks,
    chartData, topProducts, isEnabled, hasPhoneNumber, language,
  } = useLoaderData();
  const navigate = useNavigate();

  const t = getTranslations(language).dashboard;
  const tNav = getTranslations(language).nav;
  const mobilePct = recentClicks > 0 ? Math.round((mobileClicks / recentClicks) * 100) : 0;

  const tProductsTitle = language === "it" ? "🛍️ Prodotti più richiesti" : "🛍️ Top Requested Products";
  const tProductsSub = language === "it" ? "Clic dal pulsante su pagine prodotto (ultimi 7 giorni)" : "WhatsApp button clicks on product pages (last 7 days)";

  return (
    <Page>
      <TitleBar title={`WhatsApp Chat Button – ${t.title}`} />
      <BlockStack gap="500">

        {/* Status Banner */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" gap="400">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">📱 WhatsApp Chat Button</Text>
                <InlineStack gap="200">
                  <Badge tone={isEnabled ? "success" : "warning"}>
                    {isEnabled ? (language === "it" ? "Attivo ✓" : "Active ✓") : (language === "it" ? "Disattivato ✗" : "Disabled ✗")}
                  </Badge>
                </InlineStack>
              </BlockStack>
              <Button onClick={() => navigate("/app/settings")}>{tNav.settings}</Button>
            </InlineStack>
            {!hasPhoneNumber && (
              <>
                <Divider />
                <Text tone="caution">
                  ⚠️ {language === "it" ? "Nessun numero WhatsApp configurato. Il pulsante non sarà visibile! " : "No WhatsApp number configured. The button won't be visible! "}
                  <Button variant="plain" onClick={() => navigate("/app/settings")}>{tNav.settings} →</Button>
                </Text>
              </>
            )}
          </BlockStack>
        </Card>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <KpiCard
            label={`🎯 ${t.totalClicks}`}
            value={totalClicks}
            accentColor="#25D366"
          />
          <KpiCard
            label={`🔥 ${t.last7Days}`}
            value={recentClicks}
            accentColor="#128C7E"
          />
          <KpiCard
            label={`📱 ${t.mobilePercent}`}
            value={`${mobilePct}%`}
            sub={`${mobileClicks} mobile · ${desktopClicks} desktop`}
            accentColor="#34D399"
          />
        </div>

        {/* Chart */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">📈 {t.last7Days}</Text>
            {recentClicks === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <Text tone="subdued">{t.noData}</Text>
              </div>
            ) : (
              <PremiumAreaChart data={chartData} />
            )}
          </BlockStack>
        </Card>

        {/* Top Products Table */}
        <Card padding="0">
          <div style={{ padding: "16px 20px" }}>
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">{tProductsTitle}</Text>
              <Text as="p" tone="subdued">{tProductsSub}</Text>
            </BlockStack>
          </div>
          <Divider />
          {topProducts.length === 0 ? (
            <div style={{ padding: "40px" }}>
              <EmptySearchResult
                title={language === "it" ? "Nessun dato sui prodotti" : "No product data yet"}
                description={language === "it" ? "I clic dai pulsanti sulle pagine prodotto appariranno qui." : "Clicks from product page buttons will show up here."}
                withIllustration
              />
            </div>
          ) : (
            <IndexTable
              resourceName={{ singular: "prodotto", plural: "prodotti" }}
              itemCount={topProducts.length}
              headings={[
                { title: language === "it" ? "Prodotto" : "Product" },
                { title: language === "it" ? "Chat ricevute" : "Chats", alignment: "end" },
              ]}
              selectable={false}
            >
              {topProducts.map(({ title, clicks }, index) => (
                <IndexTable.Row id={title} key={title} position={index}>
                  <IndexTable.Cell>
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{
                        width: "24px", height: "24px", borderRadius: "50%",
                        background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", fontWeight: "700", color: "#128C7E", flexShrink: 0,
                      }}>
                        {index + 1}
                      </div>
                      <Text variant="bodyMd" fontWeight="semibold" as="span">{title}</Text>
                    </InlineStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Badge tone="success">{clicks} click</Badge>
                    </div>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          )}
        </Card>

      </BlockStack>
    </Page>
  );
}
