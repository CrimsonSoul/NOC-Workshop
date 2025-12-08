
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

        # Mock window.api
        await page.add_init_script("""
            window.api = {
                subscribeToData: (cb) => {
                    console.log("Subscribing to data...");
                    const data = {
                        groups: { 'Marketing': ['reese.dalton100@agency.net'], 'Sales': [] },
                        contacts: [
                            { name: 'Reese Dalton', email: 'reese.dalton100@agency.net', phone: '555-0100', title: 'Director', _searchString: 'reese dalton director', raw: {} },
                            { name: 'Avery Sinclair', email: 'avery@agency.net', phone: '555-0101', title: 'Manager', _searchString: 'avery sinclair', raw: {} }
                        ],
                        lastUpdated: Date.now()
                    };
                    setTimeout(() => {
                        console.log("Sending data...");
                        cb(data);
                    }, 100);
                },
                onReloadStart: () => {},
                onReloadComplete: () => {},
                reloadData: async () => {},
                getDataPath: async () => '/mock/path',
                removeGroup: async () => {},
                renameGroup: async () => {},
                addContact: async () => {},
                removeContact: async () => {},
                addContactToGroup: async () => {},
                removeContactFromGroup: async () => {},
                windowMinimize: () => {},
                windowMaximize: () => {},
                windowClose: () => {}
            };
        """)

        try:
            print("Navigating...")
            await page.goto("http://localhost:4173")

            print("Waiting for load...")
            await page.wait_for_timeout(2000)

            # 1. Check Directory Tab Search Placeholder
            print("Clicking People tab...")
            await page.click('button[title="People"]')
            await page.wait_for_timeout(500)

            search_input = page.get_by_placeholder("Search people...")
            await expect(search_input).to_be_visible()
            print("Verified: Search placeholder is 'Search people...'")

            # 2. Check Directory Context Menu Positioning
            print("Right clicking contact...")
            await page.get_by_text("Reese Dalton").click(button="right")
            await page.wait_for_timeout(500)

            # Check if context menu is visible
            menu = page.locator("text=Edit Contact")
            await expect(menu).to_be_visible()

            # Screenshot Directory Tab with Menu
            await page.screenshot(path="verification/directory_menu.png")
            print("Verified: Directory Context Menu opens")

            # Close the context menu by clicking the backdrop (top left)
            print("Closing context menu...")
            await page.mouse.click(10, 10)
            await page.wait_for_timeout(500)

            # 3. Check Assembler Tab (Compose)
            print("Clicking Compose tab...")
            await page.click('button[title="Compose"]')
            await page.wait_for_timeout(500)

            # Check Group Chips (No X button overlay - visual check via screenshot)
            # Right click "Marketing" group
            print("Right clicking Marketing group...")
            marketing_chip = page.get_by_role("button", name="Marketing")
            await marketing_chip.click(button="right")

            await page.wait_for_timeout(500)
            rename_option = page.locator("text=Rename Group")
            await expect(rename_option).to_be_visible()

            # Screenshot Assembler Tab with Group Menu
            await page.screenshot(path="verification/assembler_group_menu.png")
            print("Verified: Group Context Menu opens")

            # Click Rename
            await rename_option.click()
            await page.wait_for_timeout(500)

            await expect(page.get_by_text("Rename Group")).to_be_visible()
            await page.screenshot(path="verification/rename_modal.png")
            print("Verified: Rename Modal opens")

            # Close modal
            await page.get_by_text("Cancel").click()

            # 4. Check Contact List Remove Icon
            # Add a contact to manual list to see the remove button
            # We need to type in quick add
            print("Adding contact to list...")
            await page.fill('input[placeholder="Enter email address..."]', "reese.dalton100@agency.net")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(500)

            # Now "Reese Dalton" should be in the list
            # Find the remove button. It has title "Remove from List"
            remove_btn = page.locator('button[title="Remove from List"]')
            await expect(remove_btn).to_be_visible()

            await page.screenshot(path="verification/compose_list_icon.png")
            print("Verified: Remove icon is visible")

            # 5. Check Window Controls in Header
            # They should be top right.
            minimize_btn = page.locator('button[title="Minimize"]')
            await expect(minimize_btn).to_be_visible()

            await page.screenshot(path="verification/full_app.png")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="verification/error.png")
            raise e
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
