/**
 * Bitcoin Price API - CoinGecko Integration
 * API لسعر البيتكوين باستخدام CoinGecko
 * 
 * الاستخدام:
 * const tracker = new BitcoinPriceTracker();
 * tracker.startTracking();
 */

class BitcoinPriceTracker {
    constructor(options = {}) {
        this.options = {
            updateInterval: options.updateInterval || 30000, // 30 seconds
            currency: options.currency || 'usd',
            onPriceUpdate: options.onPriceUpdate || null,
            onError: options.onError || null,
            autoStart: options.autoStart !== false
        };
        
        this.currentPrice = 0;
        this.lastPrice = 0;
        this.updateInterval = null;
        this.isTracking = false;
        this.apiUrl = 'https://api.coingecko.com/api/v3';
    }

    /**
     * تنسيق الأرقام الكبيرة
     * @param {number} num - الرقم المراد تنسيقه
     * @returns {string} الرقم المنسق
     */
    formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    /**
     * تنسيق التاريخ والوقت
     * @param {Date} date - التاريخ المراد تنسيقه
     * @returns {string} التاريخ المنسق
     */
    formatDateTime(date) {
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * جلب بيانات البيتكوين من CoinGecko API
     * @returns {Promise<Object>} بيانات البيتكوين
     */
    async fetchBitcoinData() {
        try {
            const response = await fetch(`${this.apiUrl}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.processData(data);
            
        } catch (error) {
            console.error('Error fetching Bitcoin data:', error);
            if (this.options.onError) {
                this.options.onError(error);
            }
            throw error;
        }
    }

    /**
     * معالجة البيانات المستلمة من API
     * @param {Object} data - البيانات الخام من API
     * @returns {Object} البيانات المعالجة
     */
    processData(data) {
        const marketData = data.market_data;
        const currency = this.options.currency;
        
        const processedData = {
            id: data.id,
            symbol: data.symbol.toUpperCase(),
            name: data.name,
            currentPrice: marketData.current_price[currency],
            priceChange24h: marketData.price_change_24h[currency],
            priceChangePercentage24h: marketData.price_change_percentage_24h,
            high24h: marketData.high_24h[currency],
            low24h: marketData.low_24h[currency],
            volume24h: marketData.total_volume[currency],
            marketCap: marketData.market_cap[currency],
            marketCapRank: marketData.market_cap_rank,
            lastUpdated: new Date(),
            formatted: {
                currentPrice: `$${this.formatNumber(marketData.current_price[currency])}`,
                priceChange24h: `$${this.formatNumber(marketData.price_change_24h[currency])}`,
                priceChangePercentage24h: `${marketData.price_change_percentage_24h >= 0 ? '+' : ''}${marketData.price_change_percentage_24h.toFixed(2)}%`,
                high24h: `$${this.formatNumber(marketData.high_24h[currency])}`,
                low24h: `$${this.formatNumber(marketData.low_24h[currency])}`,
                volume24h: `$${this.formatNumber(marketData.total_volume[currency])}`,
                marketCap: `$${this.formatNumber(marketData.market_cap[currency])}`,
                lastUpdated: this.formatDateTime(new Date())
            }
        };

        return processedData;
    }

    /**
     * بدء تتبع سعر البيتكوين
     */
    async startTracking() {
        if (this.isTracking) {
            console.warn('Bitcoin tracking is already active');
            return;
        }

        this.isTracking = true;
        
        // جلب البيانات الأولية
        await this.updatePrice();
        
        // بدء التحديث التلقائي
        this.updateInterval = setInterval(() => {
            this.updatePrice();
        }, this.options.updateInterval);

        console.log('Bitcoin price tracking started');
    }

    /**
     * إيقاف تتبع سعر البيتكوين
     */
    stopTracking() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isTracking = false;
        console.log('Bitcoin price tracking stopped');
    }

    /**
     * تحديث السعر الحالي
     */
    async updatePrice() {
        try {
            const data = await this.fetchBitcoinData();
            this.lastPrice = this.currentPrice;
            this.currentPrice = data.currentPrice;
            
            // استدعاء callback إذا كان محدداً
            if (this.options.onPriceUpdate) {
                this.options.onPriceUpdate(data, this.lastPrice);
            }
            
            return data;
            
        } catch (error) {
            console.error('Failed to update Bitcoin price:', error);
            throw error;
        }
    }

    /**
     * الحصول على السعر الحالي
     * @returns {number} السعر الحالي
     */
    getCurrentPrice() {
        return this.currentPrice;
    }

    /**
     * الحصول على آخر سعر
     * @returns {number} آخر سعر
     */
    getLastPrice() {
        return this.lastPrice;
    }

    /**
     * التحقق من تغير السعر
     * @returns {string} اتجاه التغير (up, down, unchanged)
     */
    getPriceDirection() {
        if (this.currentPrice > this.lastPrice) return 'up';
        if (this.currentPrice < this.lastPrice) return 'down';
        return 'unchanged';
    }

    /**
     * الحصول على نسبة التغير
     * @returns {number} نسبة التغير
     */
    getPriceChangePercentage() {
        if (this.lastPrice === 0) return 0;
        return ((this.currentPrice - this.lastPrice) / this.lastPrice) * 100;
    }
}

/**
 * دالة مساعدة لإنشاء عنصر HTML لعرض السعر
 * @param {string} containerId - معرف العنصر الحاوي
 * @param {Object} options - خيارات العرض
 * @returns {BitcoinPriceTracker} مثيل المتتبع
 */
function createBitcoinPriceDisplay(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        throw new Error(`Container with id '${containerId}' not found`);
    }

    // إنشاء HTML للعرض
    container.innerHTML = `
        <div class="bitcoin-price-display">
            <div class="price-main">
                <div class="price-value" id="price-value">$0.00</div>
                <div class="price-change" id="price-change">0.00%</div>
            </div>
            <div class="price-stats">
                <div class="stat">
                    <span class="stat-label">أعلى (24س)</span>
                    <span class="stat-value" id="high-24h">$0.00</span>
                </div>
                <div class="stat">
                    <span class="stat-label">أقل (24س)</span>
                    <span class="stat-value" id="low-24h">$0.00</span>
                </div>
                <div class="stat">
                    <span class="stat-label">الحجم (24س)</span>
                    <span class="stat-value" id="volume-24h">$0.00</span>
                </div>
                <div class="stat">
                    <span class="stat-label">القيمة السوقية</span>
                    <span class="stat-value" id="market-cap">$0.00</span>
                </div>
            </div>
            <div class="last-updated" id="last-updated">آخر تحديث: --</div>
        </div>
    `;

    // إنشاء المتتبع
    const tracker = new BitcoinPriceTracker({
        ...options,
        onPriceUpdate: (data, lastPrice) => {
            // تحديث العرض
            document.getElementById('price-value').textContent = data.formatted.currentPrice;
            document.getElementById('price-change').textContent = data.formatted.priceChangePercentage24h;
            document.getElementById('high-24h').textContent = data.formatted.high24h;
            document.getElementById('low-24h').textContent = data.formatted.low24h;
            document.getElementById('volume-24h').textContent = data.formatted.volume24h;
            document.getElementById('market-cap').textContent = data.formatted.marketCap;
            document.getElementById('last-updated').textContent = `آخر تحديث: ${data.formatted.lastUpdated}`;

            // إضافة تأثير بصري عند تغير السعر
            const priceElement = document.getElementById('price-value');
            if (lastPrice !== 0 && data.currentPrice !== lastPrice) {
                priceElement.style.animation = 'price-pulse 1s';
                setTimeout(() => {
                    priceElement.style.animation = '';
                }, 1000);
            }

            // استدعاء callback مخصص إذا كان محدداً
            if (options.onPriceUpdate) {
                options.onPriceUpdate(data, lastPrice);
            }
        }
    });

    return tracker;
}

/**
 * دالة مساعدة لإنشاء CSS للعرض
 * @param {string} prefix - بادئة CSS classes
 */
function createBitcoinPriceCSS(prefix = 'bitcoin') {
    const style = document.createElement('style');
    style.textContent = `
        .${prefix}-price-display {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .${prefix}-price-display .price-main {
            margin-bottom: 20px;
        }

        .${prefix}-price-display .price-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .${prefix}-price-display .price-change {
            font-size: 18px;
            padding: 5px 15px;
            border-radius: 20px;
            display: inline-block;
        }

        .${prefix}-price-display .price-change.positive {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .${prefix}-price-display .price-change.negative {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        .${prefix}-price-display .price-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }

        .${prefix}-price-display .stat {
            background: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 8px;
        }

        .${prefix}-price-display .stat-label {
            display: block;
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 5px;
        }

        .${prefix}-price-display .stat-value {
            display: block;
            font-size: 16px;
            font-weight: bold;
        }

        .${prefix}-price-display .last-updated {
            font-size: 12px;
            opacity: 0.7;
        }

        @keyframes price-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        @media (max-width: 480px) {
            .${prefix}-price-display .price-stats {
                grid-template-columns: 1fr;
            }
            
            .${prefix}-price-display .price-value {
                font-size: 28px;
            }
        }
    `;
    document.head.appendChild(style);
}

// تصدير الكلاس والدوال للاستخدام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BitcoinPriceTracker, createBitcoinPriceDisplay, createBitcoinPriceCSS };
} else if (typeof window !== 'undefined') {
    window.BitcoinPriceTracker = BitcoinPriceTracker;
    window.createBitcoinPriceDisplay = createBitcoinPriceDisplay;
    window.createBitcoinPriceCSS = createBitcoinPriceCSS;
} 