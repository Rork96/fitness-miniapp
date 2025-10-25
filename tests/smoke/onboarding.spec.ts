import { test, expect } from "@playwright/test";

const STEP_HEADINGS = {
  birth: /When were you born\?/i,
  measurements: /Height & weight/i,
  goal: /What is your goal\?/i,
  desired: /Desired weight/i,
  desiredConfirm: /Confirm desired weight/i,
  activity: /Sessions per week/i,
  diet: /Diet preference/i,
  barriers: /What slows you down\?/i,
  privacy: /Thank you for your trust/i,
  options: /Fine-tune your plan/i,
  results: /Congratulations/i,
} as const;

test("calories onboarding flow with speed slider and tools navigation", async ({ page }) => {
  await page.goto("/calories");

  const localeToggle = page.getByRole("button", { name: /UA/i });
  await expect(localeToggle).toBeVisible();
  await localeToggle.click();
  await expect(page.getByRole("button", { name: /EN/i })).toBeVisible();

  const nextButton = () => page.getByRole("button", { name: /Next/ });

  await page.getByRole("button", { name: /Male/ }).click();
  await expect(nextButton()).toBeEnabled();
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.birth })).toBeVisible();
  await expect(nextButton()).toBeEnabled();
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.measurements })).toBeVisible();
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.goal })).toBeVisible();
  await page.getByRole("button", { name: /Lose/ }).click();
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.desired })).toBeVisible();
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.desiredConfirm })).toBeVisible();
  await nextButton().click();

  const speedValue = page.getByTestId("speed-value");
  const slider = page.getByTestId("speed-slider");
  const initialSpeed = parseFloat((await speedValue.textContent()) ?? "0");
  await slider.evaluate((element) => {
    const el = element as HTMLInputElement;
    const current = parseFloat(el.value);
    const max = parseFloat(el.max);
    const next = Math.min(max, current + 0.2);
    el.value = String(next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const expectedSpeed = Math.min(initialSpeed + 0.2, 1.5).toFixed(1);
  await expect(speedValue).toHaveText(expectedSpeed);

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: STEP_HEADINGS.desiredConfirm })).toBeVisible();
  await nextButton().click();
  await expect(speedValue).toHaveText(expectedSpeed);
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.activity })).toBeVisible();
  await page.getByRole("button", { name: /0–2 workouts/i }).click();
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.diet })).toBeVisible();
  await page.getByRole("button", { name: /Classic/ }).click();
  await nextButton().click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.barriers })).toBeVisible();
  await nextButton().click();

  const continueButton = page.getByRole("button", { name: /Continue/i });
  await expect(page.getByRole("heading", { name: STEP_HEADINGS.privacy })).toBeVisible();
  await continueButton.click();

  await expect(page.getByRole("heading", { name: STEP_HEADINGS.options })).toBeVisible();
  await nextButton().click();

  await expect(page.getByText(/Crafting your plan/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: STEP_HEADINGS.results })).toBeVisible({
    timeout: 12000,
  });

  await page.getByRole("link", { name: /Tools/i }).click();
  await expect(page).toHaveURL(/\/tools/);
  await expect(page.getByText(/Tools|Інструменти/)).toBeVisible();

  await page.getByRole("link", { name: /Back to onboarding|Назад до онбордингу/ }).click();
  await expect(page).toHaveURL(/\/calories/);
  await expect(page.getByRole("heading", { name: STEP_HEADINGS.results })).toBeVisible();
});
