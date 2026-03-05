import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    Button,
    BlockStack,
    TextField,
    Select,
    Checkbox,
    InlineGrid,
    Text,
    Badge,
    Divider,
    InlineStack,
    Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getTranslations, defaultMessages } from "../translations";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    let settings = await db.settings.findUnique({ where: { shop } });
    if (!settings) {
        settings = await db.settings.create({ data: { shop } });
    }

    return json({ settings });
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    // Handle agents JSON
    let agents = "[]";
    try {
        const agentsRaw = formData.get("agents");
        JSON.parse(agentsRaw); // validate
        agents = agentsRaw;
    } catch { }

    const data = {
        phoneNumber: formData.get("phoneNumber") || "",
        defaultMessage: formData.get("defaultMessage") || "",
        buttonPosition: formData.get("buttonPosition") || "bottom-right",
        buttonSize: formData.get("buttonSize") || "medium",
        buttonColor: formData.get("buttonColor") || "#25D366",
        tooltipText: formData.get("tooltipText") || "",
        tooltipEnabled: formData.get("tooltipEnabled") === "true",
        showOnMobile: formData.get("showOnMobile") === "true",
        showOnDesktop: formData.get("showOnDesktop") === "true",
        marginBottom: parseInt(formData.get("marginBottom") || "20", 10),
        marginSide: parseInt(formData.get("marginSide") || "20", 10),
        animation: formData.get("animation") || "pulse",
        isEnabled: formData.get("isEnabled") === "true",
        // Language & Product Message
        language: formData.get("language") || "it",
        // Availability
        availabilityEnabled: formData.get("availabilityEnabled") === "true",
        timezone: formData.get("timezone") || "Europe/Rome",
        availabilityDays: formData.get("availabilityDays") || "[1,2,3,4,5]",
        startTime: formData.get("startTime") || "09:00",
        endTime: formData.get("endTime") || "18:00",
        offlineMessage: formData.get("offlineMessage") || "",
        // Product Button
        productButtonEnabled: formData.get("productButtonEnabled") === "true",
        productButtonLabel: formData.get("productButtonLabel") || "Ask on WhatsApp",
        shareButtonEnabled: formData.get("shareButtonEnabled") === "true",
        shareButtonLabel: formData.get("shareButtonLabel") || "Share with a friend",
        // Agents & FAQ
        agents,
        faqEnabled: formData.get("faqEnabled") === "true",
        faqItems: String(formData.get("faqItems") || "[]"),
    };

    await db.settings.update({ where: { shop }, data });

    // Return the saved language so we can show the correct toast
    const t = getTranslations(data.language);
    return json({ success: true, message: t.settings.saved });
};

const TIMEZONES = [
    { label: "Roma (IT) - Europe/Rome", value: "Europe/Rome" },
    { label: "Londra - Europe/London", value: "Europe/London" },
    { label: "New York - America/New_York", value: "America/New_York" },
    { label: "Los Angeles - America/Los_Angeles", value: "America/Los_Angeles" },
    { label: "Dubai - Asia/Dubai", value: "Asia/Dubai" },
    { label: "Sydney - Australia/Sydney", value: "Australia/Sydney" },
];

const LANGUAGES = [
    { label: "🇮🇹 Italiano", value: "it" },
    { label: "🇬🇧 English", value: "en" },
    { label: "🇪🇸 Español", value: "es" },
    { label: "🇩🇪 Deutsch", value: "de" },
    { label: "🇫🇷 Français", value: "fr" },
    { label: "🇵🇹 Português", value: "pt" },
];

