// src/lib/vconsole.ts
export function setupMobileConsole() {
  // This check is good for runtime, but Vite's bundler sees the import()
  if (import.meta.env.MODE !== 'production') {
    import('vconsole').then(({ default: VConsole }) => {
      new VConsole();
      console.log('📱 vConsole is enabled (mobile debug mode)');
    }).catch(err => {
      console.error("Failed to load vConsole:", err);
    });
  }
}
