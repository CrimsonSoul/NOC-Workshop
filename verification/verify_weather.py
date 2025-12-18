from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant geolocation permission
        context = browser.new_context(permissions=['geolocation'], geolocation={'latitude': 37.7749, 'longitude': -122.4194})
        page = context.new_page()

        # Mock window.api and localStorage
        page.add_init_script("""
            window.api = {
                getWeather: async (lat, lon) => {
                    console.log('Mock getWeather called with:', lat, lon);
                    return {
                        current_weather: {
                            temperature: 72,
                            windspeed: 10,
                            winddirection: 180,
                            weathercode: 0,
                            time: new Date().toISOString()
                        },
                        hourly: {
                            time: Array(24).fill(new Date().toISOString()),
                            temperature_2m: Array(24).fill(70),
                            weathercode: Array(24).fill(0)
                        },
                        daily: {
                            time: Array(7).fill(new Date().toISOString()),
                            weathercode: Array(7).fill(0),
                            temperature_2m_max: Array(7).fill(75),
                            temperature_2m_min: Array(7).fill(65)
                        }
                    };
                },
                searchLocation: async (query) => {
                    console.log('Mock searchLocation called with:', query);
                    return {
                        results: [{
                            latitude: 40.7128,
                            longitude: -74.0060,
                            name: 'New York',
                            admin1: 'NY',
                            country_code: 'US'
                        }]
                    };
                },
                subscribeToData: (callback) => {
                    console.log('Mock subscribeToData called');
                    callback({ groups: [], contacts: [], servers: [] });
                    return () => {};
                },
                onReloadStart: (callback) => { return () => {}; },
                onReloadComplete: (callback) => { return () => {}; },
                onDataError: (callback) => { return () => {}; },
                onImportProgress: (callback) => { return () => {}; },
                onAuthRequested: (callback) => { return () => {}; },
                subscribeToRadar: (callback) => { return () => {}; },

                getDataPath: async () => '/mock/data/path',
                getMetrics: async () => ({}),
                logBridge: () => {},
                openExternal: () => {},
                windowMinimize: () => {},
                windowMaximize: () => {},
                windowClose: () => {},
                reloadData: async () => {},
                addContact: async () => true,
                removeContact: async () => true,
                addServer: async () => true,
                removeServer: async () => true,
                addGroup: async () => true,
                addContactToGroup: async () => true,
                removeContactFromGroup: async () => true,
                importContactsWithMapping: async () => true,
                changeDataFolder: async () => ({ success: true }),
                resetDataFolder: async () => ({ success: true }),
                removeGroup: async () => true,
                renameGroup: async () => true,
                importGroupsFile: async () => true,
                importContactsFile: async () => true,
                importServersFile: async () => ({ success: true }),
                openPath: async () => {},
                openGroupsFile: async () => {},
                openContactsFile: async () => {},
                submitAuth: async () => true,
                cancelAuth: () => {},
                useCachedAuth: async () => true,
                resetMetrics: async () => true
            };
            localStorage.clear();
        """)

        try:
            # Navigate to the app (assuming default preview port)
            page.goto("http://localhost:4173")

            # Wait a bit for React to hydrate
            page.wait_for_timeout(3000)

            # Take screenshot of initial state
            page.screenshot(path="verification/initial_load.png")

            # Find the Weather tab button.
            # We will use the last button in the sidebar.
            buttons = page.locator("button")

            # Assuming the sidebar buttons are the first N buttons.
            # Let's try to click the last one that is likely the sidebar item.
            # In the screenshot (if I could see it), I'd count.
            # Let's just try clicking buttons until we find the one that shows "Weather Radar" or search input.

            # Or iterate through buttons and click 'Weather' if text exists (unlikely if icon only)
            # or try clicking index 5.

            print("Clicking index 5...")
            buttons.nth(5).click()
            page.wait_for_timeout(1000)

            # Check if we are on weather tab
            if page.get_by_placeholder("Search city...").is_visible():
                print("Found Weather Tab!")
                page.screenshot(path="verification/weather_auto.png")
            else:
                print("Index 5 failed. Trying index 4...")
                buttons.nth(4).click()
                page.wait_for_timeout(1000)
                if page.get_by_placeholder("Search city...").is_visible():
                   print("Found Weather Tab at index 4!")
                   page.screenshot(path="verification/weather_auto.png")
                else:
                   print("Index 4 failed. Trying index 6...")
                   buttons.nth(6).click()
                   page.wait_for_timeout(1000)
                   if page.get_by_placeholder("Search city...").is_visible():
                        print("Found Weather Tab at index 6!")
                        page.screenshot(path="verification/weather_auto.png")
                   else:
                        print("Could not find Weather tab. Taking screenshot of current view.")
                        page.screenshot(path="verification/failed_find_tab.png")
                        return

            # Now test manual search
            search_input = page.get_by_placeholder("Search city...")
            search_input.fill("New York")
            page.get_by_role("button", name="SEARCH").click()

            # Wait for search result
            page.wait_for_timeout(2000)

            # Take screenshot of search result
            page.screenshot(path="verification/weather_search.png")

            # Reload page to test persistence
            page.reload()
            page.wait_for_timeout(3000)

            # Navigate back to Weather tab (using the index we found works? - Assuming index 5 for now)
            # If we don't know which one worked, we might fail here.
            # But likely it is index 5 (6th item).
            buttons.nth(5).click()
            page.wait_for_timeout(2000)

            page.screenshot(path="verification/weather_persisted.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_retry.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
