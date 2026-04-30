import { test, expect } from '@playwright/test'

test.describe('Connection Requests', () => {
  test('should send and accept connection request', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Both users join
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('Requester')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('Accepter')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // Wait for users to see each other
      await expect(page1.getByText('Accepter', { exact: true }).first()).toBeVisible({ timeout: 5000 })
      
      // Send connection request
      const accepterItem = page1.locator('[data-user-name="Accepter"]')
      await accepterItem.click()
      await accepterItem.getByRole('button', { name: /send.*request/i }).click()
      
      // Verify request sent confirmation
      await expect(page1.getByText(/request sent/i).first()).toBeVisible({ timeout: 3000 })
      
      // Verify request received
      await expect(page2.getByText(/requester.*wants to connect/i).first()).toBeVisible({ timeout: 5000 })
      
      // Accept request
      await page2.getByRole('button', { name: /accept/i }).first().click()
      
      // Verify connection established for both users
      await expect(page1.getByText(/connected/i).first()).toBeVisible({ timeout: 5000 })
      await expect(page2.getByText(/connected/i).first()).toBeVisible({ timeout: 5000 })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  test('should decline connection request', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Both users join
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('Requester2')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByRole('heading', { name: /welcome to hub/i })).toBeVisible({ timeout: 10000 })
      
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('Decliner')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByRole('heading', { name: /welcome to hub/i })).toBeVisible({ timeout: 10000 })
      
      // Send connection request
      const declinerItem = page1.locator('[data-user-name="Decliner"]')
      await declinerItem.click()
      await declinerItem.getByRole('button', { name: /send.*request/i }).click()
      
      // Decline request
      await expect(page2.getByText(/requester2.*wants to connect/i).first()).toBeVisible({ timeout: 5000 })
      await page2.getByRole('button', { name: /decline/i }).first().click()
      
      // Verify rejection notification
      await expect(page1.getByText(/declined|rejected/i).first()).toBeVisible({ timeout: 5000 })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  test('should timeout connection request after 30 seconds', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Both users join
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('Requester3')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByRole('heading', { name: /welcome to hub/i })).toBeVisible({ timeout: 10000 })
      
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('Ignorer')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByRole('heading', { name: /welcome to hub/i })).toBeVisible({ timeout: 10000 })
      
      // Send connection request
      const ignorerItem = page1.locator('[data-user-name="Ignorer"]')
      await ignorerItem.click()
      await ignorerItem.getByRole('button', { name: /send.*request/i }).click()
      
      // Wait for timeout (30 seconds + buffer)
      await expect(page1.getByText(/timed out/i).first()).toBeVisible({ timeout: 35000 })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })
})
