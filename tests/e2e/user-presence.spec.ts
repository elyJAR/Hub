import { test, expect } from '@playwright/test'

test.describe('User Presence', () => {
  test('should show online users in sidebar', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const context3 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    const page3 = await context3.newPage()
    
    try {
      // User 1 joins
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('User1')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // User 2 joins
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('User2')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // User 1 should see User 2
      await expect(page1.getByText('User2')).toBeVisible({ timeout: 5000 })
      
      // User 3 joins
      await page3.goto('/')
      await page3.getByPlaceholder('Enter your name').fill('User3')
      await page3.getByRole('button', { name: /join hub/i }).click()
      await expect(page3.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // Both User 1 and User 2 should see User 3
      await expect(page1.getByText('User3')).toBeVisible({ timeout: 5000 })
      await expect(page2.getByText('User3')).toBeVisible({ timeout: 5000 })
      
      // User 3 should see both User 1 and User 2
      await expect(page3.getByText('User1')).toBeVisible({ timeout: 5000 })
      await expect(page3.getByText('User2')).toBeVisible({ timeout: 5000 })
      
    } finally {
      await context1.close()
      await context2.close()
      await context3.close()
    }
  })

  test('should remove user from list when they disconnect', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Both users join
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('StayingUser')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('LeavingUser')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // Verify both see each other
      await expect(page1.getByText('LeavingUser')).toBeVisible({ timeout: 5000 })
      await expect(page2.getByText('StayingUser')).toBeVisible({ timeout: 5000 })
      
      // User 2 disconnects
      await context2.close()
      
      // User 1 should no longer see User 2
      await expect(page1.getByText('LeavingUser')).not.toBeVisible({ timeout: 10000 })
      
    } finally {
      await context1.close()
    }
  })

  test('should show connection status indicator', async ({ page }) => {
    await page.goto('/')
    
    await page.getByPlaceholder('Enter your name').fill('TestUser')
    await page.getByRole('button', { name: /join hub/i }).click()
    
    // Wait for main interface
    await expect(page.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
    
    // Check for connection status indicator
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    // Look for green status dot
    const statusDot = page.locator('.bg-green-500, [class*="green"]').first()
    await expect(statusDot).toBeVisible()
  })
})
