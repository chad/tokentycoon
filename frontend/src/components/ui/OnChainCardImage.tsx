import React, { useState, useEffect, useRef } from 'react'
import { useCardURI } from '@/lib/hooks/useNFTCardsContract'
import type { OnChainCardMetadata } from '@/lib/hooks/useNFTCardsContract'
import { getAssetUrl } from '@/lib/utils/assets'

interface OnChainCardImageProps {
  card: OnChainCardMetadata
  className?: string
  fallbackIcon?: string
  useFallback?: boolean
}

// SVG data URL decoder
function decodeSVGFromURI(uri: string): string | null {
  try {
    console.log('🔍 Decoding URI:', uri.substring(0, 50) + '...')
    
    if (!uri) {
      console.log('❌ URI is empty or null')
      return null
    }

    // Check if it's a data URI
    if (uri.startsWith('data:')) {
      const parts = uri.split(',')
      if (parts.length < 2) {
        console.log('❌ Invalid data URI format (no comma separator)')
        return null
      }

      console.log(`📦 Data URI header: ${parts[0]}`)
      const data = parts[1]
      console.log(`📦 Attempting to decode base64 data (${data.length} chars)`)
      
      const decoded = atob(data) // Base64 decode
      console.log(`✅ Base64 decoded to JSON (${decoded.length} chars)`)

      // Parse JSON metadata
      const metadata = JSON.parse(decoded)
      console.log('✅ Parsed JSON metadata:', Object.keys(metadata))
      
      // Extract SVG from image field (should be data:image/svg+xml;base64,...)
      if (metadata.image) {
        console.log(`🖼️  Found image field: ${metadata.image.substring(0, 50)}...`)
        
        if (metadata.image.startsWith('data:image/svg+xml;base64,')) {
          const svgBase64 = metadata.image.split(',')[1]
          console.log(`🎨 Decoding SVG base64 (${svgBase64.length} chars)`)
          
          let svgContent = atob(svgBase64)
          console.log(`✅ SVG decoded (${svgContent.length} chars)`)
          
          // Fix SVG format if it starts with raw 'xml version' instead of '<?xml version'
          if (svgContent.startsWith('xml version=')) {
            console.log('🔧 Fixing XML declaration')
            svgContent = '<?' + svgContent
          }
          
          // Fix missing spaces in XML declaration (critical for browser parsing)
          svgContent = svgContent.replace(/version="1\.0"encoding="UTF-8"/, 'version="1.0" encoding="UTF-8"')
          svgContent = svgContent.replace(/encoding="UTF-8"\?><svg/, 'encoding="UTF-8"?><svg ')
          
          // Fix missing spaces between SVG attributes (critical!)
          // Run multiple passes to catch all missing spaces
          let prevLength = 0
          while (svgContent.length !== prevLength) {
            prevLength = svgContent.length
            svgContent = svgContent.replace(/("[^"]*")([a-zA-Z]+=")/g, '$1 $2')
          }
          
          // Additional specific fixes for common patterns
          svgContent = svgContent.replace(/viewBox="([^"]*)"/g, ' viewBox="$1"')
          svgContent = svgContent.replace(/xmlns="([^"]*)"/g, ' xmlns="$1"')
          svgContent = svgContent.replace(/  +/g, ' ') // Clean up multiple spaces
          
          console.log('🔧 Fixed XML and SVG attribute formatting')
          
          // Ensure the SVG content is properly formatted
          if (!svgContent.includes('<svg')) {
            console.warn('❌ SVG content does not contain <svg> tag:', svgContent.substring(0, 200))
            return null
          }
          
          console.log(`✅ Valid SVG content (${svgContent.length} chars):`, svgContent.substring(0, 100))
          return svgContent
        } else {
          console.log('❌ Image field is not SVG data URL format:', metadata.image.substring(0, 100))
        }
      } else {
        console.log('❌ No image field found in metadata')
      }
    } else {
      console.log('❌ URI is not a data URI')
    }

    return null
  } catch (error) {
    console.error('❌ Failed to decode SVG from URI:', error)
    return null
  }
}

// Fallback to static file
function getStaticCardImagePath(cardName: string): string {
  const filename = cardName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
  
  return getAssetUrl(`v2/cards/${filename}-literal.svg`)
}

