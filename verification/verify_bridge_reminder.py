from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            # Navigate to preview
            page.goto("http://localhost:4173")

            # Wait for app to load. "Composition" header is in AssemblerTab
            # Use specific locator to avoid strict mode violation
            expect(page.get_by_role("heading", name="Composition")).to_be_visible(timeout=10000)

            # Click Draft Bridge
            # Note: ToolbarButton text is usually uppercase
            draft_btn = page.get_by_role("button", name="DRAFT BRIDGE")
            draft_btn.click()

            # Check for Modal
            # Wait for modal to appear
            expect(page.get_by_text("Please ensure meeting recording is enabled.")).to_be_visible()

            # Screenshot
            page.screenshot(path="verification/bridge_reminder.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
