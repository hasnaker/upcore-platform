/**
 * Slack entegrasyon admin UI E2E.
 *
 * Admin uygulamasının bu suite tarafından servis edildiğini varsayar. CI'da
 * ADMIN_BASE_URL env ile admin dev server'ın adresi verilir; yoksa test
 * atlanır (local hızlı geri bildirim için). OAuth akışı gerçek Slack'e
 * gitmediğinden, install endpoint'i bir redirect response ile mocklanır;
 * callback sonrası status endpoint bağlı görünür ve test mesajı + uninstall
 * butonları doğrulanır.
 */
import { test, expect } from "@playwright/test";

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL;

test.describe("Admin · Slack Entegrasyonu", () => {
  test.skip(
    !ADMIN_BASE_URL,
    "ADMIN_BASE_URL ayarlanmamış — admin app E2E test server'ını gösteren bir URL ver.",
  );

  test.use({ baseURL: ADMIN_BASE_URL });

  test("install → callback → status → test mesaj → uninstall", async ({ page }) => {
    let installed = false;
    let testSent = false;

    // Mock the admin → notification proxy endpoints so the test never hits
    // the real notification service nor Slack.
    await page.route("**/api/v1/admin/integrations/slack/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          installed
            ? {
                installed: true,
                team_id: "T-MOCK-1",
                team_name: "UpCore Test Workspace",
                bot_user_id: "U-BOT-1",
                app_id: "A-APP-1",
                scope: "chat:write,commands,users:read.email",
                default_channel_id: "C-GEN-1",
                webhook_channel: "#general",
                allow_dm_interventions: false,
                installed_at: new Date().toISOString(),
                installed_by: "00000000-0000-0000-0000-000000000001",
              }
            : { installed: false },
        ),
      });
    });

    // OAuth start — simulate the 302 to our fake Slack page then an instant
    // return to the integrations page with ?connected=1.
    await page.route("**/api/v1/admin/integrations/slack/install", async (route) => {
      installed = true;
      await route.fulfill({
        status: 302,
        headers: { Location: "/integrations/slack?connected=1" },
        body: "",
      });
    });

    await page.route("**/api/v1/admin/integrations/slack/test", async (route) => {
      testSent = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "sent", ts: "1700000000.000100", channel: "C-GEN-1" }),
      });
    });

    await page.route("**/api/v1/admin/integrations/slack/uninstall", async (route) => {
      installed = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "revoked" }),
      });
    });

    await page.route("**/api/v1/admin/integrations/slack/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok" }),
      });
    });

    await page.goto("/integrations/slack");
    await expect(
      page.getByRole("heading", { name: "Slack Entegrasyonu" }),
    ).toBeVisible();

    // Not installed state
    await expect(
      page.getByText("Henüz bir Slack workspace bağlı değil"),
    ).toBeVisible();

    // Click install; our mock makes it a same-origin redirect.
    await page.getByTestId("slack-install-btn").click();
    await page.waitForURL(/\/integrations\/slack\?connected=1/);

    // Installed state should render after status query refetches.
    await expect(
      page.getByText("UpCore Test Workspace", { exact: false }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("T-MOCK-1")).toBeVisible();

    // Test message
    await page.getByTestId("slack-test-btn").click();
    await expect(page.getByText("Test mesajı gönderildi.")).toBeVisible();
    expect(testSent).toBeTruthy();

    // Toggle KVKK opt-in
    await page.getByTestId("slack-kvkk-toggle").click();
    await expect(page.getByText("Ayarlar güncellendi.")).toBeVisible();

    // Uninstall
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("slack-uninstall-btn").click();
    await expect(page.getByText("Slack bağlantısı kaldırıldı.")).toBeVisible();
  });
});
