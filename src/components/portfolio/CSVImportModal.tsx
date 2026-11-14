import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Download, 
  AlertTriangle,
  Sparkles,
  Info,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Holding } from '../../types';
import { usePortfolio } from '../../context/PortfolioContext';
import { useNotifications } from '../../context/NotificationContext';
import { parseCSVContent, CSVRowPreview, CSVImportOptions } from '../../services/portfolioService';
import { formatCurrency } from '../../utils/formatters';

export interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_ZERODHA_CSV = `Instrument,Qty.,Avg. cost,LTP,Cur. val,P&L,Net chg.
RELIANCE,25,2850.00,2985.40,74635.00,3385.00,+4.75%
TCS,15,4100.00,4210.00,63150.00,1650.00,+2.68%
INFY,50,1750.00,1845.20,92260.00,4760.00,+5.44%
HDFCBANK,40,1650.00,1720.80,68832.00,2832.00,+4.29%`;

const SAMPLE_GROWW_CSV = `Company Name,Symbol,Quantity,Average Price,Type
Tata Motors Ltd.,TATAMOTORS,100,890.50,Equity
ICICI Bank Ltd.,ICICIBANK,60,1180.00,Equity
Parag Parikh Flexi Cap Fund,122639,1500,68.20,Mutual Fund`;

