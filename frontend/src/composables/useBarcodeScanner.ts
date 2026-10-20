import { ref, nextTick } from 'vue';

export function useBarcodeScanner() {
  const isScanning = ref(false);

  const focusInput = (elementRef: any) => {
    nextTick(() => {
      if (elementRef && typeof elementRef.focus === 'function') {
        elementRef.focus();
      } else if (elementRef?.$el && typeof elementRef.$el.focus === 'function') {
        elementRef.$el.focus();
      }
    });
  };

  const handleBarcodeEnter = (callback: () => void | Promise<void>) => {
    return async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        isScanning.value = true;
        try {
          await callback();
        } finally {
          isScanning.value = false;
        }
      }
    };
  };

  return {
    isScanning,
    focusInput,
    handleBarcodeEnter,
  };
}
