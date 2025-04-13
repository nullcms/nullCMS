import { test, expect } from "@playwright/test";

test("can login", async ({ page }, testInfo) => {
	await page.goto("http://localhost:4001/");
	await page.waitForLoadState("networkidle");

	const screenshot = await page.screenshot();
	testInfo.attach("Home Page", {
		body: screenshot,
		contentType: "image/png",
	});

	// Click the get started link.
	await page.getByTestId("username").fill("admin");
	await page.getByTestId("password").fill("adminpassword");
	await page.getByTestId("login-button").click();

	// Expects page to have a heading with the name of Installation.
	await expect(page.getByTestId("title")).toBeVisible();
});
