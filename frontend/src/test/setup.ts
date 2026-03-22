import '@testing-library/jest-dom/vitest'

/** В части окружений Node/localStorage `clear` отсутствует — подменяем in-memory хранилище. */
const memory = new Map<string, string>()
const testLocalStorage: Storage = {
  get length() {
    return memory.size
  },
  clear() {
    memory.clear()
  },
  getItem(key: string) {
    return memory.get(key) ?? null
  },
  setItem(key: string, value: string) {
    memory.set(key, value)
  },
  removeItem(key: string) {
    memory.delete(key)
  },
  key(index: number) {
    return [...memory.keys()][index] ?? null
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: testLocalStorage,
  writable: true,
  configurable: true,
})
