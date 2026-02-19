import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.mindmeldplatform',
  appName: 'Us',
  webDir: 'dist',
  server: {
    url: 'https://mindmeld-platform.lovable.app?forceHideBadge=true',
    cleartext: true,
    errorPath: 'error.html',
    allowNavigation: [
      'mindmeld-platform.lovable.app',
      '*.lovable.app',
      '*.supabase.co',
      'oauth.lovable.app',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
    ],
  },
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
