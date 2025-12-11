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
                        groups: {},
                        contacts: [],
                        servers: [
                            {
                                name: 'SRV-001',
                                businessArea: 'Finance',
                                lob: 'Banking',
                                comment: '',
                                owner: 'john@example.com',
                                contact: 'support@example.com',
                                osType: 'Windows',
                                os: '2019',
                                _searchString: 'srv-001',
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
                changeDataFolder: async () => ({success: true}),
                resetDataFolder: async () => ({success: true}),
            };
        """)

        try:
            # 1. Verify Servers Tab
            page.goto("http://localhost:4173/")
            page.get_by_title("Servers").click()
            expect(page.get_by_text("SRV-001")).to_be_visible()
            page.screenshot(path="verification/servers_tab.png")
            print("Captured verification/servers_tab.png")

            # 2. Verify Settings (Reload to ensure clean state)
            page.reload()

            page.get_by_title("Settings").click()
            expect(page.get_by_role("button", name="Import Servers...")).to_be_visible()
            page.screenshot(path="verification/settings_import.png")
            print("Captured verification/settings_import.png")

            # Close settings
            page.reload()

            # 3. Verify Add Modal
            page.get_by_title("Servers").click()
            page.get_by_role("button", name="ADD SERVER").click()
            expect(page.get_by_role("heading", name="Add Server")).to_be_visible()
            page.screenshot(path="verification/add_server_modal.png")
            print("Captured verification/add_server_modal.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_v2.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
