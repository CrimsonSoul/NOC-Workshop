from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.add_init_script("""
            window.api = {
                subscribeToData: (cb) => {
                    cb({
                        groups: { 'Production': ['srv1@example.com'] },
                        contacts: [
                            { name: 'John Doe', email: 'john@example.com', phone: '', title: 'Admin', _searchString: '', raw: {} }
                        ],
                        servers: [
                            {
                                name: 'SRV-001',
                                businessArea: 'Finance',
                                lob: 'Banking',
                                comment: 'Critical Server',
                                owner: 'john@example.com',
                                contact: 'support@example.com',
                                osType: 'Windows',
                                os: 'Windows 2019',
                                _searchString: 'srv-001 finance banking',
                                raw: {}
                            },
                            {
                                name: 'DB-02',
                                businessArea: 'HR',
                                lob: 'Payroll',
                                comment: 'Main DB',
                                owner: 'jane@example.com',
                                contact: 'dba@example.com',
                                osType: 'Linux',
                                os: 'RHEL 8',
                                _searchString: 'db-02 hr payroll',
                                raw: {}
                            }
                        ],
                        lastUpdated: Date.now()
                    });
                },
                onReloadStart: () => {},
                onReloadComplete: () => {},
                addServer: async () => true,
                removeServer: async () => true,
                importServersFile: async () => true,
                getDataPath: async () => '/mock/path',
            };
        """)

        try:
            page.goto("http://localhost:4173/")
            expect(page.get_by_text("Relay / Compose")).to_be_visible()

            # Navigate to Servers
            page.get_by_title("Servers").click()
            expect(page.get_by_text("Relay / Servers")).to_be_visible()

            # Verify row data
            expect(page.get_by_text("SRV-001")).to_be_visible()
            expect(page.get_by_text("John Doe")).to_be_visible()

            # Open Modal
            page.get_by_role("button", name="ADD SERVER").click()

            # Verify Modal Title specifically
            expect(page.get_by_role("heading", name="Add Server")).to_be_visible()

            # Close modal
            page.keyboard.press("Escape")

            # Check Settings
            page.get_by_title("Settings").click()
            expect(page.get_by_role("button", name="Import Servers...")).to_be_visible()
            page.keyboard.press("Escape")

            # Screenshot main table
            page.wait_for_timeout(500) # wait for modal fade out
            page.screenshot(path="verification/servers_tab.png")
            print("Screenshot captured.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
