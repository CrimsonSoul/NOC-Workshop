
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Inject mock window.api
        await page.add_init_script("""
            window.api = {
                subscribeToData: (callback) => {},
                onReloadStart: (callback) => {},
                onReloadComplete: (callback) => {},
                onDataError: (callback) => {},
                reloadData: () => {},
                importGroupsFile: () => {},
                importContactsFile: () => {},
                importServersFile: () => {}
            };
        """)

        try:
            # Go to app
            await page.goto("http://localhost:4173")

            # Wait for Sidebar to appear
            await expect(page.get_by_role("button", name="Weather")).to_be_visible()

            # Take screenshot of Sidebar with Weather button
            await page.screenshot(path="verification/sidebar_with_weather.png")

            # Click Weather button
            await page.get_by_role("button", name="Weather").click()

            # Wait for Weather Tab content (fallback might show first, then content)
            # The tab shows "Weather & Radar" in header title if active
            await expect(page.locator(".header-title")).to_contain_text("Weather & Radar")

            # Check for specific elements in Weather Tab
            # The component fetches data, so it might show "Loading..." or the layout
            # We look for "HOURLY FORECAST" or "7-DAY FORECAST" or "Weather Radar"
            # Note: The component uses "Weather Radar" as default title if location is null
            await expect(page.get_by_role("heading", name="Weather Radar")).to_be_visible()

            # Take screenshot of Weather Tab
            await page.screenshot(path="verification/weather_tab.png")

            # Check World Clock Order (PST MST EST CST)
            # Locate the secondary zones container
            # We can't easily check text order strictly with get_by_text, but we can screenshot the header
            await page.screenshot(path="verification/header_clock.png")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
