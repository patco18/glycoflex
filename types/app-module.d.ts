declare module '../types/app' {
  export interface AppConfig {
    firebase: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
    };
    version: string;
    buildNumber: string;
  }
}
