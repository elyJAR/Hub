import { test, expect } from '@playwright/test'

test.describe('Join Flow', () => {
  test('should display join screen on first visit', async ({ page }) => {
    await page.goto('/')
    
    // Check for join screen elements
    await expect(page.getByText('Welcome to Hub')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your name')).toBeVisible()
    await expect(page.getByRole('button', { name: /join hub/i })).toBeVisible()
  })

  test('should validate display name requirements', async ({ page }) => {
    await page.goto('/')
    
    const nameInput = page.getByPlaceholder('Enter your name')
    const joinButton = page.getByRole('button', { name: /join hub/i })
    
    // Test empty name
    await joinButton.click()
    await expect(page.getByText(/display name is required/i)).toBeVisible()
    
    // Test name too short
    await nameInput.fill('ab')
    await joinButton.click()
    await expect(page.getByText(/at least 3 characters/i)).toBeVisible()
    
    // Test name too long
    await nameInput.fill('a'.repeat(51))
    await joinButton.click()
    await expect(page.getByText(/less than 50 characters/i)).toBeVisible()
    
    // Test invalid characters
    await nameInput.fill('test@user!')
    await joinButton.click()
    await expect(page.getByText(/can only contain/i)).toBeVisible()
  })

  test('should successfully join with valid name', async ({ page }) => {
    await page.goto('/')
    
    const nameInput = page.getByPlaceholder('Enter your name')
    const joinButton = page.getByRole('button', { name: /join hub/i })
    
    // Fill valid name
    await nameInput.fill('TestUser')
    
    // Select an avatar (optional)
    const avatarButtons = page.locator('[data-testid^="avatar-"]')
    if (await avatarButtons.count() > 0) {
      await avatarButtons.first().click()
    }
    
    // Join
    await joinButton.click()
    
    // Wait for main interface to load
    await expect(page.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('TestUser')).toBeVisible()
  })

  test('should persist session on page reload', async ({ page }) => {
    await page.goto('/')
    
    // Join with a name
    await page.getByPlaceholder('Enter your name').fill('PersistentUser')
    await page.getByRole('button', { name: /join hub/i }).click()
    
    // Wait for main interface
    await expect(page.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
    
    // Reload page
    await page.reload()
    
    // Should still be in main interface (not join screen)
    await expect(page.getByText('PersistentUser')).toBeVisible({ timeout: 10000 })
    await expect(page.getByPlaceholder('Enter your name')).not.toBeVisible()
  })

  test('should show avatar selection', async ({ page }) => {
    await page.goto('/')
    
    // Check for avatar picker
    await expect(page.getByText(/choose your avatar/i)).toBeVisible()
    
    // Check that avatars are clickable
    const avatarButtons = page.locator('[data-testid^="avatar-"]')
    expect(await avatarButtons.count()).toBeGreaterThan(0)
  })
})
