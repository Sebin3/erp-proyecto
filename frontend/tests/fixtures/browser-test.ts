import { test as base, expect } from "@playwright/test";
import { populatedState } from "./populated-state";

const key = "enterprisecloud-integrated-erp-v1";
const fixture = JSON.stringify(populatedState());
// Legacy workflow tests supply their own isolated sample data; the shipped app starts empty.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(([storageKey, data]) => {
      if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, data);
    }, [key, fixture] as const);
    await use(page);
  },
});
export { expect };
export type { Page } from "@playwright/test";
