// Import createConfig from @privy-io/wagmi, not wagmi
import { createConfig } from '@privy-io/wagmi'
import { http } from 'wagmi'
import { baseSepolia, mainnet, base } from '@/lib/web3/config.production'

// Wagmi configuration using @privy-io/wagmi's createConfig  
// Always use production chains to avoid localhost connection issues
export const wagmiConfig = createConfig({
  chains: [baseSepolia, mainnet, base] as const,
  transports: {
    [baseSepolia.id]: http(baseSepolia.rpcUrls.default.http[0]),
    [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
    [base.id]: http(base.rpcUrls.default.http[0]),
  },
})