'use client'

import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit, useAppKit } from '@reown/appkit/react'
import { mainnet, arbitrum, sepolia } from '@reown/appkit/networks'
import React, { type ReactNode, useState, useEffect } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Setup query client
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('WalletConnect projectId is not defined')
}

// ✅ Metadata must match your deployed domain
const metadata = {
  name: 'Marne Web3 DApp',
  description: 'Multi-wallet dApp built with Reown + Wagmi',
  url: 'http://localhost:3000', // must exactly match your current domain
  icons: ['http://localhost:3000/favicon.ico'],
}

// This component will handle the client-side initialization.
function AppKitProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // This effect runs only on the client
    const G = globalThis as any;
    if (!G.__REOWN_APPKIT_INITIALIZED) {
      try {
        createAppKit({
          adapters: [wagmiAdapter],
          projectId: projectId as string,
          networks: [mainnet, sepolia, arbitrum],
          defaultNetwork: mainnet,
          metadata,
          features: {
            analytics: true,
            socials: false,
            email: false,
            emailShowWallets: true,
          },
          allWallets: 'SHOW',
        });
        G.__REOWN_APPKIT_INITIALIZED = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[createAppKit] initialization failed:', err);
      }
    }
    setIsInitialized(true);
  }, []);

  // Render children only after initialization is complete
  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}

function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode
  cookies: string | null
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  )

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        <AppKitProvider>{children}</AppKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
