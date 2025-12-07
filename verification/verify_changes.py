import os
from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mock window.api since we are running in browser preview
        context = browser.new_context()
        page = context.new_page()

        # Inject mock API
        page.add_init_script("""
            window.api = {
                subscribeToData: (cb) => {
                    // Send dummy data
                    setTimeout(() => cb({
                        groups: {'Engineering': ['alice@example.com'], 'Marketing': []},
                        contacts: [
                           {name: 'Alice Smith', email: 'alice@example.com', phone: '123', title: 'Engineer', _searchString: 'alice', raw: {}},
                           {name: 'Bob Jones', email: 'bob@example.com', phone: '456', title: 'Manager', _searchString: 'bob', raw: {}}
                        ],
                        lastUpdated: Date.now()
                    }), 100);
                },
                onReloadStart: () => {},
                onReloadComplete: () => {},
                getMetrics: async () => ({
                    bridgesLast7d: 10,
                    bridgesLast30d: 50,
                    bridgesLast6m: 200,
                    bridgesLast1y: 500,
                    topGroups: [{name: 'Engineering', count: 42}, {name: 'Marketing', count: 12}]
                }),
                getDataPath: async () => '/tmp/data',
                addContact: async () => true,
                addContactToGroup: async () => true,
                removeContactFromGroup: async () => true
            };
        """)

        try:
            # 1. Verify Assembler Tab (Group Chips)
            page.goto("http://localhost:4173")
            page.wait_for_timeout(2000) # Wait for mock data

            # Hover over "Engineering" group to see delete button
            page.get_by_role("button", name="Engineering").hover()
            page.wait_for_timeout(200)

            # Check Group Chips
            page.screenshot(path="verification/assembler_tab.png")
            print("Captured assembler_tab.png")

            # 2. Verify Directory Tab (Right click context menu)
            # Switch to People tab
            page.get_by_role("button", name="People").click()
            page.wait_for_timeout(1000)

            # Find a contact row
            contact_card = page.get_by_text("Alice Smith").first
            # Right click
            contact_card.click(button="right")
            page.wait_for_timeout(500)

            # Take screenshot of context menu
            page.screenshot(path="verification/directory_context_menu.png")
            print("Captured directory_context_menu.png")

            # 3. Verify Reports Tab (Top Groups Chips)
            # Switch to Reports
            page.get_by_role("button", name="Reports").click()
            page.wait_for_timeout(1000)

            # Take screenshot
            page.screenshot(path="verification/reports_tab.png")
            print("Captured reports_tab.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_changes()
