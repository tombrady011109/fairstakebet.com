const axios = require('axios');

/**
 * Converts a cryptocurrency to USDT using Poloniex API.
 * @param {string} cryptoSymbol - The symbol of the cryptocurrency (e.g., BTC, LTC, SOL, USDC, TRX, ETH).
 * @param {number} amount - The amount of the cryptocurrency to convert.
 * @returns {Promise<number>} - The equivalent amount in USDT.
 */
async function convertToUSDT(cryptoSymbol, amount) {
    // Normalize the crypto symbol
    const normalizedSymbol = cryptoSymbol.toUpperCase();
    
    // If already USDT, return the amount directly
    if (normalizedSymbol === 'USDT') {
        return amount;
    }
    
    try {
        // Poloniex API endpoint for ticker data
        const response = await axios.get('https://api.poloniex.com/markets/ticker24h');
        
        if (response.data && Array.isArray(response.data)) {
            // First try to find a direct pair with USDT
            const directPair = response.data.find(pair => 
                pair.symbol === `${normalizedSymbol}_USDT`
            );

            if (directPair) {
                const rate = parseFloat(directPair.markPrice);
                return amount * rate;
            }
            
            // If no direct pair with USDT, try to find a pair with BTC and then convert BTC to USDT
            const btcPair = response.data.find(pair => 
                pair.symbol === `${normalizedSymbol}_BTC`
            );
            
            const btcUsdtPair = response.data.find(pair => 
                pair.symbol === 'BTC_USDT'
            );
            
            if (btcPair && btcUsdtPair) {
                const cryptoToBtcRate = parseFloat(btcPair.last);
                const btcToUsdtRate = parseFloat(btcUsdtPair.last);
                return amount * cryptoToBtcRate * btcToUsdtRate;
            }
            
            // Try reverse pairs if direct pairs aren't found
            const reverseUsdtPair = response.data.find(pair => 
                pair.symbol === `USDT_${normalizedSymbol}`
            );
            
            if (reverseUsdtPair) {
                const rate = parseFloat(reverseUsdtPair.last);
                return amount / rate; // Inverse for reverse pairs
            }
            
            // If still not found, use hardcoded fallback rates for common stablecoins
            if (isStablecoin(normalizedSymbol)) {
                return amount; // Most stablecoins are ~1 USDT
            }
            
            // If we get here, we couldn't find a conversion path
            console.warn(`No conversion path found for ${normalizedSymbol} to USDT on Poloniex`);
            
            // Use a fallback method - approximate conversion based on known rates
            return getFallbackRate(normalizedSymbol, amount);
        }
        
        throw new Error(`Invalid response from Poloniex API for ${normalizedSymbol}`);
    } catch (error) {
        console.error(`Error converting ${normalizedSymbol} to USDT using Poloniex:`, error.message);
        
        // If API call fails, use fallback rates
        return getFallbackRate(normalizedSymbol, amount);
    }
}

/**
 * Check if a cryptocurrency is a stablecoin
 * @param {string} symbol - The cryptocurrency symbol
 * @returns {boolean} - True if it's a stablecoin
 */
function isStablecoin(symbol) {
    const stablecoins = [
        'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'FRAX', 
        'LUSD', 'SUSD', 'HUSD', 'OUSD', 'MUSD', 'DUSD', 'CUSD', 
        'ZUSD', 'USDK', 'USDX', 'USDJ'
    ];
    
    return stablecoins.includes(symbol);
}

/**
 * Get fallback conversion rate when API fails
 * @param {string} symbol - The cryptocurrency symbol
 * @param {number} amount - The amount to convert
 * @returns {number} - Estimated USDT value
 */
function getFallbackRate(symbol, amount) {
    // These rates will be outdated but provide a fallback when API is down
    // Update these periodically or when significant market changes occur
    const fallbackRates = {
        'BTC': 65000,    // Bitcoin
        'ETH': 3500,     // Ethereum
        'SOL': 150,      // Solana
        'TRX': 0.12,     // Tron
        'LTC': 80,       // Litecoin
        'XRP': 0.60,     // Ripple
        'ADA': 0.40,     // Cardano
        'DOT': 6.50,     // Polkadot
        'DOGE': 0.10,    // Dogecoin
        'AVAX': 35,      // Avalanche
        'MATIC': 0.80,   // Polygon
        'LINK': 15,      // Chainlink
        'UNI': 7,        // Uniswap
        'SHIB': 0.000025,// Shiba Inu
        'ATOM': 9,       // Cosmos
        'XLM': 0.12,     // Stellar
        'ALGO': 0.15,    // Algorand
        'FIL': 5,        // Filecoin
        'ETC': 25,       // Ethereum Classic
        'NEAR': 3,       // NEAR Protocol
        'APE': 1.5,      // ApeCoin
        'FLOW': 0.70,    // Flow
        'AXS': 7,        // Axie Infinity
        'SAND': 0.50,    // The Sandbox
        'MANA': 0.45,    // Decentraland
        // Add more as needed
    };
    
    if (fallbackRates[symbol]) {
        console.log(`Using fallback rate for ${symbol}: ${fallbackRates[symbol]}`);
        return amount * fallbackRates[symbol];
    }
    
    // If no fallback rate is available, make a very rough estimate
    // This is a last resort and should be avoided
    console.warn(`No fallback rate available for ${symbol}, using 1:1 conversion`);
    return amount;
}

/**
 * Batch convert multiple cryptocurrencies to USDT
 * @param {Array<{symbol: string, amount: number}>} cryptoAmounts - Array of crypto symbols and amounts
 * @returns {Promise<number>} - The total equivalent amount in USDT
 */
async function batchConvertToUSDT(cryptoAmounts) {
    try {
        const conversionPromises = cryptoAmounts.map(item => 
            convertToUSDT(item.symbol, item.amount)
        );
        
        const convertedAmounts = await Promise.all(conversionPromises);
        return convertedAmounts.reduce((total, amount) => total + amount, 0);
    } catch (error) {
        console.error('Error in batch conversion:', error);
        throw new Error('Failed to perform batch conversion to USDT');
    }
}

// Cache mechanism to reduce API calls
let ratesCache = {};
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached rates or update cache if expired
 * @returns {Promise<Object>} - Object with current rates
 */
async function getCachedRates() {
    const now = Date.now();
    
    // If cache is valid, return it
    if (now - lastCacheUpdate < CACHE_DURATION && Object.keys(ratesCache).length > 0) {
        return ratesCache;
    }
    
    try {
        // Update cache
        const response = await axios.get('https://api.poloniex.com/markets/ticker24h');
        
        if (response.data && Array.isArray(response.data)) {
            // Reset cache
            ratesCache = {};
            
            // Update cache with new rates
            response.data.forEach(pair => {
                ratesCache[pair.symbol] = parseFloat(pair.last);
            });
            
            lastCacheUpdate = now;
        }
    } catch (error) {
        console.error('Error updating rates cache:', error.message);
        // If cache update fails but we have old data, keep using it
        if (Object.keys(ratesCache).length === 0) {
            throw new Error('Failed to get exchange rates');
        }
    }
    
    return ratesCache;
}

module.exports = { convertToUSDT, batchConvertToUSDT };