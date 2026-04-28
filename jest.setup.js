// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock WebSocket for tests
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) this.onopen()
    }, 0)
  }

  send(data) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure' })
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})