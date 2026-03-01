import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    Button,
    Badge,
    InlineStack,
    List,
    Divider,
    Banner,
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
    const { session, billing } = await authenticate.admin(request);
    const { hasActivePayment, appSubscriptions } = await billing.check({
        plans: [MONTHLY_PLAN],
        isTest: true,
    });

    const subscription = appSubscriptions[0];
    let trialDaysLeft = null;
    if (subscription?.trialDays && subscription?.currentPeriodEnd) {
        const trialEnd = new Date(subscription.currentPeriodEnd);
        const now = new Date();
        const diff = trialEnd - now;
        trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return json({
        hasActivePayment,
        trialDaysLeft,
        shop: session.shop,
    });
};

export const action = async ({ request }) => {
    const { billing } = await authenticate.admin(request);
    await billing.request({
        plan: MONTHLY_PLAN,
        isTest: true,
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app`,
    });
};

export default function PricingPage() {
    const { hasActivePayment, trialDaysLeft } = useLoaderData();
    const submit = useSubmit();
    const navigation = useNavigation();
    const isLoading = navigation.state === "submitting";

    const handleSubscribe = () => {
        submit({}, { method: "post" });
    };

    return (
        <Page title="Piani e Prezzi">
            <Layout>
                {trialDaysLeft !== null && trialDaysLeft > 0 && (
                    <Layout.Section>
                        <Banner
                            title={`Hai ancora ${trialDaysLeft} giorni di prova gratuita`}
                            tone="info"
                        >
                            <p>
                                Stai usando WhatsApp Chat Button Pro in prova gratuita. Dopo la
                                scadenza, puoi continuare sottoscrivendo il piano mensile.
                            </p>
                        </Banner>
                    </Layout.Section>
                )}
                <Layout.Section>
                    <InlineStack gap="400" align="center">
                        {/* Free Plan */}
                        <Card>
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <Text variant="headingLg" as="h2">
                                        Free
                                    </Text>
                                    <Text variant="heading2xl" as="p" fontWeight="bold">
                                        $0
                                        <Text variant="bodyMd" as="span" tone="subdued">
                                            {" "}
                                            /mese
                                        </Text>
                                    </Text>
                                </BlockStack>
                                <Divider />
                                <List>
                                    <List.Item>✅ Pulsante WhatsApp base</List.Item>
                                    <List.Item>✅ Personalizzazione colore e posizione</List.Item>
                                    <List.Item>✅ Max 100 click/mese</List.Item>
                                    <List.Item>❌ Orari di disponibilità</List.Item>
                                    <List.Item>❌ Analytics avanzati</List.Item>
                                    <List.Item>❌ Multi-agente</List.Item>
                                    <List.Item>❌ Messaggio smart (nome prodotto)</List.Item>
                                </List>
                                <Button disabled={!hasActivePayment} fullWidth>
                                    {!hasActivePayment ? "Piano attuale" : "Torna al Free"}
                                </Button>
                            </BlockStack>
                        </Card>

                        {/* Pro Plan */}
                        <Card>
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <InlineStack gap="200">
                                        <Text variant="headingLg" as="h2">
                                            Pro
                                        </Text>
                                        <Badge tone="success">Consigliato</Badge>
                                    </InlineStack>
                                    <Text variant="heading2xl" as="p" fontWeight="bold">
                                        $4.99
                                        <Text variant="bodyMd" as="span" tone="subdued">
                                            {" "}
                                            /mese
                                        </Text>
                                    </Text>
                                    <Text tone="success" fontWeight="semibold">
                                        🎉 7 giorni di prova gratuita
                                    </Text>
                                </BlockStack>
                                <Divider />
                                <List>
                                    <List.Item>✅ Tutto del piano Free</List.Item>
                                    <List.Item>✅ Click illimitati</List.Item>
                                    <List.Item>✅ Orari di disponibilità con timezone</List.Item>
                                    <List.Item>✅ Analytics con grafici</List.Item>
                                    <List.Item>✅ Multi-agente (fino a 5)</List.Item>
                                    <List.Item>✅ Messaggio smart con nome prodotto</List.Item>
                                    <List.Item>✅ Supporto prioritario</List.Item>
                                </List>
                                <Button
                                    variant="primary"
                                    fullWidth
                                    loading={isLoading}
                                    disabled={hasActivePayment}
                                    onClick={handleSubscribe}
                                >
                                    {hasActivePayment
                                        ? "Piano attuale ✓"
                                        : "Inizia la prova gratuita"}
                                </Button>
                            </BlockStack>
                        </Card>
                    </InlineStack>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
