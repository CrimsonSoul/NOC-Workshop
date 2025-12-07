from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the preview server
        page.goto('http://127.0.0.1:4173')

        # Mock window.api since it's missing in browser preview
        page.add_init_script("""
            window.api = {
                subscribeToData: (cb) => {
                    // Provide dummy data
                    cb({
                        groups: { 'Default': [], 'Developers': [] },
                        contacts: [
                            { name: 'Alice Smith', email: 'alice@example.com', title: 'Developer', phone: '1234567890' },
                            { name: 'Bob Johnson with a very long name', email: 'bob.johnson.long.email.address@verylongdomain.com', title: 'Manager', phone: '0987654321' }
                        ],
                        lastUpdated: Date.now()
                    });
                },
                onReloadStart: () => {},
                onReloadComplete: () => {},
                getMetrics: () => Promise.resolve({
                     bridgesLast7d: 10,
                     bridgesLast30d: 50,
                     bridgesLast6m: 200,
                     bridgesLast1y: 500,
                     topGroups: [{name: 'Test', count: 5}]
                })
            };
        """)

        # Wait for app to load
        page.wait_for_timeout(1000)

        # 1. Verify "Reports" tab renaming
        # Click Reports tab
        page.get_by_role('button', name='Reports').click()
        page.wait_for_timeout(500)
        # Check header
        page.screenshot(path='verification/reports_tab.png')

        # 2. Verify Contact Card layout
        # Go back to Compose (default)
        page.get_by_role('button', name='Compose').click()
        page.wait_for_timeout(500)

        # Select a group or search to show contacts?
        # In AssemblerTab, contacts are not shown by default unless searching or selected?
        # Wait, the AssemblerTab shows "log" which are selected recipients.
        # I need to "select" a recipient to see the card.
        # Use Quick Add
        page.get_by_placeholder('Enter email address...').fill('bob.johnson.long.email.address@verylongdomain.com')
        page.get_by_placeholder('Enter email address...').press('Enter')

        page.wait_for_timeout(500)

        page.screenshot(path='verification/contact_card.png')

        browser.close()

if __name__ == '__main__':
    verify_frontend()
