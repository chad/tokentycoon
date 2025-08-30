import { useReadContract, useReadContracts } from 'wagmi'
import { TokenTycoonCardsABI } from '@/lib/contracts/TokenTycoonCardsABI'
import { getContractAddresses } from '@/lib/web3/config.production'
import { useState, useEffect, useMemo } from 'react'

// Extended contract card interface with on-chain data
export interface OnChainCardMetadata {
  cardId: number
  name: string
  description: string
  cost: number
  cardType: number // 0=Chain, 1=DeFi, 2=EOA, 3=Action
  svgPointer: string
  jsonPointer: string
  contentHash: string
  maxSupply: number
  totalMinted: number
  tradeable: boolean
  finalized: boolean
  abilities: Array<{
    abilityType: string
    amount: number
  }>
  svgData?: string // Decoded SVG if available
}

export interface CardCache {
  [cardId: number]: OnChainCardMetadata
}

// Cache implementation with localStorage persistence
class CardCacheManager {
  private static instance: CardCacheManager
  private cache: CardCache = {}
  private cacheKey = 'nft-cards-cache-v1'
  private cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours

  static getInstance(): CardCacheManager {
    if (!CardCacheManager.instance) {
      CardCacheManager.instance = new CardCacheManager()
    }
    return CardCacheManager.instance
  }

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.cacheKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        const now = Date.now()
        
        // Check if cache is still valid
        if (parsed.timestamp && (now - parsed.timestamp) < this.cacheExpiry) {
          this.cache = parsed.data || {}
          console.log(`Loaded ${Object.keys(this.cache).length} cards from cache`)
        } else {
          console.log('Cache expired, clearing...')
          this.clearCache()
        }
      }
    } catch (error) {
      console.warn('Failed to load card cache:', error)
      this.clearCache()
    }
  }

  private saveToStorage() {
    try {
      const data = {
        data: this.cache,
        timestamp: Date.now()
      }
      localStorage.setItem(this.cacheKey, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save card cache:', error)
    }
  }

  getCard(cardId: number): OnChainCardMetadata | null {
    return this.cache[cardId] || null
  }

  setCard(cardId: number, card: OnChainCardMetadata) {
    this.cache[cardId] = card
    this.saveToStorage()
  }

  getCachedCards(): OnChainCardMetadata[] {
    return Object.values(this.cache)
  }

  clearCache() {
    this.cache = {}
    localStorage.removeItem(this.cacheKey)
  }

  getCacheStats() {
    return {
      size: Object.keys(this.cache).length,
      lastUpdated: new Date().toISOString()
    }
  }
}

const cacheManager = CardCacheManager.getInstance()

// Hook for getting a single card's metadata
export function useNFTCard(cardId: number) {
  const contractAddresses = getContractAddresses()
  
  const { data: metadataRaw, isLoading: isLoadingMetadata, error: metadataError } = useReadContract({
    address: contractAddresses.NFT_CARDS,
    abi: TokenTycoonCardsABI,
    functionName: 'getCardMetadata',
    args: [BigInt(cardId)],
    query: {
      enabled: !!cardId && cardId > 0,
    }
  })

  const { data: abilitiesRaw, isLoading: isLoadingAbilities } = useReadContract({
    address: contractAddresses.NFT_CARDS,
    abi: TokenTycoonCardsABI,
    functionName: 'getCardAbilities',
    args: [BigInt(cardId)],
    query: {
      enabled: !!cardId && cardId > 0,
    }
  })

  const card = useMemo((): OnChainCardMetadata | null => {
    if (!metadataRaw || !abilitiesRaw) return null

    const [name, description, cost, cardType, svgPointer, jsonPointer, contentHash, maxSupply, totalMinted, tradeable, finalized] = metadataRaw as any[]

    return {
      cardId,
      name: name || '',
      description: description || '',
      cost: Number(cost || 0),
      cardType: Number(cardType || 0),
      svgPointer: svgPointer || '0x0000000000000000000000000000000000000000',
      jsonPointer: jsonPointer || '0x0000000000000000000000000000000000000000',
      contentHash: contentHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      maxSupply: Number(maxSupply || 0),
      totalMinted: Number(totalMinted || 0),
      tradeable: tradeable || false,
      finalized: finalized || false,
      abilities: (abilitiesRaw as any[] || []).map((ability: any) => ({
        abilityType: ability.abilityType || '',
        amount: Number(ability.amount || 0)
      }))
    }
  }, [metadataRaw, abilitiesRaw, cardId])

  // Cache the card if it's valid
  useEffect(() => {
    if (card && card.name) {
      cacheManager.setCard(cardId, card)
    }
  }, [card, cardId])

  return {
    card,
    isLoading: isLoadingMetadata || isLoadingAbilities,
    error: metadataError
  }
}

