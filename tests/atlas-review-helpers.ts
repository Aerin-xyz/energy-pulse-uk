import { expect, type Page } from "@playwright/test";
export const inspector = (page: Page) => page.locator(".atlas-inspector");
export const evidence = (page: Page) =>
  page.locator(".atlas-inspector[data-panel=detail]");
export async function closePanel(page: Page) {
  const close = inspector(page).locator(".atlas-close");
  if (await close.isVisible()) await close.click();
}
export async function closeAllPanels(page: Page) {
  for (let i = 0; i < 3 && (await inspector(page).isVisible()); i++)
    await closePanel(page);
}
export async function openFilters(page: Page) {
  await closeAllPanels(page);
  await page.getByRole("button", { name: /^Filters(?: \(\d+\))?$/ }).click();
  await expect(page.getByLabel("Minimum asset capacity")).toBeVisible();
}
export async function searchSite(page: Page, name: string) {
  await closeAllPanels(page);
  const button = page.getByRole("button", {
    name: "Search generation sites",
    exact: true,
  });
  if (await button.isVisible()) await button.click();
  await page
    .getByRole("searchbox", { name: "Find a generation site" })
    .first()
    .fill(name);
  await expect(inspector(page)).toBeVisible();
}
export async function browse(page: Page) {
  await closeAllPanels(page);
  const mobile = page.getByRole("button", {
    name: "Search generation sites",
    exact: true,
  });
  if (await mobile.isVisible()) await mobile.click();
  else
    await page
      .getByRole("button", { name: /^Browse (sites|evidence)$/ })
      .first()
      .click();
}
export async function selectSite(page: Page, name: string) {
  await searchSite(page, name);
  await page
    .locator(".atlas-access-list button")
    .filter({ hasText: name })
    .first()
    .click();
  await expect(evidence(page)).toContainText(name);
}
