import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  PieChart as PieIcon, 
  Coins, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Search, 
  AlertCircle, 
  Calendar, 
  Building2, 
  FileText, 
  Trash2, 
  Copy, 
  Sparkles,
  Info
} from 'lucide-react';
import { Holding, AssetType, MetalCategory, MutualFundScheme } from '../../types';
import { usePortfolio } from '../../context/PortfolioContext';
import { useNotifications } from '../../context/NotificationContext';
import { searchMutualFunds } from '../../services/mutualFundService';
import { fetchStockQuote } from '../../services/marketDataService';
import { formatCurrency } from '../../utils/formatters';

export interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editHolding?: Holding;
}

const POPULAR_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries' },
  { symbol: 'INFY', name: 'Infosys Ltd' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp' },
];

const BROKER_OPTIONS = [
  'Zerodha',
  'Groww',
  'AngelOne',
  'Upstox',
  'HDFC Sky',
  'ICICI Direct',
  'Kotak Securities',
  'Direct / Physical Vault'
];

export const AddHoldingModal: React.FC<AddHoldingModalProps> = ({
  isOpen,
  onClose,
  editHolding,
}) => {
  const { addHolding, updateHolding, deleteHolding, duplicateHolding } = usePortfolio();
  const { addNotification } = useNotifications();

  // Wizard state: 1 = Type, 2 = Details, 3 = Review
  const [step, setStep] = useState<number>(1);

  // Form Fields
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [symbol, setSymbol] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [averagePrice, setAveragePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [broker, setBroker] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Metal specific fields
  const [goldCategory, setGoldCategory] = useState<MetalCategory>('Bars');
  const [silverCategory, setSilverCategory] = useState<MetalCategory>('Bars');
  const [weightGrams, setWeightGrams] = useState<string>('');
  const [pricePer10g, setPricePer10g] = useState<string>('');
  const [pricePerKg, setPricePerKg] = useState<string>('');

  // Mutual Fund search state
  const [mfSearchQuery, setMfSearchQuery] = useState<string>('');
  const [mfSearchResults, setMfSearchResults] = useState<MutualFundScheme[]>([]);
  const [isSearchingMF, setIsSearchingMF] = useState<boolean>(false);
  const [showMfDropdown, setShowMfDropdown] = useState<boolean>(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Reset or populate on open / editHolding
  useEffect(() => {
    if (!isOpen) return;

    if (editHolding) {
      setStep(2); // In edit mode, jump straight to details
      setAssetType(editHolding.assetType);
      setSymbol(editHolding.symbol);
      setName(editHolding.name);
      setQuantity(editHolding.quantity.toString());
      setAveragePrice(editHolding.averagePrice.toString());
      setPurchaseDate(editHolding.purchaseDate || new Date().toISOString().split('T')[0]);
      setBroker(editHolding.broker || '');
      setNotes(editHolding.notes || '');

      if (editHolding.assetType === 'gold') {
        const cat = editHolding.metalDetails?.metalCategory || 'Bars';
        setGoldCategory(cat);
        const w = editHolding.metalDetails?.weightGrams || editHolding.quantity;
        setWeightGrams(w.toString());
        // If price > 10,000 it's per 10g
        const p10 = editHolding.averagePrice > 10000 ? editHolding.averagePrice : editHolding.averagePrice * 10;
        setPricePer10g(p10.toString());
      } else if (editHolding.assetType === 'silver') {
        const cat = editHolding.metalDetails?.metalCategory || 'Bars';
        setSilverCategory(cat);
        const w = editHolding.metalDetails?.weightGrams || editHolding.quantity;
        setWeightGrams(w.toString());
        const pkg = editHolding.averagePrice > 10000 ? editHolding.averagePrice : editHolding.averagePrice * 1000;
        setPricePerKg(pkg.toString());
      }
    } else {
      setStep(1);
      setAssetType('stock');
      setSymbol('');
      setName('');
      setQuantity('');
      setAveragePrice('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setBroker('');
      setNotes('');
      setGoldCategory('Bars');
      setSilverCategory('Bars');
      setWeightGrams('');
      setPricePer10g('');
      setPricePerKg('');
      setMfSearchQuery('');
      setMfSearchResults([]);
      setErrors({});
      setShowDeleteConfirm(false);
    }
  }, [isOpen, editHolding]);

  // Debounced Mutual Fund search
  useEffect(() => {
    if (assetType !== 'mutual_fund' || mfSearchQuery.trim().length < 2) {
      setMfSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMF(true);
      try {
        const results = await searchMutualFunds(mfSearchQuery);
        setMfSearchResults(results);
        setShowMfDropdown(true);
      } catch (err) {
        console.warn('MF search failed:', err);
      } finally {
        setIsSearchingMF(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [mfSearchQuery, assetType]);

  if (!isOpen) return null;

  // Validation function for Step 2
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};

    if (assetType === 'stock') {
      if (!symbol.trim()) errs.symbol = 'Stock symbol is required (e.g. RELIANCE)';
      const q = parseFloat(quantity);
      if (isNaN(q) || q <= 0) errs.quantity = 'Quantity must be a positive number';
      const p = parseFloat(averagePrice);
      if (isNaN(p) || p <= 0) errs.averagePrice = 'Average purchase price must be greater than 0';
    } else if (assetType === 'mutual_fund') {
      if (!symbol.trim()) errs.symbol = 'Fund scheme selection or code is required';
      if (!name.trim()) errs.name = 'Fund name is required';
      const q = parseFloat(quantity);
      if (isNaN(q) || q <= 0) errs.quantity = 'Units must be greater than 0';
      const p = parseFloat(averagePrice);
      if (isNaN(p) || p <= 0) errs.averagePrice = 'Purchase NAV must be greater than 0';
    } else if (assetType === 'gold') {
      const w = parseFloat(weightGrams);
      if (isNaN(w) || w <= 0) errs.weightGrams = 'Weight in grams must be greater than 0';
      const p = parseFloat(pricePer10g);
      if (isNaN(p) || p <= 0) errs.pricePer10g = 'Purchase price per 10g must be greater than 0';
    } else if (assetType === 'silver') {
      const w = parseFloat(weightGrams);
      if (isNaN(w) || w <= 0) errs.weightGrams = 'Weight in grams must be greater than 0';
      const p = parseFloat(pricePerKg);
      if (isNaN(p) || p <= 0) errs.pricePerKg = 'Purchase price per kg must be greater than 0';
    }

    if (!purchaseDate) {
      errs.purchaseDate = 'Purchase date is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    if (step === 2 && !editHolding) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSelectPopularStock = async (stock: { symbol: string; name: string }) => {
    setSymbol(stock.symbol);
    setName(stock.name);
    try {
      const q = await fetchStockQuote(stock.symbol);
      if (q && q.price && !averagePrice) {
        setAveragePrice(q.price.toString());
      }
    } catch {
      // ignore
    }
  };

  const handleSelectMF = (scheme: MutualFundScheme) => {
    setSymbol(scheme.schemeCode.toString());
    setName(scheme.schemeName);
    setMfSearchQuery(scheme.schemeName);
    setShowMfDropdown(false);
  };

  const handleSave = () => {
    let finalHolding: Omit<Holding, 'id'>;

    if (assetType === 'stock') {
      finalHolding = {
        assetType: 'stock',
        symbol: symbol.toUpperCase().trim(),
        name: name.trim() || symbol.toUpperCase().trim(),
        quantity: parseFloat(quantity),
        averagePrice: parseFloat(averagePrice),
        purchaseDate,
        broker: broker || undefined,
        notes: notes || undefined,
      };
    } else if (assetType === 'mutual_fund') {
      finalHolding = {
        assetType: 'mutual_fund',
        symbol: symbol.trim(),
        name: name.trim() || `Fund ${symbol}`,
        quantity: parseFloat(quantity),
        averagePrice: parseFloat(averagePrice),
        purchaseDate,
        broker: broker || undefined,
        notes: notes || undefined,
      };
    } else if (assetType === 'gold') {
      const w = parseFloat(weightGrams);
      const p10 = parseFloat(pricePer10g);
      finalHolding = {
        assetType: 'gold',
        symbol: `GOLD-${goldCategory.toUpperCase()}`,
        name: name.trim() || `Physical Gold ${goldCategory}`,
        quantity: 1,
        averagePrice: p10, // price per 10g
        purchaseDate,
        broker: broker || undefined,
        notes: notes || undefined,
        metalDetails: {
          metalCategory: goldCategory,
          weightGrams: w,
        },
      };
    } else {
      // silver
      const w = parseFloat(weightGrams);
      const pkg = parseFloat(pricePerKg);
      finalHolding = {
        assetType: 'silver',
        symbol: `SILVER-${silverCategory.toUpperCase()}`,
        name: name.trim() || `Silver Bullion ${silverCategory}`,
        quantity: 1,
        averagePrice: pkg, // price per kg
        purchaseDate,
        broker: broker || undefined,
        notes: notes || undefined,
        metalDetails: {
          metalCategory: silverCategory,
          weightGrams: w,
        },
      };
    }

    if (editHolding) {
      updateHolding(editHolding.id, finalHolding);
      addNotification({
        title: 'Holding Updated',
        message: `Updated details for ${finalHolding.name}`,
        type: 'success',
      });
    } else {
      addHolding(finalHolding);
      addNotification({
        title: 'Asset Added to Portfolio',
        message: `Successfully added ${finalHolding.name} (${finalHolding.symbol})`,
        type: 'success',
      });
    }

    onClose();
  };

  // Invested calculation for Review step
  let reviewInvested = 0;
  if (assetType === 'stock' || assetType === 'mutual_fund') {
    reviewInvested = (parseFloat(quantity) || 0) * (parseFloat(averagePrice) || 0);
  } else if (assetType === 'gold') {
    const w = parseFloat(weightGrams) || 0;
    const p10 = parseFloat(pricePer10g) || 0;
    reviewInvested = w * (p10 / 10);
  } else if (assetType === 'silver') {
    const w = parseFloat(weightGrams) || 0;
    const pkg = parseFloat(pricePerKg) || 0;
    reviewInvested = w * (pkg / 1000);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        className="relative w-full max-w-2xl bg-[#0F1626] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col my-8 max-h-[90vh]"
      >
        {/* Top Glow Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-400" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#111827]/80">
          <div>
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{editHolding ? 'Edit Holding' : 'Add New Holding'}</span>
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Step {step} of 3 • {step === 1 ? 'Select Asset Type' : step === 2 ? 'Holding Parameters' : 'Review & Confirm'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {editHolding && (
              <div className="flex items-center gap-1.5 mr-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                  title="Delete holding"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    duplicateHolding(editHolding.id);
                    addNotification({
                      title: 'Holding Duplicated',
                      message: `Created copy of ${editHolding.name}`,
                      type: 'info'
                    });
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-white/[0.08] transition-colors"
                  title="Duplicate holding"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="px-6 py-2 bg-[#0B0F17]/50 border-b border-white/[0.04] flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
              1
            </span>
            <span className={`text-xs font-mono ${step >= 1 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}`}>Type</span>
          </div>
          <div className="w-8 h-[1px] bg-gray-800" />
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
              2
            </span>
            <span className={`text-xs font-mono ${step >= 2 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}`}>Details</span>
          </div>
          <div className="w-8 h-[1px] bg-gray-800" />
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 3 ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
              3
            </span>
            <span className={`text-xs font-mono ${step >= 3 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}`}>Confirm</span>
          </div>
        </div>

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && editHolding && (
          <div className="p-4 bg-red-950/80 border-b border-red-500/40 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Are you sure you want to permanently delete this holding?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteHolding(editHolding.id);
                  addNotification({
                    title: 'Holding Deleted',
                    message: `Removed ${editHolding.name}`,
                    type: 'alert'
                  });
                  onClose();
                }}
                className="px-2.5 py-1 rounded bg-red-600 text-white font-bold hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Modal Body with Animated Step Transition */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT ASSET TYPE */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="text-center max-w-sm mx-auto mb-6">
                  <h4 className="text-base font-bold text-gray-100">Choose an Asset Class</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Select the type of financial instrument or physical asset to add.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stock Card */}
                  <div
                    onClick={() => {
                      setAssetType('stock');
                      setStep(2);
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      assetType === 'stock'
                        ? 'bg-[#151C2B] border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
                        : 'bg-[#111827]/60 border-white/[0.08] hover:border-cyan-500/30 hover:bg-[#151C2B]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      {assetType === 'stock' && (
                        <span className="w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-100">Equities & Stocks</h5>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Indian (NSE/BSE) or US equities with real-time quote lookups and P&L tracking.
                      </p>
                    </div>
                  </div>

                  {/* Mutual Fund Card */}
                  <div
                    onClick={() => {
                      setAssetType('mutual_fund');
                      setStep(2);
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      assetType === 'mutual_fund'
                        ? 'bg-[#151C2B] border-purple-500/60 shadow-[0_0_25px_rgba(124,58,237,0.2)]'
                        : 'bg-[#111827]/60 border-white/[0.08] hover:border-purple-500/30 hover:bg-[#151C2B]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <PieIcon className="w-6 h-6" />
                      </div>
                      {assetType === 'mutual_fund' && (
                        <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-100">Mutual Funds & SIPs</h5>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Direct growth & regular schemes across AMCs with AMFI live NAV integration.
                      </p>
                    </div>
                  </div>

                  {/* Gold Card */}
                  <div
                    onClick={() => {
                      setAssetType('gold');
                      setStep(2);
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      assetType === 'gold'
                        ? 'bg-[#151C2B] border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                        : 'bg-[#111827]/60 border-white/[0.08] hover:border-amber-500/30 hover:bg-[#151C2B]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Coins className="w-6 h-6" />
                      </div>
                      {assetType === 'gold' && (
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-100">Physical & Digital Gold</h5>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        24K/22K bars, bullion coins, jewellery, and digital gold with purity adjustments.
                      </p>
                    </div>
                  </div>

                  {/* Silver Card */}
                  <div
                    onClick={() => {
                      setAssetType('silver');
                      setStep(2);
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      assetType === 'silver'
                        ? 'bg-[#151C2B] border-slate-400/60 shadow-[0_0_25px_rgba(148,163,184,0.2)]'
                        : 'bg-[#111827]/60 border-white/[0.08] hover:border-slate-400/30 hover:bg-[#151C2B]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-400/10 border border-slate-400/20 flex items-center justify-center text-slate-300">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      {assetType === 'silver' && (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-black flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-100">Silver Bullion & Coins</h5>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        999 Fine Bullion bars, kilo bricks, and commemorative silver assets.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: ENTER DETAILS */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* 1. STOCK DETAILS */}
                {assetType === 'stock' && (
                  <div className="space-y-4">
                    {/* Quick Pick Chips */}
                    <div>
                      <label className="text-xs font-mono text-gray-400 mb-2 block">
                        Quick Pick Popular Stocks
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_STOCKS.map((s) => (
                          <button
                            key={s.symbol}
                            type="button"
                            onClick={() => handleSelectPopularStock(s)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                              symbol === s.symbol
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-gray-800/60 text-gray-300 border-white/[0.06] hover:bg-gray-800 hover:text-cyan-400'
                            }`}
                          >
                            {s.symbol}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Stock Symbol / Ticker *
                        </label>
                        <input
                          type="text"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                          placeholder="e.g. RELIANCE, AAPL"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                            errors.symbol ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.symbol && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.symbol}</span>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Reliance Industries Ltd."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border border-white/[0.1] text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Quantity (Shares) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="e.g. 50"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                            errors.quantity ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.quantity && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.quantity}</span>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Avg Purchase Price (₹) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={averagePrice}
                          onChange={(e) => setAveragePrice(e.target.value)}
                          placeholder="e.g. 2450.50"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                            errors.averagePrice ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.averagePrice && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.averagePrice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MUTUAL FUND DETAILS */}
                {assetType === 'mutual_fund' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                        Search Mutual Fund Scheme *
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={mfSearchQuery}
                          onChange={(e) => {
                            setMfSearchQuery(e.target.value);
                            setShowMfDropdown(true);
                          }}
                          onFocus={() => setShowMfDropdown(true)}
                          placeholder="Type fund name (e.g. Parag Parikh, SBI Small Cap)..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/80 border border-white/[0.1] text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        {isSearchingMF && (
                          <div className="absolute right-3.5 top-3">
                            <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin block" />
                          </div>
                        )}
                      </div>

                      {/* Dropdown Results */}
                      {showMfDropdown && mfSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#151C2B] border border-white/[0.12] rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 divide-y divide-white/[0.04]">
                          {mfSearchResults.map((scheme) => (
                            <div
                              key={scheme.schemeCode}
                              onClick={() => handleSelectMF(scheme)}
                              className="p-3 text-xs text-gray-200 hover:bg-purple-600/20 hover:text-purple-200 cursor-pointer transition-colors"
                            >
                              <div className="font-semibold">{scheme.schemeName}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">Code: {scheme.schemeCode}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {errors.symbol && (
                        <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.symbol}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Units Held *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="e.g. 1520.45"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                            errors.quantity ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.quantity && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.quantity}</span>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          NAV at Purchase (₹) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={averagePrice}
                          onChange={(e) => setAveragePrice(e.target.value)}
                          placeholder="e.g. 74.50"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                            errors.averagePrice ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.averagePrice && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.averagePrice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. GOLD DETAILS */}
                {assetType === 'gold' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                        Gold Category / Form *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['24K', '22K', 'Bars', 'Coins', 'Jewellery', 'Digital'] as MetalCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setGoldCategory(cat)}
                            className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                              goldCategory === cat
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-gray-800/60 text-gray-400 border-white/[0.06] hover:bg-gray-800'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Weight in Grams *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={weightGrams}
                          onChange={(e) => setWeightGrams(e.target.value)}
                          placeholder="e.g. 20"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                            errors.weightGrams ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.weightGrams && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.weightGrams}</span>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Purchase Price per 10g (₹) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={pricePer10g}
                          onChange={(e) => setPricePer10g(e.target.value)}
                          placeholder="e.g. 74500"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                            errors.pricePer10g ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.pricePer10g && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.pricePer10g}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SILVER DETAILS */}
                {assetType === 'silver' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                        Silver Category / Form *
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['Bars', 'Coins', 'Jewellery', 'Digital'] as MetalCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSilverCategory(cat)}
                            className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                              silverCategory === cat
                                ? 'bg-slate-400/20 text-slate-200 border-slate-400/40'
                                : 'bg-gray-800/60 text-gray-400 border-white/[0.06] hover:bg-gray-800'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Weight in Grams *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={weightGrams}
                          onChange={(e) => setWeightGrams(e.target.value)}
                          placeholder="e.g. 1000 for 1 Kg"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                            errors.weightGrams ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.weightGrams && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.weightGrams}</span>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                          Purchase Price per Kg (₹) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={pricePerKg}
                          onChange={(e) => setPricePerKg(e.target.value)}
                          placeholder="e.g. 87000"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                            errors.pricePerKg ? 'border-red-500' : 'border-white/[0.1]'
                          }`}
                        />
                        {errors.pricePerKg && (
                          <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.pricePerKg}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* COMMON TRANSACTION FIELDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                        errors.purchaseDate ? 'border-red-500' : 'border-white/[0.1]'
                      }`}
                    />
                    {errors.purchaseDate && (
                      <span className="text-[11px] text-red-400 mt-1 block font-mono">{errors.purchaseDate}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      Broker / Depository (Optional)
                    </label>
                    <input
                      type="text"
                      list="brokers-list"
                      value={broker}
                      onChange={(e) => setBroker(e.target.value)}
                      placeholder="e.g. Zerodha, Groww"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900/80 border border-white/[0.1] text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <datalist id="brokers-list">
                      {BROKER_OPTIONS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-gray-300 mb-1.5 block flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    Investment Notes & Thesis (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Rationale, target exit price, or notes for rebalancing..."
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-900/80 border border-white/[0.1] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: REVIEW & CONFIRM */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="glass-card p-5 rounded-2xl space-y-4 border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                      Portfolio Order Summary
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {assetType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="py-2 border-y border-white/[0.06] space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Asset Name</span>
                      <span className="font-semibold text-gray-100">
                        {name || symbol || (assetType === 'gold' ? `Gold ${goldCategory}` : `Silver ${silverCategory}`)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-gray-400">Symbol / Identifier</span>
                      <span className="text-cyan-400">{symbol || (assetType === 'gold' ? `GOLD-${goldCategory}` : `SILVER-${silverCategory}`)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-gray-400">Holding Size</span>
                      <span className="text-gray-200">
                        {assetType === 'gold' || assetType === 'silver' ? `${weightGrams} Grams` : `${quantity} Units`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-gray-400">Effective Unit Price</span>
                      <span className="text-gray-200">
                        {assetType === 'gold' ? `${formatCurrency(parseFloat(pricePer10g) || 0)} / 10g` : assetType === 'silver' ? `${formatCurrency(parseFloat(pricePerKg) || 0)} / Kg` : formatCurrency(parseFloat(averagePrice) || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-gray-400">Purchase Date</span>
                      <span className="text-gray-200">{purchaseDate}</span>
                    </div>

                    {broker && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Broker</span>
                        <span className="text-gray-200">{broker}</span>
                      </div>
                    )}
                  </div>

                  {/* Calculated Total Investment Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-violet-950/30 to-gray-900 border border-cyan-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block">
                        Total Capital Committed
                      </span>
                      <span className="text-2xl font-black font-mono text-white">
                        {formatCurrency(reviewInvested)}
                      </span>
                    </div>
                    <Check className="w-8 h-8 text-cyan-400 opacity-80" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-white/[0.08] bg-[#111827]/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs border border-white/[0.06] flex items-center gap-1.5 transition-all"
          >
            {step === 1 ? 'Cancel' : (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{editHolding ? 'Update Holding' : 'Save to Portfolio'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AddHoldingModal;
