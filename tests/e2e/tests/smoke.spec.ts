import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("web health endpoint is reachable", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload.status).toBe("ok");
  });
});
