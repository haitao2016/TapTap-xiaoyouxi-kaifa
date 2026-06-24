import { mobileNativeBridge } from './native-bridge';

document.addEventListener('DOMContentLoaded', async () => {
  await mobileNativeBridge.initialize();
  
  window.addEventListener('resize', () => {
    updateViewportHeight();
  });
  
  updateViewportHeight();
});

function updateViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

(window as unknown as { mobileBridge: typeof mobileNativeBridge }).mobileBridge = mobileNativeBridge;