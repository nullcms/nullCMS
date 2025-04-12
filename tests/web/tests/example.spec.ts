import { test, expect } from "@playwright/test";

test("can login", async ({ page }, testInfo) => {
	await page.goto("http://localhost:4001/");
  await page.waitForLoadState('networkidle');

	// Click the get started link.
	await page.getByTestId("username").fill("admin");
	await page.getByTestId("password").fill("adminpassword");
	await page.getByTestId("login-button").click();

	const homeScreenshot = await page.screenshot();
	testInfo.attach("Home Page", {
		body: homeScreenshot,
		contentType: "image/png",
	});

	// Expects page to have a heading with the name of Installation.
	await expect(page.getByTestId("title")).toBeVisible();
});
