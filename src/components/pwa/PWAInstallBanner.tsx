import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X, Share, PlusSquare, Zap } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install, dismiss } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!isInstallable || isInstalled) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-950 via-gray-900 to-[#0A1020] border border-cyan-500/40 shadow-2xl shadow-cyan-950/80 backdrop-blur-xl text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white tracking-wide">
                      Install Mobile App
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      PWA
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    Access your portfolio with full offline support & instant launch from home screen.
                  </p>
                </div>
              </div>

              <button
                onClick={dismiss}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 flex items-center justify-end gap-2 pt-2 border-t border-gray-800/80">
              <button
                onClick={dismiss}
                className="px-3 py-1.5 rounded-xl text-xs font-mono text-gray-400 hover:text-white transition-colors"
              >
                Not Now
              </button>

              {isIOS ? (
                <button
                  onClick={() => setShowIOSModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
                >
                  <Share className="w-3.5 h-3.5" />
                  <span>How to Install</span>
                </button>
              ) : (
                <button
                  onClick={install}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-sm w-full p-6 rounded-3xl bg-gray-900 border border-cyan-500/40 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-sm">Install on iPhone / iPad</h3>
                </div>
                <button onClick={() => setShowIOSModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-gray-300 font-mono">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    1
                  </span>
                  <span>Tap the <b>Share</b> button <Share className="inline w-3.5 h-3.5 text-cyan-400 ml-1" /> in Safari's bottom toolbar.</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    2
                  </span>
                  <span>Scroll down and select <b>Add to Home Screen</b> <PlusSquare className="inline w-3.5 h-3.5 text-cyan-400 ml-1" />.</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    3
                  </span>
                  <span>Tap <b>Add</b> top-right. Portfolio Manager is now on your home screen!</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowIOSModal(false);
                  dismiss();
                }}
                className="w-full mt-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
