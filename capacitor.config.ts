import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.mindmeldplatform',
  appName: 'mindmeld-platform',
  webDir: 'dist',
  server: {
    url: 'https://8a7c41d1-336b-4415-9716-bbe56384b7fc.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
