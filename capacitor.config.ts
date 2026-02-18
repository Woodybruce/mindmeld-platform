import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.mindmeldplatform',
  appName: 'Us',
  webDir: 'dist',
  // server config removed for production/TestFlight build
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FAF6F2',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FAF6F2',
    },
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
