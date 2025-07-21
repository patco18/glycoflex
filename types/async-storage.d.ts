declare module '@react-native-async-storage/async-storage' {
  export interface AsyncStorageStatic {
    /**
     * Fetches an item for a key and invokes a callback upon completion.
     */
    getItem(key: string): Promise<string | null>;
    
    /**
     * Sets the value for a key and invokes a callback upon completion.
     */
    setItem(key: string, value: string): Promise<void>;
    
    /**
     * Removes an item for a key and invokes a callback upon completion.
     */
    removeItem(key: string): Promise<void>;
    
    /**
     * Erases all AsyncStorage for all clients, libraries, etc.
     */
    clear(): Promise<void>;
    
    /**
     * Gets all keys known to your app, for all callers, libraries, etc.
     */
    getAllKeys(): Promise<readonly string[]>;
    
    /**
     * multiGet invokes a callback with an array of key-value pairs.
     */
    multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>;
    
    /**
     * multiSet and multiMerge take arrays of key-value pairs and will do the following in order:
     * multiSet fully replaces all fields in the AsyncStorage.
     */
    multiSet(keyValuePairs: readonly [string, string][]): Promise<void>;
    
    /**
     * Delete all the keys in the keys array.
     */
    multiRemove(keys: readonly string[]): Promise<void>;
    
    /**
     * Merges existing values with input values, assuming they are stringified json.
     */
    mergeItem(key: string, value: string): Promise<void>;
    
    /**
     * multiMerge takes an array of key-value array pairs and merges them with existing values.
     */
    multiMerge(keyValuePairs: string[][]): Promise<void>;
  }

  const AsyncStorage: AsyncStorageStatic;

  export default AsyncStorage;
}
