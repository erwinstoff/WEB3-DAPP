// Wallet detection utilities
export const detectMetaMask = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).ethereum !== 'undefined' && 
         (window as any).ethereum.isMetaMask;
};

export const detectWalletConnect = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).ethereum !== 'undefined';
};

export const getWalletInfo = () => {
  if (typeof window === 'undefined') return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  
  return {
    isMetaMask: ethereum.isMetaMask,
    isCoinbase: ethereum.isCoinbaseWallet,
    isTrust: ethereum.isTrust,
    isBrave: ethereum.isBraveWallet,
    providers: ethereum.providers || [],
    selectedAddress: ethereum.selectedAddress,
    chainId: ethereum.chainId,
    isConnected: !!ethereum.selectedAddress
  };
};

export const waitForMetaMask = (timeout = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (detectMetaMask()) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (detectMetaMask()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
};