// Hook for getting multiple cards efficiently
export function useNFTCards(cardIds: number[] = []) {
  const contractAddresses = getContractAddresses()
  const [cachedCards, setCachedCards] = useState<OnChainCardMetadata[]>([])
  const [missingCardIds, setMissingCardIds] = useState<number[]>([])

  // Check cache first
  useEffect(() => {
    const cached: OnChainCardMetadata[] = []
    const missing: number[] = []

    cardIds.forEach(id => {
      const cachedCard = cacheManager.getCard(id)
      if (cachedCard) {
        cached.push(cachedCard)
      } else {
        missing.push(id)
      }
    })

    setCachedCards(cached)
    setMissingCardIds(missing)
  }, [cardIds])

  // Batch fetch missing cards
  const contracts = missingCardIds.map(cardId => [
    {
      address: contractAddresses.NFT_CARDS,
      abi: TokenTycoonCardsABI,
      functionName: 'getCardMetadata',
      args: [BigInt(cardId)]
    },
    {
      address: contractAddresses.NFT_CARDS,
      abi: TokenTycoonCardsABI,
      functionName: 'getCardAbilities',
      args: [BigInt(cardId)]
    }
  ]).flat()

  const { data: contractResults, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: missingCardIds.length > 0,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff up to 30s
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  })

  // Process batch results
  const fetchedCards = useMemo(() => {
    if (!contractResults || missingCardIds.length === 0) return []

    const cards: OnChainCardMetadata[] = []

    for (let i = 0; i < missingCardIds.length; i++) {
      const metadataResult = contractResults[i * 2]
      const abilitiesResult = contractResults[i * 2 + 1]

      if (metadataResult?.result && abilitiesResult?.result) {
        const cardId = missingCardIds[i]
        const metadata = metadataResult.result as any
        const abilities = abilitiesResult.result as any[]

        // Handle both array (old format) and object (new format) from contract
        let name, description, cost, cardType, svgPointer, jsonPointer, contentHash, maxSupply, totalMinted, tradeable, finalized
        
        if (Array.isArray(metadata)) {
          // Old tuple format - destructure as array
          [name, description, cost, cardType, svgPointer, jsonPointer, contentHash, maxSupply, totalMinted, tradeable, finalized] = metadata
        } else if (metadata && typeof metadata === 'object') {
          // New struct format - access as object properties
          name = metadata.name
          description = metadata.description
          cost = metadata.cost
          cardType = metadata.cardType
          svgPointer = metadata.svgPointer
          jsonPointer = metadata.jsonPointer
          contentHash = metadata.contentHash
          maxSupply = metadata.maxSupply
          totalMinted = metadata.totalMinted
          tradeable = metadata.tradeable
          finalized = metadata.finalized
        } else {
          // Skip invalid metadata without warning since we handle both formats
          continue
        }

        // Ensure abilities is an array
        if (!Array.isArray(abilities)) {
          console.warn(`Card ${cardId}: abilities is not an array:`, abilities)
          continue
        }

        // Skip cards that are not initialized (empty name)
        if (!name || name.trim() === '') {
          continue
        }

        const card: OnChainCardMetadata = {
          cardId,
          name: name || '',
          description: description || '',
          cost: Number(cost || 0),
          cardType: Number(cardType || 0),
          svgPointer: svgPointer || '0x0000000000000000000000000000000000000000',
          jsonPointer: jsonPointer || '0x0000000000000000000000000000000000000000',
          contentHash: contentHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
          maxSupply: Number(maxSupply || 0),
          totalMinted: Number(totalMinted || 0),
          tradeable: tradeable || false,
          finalized: finalized || false,
          abilities: (abilities || []).map((ability: any) => ({
            abilityType: ability.abilityType || '',
            amount: Number(ability.amount || 0)
          }))
        }

        cards.push(card)
        cacheManager.setCard(cardId, card) // Cache the fetched card
      }
    }

    return cards
  }, [contractResults, missingCardIds])

  // Combine cached and fetched cards
  const allCards = useMemo(() => {
    return [...cachedCards, ...fetchedCards].sort((a, b) => a.cardId - b.cardId)
  }, [cachedCards, fetchedCards])

  // Log errors for debugging
  if (error) {
    console.warn('Error fetching NFT cards:', error)
  }

  return {
    cards: allCards,
    isLoading,
    error,
    cacheStats: cacheManager.getCacheStats()
  }
}

// Hook for getting all available cards (discovers card IDs dynamically)
export function useAllNFTCards() {
  const [discoveredCardIds, setDiscoveredCardIds] = useState<number[]>([])
  const [isDiscovering, setIsDiscovering] = useState(false)

  // Start with cached cards if available
  useEffect(() => {
    const cached = cacheManager.getCachedCards()
    if (cached.length > 0) {
      setDiscoveredCardIds(cached.map(c => c.cardId))
    } else {
      // Try all card IDs 1-91 (our full card range)
      const commonIds = Array.from({ length: 91 }, (_, i) => i + 1) // Cards 1-91
      setDiscoveredCardIds(commonIds)
    }
  }, [])

  const { cards, isLoading } = useNFTCards(discoveredCardIds)

  return {
    cards: cards.filter(card => card.name && card.name.trim() !== ''), // Filter out empty/invalid cards
    isLoading: isLoading || isDiscovering,
    discoveredCount: discoveredCardIds.length,
    cacheStats: cacheManager.getCacheStats()
  }
}

// Utility hook for getting card URI (SVG data)
export function useCardURI(cardId: number) {
  const contractAddresses = getContractAddresses()

  const { data: uri, isLoading, error } = useReadContract({
    address: contractAddresses.NFT_CARDS,
    abi: TokenTycoonCardsABI,
    functionName: 'uri',
    args: [BigInt(cardId)],
    query: {
      enabled: !!cardId && cardId > 0,
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  })

  // Debug logging
  useEffect(() => {
    if (cardId > 0) {
      console.log(`🔗 [useCardURI ${cardId}] Status:`, { 
        hasUri: !!uri, 
        isLoading, 
        hasError: !!error,
        contractAddress: contractAddresses.NFT_CARDS
      })
      if (error) {
        console.error(`🔗 [useCardURI ${cardId}] Error:`, error)
      }
      if (uri) {
        console.log(`🔗 [useCardURI ${cardId}] URI received:`, uri.substring(0, 50) + '...')
      }
    }
  }, [cardId, uri, isLoading, error, contractAddresses.NFT_CARDS])

  return {
    uri: uri as string,
    isLoading,
    error
  }
}