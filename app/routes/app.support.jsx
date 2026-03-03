import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    Button,
    List,
    Box,
    Icon,
    InlineStack
} from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { EmailIcon, ChatIcon, CheckCircleIcon } from "@shopify/polaris-icons";
import { getTranslations } from "../translations";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    let language = "en";

    try {
        const settings = await db.settings.findUnique({ where: { shop: session.shop } });
        if (settings) {
            language = settings.language;
        }
    } catch (e) { }

    return { language };
};

export default function SupportPage() {
    const { language } = useLoaderData();
    const t = getTranslations(language || "en").support;

    return (
        <Page title={t.pageTitle}>
            <Layout>
                <Layout.Section>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Hero Contact Section */}
                        <Card roundedAbove="sm">
                            <Box padding="600">
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Icon source={ChatIcon} tone="base" />
                                        <Text variant="headingLg" as="h2">
                                            {t.needHelpHeader}
                                        </Text>
                                    </div>

                                    <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
                                        {t.needHelpDescription}
                                    </Text>

                                    <Box paddingBlockStart="200">
                                        <Button
                                            size="large"
                                            variant="primary"
                                            icon={EmailIcon}
                                            url="mailto:nyappshopify@gmail.com?subject=WhatsApp%20App%20Support%20Request"
                                            target="_blank"
                                        >
                                            {t.contactButtonText}
                                        </Button>
                                    </Box>

                                    <Text variant="bodySm" tone="subdued" alignment="center">
                                        {t.emailAddress}: nyappshopify@gmail.com
                                    </Text>
                                </div>
                            </Box>
                        </Card>

                        {/* Quick Troubleshooting Guide */}
                        <Card roundedAbove="sm">
                            <Box padding="600">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <Text variant="headingMd" as="h3">
                                        {t.quickGuideHeader}
                                    </Text>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Issue 1 */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ marginTop: '2px' }}><Icon source={CheckCircleIcon} tone="success" /></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                                <Text variant="bodyMd" fontWeight="bold">{t.issue1Title}</Text>
                                                <Text variant="bodyMd" tone="subdued">{t.issue1Desc}</Text>
                                            </div>
                                        </div>

                                        {/* Issue 2 */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ marginTop: '2px' }}><Icon source={CheckCircleIcon} tone="success" /></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                                <Text variant="bodyMd" fontWeight="bold">{t.issue2Title}</Text>
                                                <Text variant="bodyMd" tone="subdued">{t.issue2Desc}</Text>
                                            </div>
                                        </div>

                                        {/* Issue 3 */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ marginTop: '2px' }}><Icon source={CheckCircleIcon} tone="success" /></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                                <Text variant="bodyMd" fontWeight="bold">{t.issue3Title}</Text>
                                                <Text variant="bodyMd" tone="subdued">{t.issue3Desc}</Text>
                                            </div>
                                        </div>

                                        {/* Issue 4 */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ marginTop: '2px' }}><Icon source={CheckCircleIcon} tone="success" /></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                                <Text variant="bodyMd" fontWeight="bold">{t.issue4Title}</Text>
                                                <Text variant="bodyMd" tone="subdued">{t.issue4Desc}</Text>
                                            </div>
                                        </div>

                                        {/* Issue 5 */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ marginTop: '2px' }}><Icon source={CheckCircleIcon} tone="success" /></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                                <Text variant="bodyMd" fontWeight="bold">{t.issue5Title}</Text>
                                                <Text variant="bodyMd" tone="subdued">{t.issue5Desc}</Text>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Box>
                        </Card>
                    </div>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
