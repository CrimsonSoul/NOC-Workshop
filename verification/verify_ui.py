from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_attio_ui(page: Page):
    page.goto("http://127.0.0.1:4173")

    page.add_init_script("""
        window.api = {
            getGroups: () => Promise.resolve({
                'Engineering': ['alice@example.com'],
                'Marketing': ['bob@example.com']
            }),
            getContacts: () => Promise.resolve([
                { name: 'Alice Smith', email: 'alice@example.com', title: 'Engineer', phone: '1234567890', _searchString: 'alice smith' },
                { name: 'Bob Jones', email: 'bob@example.com', title: 'Marketer', phone: '0987654321', _searchString: 'bob jones' }
            ]),
            onGroupsChange: () => {},
            onContactsChange: () => {},
            removeListener: () => {}
        };
    """)

    page.reload()

    # Just wait a bit for rendering
    time.sleep(3)

    page.screenshot(path="verification/debug_snapshot.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_attio_ui(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