export function OnChainCardImage({ 
  card, 
  className = '', 
  fallbackIcon = '🃏',
  useFallback = false 
}: OnChainCardImageProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [useStatic, setUseStatic] = useState(useFallback)
  
  // Debug to identify modal vs grid instances
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))
  
  // Use ref to persist SVG content across renders
  const persistedSvgContent = useRef<string | null>(null)
  
  // Track the previous card ID to detect actual changes
  const previousCardId = useRef<number>(card.cardId)
  
  console.log(`[OnChainCardImage ${instanceId.current}] Rendering card ${card.cardId} (${card.name})`)
  
  // Fetch on-chain URI
  const { uri, isLoading: isLoadingURI, error: uriError } = useCardURI(card.cardId)
  
  // Try to extract SVG from URI
  useEffect(() => {
    if (uri && !useStatic) {
      console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Processing URI:`, uri.substring(0, 100) + '...')
      const decoded = decodeSVGFromURI(uri)
      if (decoded) {
        console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Successfully decoded SVG (${decoded.length} chars)`)
        console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Setting SVG content in state and ref...`)
        setSvgContent(decoded)
        persistedSvgContent.current = decoded
        setImageError(false)
        console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] SVG content set, should not fall back to static`)
      } else {
        console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] No valid SVG found in URI, falling back to static`)
        setUseStatic(true)
      }
    } else {
      console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Skipping decode - URI: ${!!uri}, useStatic: ${useStatic}`)
    }
  }, [uri, card.cardId]) // Removed useStatic dependency to prevent re-running when useStatic changes

  // Handle URI loading error
  useEffect(() => {
    if (uriError) {
      console.error(`[Card ${card.cardId}] URI error, falling back to static:`, uriError)
      setUseStatic(true)
    }
  }, [uriError, card.cardId])

  // Reset error states when card changes (but not when useFallback changes)
  useEffect(() => {
    // Check if card actually changed
    if (previousCardId.current === card.cardId) {
      console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Same card, skipping reset`)
      return
    }
    
    // Card actually changed - update the ref and reset state
    console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Card changed from ${previousCardId.current} to ${card.cardId}, resetting state`)
    previousCardId.current = card.cardId
    
    setImageError(false)
    if (svgContent || persistedSvgContent.current) {
      console.log(`[Card ${card.cardId}] Resetting component state (had SVG: ${svgContent?.length || persistedSvgContent.current?.length} chars)`)
    }
    setSvgContent(null)
    persistedSvgContent.current = null
    setUseStatic(useFallback)
  }, [card.cardId, useFallback]) // Re-added useFallback since we're now checking actual card changes

  // Handle useFallback changes without resetting SVG content
  useEffect(() => {
    // Only update useStatic if we don't already have valid SVG content
    if (!svgContent) {
      setUseStatic(useFallback)
    }
  }, [useFallback, svgContent])

  // Loading state
  if (isLoadingURI && !useStatic) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 animate-pulse ${className}`}>
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Show on-chain SVG if available (prefer state, fallback to ref)
  const currentSvgContent = svgContent || persistedSvgContent.current
  if (currentSvgContent && !imageError && !useStatic) {
    console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Rendering SVG content (${currentSvgContent.length} chars) - source: ${svgContent ? 'state' : 'ref'}`);
    try {
      // Clean up the SVG content and create a proper data URL
      let cleanSvg = currentSvgContent.trim()
      
      // Fix any remaining XML formatting issues
      cleanSvg = cleanSvg.replace(/\?><svg/g, '?>\n<svg')
      
      // Ensure proper SVG structure
      if (!cleanSvg.startsWith('<svg')) {
        // If it starts with XML declaration, find the SVG tag
        const svgStart = cleanSvg.indexOf('<svg')
        if (svgStart > -1) {
          cleanSvg = cleanSvg.substring(svgStart)
        }
      }
      
      console.log(`[Card ${card.cardId}] Using direct SVG injection (${cleanSvg.length} chars)`)
      
      // Use direct SVG injection instead of data URLs
      return (
        <div 
          className={`${className} flex items-center justify-center`}
          dangerouslySetInnerHTML={{ __html: cleanSvg }}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      )
    } catch (error) {
      console.error(`[Card ${card.cardId}] Error creating SVG data URL:`, error)
      setImageError(true)
      // Fall through to next fallback
    }
  }

  // Fallback to static file
  if (useStatic && !imageError) {
    return (
      <img
        src={getStaticCardImagePath(card.name)}
        alt={card.name}
        className={`object-cover ${className}`}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    )
  }

  // Ultimate fallback to emoji
  console.log(`[Card ${card.cardId}] [Instance ${instanceId.current}] Using fallback emoji - State:`, {
    svgContent: !!svgContent,
    svgLength: svgContent?.length || 0,
    persistedSvgContent: !!persistedSvgContent.current,
    persistedSvgLength: persistedSvgContent.current?.length || 0,
    currentSvgContent: !!(svgContent || persistedSvgContent.current),
    imageError,
    useStatic,
    isLoadingURI,
    hasURI: !!uri,
    uriError: !!uriError
  })
  
  return (
    <div className={`flex items-center justify-center bg-gray-800 ${className}`}>
      <span className="text-4xl">{fallbackIcon}</span>
      <div className="absolute bottom-1 right-1 bg-red-500 text-white text-xs px-1 rounded">
        {card.cardId}
      </div>
    </div>
  )
}

// Hybrid component that intelligently chooses between on-chain and static
export function SmartCardImage({ 
  card, 
  className = '', 
  fallbackIcon = '🃏',
  preferOnChain = true 
}: OnChainCardImageProps & { preferOnChain?: boolean }) {
  // For now, we'll try on-chain first, then fallback to static
  // In the future, we can add logic to prefer one over the other based on card.finalized status
  
  const shouldUseOnChain = preferOnChain && card.finalized && card.name

  return (
    <OnChainCardImage
      card={card}
      className={className}
      fallbackIcon={fallbackIcon}
      useFallback={!shouldUseOnChain}
    />
  )
}