// Type declarations for modules that TypeScript can't find

declare module 'expo-router' {
  import { ComponentType } from 'react';
  
  export interface StackProps {
    screenOptions?: any;
    children?: React.ReactNode;
  }

  export interface StackScreenProps {
    name: string;
    options?: any;
  }

  export const Stack: ComponentType<StackProps> & {
    Screen: ComponentType<StackScreenProps>;
  };
}

declare module 'expo-status-bar' {
  import { ComponentType } from 'react';
  
  export interface StatusBarProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
    backgroundColor?: string;
    translucent?: boolean;
    hideTransitionAnimation?: 'fade' | 'slide' | 'none';
  }

  export const StatusBar: ComponentType<StatusBarProps>;
}
