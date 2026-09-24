from playwright.sync_api import sync_playwright
import os
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        repo_root = os.getcwd()
        os.system(f'rm -rf /tmp/workspace_test_err && cp -r {repo_root} /tmp/workspace_test_err')

        # Mock auth properly
        os.system("sed -i 's/auth.onAuthStateChanged((user) => {/const user = {uid: \"test_user\"}; if(true) {/g' /tmp/workspace_test_err/firebase-app-data.js")
        os.system("sed -i 's/onAuthStateChanged(auth, (user) => {/const user = {uid: \"test_user\"}; if(true) {/g' /tmp/workspace_test_err/firebase-app-data.js")
        os.system("sed -i 's/auth.onAuthStateChanged(user => {/const user = {uid: \"test_user\"}; if(true) {/g' /tmp/workspace_test_err/firebase-patients.js")
        os.system("sed -i 's/onAuthStateChanged(auth, (user) => {/const user = {uid: \"test_user\"}; if(true) {/g' /tmp/workspace_test_err/firebase-patients.js")
        os.system("sed -i 's/auth.onAuthStateChanged(user => {/const user = {uid: \"test_user\"}; if(true) {/g' /tmp/workspace_test_err/firebase-inventory.js")

        # Remove redirects
        os.system("sed -i 's/window.location.replace/\\/\\/ window.location.replace/g' /tmp/workspace_test_err/firebase-app-data.js")
        os.system("sed -i 's/window.location.replace/\\/\\/ window.location.replace/g' /tmp/workspace_test_err/firebase-patients.js")

        # Fix the mock sed bug where we missed the closing brackets
        os.system("sed -i 's/^});\\s*\\/\\/ --- PATIENT PROFILE LOGIC ---/\\/\\/ --- PATIENT PROFILE LOGIC ---/g' /tmp/workspace_test_err/firebase-patients.js")

        os.system('cd /tmp/workspace_test_err && python3 -m http.server 8000 &')
        time.sleep(2)

        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        page.goto("http://localhost:8000/dashboard.html")
        page.wait_for_load_state("networkidle")

        # Click Patients
        page.evaluate("document.querySelector('.sidebar-link[data-target=\"patients-section\"]').click()")
        time.sleep(1)

        # screenshot
        page.screenshot(path="patients.png")

        os.system('pkill -f "python3 -m http.server 8000"')
        browser.close()

if __name__ == "__main__":
    run()