export default function Settings() {
    const { settings } = useLoaderData();
    const actionData = useActionData();
    const submit = useSubmit();
    const navigation = useNavigation();
    const shopify = useAppBridge();

    const isSaving = navigation.state === "submitting";

    const [formState, setFormState] = useState({
        ...settings,
        availabilityDays: settings.availabilityDays || "[1,2,3,4,5]",
        agents: settings.agents || "[]",
    });

    // Get translations based on currently selected language
    const t = getTranslations(formState.language || "it").settings;

    // Parse agents from JSON string
    const [agents, setAgents] = useState(() => {
        try { return JSON.parse(settings.agents || "[]"); } catch { return []; }
    });

    // Parse availability days
    const [availDays, setAvailDays] = useState(() => {
        try { return JSON.parse(settings.availabilityDays || "[1,2,3,4,5]"); } catch { return [1, 2, 3, 4, 5]; }
    });

    // Parse FAQ items
    const [faqItems, setFaqItems] = useState(() => {
        try { return JSON.parse(settings.faqItems || "[]"); } catch { return []; }
    });

    // Day names from translations
    const DAYS = t.dayNames.map((label, value) => ({ label, value }));

    useEffect(() => {
        if (actionData?.success) shopify.toast.show(actionData.message);
    }, [actionData, shopify]);

    const handleChange = (value, id) => setFormState((prev) => ({ ...prev, [id]: value }));

    // When language changes, auto-translate message fields
    const handleLanguageChange = (newLang) => {
        const msgs = defaultMessages[newLang] || defaultMessages["en"];
        setFormState((prev) => ({
            ...prev,
            language: newLang,
            defaultMessage: msgs.defaultMessage,
            tooltipText: msgs.tooltipText,
            offlineMessage: msgs.offlineMessage,
            productButtonLabel: msgs.productButtonLabel,
            shareButtonLabel: msgs.shareButtonLabel,
        }));
    };

    const toggleDay = (day) => {
        setAvailDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const addAgent = () =>
        setAgents((prev) => [...prev, { name: "", phone: "", role: "", avatar: "" }]);

    const updateAgent = (idx, field, value) =>
        setAgents((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));

    const removeAgent = (idx) => setAgents((prev) => prev.filter((_, i) => i !== idx));

    const addFaq = () =>
        setFaqItems((prev) => [...prev, { question: "", answer: "" }]);

    const updateFaq = (idx, field, value) =>
        setFaqItems((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));

    const removeFaq = (idx) => setFaqItems((prev) => prev.filter((_, i) => i !== idx));

    const handleSave = () => {
        const data = {
            ...formState,
            availabilityDays: JSON.stringify(availDays),
            agents: JSON.stringify(agents),
            faqItems: JSON.stringify(faqItems),
        };
        submit(data, { method: "post" });
    };

    return (
        <Page
            backAction={{ content: "Dashboard", url: "/app" }}
            title={t.title}
            primaryAction={{ content: t.save, onAction: handleSave, loading: isSaving }}
        >
            <TitleBar title={t.title} />
            <Layout>
                <Layout.Section>
                    <BlockStack gap="500">
                        {/* General */}
                        <Card>
                            <BlockStack gap="400">
                                <Text as="h2" variant="headingMd">{t.generalTitle}</Text>
                                <Checkbox
                                    label={t.enableButton}
                                    checked={formState.isEnabled}
                                    onChange={(val) => handleChange(val, "isEnabled")}
                                />
                                <TextField
                                    label={t.phoneNumber}
                                    value={formState.phoneNumber}
                                    onChange={(val) => handleChange(val, "phoneNumber")}
                                    helpText={t.phoneHelp}
                                    autoComplete="off"
                                />
                                <TextField
                                    label={t.defaultMessage}
                                    value={formState.defaultMessage}
                                    onChange={(val) => handleChange(val, "defaultMessage")}
                                    helpText={t.defaultMessageHelp}
                                    multiline={3}
                                    autoComplete="off"
                                />
                                <Divider />
                                <Select
                                    label={t.language}
                                    options={LANGUAGES}
                                    value={formState.language || "en"}
                                    onChange={handleLanguageChange}
                                    helpText={t.languageHelp}
                                />
                            </BlockStack>
                        </Card>

                        {/* Product Button */}
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack gap="200" align="space-between">
                                    <Text as="h2" variant="headingMd">{t.productButtonTitle}</Text>
                                </InlineStack>
                                <BlockStack gap="400">
                                    <Banner tone="info">
                                        {t.productButtonHelp}
                                    </Banner>
                                    <Checkbox
                                        label={t.productButtonEnable}
                                        checked={formState.productButtonEnabled}
                                        onChange={(val) => handleChange(val, "productButtonEnabled")}
                                    />
                                    {formState.productButtonEnabled && (
                                        <TextField
                                            label={t.productButtonLabelLabel}
                                            value={formState.productButtonLabel || "Ask on WhatsApp"}
                                            onChange={(val) => handleChange(val, "productButtonLabel")}
                                            autoComplete="off"
                                        />
                                    )}
                                    <Divider />
                                    <Checkbox
                                        label={t.shareButtonEnable}
                                        checked={formState.shareButtonEnabled ?? true}
                                        onChange={(val) => handleChange(val, "shareButtonEnabled")}
                                    />
                                    {(formState.shareButtonEnabled ?? true) && (
                                        <TextField
                                            label={t.shareButtonLabelLabel}
                                            value={formState.shareButtonLabel || "Share with a friend"}
                                            onChange={(val) => handleChange(val, "shareButtonLabel")}
                                            autoComplete="off"
                                        />
                                    )}
                                </BlockStack>
                            </BlockStack>
                        </Card>

                        {/* Appearance */}
                        <Card>
                            <BlockStack gap="400">
                                <Text as="h2" variant="headingMd">{t.appearanceTitle}</Text>
                                <InlineGrid columns={2} gap="400">
                                    <Select
                                        label={t.position}
                                        options={[
                                            { label: t.positionRight, value: "bottom-right" },
                                            { label: t.positionLeft, value: "bottom-left" },
                                        ]}
                                        value={formState.buttonPosition}
                                        onChange={(val) => handleChange(val, "buttonPosition")}
                                    />
                                    <Select
                                        label={t.size}
                                        options={[
                                            { label: t.sizeSmall, value: "small" },
                                            { label: t.sizeMedium, value: "medium" },
                                            { label: t.sizeLarge, value: "large" },
                                        ]}
                                        value={formState.buttonSize}
                                        onChange={(val) => handleChange(val, "buttonSize")}
                                    />
                                    <TextField
                                        label={t.color}
                                        value={formState.buttonColor}
                                        onChange={(val) => handleChange(val, "buttonColor")}
                                        autoComplete="off"
                                        prefix={
                                            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: formState.buttonColor }} />
                                        }
                                    />
                                    <Select
                                        label={t.animationLabel}
                                        options={[
                                            { label: t.animNone, value: "none" },
                                            { label: t.animPulse, value: "pulse" },
                                            { label: t.animBounce, value: "bounce" },
                                        ]}
                                        value={formState.animation}
                                        onChange={(val) => handleChange(val, "animation")}
                                    />
                                </InlineGrid>
                            </BlockStack>
                        </Card>

                        {/* Tooltip & Visibility */}
                        <Card>
                            <BlockStack gap="400">
                                <Text as="h2" variant="headingMd">{t.tooltipTitle}</Text>
                                <Checkbox
                                    label={t.showTooltip}
                                    checked={formState.tooltipEnabled}
                                    onChange={(val) => handleChange(val, "tooltipEnabled")}
                                />
                                {formState.tooltipEnabled && (
                                    <TextField
                                        label={t.tooltipText}
                                        value={formState.tooltipText}
                                        onChange={(val) => handleChange(val, "tooltipText")}
                                        autoComplete="off"
                                    />
                                )}
                                <InlineGrid columns={2} gap="400">
                                    <Checkbox
                                        label={t.showMobile}
                                        checked={formState.showOnMobile}
                                        onChange={(val) => handleChange(val, "showOnMobile")}
                                    />
                                    <Checkbox
                                        label={t.showDesktop}
                                        checked={formState.showOnDesktop}
                                        onChange={(val) => handleChange(val, "showOnDesktop")}
                                    />
                                </InlineGrid>
                            </BlockStack>
                        </Card>

                        {/* Availability Hours */}
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack gap="200" align="space-between">
                                    <Text as="h2" variant="headingMd">{t.availabilityTitle}</Text>
                                </InlineStack>
                                <Checkbox
                                    label={t.availabilityEnable}
                                    checked={formState.availabilityEnabled}
                                    onChange={(val) => handleChange(val, "availabilityEnabled")}
                                />
                                {formState.availabilityEnabled && (
                                    <BlockStack gap="400">
                                        <Select
                                            label={t.timezone}
                                            options={TIMEZONES}
                                            value={formState.timezone}
                                            onChange={(val) => handleChange(val, "timezone")}
                                        />
                                        <Text as="p" variant="bodyMd">{t.availableDays}</Text>
                                        <InlineStack gap="200">
                                            {DAYS.map((d) => (
                                                <Button
                                                    key={d.value}
                                                    variant={availDays.includes(d.value) ? "primary" : "secondary"}
                                                    size="slim"
                                                    onClick={() => toggleDay(d.value)}
                                                >
                                                    {d.label}
                                                </Button>
                                            ))}
                                        </InlineStack>
                                        <InlineGrid columns={2} gap="400">
                                            <TextField
                                                label={t.openTime}
                                                type="time"
                                                value={formState.startTime}
                                                onChange={(val) => handleChange(val, "startTime")}
                                                autoComplete="off"
                                            />
                                            <TextField
                                                label={t.closeTime}
                                                type="time"
                                                value={formState.endTime}
                                                onChange={(val) => handleChange(val, "endTime")}
                                                autoComplete="off"
                                            />
                                        </InlineGrid>
                                        <TextField
                                            label={t.offlineMessage}
                                            value={formState.offlineMessage}
                                            onChange={(val) => handleChange(val, "offlineMessage")}
                                            helpText={t.offlineHelp}
                                            autoComplete="off"
                                        />
                                    </BlockStack>
                                )}
                            </BlockStack>
                        </Card>

                        {/* Multi-agent */}
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack gap="200" align="space-between">
                                    <Text as="h2" variant="headingMd">{t.agentTitle}</Text>
                                </InlineStack>
                                <BlockStack gap="400">
                                    <Text tone="subdued">
                                        {t.agentInfo}
                                    </Text>
                                    {agents.map((agent, idx) => (
                                        <Card key={idx}>
                                            <BlockStack gap="300">
                                                <InlineStack align="space-between">
                                                    <Text variant="headingSm">{t.agentLabel} {idx + 1}</Text>
                                                    <Button tone="critical" size="slim" onClick={() => removeAgent(idx)}>
                                                        {t.agentRemove}
                                                    </Button>
                                                </InlineStack>
                                                <InlineGrid columns={2} gap="300">
                                                    <TextField
                                                        label={t.agentName}
                                                        value={agent.name}
                                                        onChange={(v) => updateAgent(idx, "name", v)}
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label={t.agentRole}
                                                        value={agent.role}
                                                        onChange={(v) => updateAgent(idx, "role", v)}
                                                        autoComplete="off"
                                                        placeholder={t.agentRolePlaceholder}
                                                    />
                                                    <TextField
                                                        label={t.agentPhone}
                                                        value={agent.phone}
                                                        onChange={(v) => updateAgent(idx, "phone", v)}
                                                        autoComplete="off"
                                                        placeholder="+39..."
                                                    />
                                                    <TextField
                                                        label={t.agentAvatar}
                                                        value={agent.avatar}
                                                        onChange={(v) => updateAgent(idx, "avatar", v)}
                                                        autoComplete="off"
                                                    />
                                                </InlineGrid>
                                            </BlockStack>
                                        </Card>
                                    ))}
                                    {agents.length < 5 && (
                                        <Button onClick={addAgent}>{t.agentAdd}</Button>
                                    )}
                                </BlockStack>
                            </BlockStack>
                        </Card>

                        {/* FAQ Menu */}
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack gap="200" align="space-between">
                                    <Text as="h2" variant="headingMd">{t.faqTitle}</Text>
                                </InlineStack>
                                <BlockStack gap="400">
                                    <Text tone="subdued">
                                        {t.faqInfo}
                                    </Text>
                                    <Checkbox
                                        label={t.faqEnable}
                                        checked={formState.faqEnabled}
                                        onChange={(val) => handleChange(val, "faqEnabled")}
                                    />
                                    {formState.faqEnabled && (
                                        <BlockStack gap="400">
                                            {faqItems.map((faq, idx) => (
                                                <Card key={idx}>
                                                    <BlockStack gap="300">
                                                        <InlineStack align="space-between">
                                                            <Text variant="headingSm">{t.faqItem} {idx + 1}</Text>
                                                            <Button tone="critical" size="slim" onClick={() => removeFaq(idx)}>
                                                                {t.faqRemove}
                                                            </Button>
                                                        </InlineStack>
                                                        <BlockStack gap="300">
                                                            <TextField
                                                                label={t.faqQuestion}
                                                                value={faq.question}
                                                                onChange={(v) => updateFaq(idx, "question", v)}
                                                                autoComplete="off"
                                                                placeholder={t.faqQuestionPlaceholder}
                                                            />
                                                            <TextField
                                                                label={t.faqAnswer}
                                                                value={faq.answer}
                                                                onChange={(v) => updateFaq(idx, "answer", v)}
                                                                autoComplete="off"
                                                                placeholder={t.faqAnswerPlaceholder}
                                                                multiline={2}
                                                            />
                                                        </BlockStack>
                                                    </BlockStack>
                                                </Card>
                                            ))}
                                            {faqItems.length < 10 && (
                                                <Button onClick={addFaq}>{t.faqAdd}</Button>
                                            )}
                                        </BlockStack>
                                    )}
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </Layout.Section>

                {/* Live Preview */}
                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">{t.previewTitle}</Text>
                            <div style={{
                                width: "100%", height: "220px", backgroundColor: "#f4f6f8",
                                position: "relative", borderRadius: "8px", border: "1px solid #dfe3e8", overflow: "hidden"
                            }}>
                                <div style={{
                                    position: "absolute",
                                    [formState.buttonPosition === "bottom-left" ? "left" : "right"]: "20px",
                                    bottom: "20px",
                                    backgroundColor: formState.buttonColor,
                                    width: formState.buttonSize === "small" ? "40px" : formState.buttonSize === "large" ? "70px" : "55px",
                                    height: formState.buttonSize === "small" ? "40px" : formState.buttonSize === "large" ? "70px" : "55px",
                                    borderRadius: "50%",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                }}>
                                    <svg width="60%" height="60%" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                </div>
                            </div>
                            <Text as="p" tone="subdued">{t.previewInfo}</Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
