import React, { useState, useEffect } from 'react';
import { BISTStock, OHLCV, SupportResistanceZone, KAPDisclosure, BreakoutEvent, AutoChannel, PeakAndResistanceMetrics } from '../../types';
import { apiClient } from '../../services/apiClient';
import { FinancialChart } from '../../components/FinancialChart';
import {
  Activity,
  ShieldAlert,
  ArrowUpRight,
  BarChart2,
  Layers,
  Search,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface StockDetailViewProps {
  symbol: string;
  stocks: BISTStock[];
  onSelectStock: (symbol: string) => void;
  onNavigateTab: (tab: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (symbol: string) => void;
}

export const StockDetailView: React.FC<StockDetailViewProps> = ({
  symbol,
  stocks,
  onSelectStock,
  onNavigateTab,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const [stock, setStock] = useState<BISTStock | null>(null);
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [zones, setZones] = useState<SupportResistanceZone[]>([]);
  const [breakouts, setBreakouts] = useState<BreakoutEvent[]>([]);
  const [autoChannels, setAutoChannels] = useState<AutoChannel[]>([]);
  const [peakMetrics, setPeakMetrics] = useState<PeakAndResistanceMetrics | null>(null);
  const [disclosures, setDisclosures] = useState<KAPDisclosure[]>([]);
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1y');
  const [coverage, setCoverage] = useState<import('../../types').HistoricalCoverage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataErrorMessage, setDataErrorMessage] = useState<string | null>(null);

  // Quick symbol search box
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setDataErrorMessage(null);

    const loadData = async () => {
      // 1. Fetch stock basic metadata first
      let currentStock: BISTStock | null = null;
      try {
        currentStock = await apiClient.getStock(symbol);
        if (isMounted) setStock(currentStock);
      } catch (err: any) {
        // Find in passed stock list
        const found = stocks.find(s => s.symbol === symbol.toUpperCase());
        if (found && isMounted) setStock(found);
      }

      // 2. Fetch candles and technical data with isolated error handling
      try {
        const candleLimit = timeframe === '1h'
          ? 200 // Saatlik analizlerde son bir aylık saatlik veriyi destekle (~200 mum)
          : selectedPeriod === '10y' ? 2600 : selectedPeriod === '5y' ? 1300 : selectedPeriod === '1y' ? 260 : 35;

        const [ohlcvData, techData, kapData] = await Promise.all([
          apiClient.getOHLCV(symbol, timeframe, candleLimit, selectedPeriod).catch(err => {
            if (isMounted) setDataErrorMessage(err.message);
            return { candles: [], coverage: undefined };
          }),
          apiClient.getTechnical(symbol, timeframe, selectedPeriod).catch(() => ({
            zones: [],
            breakouts: [],
            autoChannels: [],
            peakMetrics: undefined
          })),
          apiClient.getDisclosures(symbol).catch(() => [])
        ]);

        if (isMounted) {
          setCandles(ohlcvData.candles || []);
          setCoverage(ohlcvData.coverage || null);
          setZones(techData.zones || []);
          setBreakouts(techData.breakouts || []);
          setAutoChannels(techData.autoChannels || []);
          setPeakMetrics(techData.peakMetrics || null);
          setDisclosures(kapData || []);
        }
      } catch (err: any) {
        if (isMounted) setDataErrorMessage(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [symbol, timeframe, selectedPeriod, stocks]);

  const filteredStocks = searchQuery
    ? stocks.filter(s => s.symbol.includes(searchQuery.toUpperCase()) || s.name.toUpperCase().includes(searchQuery.toUpperCase())).slice(0, 10)
    : [];

  const isPos = (stock?.changePercent || 0) >= 0;

  const segmentLabel = stock?.marketSegment === 'YILDIZ_PAZAR'
    ? 'Yıldız Pazar'
    : stock?.marketSegment === 'ANA_PAZAR'
    ? 'Ana Pazar'
    : stock?.marketSegment === 'ALT_PAZAR'
    ? 'Alt Pazar'
    : stock?.marketSegment === 'POIP'
    ? 'Piyasa Öncesi İşlem Platformu'
    : 'BIST Pay Senedi';

  return (
    <div className="space-y-5">
      {/* Stock Header & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Symbol Title & Search Switcher */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight font-mono">{symbol}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                {stock?.sector || 'BIST Pay Senedi'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold font-mono">
                {segmentLabel}
              </span>
              {stock?.status === 'HALTED' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold">
                  İŞLEM SIRASI DURDURULDU
                </span>
              )}
              {stock?.status === 'SUSPENDED' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-mono font-bold">
                  İŞLEME KAPALI / KOTTAN ÇIKARILDI
                </span>
              )}
              {stock?.dataStatus === 'VERIFIED' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              ) : stock?.dataStatus === 'UNAVAILABLE' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60 font-mono">
                  UNAVAILABLE
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {stock?.dataStatus || 'NOT_TESTED'}
                </span>
              )}

              <button
                onClick={() => onToggleWatchlist(symbol)}
                className={`p-1.5 rounded border transition-colors ${
                  isWatchlisted
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={isWatchlisted ? 'İzleme listesinden çıkar' : 'İzleme listesine ekle'}
              >
                {isWatchlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium">{stock?.name}</p>

            {/* Quick Switch Dropdown */}
            <div className="relative pt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Search className="w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Tüm BIST hisselerinde ara (500+)..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="bg-transparent border-b border-slate-800 focus:border-emerald-500 text-xs text-slate-200 placeholder-slate-600 outline-none pb-0.5 w-60"
                />
              </div>

              {isSearchOpen && filteredStocks.length > 0 && (
                <div className="absolute left-0 mt-1 w-80 bg-slate-950 border border-slate-800 rounded-md shadow-xl z-30 py-1 max-h-56 overflow-y-auto">
                  {filteredStocks.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => {
                        onSelectStock(s.symbol);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-200">{s.symbol}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                          {s.marketSegment === 'YILDIZ_PAZAR' ? 'YILDIZ' : s.marketSegment === 'ANA_PAZAR' ? 'ANA' : s.marketSegment === 'ALT_PAZAR' ? 'ALT' : 'PÖİP'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current Price & Daily Delta */}
          <div className="text-right">
            <div className="text-3xl font-extrabold text-slate-100 font-mono tabular-nums">
              {stock?.lastPrice ? stock.lastPrice.toFixed(2) : '-'} <span className="text-sm font-normal text-slate-400">TL</span>
            </div>
            <div className={`text-sm font-bold font-mono tabular-nums flex items-center justify-end gap-1 mt-0.5 ${
              isPos ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isPos ? `+${stock?.change.toFixed(2) || '0.00'}` : (stock?.change.toFixed(2) || '0.00')} TL
              <span>({isPos ? `+${stock?.changePercent.toFixed(2) || '0.00'}` : (stock?.changePercent.toFixed(2) || '0.00')}%)</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              15 Dk Gecikmeli · Son İşlem: {stock?.updatedAt ? new Date(stock.updatedAt).toLocaleTimeString('tr-TR') : '-'}
            </div>
          </div>
        </div>

        {/* Fundamental & Trading KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div>
            <div className="text-slate-500 text-[11px]">Açılış</div>
            <div className="text-slate-200 font-semibold tabular-nums">{stock?.open ? stock.open.toFixed(2) : '-'} TL</div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Günlük Yüksek / Düşük</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.high ? stock.high.toFixed(2) : '-'} / {stock?.low ? stock.low.toFixed(2) : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">İşlem Hacmi (TL)</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.volumeTL ? `${(stock.volumeTL / 1_000_000).toFixed(1)} M TL` : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Piyasa Değeri</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.marketCapTL ? `${(stock.marketCapTL / 1_000_000_000).toFixed(2)} Mr TL` : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">F/K / PD/DD</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.pe || '-'} / {stock?.pb || '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Temettü / Pazar</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              %{stock?.dividendYield || 0} / {segmentLabel}
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/50">
          <button
            onClick={() => onNavigateTab('technical')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
            Teknik Analiz Motoruna Git
          </button>
          <button
            onClick={() => onNavigateTab('scenarios')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            5/7/10 Günlük Senaryo Modellemesi
          </button>
          <button
            onClick={() => onNavigateTab('backtesting')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            Bu Hissede Strateji Backtesti Yap
          </button>
        </div>
      </div>

      {/* Honest Data Unavailability Warning (Kural 1 & Kural 3) */}
      {!isLoading && (candles.length === 0 || dataErrorMessage || stock?.dataStatus === 'UNAVAILABLE') && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">
              Kural 1 &amp; Kural 3 Bildirimi: Gerçek Piyasa Verisi Akışı Durumu ({symbol})
            </div>
            <p className="text-amber-200/90 text-[11px] leading-relaxed">
              Bu şirket ({stock?.name || symbol}), Borsa İstanbul {segmentLabel} evrenimizde kayıtlı resmi bir pay senedidir.
              {dataErrorMessage ? ` Sağlayıcı yanıtı: "${dataErrorMessage}"` : ' Harici piyasa verisi sağlayıcısında bu hisseye ait geçmiş OHLCV mum verisi henüz bulunmamaktadır.'}
            </p>
            <p className="text-amber-300 font-semibold text-[11px]">
              Kural 1 gereğince yatırımcı sağlığını korumak adına hiçbir sahte, rastgele (Math.random) veya sentetik fiyat/mum üretilmemektedir.
            </p>
          </div>
        </div>
      )}

      {/* 10. ZİRVE VE DİRENÇ UZAKLIĞI BİLGİ PANELİ (FAZ 2 Madde 10) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
              Zirve, Destek ve Direnç Mesafe Analizi ({selectedPeriod === '10y' ? '10 Yıl' : selectedPeriod === '5y' ? '5 Yıl' : selectedPeriod === '1y' ? '1 Yıl' : '1 Ay'})
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Veri Zamanı: <strong className="text-slate-200">{peakMetrics?.marketDataTime || stock?.updatedAt || '-'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Son Doğrulanmış Fiyat */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono">
            <div className="text-[11px] text-slate-400">Son Doğrulanmış Fiyat</div>
            <div className="text-xl font-extrabold text-slate-100 mt-0.5 tabular-nums">
              {peakMetrics?.lastVerifiedPrice !== undefined
                ? peakMetrics.lastVerifiedPrice.toFixed(2)
                : peakMetrics?.lastPrice !== undefined
                ? peakMetrics.lastPrice.toFixed(2)
                : stock?.lastPrice
                ? stock.lastPrice.toFixed(2)
                : '-'} <span className="text-xs font-normal text-slate-400">TL</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-sans">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> Gerçek Piyasa Kapanışı
            </div>
          </div>

          {/* Dönem Zirvesi & Zirveden Uzaklık */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Dönem Zirvesi</span>
              <span className="text-amber-400 text-[10px] font-sans font-semibold">Tepeden Uzaklık</span>
            </div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5 tabular-nums">
              {peakMetrics ? peakMetrics.periodHigh.toFixed(2) : '-'} <span className="text-xs font-normal text-slate-400">TL</span>
            </div>
            <div className="text-xs font-bold text-amber-300 mt-1 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              %{peakMetrics ? peakMetrics.distanceFromPeakPct.toFixed(2) : '0.00'} Uzaklık
            </div>
          </div>

          {/* En Yakın Tarihsel Direnç (YEŞİL - Kural 6) */}
          <div className="bg-slate-950 p-3 rounded border border-emerald-900/50 font-mono">
            <div className="flex items-center justify-between text-[11px] text-emerald-400">
              <span className="font-semibold">En Yakın Direnç (Yeşil)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 rounded border border-emerald-800 text-emerald-300">DİRENÇ</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5 tabular-nums">
              {peakMetrics?.nearestResistance ? (peakMetrics.nearestResistance.pivotPrice ?? peakMetrics.nearestResistance.price ?? 0).toFixed(2) : '-'} <span className="text-xs font-normal text-slate-400">TL</span>
            </div>
            <div className="text-xs font-bold text-emerald-300 mt-1 flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5" />
              {peakMetrics?.nearestResistance && peakMetrics.distanceToResistancePct != null ? (
                <span>%{peakMetrics.distanceToResistancePct.toFixed(2)} Direnç Mesafesi</span>
              ) : (
                <span className="text-slate-500 font-normal text-[11px]">Üst direnç bulunamadı</span>
              )}
            </div>
          </div>

          {/* En Yakın Tarihsel Destek (KIRMIZI - Kural 6) */}
          <div className="bg-slate-950 p-3 rounded border border-rose-900/50 font-mono">
            <div className="flex items-center justify-between text-[11px] text-rose-400">
              <span className="font-semibold">En Yakın Destek (Kırmızı)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-rose-950 rounded border border-rose-800 text-rose-300">DESTEK</span>
            </div>
            <div className="text-xl font-extrabold text-rose-400 mt-0.5 tabular-nums">
              {peakMetrics?.nearestSupport ? (peakMetrics.nearestSupport.pivotPrice ?? peakMetrics.nearestSupport.price ?? 0).toFixed(2) : '-'} <span className="text-xs font-normal text-slate-400">TL</span>
            </div>
            <div className="text-xs font-bold text-rose-300 mt-1 flex items-center gap-1">
              <ArrowDown className="w-3.5 h-3.5" />
              {peakMetrics?.nearestSupport && peakMetrics.distanceToSupportPct != null ? (
                <span>%{peakMetrics.distanceToSupportPct.toFixed(2)} Destek Mesafesi</span>
              ) : (
                <span className="text-slate-500 font-normal text-[11px]">Alt destek bulunamadı</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Period Selector and Data Range Toolbar (Section 4 & Section 5) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-[11px]">Tarihsel Dönem:</span>
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            {[
              { id: '10y', label: '10 Yıl' },
              { id: '5y', label: '5 Yıl' },
              { id: '1y', label: '1 Yıl' },
              { id: '1mo', label: '1 Ay' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  selectedPeriod === p.id
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {timeframe === '1h' && (
            <span className="text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50 font-mono">
              Saatlik grafik: Son 1 aylık saatlik veri (~200 mum) esas alınmaktadır.
            </span>
          )}
        </div>

        {coverage && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>
              Veri Aralığı: <strong className="text-slate-200">{coverage.earliestDate}</strong> → <strong className="text-slate-200">{coverage.latestDate}</strong>
            </span>
            <span>·</span>
            <span>
              Toplam: <strong className="text-emerald-400">{coverage.totalCandles}</strong> Mum
            </span>
            <span>·</span>
            <span className="text-cyan-400">Ham &amp; Düzeltmeli Gerçek Kapanışlar</span>
          </div>
        )}
      </div>

      {/* Interactive Candlestick Chart */}
      {candles.length > 0 && (
        <FinancialChart
          candles={candles}
          symbol={symbol}
          zones={zones}
          autoChannels={autoChannels}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          isLoading={isLoading}
        />
      )}

      {/* 6. TARİHSEL DESTEK VE DİRENÇ SEVİYELERİ TABLOSU (Kural 6: Destek Kırmızı, Direnç Yeşil) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Tarihsel Destek &amp; Direnç Koridorları ({selectedPeriod.toUpperCase()} Kapsamı)
          </h3>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Destek (Kırmızı)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Direnç (Yeşil)
            </span>
          </div>
        </div>

        {zones.length === 0 ? (
          <div className="text-slate-500 text-xs py-4 text-center font-mono">
            Seçilen dönemde yeterli temas noktası içeren belirgin destek/direnç kümesi tespit edilmedi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] text-slate-400 uppercase font-medium border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Tür</th>
                  <th className="py-2 px-3">Fiyat Aralığı (TL)</th>
                  <th className="py-2 px-3">Pivot Fiyat</th>
                  <th className="py-2 px-3 text-right">Güncel Fiyata Mesafe %</th>
                  <th className="py-2 px-3 text-center">Temas Sayısı</th>
                  <th className="py-2 px-3">Son Temas</th>
                  <th className="py-2 px-3 text-center">Rol Değişimi</th>
                  <th className="py-2 px-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {zones.map(z => {
                  const isSupp = z.type === 'SUPPORT';
                  return (
                    <tr key={z.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isSupp
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {isSupp ? 'DESTEK' : 'DİRENÇ'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-100">
                        {z.priceLow.toFixed(2)} - {z.priceHigh.toFixed(2)} TL
                      </td>
                      <td className="py-2 px-3 text-slate-300">{z.pivotPrice.toFixed(2)} TL</td>
                      <td className={`py-2 px-3 text-right font-bold ${isSupp ? 'text-rose-400' : 'text-emerald-400'}`}>
                        %{z.distancePercent}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-bold text-slate-200">
                          {z.touchCount}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">{z.lastTestedDate || z.lastTouchDate || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        {z.roleReversals && z.roleReversals > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                            {z.roleReversals} Kez Rol Değişti
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                          z.status === 'BROKEN'
                            ? 'bg-rose-900/40 text-rose-300 border border-rose-700/60'
                            : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60'
                        }`}>
                          {z.status === 'BROKEN' ? 'KIRILDI' : 'AKTİF'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. DESTEK VE DİRENÇ KIRILIMLARI (FAZ 2 Madde 7) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Tarihsel Kırılım Olayları (Kapanış Teyitli vs Fitil Taşması)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Toplam: {breakouts.length} Olay
          </span>
        </div>

        {breakouts.length === 0 ? (
          <div className="text-slate-500 text-xs py-4 text-center font-mono">
            Bu periyotta incelenen destek ve direnç koridorlarına ait kayıtlı kırılım olayı bulunmamaktadır.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] text-slate-400 uppercase font-medium border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Kırılım Tarihi</th>
                  <th className="py-2 px-3">Fiyat Seviyesi</th>
                  <th className="py-2 px-3">Kırılım Yönü</th>
                  <th className="py-2 px-3">Zaman Dilimi</th>
                  <th className="py-2 px-3 text-center">Kapanış Teyidi</th>
                  <th className="py-2 px-3 text-center">Hacim Teyidi</th>
                  <th className="py-2 px-3 text-right">Sonraki Fiyat Hareketi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {breakouts.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-semibold text-slate-200">{b.dateStr || b.date}</td>
                    <td className="py-2 px-3 text-slate-100 font-bold">{(b.levelPrice ?? b.priceLevel ?? 0).toFixed(2)} TL</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        b.direction === 'BULLISH_BREAKOUT'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {b.direction === 'BULLISH_BREAKOUT' ? 'YUKARI KIRILIM' : 'AŞAĞI KIRILIM'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{b.timeframe.toUpperCase()}</td>
                    <td className="py-2 px-3 text-center">
                      {b.closeConfirmed ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-sans font-bold">
                          Kapanış Teyitli
                        </span>
                      ) : b.wickPenetrationOnly ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-sans font-bold">
                          Fitil Taşması (Sahte Kırılım)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-sans">Teyitsiz</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {(b.hasVolumeConfirmation ?? b.volumeConfirmed) ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-sans">
                          {b.volumeRatio ? `${b.volumeRatio.toFixed(1)}x Hacim` : 'Hacimli'}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-sans">Rutin Hacim</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {b.subsequentMovePct !== undefined ? (
                        <span className={`font-bold ${b.subsequentMovePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {b.subsequentMovePct >= 0 ? `+${b.subsequentMovePct.toFixed(2)}%` : `${b.subsequentMovePct.toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KAP Disclosures List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          {symbol} Kamuyu Aydınlatma Platformu (KAP) Bildirimleri
        </h3>

        {disclosures.length === 0 ? (
          <div className="text-slate-500 text-xs py-4 text-center font-mono">
            Bu sembol için son 30 gün içinde yayımlanmış KAP açıklaması bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {disclosures.map(k => (
              <div key={k.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">{k.title}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{k.summary}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {k.category}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">{k.publishDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
