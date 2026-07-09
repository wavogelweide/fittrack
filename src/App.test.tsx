import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('lässt sich als Komponente aufrufen', () => {
    expect(typeof App).toBe('function')
    expect(App()).toBeTruthy()
  })
})
