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
import db from "../db.server";
import { getTranslations } from "../translations";

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

    // Get language from settings
    const settings = await db.settings.findUnique({ where: { shop: session.shop } });
    const language = settings?.language || "it";

    return json({
        hasActivePayment,
        trialDaysLeft,
        shop: session.shop,
        language,
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
    const { hasActivePayment, trialDaysLeft, language } = useLoaderData();
    const submit = useSubmit();
    const navigation = useNavigation();
    const isLoading = navigation.state === "submitting";

    const t = getTranslations(language).pricing;

    const handleSubscribe = () => {
        submit({}, { method: "post" });
    };

    return (
        <Page title={t.title}>
            <Layout>
                {trialDaysLeft !== null && trialDaysLeft > 0 && (
                    <Layout.Section>
                        <Banner
                            title={
                                language === "it" ? `Hai ancora ${trialDaysLeft} giorni di prova gratuita` :
                                    language === "en" ? `You have ${trialDaysLeft} days left in your free trial` :
                                        language === "es" ? `Te quedan ${trialDaysLeft} días de prueba gratuita` :
                                            language === "de" ? `Sie haben noch ${trialDaysLeft} Tage kostenlose Testzeit` :
                                                language === "fr" ? `Il vous reste ${trialDaysLeft} jours d'essai gratuit` :
                                                    `Você tem ${trialDaysLeft} dias restantes de teste grátis`
                            }
                            tone="info"
                        >
                            <p>
                                {language === "it" ? "Stai usando WhatsApp Chat Button Pro in prova gratuita. Dopo la scadenza, puoi continuare sottoscrivendo il piano mensile." :
                                    language === "en" ? "You're using WhatsApp Chat Button Pro on a free trial. After it expires, you can continue by subscribing to the monthly plan." :
                                        language === "es" ? "Estás usando WhatsApp Chat Button Pro en prueba gratuita. Después de que expire, puedes continuar suscribiéndote al plan mensual." :
                                            language === "de" ? "Sie verwenden WhatsApp Chat Button Pro in der kostenlosen Testversion. Nach Ablauf können Sie durch Abschluss des Monatsabonnements fortfahren." :
                                                language === "fr" ? "Vous utilisez WhatsApp Chat Button Pro en essai gratuit. Après expiration, vous pouvez continuer en souscrivant à l'abonnement mensuel." :
                                                    "Você está usando o WhatsApp Chat Button Pro em teste grátis. Após o término, pode continuar assinando o plano mensal."}
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
                                        {t.freeTitle}
                                    </Text>
                                    <Text variant="heading2xl" as="p" fontWeight="bold">
                                        $0
                                        <Text variant="bodyMd" as="span" tone="subdued">
                                            {" "}/{language === "it" ? "mese" : language === "en" ? "month" : language === "es" ? "mes" : language === "de" ? "Monat" : language === "fr" ? "mois" : "mês"}
                                        </Text>
                                    </Text>
                                </BlockStack>
                                <Divider />
                                <List>
                                    {t.freeFeatures.map((f, i) => (
                                        <List.Item key={i}>✅ {f}</List.Item>
                                    ))}
                                </List>
                                <Button disabled={!hasActivePayment} fullWidth>
                                    {!hasActivePayment ? t.freeCurrent : t.freeTitle}
                                </Button>
                            </BlockStack>
                        </Card>

                        {/* Pro Plan */}
                        <Card>
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <InlineStack gap="200">
                                        <Text variant="headingLg" as="h2">
                                            {t.proTitle}
                                        </Text>
                                        <Badge tone="success">
                                            {language === "it" ? "Consigliato" : language === "en" ? "Recommended" : language === "es" ? "Recomendado" : language === "de" ? "Empfohlen" : language === "fr" ? "Recommandé" : "Recomendado"}
                                        </Badge>
                                    </InlineStack>
                                    <Text variant="heading2xl" as="p" fontWeight="bold">
                                        $4.99
                                        <Text variant="bodyMd" as="span" tone="subdued">
                                            {" "}/{language === "it" ? "mese" : language === "en" ? "month" : language === "es" ? "mes" : language === "de" ? "Monat" : language === "fr" ? "mois" : "mês"}
                                        </Text>
                                    </Text>
                                    <Text tone="success" fontWeight="semibold">
                                        🎉 {t.proTrial}
                                    </Text>
                                </BlockStack>
                                <Divider />
                                <List>
                                    {t.proFeatures.map((f, i) => (
                                        <List.Item key={i}>✅ {f}</List.Item>
                                    ))}
                                </List>
                                <Button
                                    variant="primary"
                                    fullWidth
                                    loading={isLoading}
                                    disabled={hasActivePayment}
                                    onClick={handleSubscribe}
                                >
                                    {hasActivePayment
                                        ? `${t.proCurrent} ✓`
                                        : t.proCta}
                                </Button>
                            </BlockStack>
                        </Card>
                    </InlineStack>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
