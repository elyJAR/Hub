# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: join-flow.spec.ts >> Join Flow >> should validate display name requirements
- Location: tests\e2e\join-flow.spec.ts:13:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('join-error')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('join-error')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "Welcome to Hub" [level=1] [ref=e12]
      - paragraph [ref=e13]: Connect with others on your local network
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Choose your avatar
          - generic [ref=e18]:
            - generic [ref=e19]:
              - button "😊" [ref=e20] [cursor=pointer]:
                - generic [ref=e21]: 😊
              - button "😎" [ref=e22] [cursor=pointer]:
                - generic [ref=e23]: 😎
              - button "😄" [ref=e24] [cursor=pointer]:
                - generic [ref=e25]: 😄
              - button "😍" [ref=e26] [cursor=pointer]:
                - generic [ref=e27]: 😍
              - button "😉" [ref=e28] [cursor=pointer]:
                - generic [ref=e29]: 😉
              - button "🥰" [ref=e30] [cursor=pointer]:
                - generic [ref=e31]: 🥰
              - button "🤔" [ref=e32] [cursor=pointer]:
                - generic [ref=e33]: 🤔
              - button "😂" [ref=e34] [cursor=pointer]:
                - generic [ref=e35]: 😂
              - button "🥳" [ref=e36] [cursor=pointer]:
                - generic [ref=e37]: 🥳
              - button "😌" [ref=e38] [cursor=pointer]:
                - generic [ref=e39]: 😌
              - button "🤩" [ref=e40] [cursor=pointer]:
                - generic [ref=e41]: 🤩
              - button "😊" [ref=e42] [cursor=pointer]:
                - generic [ref=e43]: 😊
            - button "🎲 Pick random avatar" [ref=e44] [cursor=pointer]
        - generic [ref=e45]:
          - generic [ref=e46]: Display Name
          - textbox "Display Name" [ref=e47]:
            - /placeholder: Enter your name
            - text: ab
          - paragraph [ref=e48]: 2/50 characters
        - button "Join Hub" [active] [ref=e49] [cursor=pointer]
      - generic [ref=e51]:
        - paragraph [ref=e52]: Connected to local network
        - paragraph [ref=e53]: localhost:3000
    - paragraph [ref=e55]: No internet required • Local network only • Privacy first
  - alert [ref=e56]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Join Flow', () => {
  4  |   test('should display join screen on first visit', async ({ page }) => {
  5  |     await page.goto('/')
  6  |     
  7  |     // Check for join screen elements
  8  |     await expect(page.getByText('Welcome to Hub')).toBeVisible()
  9  |     await expect(page.getByPlaceholder('Enter your name')).toBeVisible()
  10 |     await expect(page.getByRole('button', { name: /join hub/i })).toBeVisible()
  11 |   })
  12 | 
  13 |   test('should validate display name requirements', async ({ page }) => {
  14 |     await page.goto('/')
  15 |     
  16 |     const nameInput = page.getByPlaceholder('Enter your name')
  17 |     const joinButton = page.getByRole('button', { name: /join hub/i })
  18 |     
  19 |     // Test empty name
  20 |     await joinButton.click()
  21 |     const error = page.getByTestId('join-error')
  22 |     await expect(error).toBeVisible()
  23 |     await expect(error).toContainText(/required/i)
  24 |     
  25 |     // Test name too short
  26 |     await nameInput.fill('ab')
  27 |     await joinButton.click()
> 28 |     await expect(error).toBeVisible()
     |                         ^ Error: expect(locator).toBeVisible() failed
  29 |     await expect(error).toContainText(/at least 3 characters/i)
  30 |     
  31 |     // Test name too long
  32 |     await nameInput.fill('a'.repeat(51))
  33 |     await joinButton.click()
  34 |     await expect(error).toBeVisible()
  35 |     await expect(error).toContainText(/less than 50 characters/i)
  36 |     
  37 |     // Test invalid characters
  38 |     await nameInput.fill('test@user!')
  39 |     await joinButton.click()
  40 |     await expect(error).toBeVisible()
  41 |     await expect(error).toContainText(/can only contain/i)
  42 |   })
  43 | 
  44 |   test('should successfully join with valid name', async ({ page }) => {
  45 |     await page.goto('/')
  46 |     
  47 |     const nameInput = page.getByPlaceholder('Enter your name')
  48 |     const joinButton = page.getByRole('button', { name: /join hub/i })
  49 |     
  50 |     // Fill valid name
  51 |     await nameInput.fill('TestUser')
  52 |     
  53 |     // Select an avatar (optional)
  54 |     const avatarButtons = page.locator('[data-testid^="avatar-"]')
  55 |     if (await avatarButtons.count() > 0) {
  56 |       await avatarButtons.first().click()
  57 |     }
  58 |     
  59 |     // Join
  60 |     await joinButton.click()
  61 |     
  62 |     // Wait for main interface to load
  63 |     await expect(page.getByRole('heading', { name: /welcome to hub/i })).toBeVisible({ timeout: 10000 })
  64 |     await expect(page.getByRole('heading', { name: 'TestUser', exact: true })).toBeVisible()
  65 |   })
  66 | 
  67 |   test('should persist session on page reload', async ({ page }) => {
  68 |     await page.goto('/')
  69 |     
  70 |     // Join with a name
  71 |     await page.getByPlaceholder('Enter your name').fill('PersistentUser')
  72 |     await page.getByRole('button', { name: /join hub/i }).click()
  73 |     
  74 |     // Wait for main interface
  75 |     await expect(page.getByRole('heading', { name: /welcome to hub/i })).toBeVisible({ timeout: 10000 })
  76 |     
  77 |     // Reload page
  78 |     await page.reload()
  79 |     
  80 |     // Should still be in main interface (not join screen)
  81 |     await expect(page.getByRole('heading', { name: 'PersistentUser', exact: true })).toBeVisible({ timeout: 10000 })
  82 |     await expect(page.getByPlaceholder('Enter your name')).not.toBeVisible()
  83 |   })
  84 | 
  85 |   test('should show avatar selection', async ({ page }) => {
  86 |     await page.goto('/')
  87 |     
  88 |     // Check for avatar picker
  89 |     await expect(page.getByText(/choose your avatar/i)).toBeVisible()
  90 |     
  91 |     // Check that avatars are clickable
  92 |     const avatarButtons = page.locator('[data-testid^="avatar-"]')
  93 |     expect(await avatarButtons.count()).toBeGreaterThan(0)
  94 |   })
  95 | })
  96 | 
```