// src/lib/vconsole.ts
export function setupMobileConsole() {
  if (import.meta.env.MODE !== 'production') {
    import('vconsole').then(({ default: VConsole }) => {
      new VConsole();
      console.log('📱 vConsole is enabled (mobile debug mode)');
    });
  }
}