const SAMPLE_GENERIC_CSV = `Ticker,Name,Quantity,Price,Date,Type
AAPL,Apple Inc.,20,215.50,2025-05-10,Stock
GOLD-24K,Physical Gold 24K,1,72000,2025-06-15,Gold
SILVER-1KG,Silver 999 Bullion,1,85000,2025-07-01,Silver`;

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { holdings: existingHoldings, importHoldings } = usePortfolio();
  const { addNotification } = useNotifications();

  // Wizard Steps: 1 = Upload, 2 = Mapping (for Generic), 3 = Preview, 4 = Confirm
  const [step, setStep] = useState<number>(1);
  const [brokerFormat, setBrokerFormat] = useState<'zerodha' | 'groww' | 'generic'>('zerodha');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column Mapping state for Generic format
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    symbol: 'Symbol',
    name: 'Name',
    quantity: 'Quantity',
    averagePrice: 'Price',
    assetType: 'Type',
    purchaseDate: 'Date',
  });

  // Preview filtering: 'all' | 'errors' | 'valid'
  const [previewFilter, setPreviewFilter] = useState<'all' | 'errors' | 'valid'>('all');

  // Import options
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [confirmOverwrite, setConfirmOverwrite] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Process CSV rows using portfolioService
  const previewRows: CSVRowPreview[] = useMemo(() => {
    if (!csvContent.trim()) return [];

    const options: CSVImportOptions = {
      brokerFormat,
      columnMapping: brokerFormat === 'generic' ? columnMapping : undefined,
    };

    return parseCSVContent(csvContent, options);
  }, [csvContent, brokerFormat, columnMapping]);

  // Aggregate stats
  const validRows = previewRows.filter(r => r.isValid);
  const errorRows = previewRows.filter(r => !r.isValid);

  // Check for duplicates against existing portfolio
  const existingSymbols = new Set(existingHoldings.map(h => h.symbol.toUpperCase()));
  const duplicateRows = validRows.filter(r => 
    r.parsedHolding?.symbol && existingSymbols.has(r.parsedHolding.symbol.toUpperCase())
  );

  // Filtered rows for Preview Table
  const displayedRows = useMemo(() => {
    if (previewFilter === 'errors') return errorRows;
    if (previewFilter === 'valid') return validRows;
    return previewRows;
  }, [previewRows, previewFilter, errorRows, validRows]);

  if (!isOpen) return null;

  const handleFileRead = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setCsvContent(text);

        // Detect CSV headers
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
          setDetectedHeaders(headers);

          // Auto-guess mapping for generic
          setColumnMapping({
            symbol: headers.find(h => /symbol|ticker|instrument|code/i.test(h)) || headers[0] || 'Symbol',
            name: headers.find(h => /name|company|scheme|description/i.test(h)) || headers[1] || 'Name',
            quantity: headers.find(h => /qty|quantity|units|shares/i.test(h)) || headers[2] || 'Quantity',
            averagePrice: headers.find(h => /price|avg|cost|rate|buy/i.test(h)) || headers[3] || 'Price',
            assetType: headers.find(h => /type|asset|class/i.test(h)) || 'Type',
            purchaseDate: headers.find(h => /date|time/i.test(h)) || 'Date',
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileRead(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = (type: 'zerodha' | 'groww' | 'generic') => {
    setBrokerFormat(type);
    let sample = SAMPLE_ZERODHA_CSV;
    let name = 'zerodha_holdings_sample.csv';

    if (type === 'groww') {
      sample = SAMPLE_GROWW_CSV;
      name = 'groww_portfolio_sample.csv';
    } else if (type === 'generic') {
      sample = SAMPLE_GENERIC_CSV;
      name = 'generic_portfolio_sample.csv';
    }

    setFileName(name);
    setCsvContent(sample);

    const lines = sample.split(/\r?\n/).filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    setDetectedHeaders(headers);
    setColumnMapping({
      symbol: headers.find(h => /symbol|ticker|instrument/i.test(h)) || headers[0],
      name: headers.find(h => /name|company/i.test(h)) || headers[1] || headers[0],
      quantity: headers.find(h => /qty|quantity/i.test(h)) || headers[2],
      averagePrice: headers.find(h => /price|avg/i.test(h)) || headers[3],
      assetType: headers.find(h => /type/i.test(h)) || 'Type',
      purchaseDate: headers.find(h => /date/i.test(h)) || 'Date',
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!csvContent.trim()) return;
      if (brokerFormat === 'generic') {
        setStep(2); // Go to Column Mapping
      } else {
        setStep(3); // Jump to Preview
      }
    } else if (step === 2) {
      setStep(3); // Go to Preview
    } else if (step === 3) {
      setStep(4); // Go to Final Confirm
    }
  };

  const handleBack = () => {
    if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      if (brokerFormat === 'generic') setStep(2);
      else setStep(1);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleExecuteImport = () => {
    if (importMode === 'overwrite' && !confirmOverwrite) {
      return;
    }

    setIsImporting(true);

    try {
      const holdingsToImport: Holding[] = validRows.map((r, idx) => {
        const ph = r.parsedHolding!;
        return {
          id: `imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          assetType: ph.assetType || 'stock',
          symbol: (ph.symbol || 'ASSET').toUpperCase(),
          name: ph.name || ph.symbol || 'Imported Holding',
          quantity: ph.quantity || 1,
          averagePrice: ph.averagePrice || 100,
          purchaseDate: ph.purchaseDate || new Date().toISOString().split('T')[0],
          broker: ph.broker || brokerFormat.toUpperCase(),
          notes: `Imported via CSV (${brokerFormat})`,
          isDemo: false,
          metalDetails: ph.assetType === 'gold' || ph.assetType === 'silver' ? {
            metalCategory: 'Bars',
            weightGrams: ph.quantity || 1
          } : undefined
        };
      });

      importHoldings(holdingsToImport, importMode === 'overwrite');

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      addNotification({
        title: 'CSV Import Completed',
        message: `Successfully imported ${holdingsToImport.length} holdings into portfolio (${importMode === 'overwrite' ? 'Replaced' : 'Merged'})`,
        type: 'success'
      });

      onClose();
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

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

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        className="relative w-full max-w-3xl bg-[#0F1626] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col my-8 max-h-[92vh]"
      >
        {/* Top Accent Strip */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-400" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#111827]/80">
          <div>
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              <span>Import Portfolio via CSV</span>
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Step {step} of 4 • {
                step === 1 ? 'Upload & Broker Format' : 
                step === 2 ? 'Column Mapping' : 
                step === 3 ? 'Data Verification Preview' : 
                'Final Confirmation'
              }
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-2 bg-[#0B0F17]/50 border-b border-white/[0.04] flex items-center justify-between text-xs font-mono">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}`}>
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">1</span>
            <span>Upload</span>
          </div>
          <span className="text-gray-700">──</span>
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}`}>
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
            <span>Mapping</span>
          </div>
          <span className="text-gray-700">──</span>
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}`}>
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">3</span>
            <span>Preview</span>
          </div>
          <span className="text-gray-700">──</span>
          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}`}>
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">4</span>
            <span>Import</span>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: UPLOAD & FORMAT SELECTION */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Format Selector */}
                <div>
                  <label className="text-xs font-mono text-gray-300 mb-2 block uppercase tracking-wider">
                    Select CSV Format Source
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'zerodha', label: 'Zerodha Kite', desc: 'Holdings export from Kite Web / App' },
                      { id: 'groww', label: 'Groww', desc: 'Portfolio investments CSV export' },
                      { id: 'generic', label: 'Generic / Custom', desc: 'Standard CSV with customizable columns' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setBrokerFormat(fmt.id as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          brokerFormat === fmt.id
                            ? 'bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-gray-100'
                            : 'bg-gray-800/40 border-white/[0.06] text-gray-400 hover:bg-gray-800/80 hover:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-gray-100">{fmt.label}</span>
                          {brokerFormat === fmt.id && (
                            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-normal">{fmt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drag & Drop Zone */}
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
                      isDragging
                        ? 'border-cyan-400 bg-cyan-500/10'
                        : csvContent
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/[0.1] bg-gray-900/40 hover:border-cyan-500/40 hover:bg-gray-900/70'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileRead(e.target.files[0]);
                        }
                      }}
                    />

                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                      {csvContent ? (
                        <FileCheck className="w-7 h-7 text-emerald-400" />
                      ) : (
                        <UploadCloud className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-200">
                        {fileName ? fileName : 'Drop your CSV file here, or browse'}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports UTF-8 CSV exports up to 10MB
                      </p>
                    </div>

                    {csvContent && (
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {previewRows.length} rows detected
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Test with Sample Template */}
                <div className="p-4 rounded-xl bg-gray-900/50 border border-white/[0.06] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-gray-200">
                        Don't have a CSV file handy?
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Load an authentic sample portfolio to test the import workflow instantly.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSample('zerodha')}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-cyan-300 font-mono border border-cyan-500/30 transition-colors"
                    >
                      Zerodha Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample('groww')}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-purple-300 font-mono border border-purple-500/30 transition-colors"
                    >
                      Groww Sample
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: COLUMN MAPPING (for Generic) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200">
                  Portfolio Manager automatically detected columns from your file. Verify or match the header labels below:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                      Symbol / Ticker Column *
                    </label>
                    <select
                      value={columnMapping.symbol}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, symbol: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-white/[0.1] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    >
                      {detectedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                      Asset / Company Name Column
                    </label>
                    <select
                      value={columnMapping.name}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-white/[0.1] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    >
                      <option value="">-- Same as Symbol --</option>
                      {detectedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                      Quantity / Units Column *
                    </label>
                    <select
                      value={columnMapping.quantity}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-white/[0.1] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    >
                      {detectedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                      Average / Buy Price Column *
                    </label>
                    <select
                      value={columnMapping.averagePrice}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, averagePrice: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-white/[0.1] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    >
                      {detectedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                      Asset Type Column (Optional)
                    </label>
                    <select
                      value={columnMapping.assetType}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, assetType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-white/[0.1] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    >
                      <option value="">-- Default (Stock) --</option>
                      {detectedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-300 mb-1.5 block">
                      Purchase Date Column (Optional)
                    </label>
                    <select
                      value={columnMapping.purchaseDate}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-white/[0.1] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    >
                      <option value="">-- Default (Today) --</option>
                      {detectedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PREVIEW TABLE */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* Stats Header Bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-gray-800/50 border border-white/[0.06] text-center">
                    <span className="text-[10px] font-mono text-gray-400 uppercase block">Total Rows</span>
                    <span className="text-lg font-bold font-mono text-gray-100">{previewRows.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase block">Ready to Import</span>
                    <span className="text-lg font-bold font-mono text-emerald-300">{validRows.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-[10px] font-mono text-red-400 uppercase block">Validation Errors</span>
                    <span className="text-lg font-bold font-mono text-red-300">{errorRows.length}</span>
                  </div>
                </div>

                {/* Filter toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        previewFilter === 'all'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      All Rows ({previewRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('valid')}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        previewFilter === 'valid'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Valid Only ({validRows.length})
                    </button>
                    {errorRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('errors')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                          previewFilter === 'errors'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'text-red-400 hover:text-red-300'
                        }`}
                      >
                        Errors Only ({errorRows.length})
                      </button>
                    )}
                  </div>

                  {duplicateRows.length > 0 && (
                    <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {duplicateRows.length} potential duplicate(s)
                    </span>
                  )}
                </div>

                {/* Preview Table */}
                <div className="border border-white/[0.08] rounded-xl overflow-hidden glass-card max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#151C2B] text-gray-400 font-mono uppercase text-[10px] sticky top-0 border-b border-white/[0.08]">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Avg Price</th>
                        <th className="py-2.5 px-3">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {displayedRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={r.isValid ? 'hover:bg-white/[0.02]' : 'bg-red-500/10 text-red-200'}
                        >
                          <td className="py-2 px-3">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-mono font-bold">
                                  <AlertCircle className="w-3.5 h-3.5" /> Error
                                </span>
                                <div className="text-[10px] text-red-300">
                                  {r.errors.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold">
                            {r.parsedHolding?.symbol || '-'}
                          </td>
                          <td className="py-2 px-3 truncate max-w-[140px]">
                            {r.parsedHolding?.name || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {r.parsedHolding?.quantity?.toLocaleString('en-IN') || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {r.parsedHolding?.averagePrice ? formatCurrency(r.parsedHolding.averagePrice) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] uppercase text-gray-400">
                            {r.parsedHolding?.assetType || 'stock'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* STEP 4: CONFIRMATION & OVERWRITE SAFEGUARDS */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Summary Card */}
                <div className="glass-card p-5 rounded-2xl border-white/[0.08] space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Ready to Execute Ingestion
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3.5 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Holdings to Add</span>
                      <span className="text-xl font-black text-gray-100">{validRows.length} assets</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Source Broker Format</span>
                      <span className="text-xl font-black text-cyan-400 uppercase">{brokerFormat}</span>
                    </div>
                  </div>
                </div>

                {/* Ingestion Strategy Options */}
                <div className="space-y-3">
                  <label className="text-xs font-mono text-gray-300 uppercase tracking-wider block">
                    Select Ingestion Strategy
                  </label>

                  <div className="space-y-2">
                    <label
                      onClick={() => setImportMode('merge')}
                      className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        importMode === 'merge'
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-gray-100'
                          : 'bg-gray-800/40 border-white/[0.06] text-gray-400 hover:bg-gray-800/70'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="mt-1 text-cyan-500 focus:ring-cyan-500"
                      />
                      <div>
                        <div className="font-semibold text-xs text-gray-200">
                          Merge with Existing Portfolio (Recommended)
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Appends imported assets into your current holdings without deleting existing investments.
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setImportMode('overwrite')}
                      className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        importMode === 'overwrite'
                          ? 'bg-red-500/10 border-red-500/50 text-red-200'
                          : 'bg-gray-800/40 border-white/[0.06] text-gray-400 hover:bg-gray-800/70'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="mt-1 text-red-500 focus:ring-red-500"
                      />
                      <div>
                        <div className="font-semibold text-xs text-red-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          Replace All Existing Holdings (Danger)
                        </div>
                        <div className="text-[11px] text-red-300/70 mt-0.5">
                          Completely wipes existing portfolio and replaces it with these {validRows.length} imported holdings.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Overwrite Safeguard Checkbox */}
                  {importMode === 'overwrite' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 space-y-2"
                    >
                      <label className="flex items-center gap-2.5 text-xs text-red-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmOverwrite}
                          onChange={(e) => setConfirmOverwrite(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                        />
                        <span className="font-bold">
                          I explicitly confirm that I want to replace my entire current portfolio.
                        </span>
                      </label>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
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
            {step < 4 ? (
              <button
                type="button"
                disabled={!csvContent || validRows.length === 0}
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isImporting || (importMode === 'overwrite' && !confirmOverwrite) || validRows.length === 0}
                onClick={handleExecuteImport}
                className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-1.5 transition-all ${
                  importMode === 'overwrite'
                    ? 'bg-red-600 hover:bg-red-500 text-white disabled:opacity-40'
                    : 'bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black disabled:opacity-40'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing Assets...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Import {validRows.length} Holdings</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CSVImportModal;
