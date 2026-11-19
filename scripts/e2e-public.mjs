import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:3103";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const out = { steps: [], errors };
const step = async (name, fn) => {
  try { await fn(); out.steps.push({ name, ok: true }); }
  catch (e) { out.steps.push({ name, ok: false, error: String(e).slice(0, 250) }); throw e; }
};

try {
  await step("landing renders", async () => {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.getByText(/GitKolay/).first().waitFor({ timeout: 15000 });
  });

  await step("browse public owner", async () => {
    const skip = page.getByRole("button", { name: /Token olmadan devam et/ });
    if (await skip.count()) await skip.first().click();
    await page.waitForTimeout(800);
    const input = page.locator('input[placeholder*="octocat"]').first();
    await input.fill("FlyingGrasss");
    await page.getByRole("button", { name: /Depoları getir/ }).first().click();
    await page.getByText("personal-gateway").first().waitFor({ timeout: 20000 });
  });

  await step("open repo", async () => {
    await page.getByText("personal-gateway").first().click();
    await page.waitForURL(/\/repo/, { timeout: 20000 });
    await page.getByText(/README|package\.json|src/).first().waitFor({ timeout: 20000 });
  });

  await step("open file", async () => {
    await page.getByText("package.json").first().click();
    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText();
    out.sawContent = /personal-gateway|"name"/i.test(body);
    if (!out.sawContent) throw new Error("file content not shown");
  });

  out.title = await page.title();
} catch {}

console.log(JSON.stringify(out, null, 2));
await browser.close();
