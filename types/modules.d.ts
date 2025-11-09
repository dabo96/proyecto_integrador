declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
    multiSet(entries: Array<[string, string]>): Promise<void>;
    multiRemove(keys: string[]): Promise<void>;
  };
  export default AsyncStorage;
}

declare module '@react-native-picker/picker' {
  import * as React from 'react';

  export class PickerItem extends React.Component<any> {}

  export class Picker extends React.Component<any> {
    static Item: typeof PickerItem;
  }
}

