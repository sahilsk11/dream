import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const BASE = process.env.DREAM_URL || "http://127.0.0.1:8787";
const OUT = process.env.SHOT_DIR || "/tmp/dream-shots";

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

async function shot(name) {
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 280));
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, type: "png" });
  console.log(path);
}

async function login() {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const nav = await page.$(".bottom-nav");
  if (nav) return;
  await page.waitForSelector(".pad");
  for (const d of ["2", "4", "6", "8"]) {
    await page.evaluate((digit) => {
      const btn = [...document.querySelectorAll(".pad button")].find((b) => b.textContent.trim() === digit);
      btn?.click();
    }, d);
  }
  await page.waitForSelector(".bottom-nav");
}

await login();
await page.evaluate(() => {
  window.location.hash = "sleep";
});
await page.waitForSelector(".timeline");
await new Promise((r) => setTimeout(r, 500));
await shot("01_sleep_day");

await page.evaluate(() => {
  const nap = [...document.querySelectorAll(".list .row-item")].find((el) =>
    el.textContent.toLowerCase().includes("nap"),
  );
  (nap || document.querySelector(".list .row-item"))?.click();
});
await page.waitForSelector(".sheet");
await new Promise((r) => setTimeout(r, 400));
await shot("02_sleep_edit");

await page.evaluate(() => {
  document.querySelector(".sheet [aria-label='close']")?.click();
});
await page.waitForSelector(".sheet", { hidden: true, timeout: 5000 }).catch(() => {});
await page.evaluate(() => {
  window.location.hash = "food";
});
await page.waitForSelector(".search-wrap");
await new Promise((r) => setTimeout(r, 500));
await page.evaluate(() => window.scrollTo(0, 0));
await shot("03_food_quick_add");

await page.waitForSelector("#food-logged");
await page.$eval("#food-logged", (el) => {
  const y = el.getBoundingClientRect().top + window.scrollY - 52;
  window.scrollTo(0, Math.max(0, y));
});
await new Promise((r) => setTimeout(r, 400));
await shot("04_food_logged");

await page.evaluate(() => {
  window.location.hash = "weight";
});
await page.waitForSelector(".weight-big");
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 500));
await shot("05_weight");

await browser.close();
