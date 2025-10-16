// src/utils/storage.ts

/**
 * Mengambil dan mem-parsing item dari localStorage dengan aman.
 * @param key Kunci item yang akan diambil.
 * @returns Nilai yang telah di-parse atau null jika tidak ada atau terjadi error.
 */
export function getLocalStorage<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) as T : null;
    } catch (error) {
        console.error(`Error reading from localStorage for key "${key}":`, error);
        return null;
    }
}

/**
 * Menyimpan nilai ke localStorage dengan aman, mengubahnya menjadi string JSON.
 * @param key Kunci untuk menyimpan item.
 * @param value Nilai yang akan disimpan.
 */
export function setLocalStorage<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage for key "${key}":`, error);
    }
}
