# TGL Automated Quality Assurance Suite (Proof of Concept)
![Playwright Tests](https://github.com/sandeepvarma117/tgl-automated-qa-suite/actions/workflows/playwright.yml/badge.svg)

This project is a personal automation framework built to demonstrate my technical readiness for the **Quality Assurance Engineer** role at Therapeutic Guidelines.

While I understand that an automation suite already exists for the platform, this repository serves as a practical demonstration of my ability to write scalable, maintainable, and CI-integrated tests using the modern stack required for the role.

## 🛠 Tech Stack

* **Framework:** Playwright (Node.js)
* **Language:** TypeScript
* **Design Pattern:** Page Object Model (POM)
* **CI/CD:** GitHub Actions

## 🧪 What It Tests (Critical User Journeys)

I focused on automating the core workflows that impact user experience the most:

| Test ID | Scenario | Why it matters |
|----|---------|-------------|
| **TC-01** | **Search** | Verifies users can locate guidelines (e.g., "Diabetes") and navigate to the correct result. |
| **TC-02** | **Navigation** | Checks that homepage shortcuts and deep links route users correctly. |
| **TC-03** | **Mobile Layout** | Verifies UI responsiveness on iPhone SE viewports (e.g., Hamburger menu interaction). |
| **TC-04** | **Favorites** | A full E2E workflow: Add to favorites -> Navigate away -> Return -> Verify data persistence. |

## ⚙️ Key Engineering Decisions

### 1. Maintainability (Page Object Model)
To demonstrate clean coding practices, I encapsulated all selectors in `HomePage.ts`. This ensures that UI changes (e.g., a renamed ID) only require a single file update, rather than rewriting multiple tests.

### 2. Device Agnostic Logic
The tests dynamically detect the viewport. On mobile devices, the script automatically dismisses the virtual keyboard (to uncover hidden results) and interacts with the hamburger menu, mirroring real user behavior.

### 3. CI/CD Integration
This repository is linked to **GitHub Actions**. Every commit automatically triggers the test suite in a headless environment, simulating a standard "Gatekeeper" pipeline that prevents regressions from merging.

## 🔮 Future Enhancements & Roadmap

If I were to expand this framework for the production environment, I would prioritize the following:

### 1. Promotion to Staging Environment
Currently, these tests run on `test.app.tg.org.au`. Moving execution to the Staging environment (`stage.app.tg.org.au`) would allow for higher-value testing closer to production configuration.

### 2. Automated Accessibility Testing
Integration of **Axe-core** (`@axe-core/playwright`) into the pipeline to automatically scan all pages for WCAG compliance issues (e.g., color contrast, missing ARIA labels) during the regression run.

### 3. Subscription & Renewal Validation
By leveraging the Staging environment, we can automate complex data scenarios that are difficult to mock in Test, such as:
* **Subscription Expiry:** Verifying user access is revoked exactly when the subscription ends.
* **Renewal Timelines:** Validating that "Renew Now" prompts appear at the correct intervals.
* **Token Validation:** Ensuring concurrent session limits are enforced correctly.

## 🚀 How to Run

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run All Tests**
    ```bash
    npx playwright test
    ```

3.  **Visual Debugging Mode**
    ```bash
    npx playwright test --ui
    ```
