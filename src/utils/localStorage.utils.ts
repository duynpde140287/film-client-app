/**
 * LocalStorage utilities theo chuẩn quan-ly-kho-sim-react
 */

export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setLocalStorageItem<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Không thể lưu vào localStorage với key: ${key}`, e);
  }
}

export function removeLocalStorageItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    console.error(`Không thể xóa khỏi localStorage với key: ${key}`, e);
  }
}
