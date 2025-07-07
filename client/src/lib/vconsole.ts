// src/lib/vconsole.ts
export function setupMobileConsole() {
  // ✅ अस्थायी रूप से यह शर्त हटा दें या बदल दें
  // if (import.meta.env.MODE !== 'production') { // इसे हटा दें
  // या इसे ऐसे कर दें अगर आपको सिर्फ Render पर देखना है
  // if (window.location.hostname === 'shopnish-9vlk.onrender.com' || import.meta.env.MODE !== 'production') {
    import('vconsole').then(({ default: VConsole }) => {
      new VConsole();
      console.log('📱 vConsole is enabled (mobile debug mode)');
    }).catch(err => {
      console.error("Failed to load vConsole:", err);
    });
  // } // इसे हटा दें
}

