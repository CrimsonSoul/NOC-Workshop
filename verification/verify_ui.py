from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Mock window.api since we are running in browser preview
    page.add_init_script("""
        window.api = {
            subscribeToData: (cb) => {
                setTimeout(() => {
                    cb({
                        groups: {'Engineering': ['alice@example.com'], 'Marketing': ['bob@example.com']},
                        contacts: [
                            {name: 'Alice', email: 'alice@example.com', title: 'Dev', phone: '123', _searchString: 'alice'},
                            {name: 'Bob', email: 'bob@example.com', title: 'Marketer', phone: '456', _searchString: 'bob'}
                        ],
                        lastUpdated: Date.now()
                    });
                }, 100);
            },
            onReloadStart: () => {},
            onReloadComplete: () => {},
            getDataPath: () => Promise.resolve('/tmp/data'),
            windowMinimize: () => console.log('minimized'),
            windowMaximize: () => console.log('maximized'),
            windowClose: () => console.log('closed'),
            removeGroup: (g) => Promise.resolve(true),
            openGroupsFile: () => {},
            openContactsFile: () => {}
        };
    """)

    page.goto("http://localhost:4173")

    # 1. Verify Window Controls exist
    # They don't have text, but they are buttons in a div with no-drag.
    # We can check for the SVG titles "Minimize", "Maximize", "Close"
    expect(page.locator('button[title="Minimize"]')).to_be_visible()
    expect(page.locator('button[title="Maximize"]')).to_be_visible()
    expect(page.locator('button[title="Close"]')).to_be_visible()

    # Screenshot main view
    page.screenshot(path="verification/main_view.png")

    # 2. Verify Group Deletion Hover
    # We need to hover over the 'Engineering' group chip
    # The chip text is 'Engineering'
    group_chip = page.get_by_role("button", name="Engineering")
    # Actually, the button is inside the div. The div handles the hover.
    # The structure is div > button(group) + button(delete).
    # Playwright's hover should trigger the CSS hover state.

    # We locate the 'Engineering' text button, then get its parent div to hover?
    # Or just hover the button itself, event bubbles?
    # The parent div has `onMouseEnter`.

    # Let's target the button with name "Engineering", then find its container?
    # Or just text "Engineering".
    # The implementation:
    # <div>
    #   <button>Engineering</button>
    #   <button class="delete-btn">x</button>
    # </div>

    # Let's hover the text "Engineering"
    page.get_by_text("Engineering").hover()

    # Check if delete button is visible/opacity 1.
    # The delete button has title="Delete Group"
    delete_btn = page.locator('button[title="Delete Group"]').first
    # Force visible check might fail if opacity is transitioned, but let's wait a bit
    page.wait_for_timeout(500)

    # Take screenshot of hover state
    page.screenshot(path="verification/hover_group.png")

    # 3. Click Delete
    delete_btn.click()

    # 4. Verify Modal
    expect(page.get_by_text("Are you sure you want to delete Engineering?")).to_be_visible()

    # Screenshot modal
    page.screenshot(path="verification/delete_modal.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
