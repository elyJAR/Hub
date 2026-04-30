import { test, expect } from '@playwright/test'

test.describe('Messaging', () => {
  test('should send and receive messages between two users', async ({ browser }) => {
    // Create two browser contexts (two users)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // User 1 joins
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('Alice')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // User 2 joins
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('Bob')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // Wait for users to see each other
      await expect(page1.getByText('Bob')).toBeVisible({ timeout: 5000 })
      await expect(page2.getByText('Alice')).toBeVisible({ timeout: 5000 })
      
      // Alice sends connection request to Bob
      await page1.getByText('Bob').click()
      await page1.getByRole('button', { name: /send.*request/i }).click()
      
      // Bob accepts connection request
      await expect(page2.getByText(/alice.*wants to connect/i)).toBeVisible({ timeout: 5000 })
      await page2.getByRole('button', { name: /accept/i }).click()
      
      // Wait for connection to be established
      await expect(page1.getByText(/connected/i)).toBeVisible({ timeout: 5000 })
      await expect(page2.getByText(/connected/i)).toBeVisible({ timeout: 5000 })
      
      // Alice opens chat with Bob
      await page1.getByText('Bob').click()
      
      // Alice sends a message
      const messageInput1 = page1.getByPlaceholder(/type a message/i)
      await messageInput1.fill('Hello Bob!')
      await messageInput1.press('Enter')
      
      // Bob should receive the message
      await expect(page2.getByText('Hello Bob!')).toBeVisible({ timeout: 5000 })
      
      // Bob opens chat with Alice and replies
      await page2.getByText('Alice').click()
      const messageInput2 = page2.getByPlaceholder(/type a message/i)
      await messageInput2.fill('Hi Alice!')
      await messageInput2.press('Enter')
      
      // Alice should receive Bob's reply
      await expect(page1.getByText('Hi Alice!')).toBeVisible({ timeout: 5000 })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  test('should show typing indicator', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Setup: Both users join and connect
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('User1')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('User2')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      // Connect users
      await page1.getByText('User2').click()
      await page1.getByRole('button', { name: /send.*request/i }).click()
      await page2.getByRole('button', { name: /accept/i }).click()
      
      // Open chat
      await page1.getByText('User2').click()
      await page2.getByText('User1').click()
      
      // User1 starts typing
      const messageInput = page1.getByPlaceholder(/type a message/i)
      await messageInput.fill('Typing...')
      
      // User2 should see typing indicator
      await expect(page2.locator('.typing-dots')).toBeVisible({ timeout: 3000 })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  test('should show message delivery status', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Setup and connect users
      await page1.goto('/')
      await page1.getByPlaceholder('Enter your name').fill('Sender')
      await page1.getByRole('button', { name: /join hub/i }).click()
      await expect(page1.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      await page2.goto('/')
      await page2.getByPlaceholder('Enter your name').fill('Receiver')
      await page2.getByRole('button', { name: /join hub/i }).click()
      await expect(page2.getByText(/welcome to hub/i)).toBeVisible({ timeout: 10000 })
      
      await page1.getByText('Receiver').click()
      await page1.getByRole('button', { name: /send.*request/i }).click()
      await page2.getByRole('button', { name: /accept/i }).click()
      
      await page1.getByText('Receiver').click()
      
      // Send message
      const messageInput = page1.getByPlaceholder(/type a message/i)
      await messageInput.fill('Test message')
      await messageInput.press('Enter')
      
      // Check for delivery checkmark
      await expect(page1.getByText('✓')).toBeVisible({ timeout: 5000 })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })
})
