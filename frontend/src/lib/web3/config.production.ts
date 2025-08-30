// Production configuration for Base Sepolia deployment
// This file is used by GitHub Actions during deployment

// Base Sepolia configuration
export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { 
      http: [
        'https://sepolia.base.org',
        'https://base-sepolia.g.alchemy.com/v2/demo',
        'https://base-sepolia.blockpi.network/v1/rpc/public'
      ] 
    },
  },
  blockExplorers: {
    default: { name: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org' },
  },
} as const

// Ethereum mainnet configuration (needed for funding)
export const mainnet = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://ethereum.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
} as const

// Base mainnet (alternative for funding)
export const base = {
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
} as const

// Local chain (kept for compatibility but not used in production)
export const localChain = {
  id: 31337,
  name: 'Local Development',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
  },
  blockExplorers: {
    default: { name: 'Local Explorer', url: 'http://localhost:8545' },
  },
} as const

// Privy configuration
export const privyConfig = {
  appId: import.meta.env.VITE_PRIVY_APP_ID || 'local-dev-app-id',
  config: {
    loginMethods: ['email' as const, 'wallet' as const, 'sms' as const],
    appearance: {
      theme: 'dark' as const,
      accentColor: '#627eea' as `#${string}`,
      logo: undefined,
    },
    embeddedWallets: {
      createOnLogin: 'all-users' as const,
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: true,
      showWalletUIs: false,
    },
    externalWallets: {
      metamask: true,
      coinbaseWallet: { connectionOptions: 'all' as const },
      walletConnect: { enabled: true },
    },
    supportedChains: [baseSepolia, mainnet, base],
    defaultChain: baseSepolia,
    mfa: {
      noPromptOnMfaRequired: false,
    },
    legal: {
      termsAndConditionsUrl: '',
      privacyPolicyUrl: '',
    },
  },
}

// Contract addresses on Base Sepolia
export const CONTRACT_ADDRESSES = {
  // Legacy contracts (game engine)
  CARD_REGISTRY: '0x8f0c54b31077a505A98fCE72FBc2eeF247F40550' as `0x${string}`,
  DECK_REGISTRY: '0x464636fAC3b95EB37B9C5e1CFDa13A1d5E382D64' as `0x${string}`,
  GAME_ENGINE: '0x947F43184d438d7C4D0ceBD9D28751e7C5296891' as `0x${string}`,
  
  // NFT contracts (ERC1155) - Updated with fixed SSTORE2
  NFT_CARDS: '0x80E2bF1733e92718E95d21235594FCcD2931fD9a' as `0x${string}`,
  NFT_DECKS: '0xb2d7d608B6DF78a321Ac76435A51BB1653f59dD4' as `0x${string}`,
  NFT_PACKS: '0xf45d07063CA4e1AdFB47c010Bc4e1F53aF4d57d8' as `0x${string}`,
} as const

// Helper function to get contract addresses based on chain
export function getContractAddresses(chainId?: number) {
  // For now, return Base Sepolia addresses
  // In the future, this could return different addresses per chain
  return CONTRACT_ADDRESSES
}