import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Database, Zap, AlertCircle } from 'lucide-react';
import { CardImage } from '@/components/ui/CardImage';
import { OnChainCardImage } from '@/components/ui/OnChainCardImage';
import { useAllNFTCards } from '@/lib/hooks/useNFTCardsContract';
import type { OnChainCardMetadata } from '@/lib/hooks/useNFTCardsContract';
import type { Card } from '@/stores/gameStore';

interface CardsPageProps {
  onClose?: () => void;
}

type CardType = 'Chain' | 'DeFi' | 'EOA' | 'Action';

export const CardsPage: React.FC<CardsPageProps> = ({ onClose = () => window.location.hash = '#/' }) => {
  const { cards: nftCards, isLoading: isLoadingCards, cacheStats } = useAllNFTCards();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<CardType | 'All'>('All');
  const [selectedCard, setSelectedCard] = useState<OnChainCardMetadata | null>(null);
  const [useOnChainImages, setUseOnChainImages] = useState(true);

  // Helper to convert OnChainCardMetadata to Card format
  const convertNFTCardToCard = (nftCard: OnChainCardMetadata): Card => {
    const cardTypes = ['Chain', 'DeFi', 'EOA', 'Action'] as const;
    return {
      id: nftCard.cardId.toString(),
      name: nftCard.name,
      type: cardTypes[nftCard.cardType] || 'unit',
      cost: nftCard.cost,
      text: nftCard.description,
      abilities: nftCard.abilities?.length > 0 ? JSON.stringify(nftCard.abilities) : undefined
    };
  };

  // Use NFT cards as primary data source
  const cards = nftCards || [];


  const enumToCardType = (enumValue: number): CardType => {
    switch (enumValue) {
      case 0: return 'Chain';
      case 1: return 'DeFi';
      case 2: return 'EOA';
      case 3: return 'Action';
      default: return 'Chain';
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          card.description.toLowerCase().includes(searchTerm.toLowerCase());
    const cardType = enumToCardType(card.cardType);
    const matchesType = selectedType === 'All' || cardType === selectedType;
    return matchesSearch && matchesType;
  });

  // Debug logging for first few cards
  useEffect(() => {
    if (cards.length > 0) {
      console.log('📊 Cards data sample:', cards.slice(0, 3).map(card => ({
        cardId: card.cardId,
        name: card.name,
        hasName: !!card.name,
        cardType: card.cardType
      })));
    }
  }, [cards]);

  const getTypeColor = (type: CardType) => {
    switch (type) {
      case 'Chain': return 'bg-blue-600';
      case 'DeFi': return 'bg-purple-600';
      case 'EOA': return 'bg-green-600';
      case 'Action': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl h-[90vh] bg-gray-900 rounded-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">All Cards</h2>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-gray-400">On-Chain</span>
                {cacheStats.size > 0 && (
                  <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded">
                    {cacheStats.size} cached
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseOnChainImages(!useOnChainImages)}
                className={`p-2 rounded-lg transition-colors ${
                  useOnChainImages 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title={useOnChainImages ? 'Using on-chain SVG' : 'Using static images'}
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2">
              {(['All', 'Chain', 'DeFi', 'EOA', 'Action'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedType === type
                      ? type === 'All' 
                        ? 'bg-cyan-600 text-white'
                        : `${getTypeColor(type as CardType)} text-white`
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
            <span>Showing {filteredCards.length} of {cards.length} cards</span>
            <div className="flex items-center gap-3">
              <span>Source: On-Chain NFT Metadata</span>
              {isLoadingCards && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingCards && cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-white">Loading cards from blockchain...</div>
              <div className="text-sm text-gray-400">Fetching on-chain metadata and SVG artwork</div>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <AlertCircle className="w-16 h-16 text-gray-500" />
              <div className="text-white">No cards found</div>
              <div className="text-sm text-gray-400">
                Make sure the cards are properly initialized on the blockchain
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredCards.map(card => {
                const cardType = enumToCardType(card.cardType);
                return (
                  <div
                    key={card.cardId}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setSelectedCard(card)}
                  >
                    <div className="bg-gray-800 rounded-lg p-2 border border-gray-700 hover:border-cyan-500">
                      {/* Card Image */}
                      <div className="aspect-[3/4] bg-gray-900 rounded mb-2 overflow-hidden">
                        {useOnChainImages ? (
                          <OnChainCardImage 
                            card={card}
                            className="w-full h-full"
                            fallbackIcon="🃏"
                          />
                        ) : (
                          <CardImage 
                            card={convertNFTCardToCard(card)} 
                            className="w-full h-full"
                            fallbackIcon="🃏"
                          />
                        )}
                      </div>
                      
                      {/* Card Info */}
                      <div className="text-xs">
                        <div className="font-semibold text-white mb-1 truncate">{card.name}</div>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-white ${getTypeColor(cardType)}`}>
                            {cardType}
                          </span>
                          <span className="text-cyan-400">⚡ {card.cost}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-6">
              {/* Card Image */}
              <div className="w-64 flex-shrink-0">
                <div className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden">
                  {useOnChainImages ? (
                    <OnChainCardImage 
                      card={selectedCard}
                      className="w-full h-full"
                      fallbackIcon="🃏"
                    />
                  ) : (
                    <CardImage 
                      card={convertNFTCardToCard(selectedCard)} 
                      className="w-full h-full"
                      fallbackIcon="🃏"
                    />
                  )}
                </div>
              </div>

              {/* Card Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{selectedCard.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded text-white ${
                        getTypeColor(enumToCardType(selectedCard.cardType))
                      }`}>
                        {enumToCardType(selectedCard.cardType)}
                      </span>
                      <span className="text-cyan-400 font-semibold">Cost: {selectedCard.cost} ETH</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="text-gray-300 mb-4">
                  {selectedCard.description}
                </div>

                {/* Abilities */}
                {selectedCard.abilities && selectedCard.abilities.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Abilities</h4>
                    <div className="space-y-2">
                      {selectedCard.abilities.map((ability, index) => (
                        <div key={index} className="bg-gray-800 rounded p-3">
                          <div className="font-medium text-cyan-400 mb-1 capitalize">
                            {ability.abilityType}
                          </div>
                          <div className="text-sm text-gray-400">
                            Amount: {ability.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* On-chain Metadata */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Card ID: #{selectedCard.cardId}</div>
                    <div>Max Supply: {selectedCard.maxSupply === 0 ? 'Unlimited' : selectedCard.maxSupply.toLocaleString()}</div>
                    <div>Total Minted: {selectedCard.totalMinted.toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      {selectedCard.finalized ? (
                        <span className="text-green-400">Finalized</span>
                      ) : (
                        <span className="text-yellow-400">Draft</span>
                      )}
                      {selectedCard.tradeable && (
                        <span className="text-blue-400">• Tradeable</span>
                      )}
                    </div>
                    {selectedCard.contentHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                      <div className="text-cyan-400">
                        Content Hash: {selectedCard.contentHash.substring(0, 10)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};