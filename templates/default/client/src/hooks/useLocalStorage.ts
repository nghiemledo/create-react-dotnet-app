import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) return initialValue;

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      return initialValue;
    }
  });

  const updateValue = (nextValue: T) => {
    setValue(nextValue);
    window.localStorage.setItem(key, JSON.stringify(nextValue));
  };

  return [value, updateValue] as const;
}
