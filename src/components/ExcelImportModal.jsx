import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { downloadExcelTemplate, parseExcelFile } from '../services/excelService.js';
import { DEFAULT_USD_COP_RATE } from '../data/mockData.js';

export const ExcelImportModal = ({
  isOpen,
  onClose,
  onImportData,
  activeCurrency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
}) => {
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [importMode, setImportMode] = useState('replace'); // 'replace' or 'merge'
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setError('');
    setFile(selectedFile);
    setIsParsing(true);

    try {
      const data = await parseExcelFile(selectedFile, exchangeRate);
      setParsedData(data);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo Excel');
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = () => {
    if (!parsedData) return;
    onImportData(parsedData, importMode);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-[#14121E]/95 backdrop-blur-2xl border border-purple-500/35 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.2)] relative overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-emerald-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-purple-600/20 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Importar Datos desde Excel (.xlsx)
              </h3>
              <p className="text-xs text-zinc-400">
                Carga masiva de cuentas, movimientos, gastos fijos y deudas en USD / COP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Currency conversion pill notice */}
        <div className="mt-4 p-3 rounded-2xl bg-purple-900/25 border border-purple-400/30 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-fuchsia-400 shrink-0" />
            <span>
              Tasa de Cambio Base:{' '}
              <strong className="text-white">1 USD = ${exchangeRate.toLocaleString('es-CO')} COP</strong>
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
            Doble Divisa
          </span>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Download Template */}
        <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-bold text-white">¿No tienes la estructura de Excel?</p>
            <p className="text-zinc-400 text-[11px] mt-0.5">
              Descarga nuestra plantilla oficial con las 4 pestañas y columnas listas para llenar.
            </p>
          </div>
          <button
            onClick={downloadExcelTemplate}
            className="liquid-pill px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-white border-emerald-500/40 hover:bg-emerald-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Plantilla (.xlsx)</span>
          </button>
        </div>

        {/* Step 2: Drag and drop or file upload */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 border-2 border-dashed border-white/15 hover:border-purple-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-black/30 hover:bg-purple-950/20"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 mx-auto">
              {isParsing ? (
                <RefreshCw className="w-6 h-6 animate-spin text-fuchsia-400" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {file ? file.name : 'Arrastra tu archivo Excel aquí o haz clic para seleccionar'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Formatos compatibles: Microsoft Excel (.xlsx, .xls)
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Parsed Summary Preview */}
        {parsedData && (
          <div className="mt-4 space-y-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Registros detectados y listos para importar:
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="liquid-pill p-2">
                <span className="text-[10px] text-zinc-400 block">Cuentas</span>
                <span className="font-bold text-white text-base">
                  {parsedData.summary.accountsCount}
                </span>
              </div>
              <div className="liquid-pill p-2">
                <span className="text-[10px] text-zinc-400 block">Movimientos</span>
                <span className="font-bold text-purple-300 text-base">
                  {parsedData.summary.transactionsCount}
                </span>
              </div>
              <div className="liquid-pill p-2">
                <span className="text-[10px] text-zinc-400 block">Suscripciones</span>
                <span className="font-bold text-fuchsia-300 text-base">
                  {parsedData.summary.subscriptionsCount}
                </span>
              </div>
              <div className="liquid-pill p-2">
                <span className="text-[10px] text-zinc-400 block">Deudas</span>
                <span className="font-bold text-rose-300 text-base">
                  {parsedData.summary.debtsCount}
                </span>
              </div>
            </div>

            {/* Mode selection: Replace vs Merge */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-zinc-400">Modo de Importación:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                    importMode === 'replace'
                      ? 'bg-purple-600/40 text-purple-200 border border-purple-400/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Reemplazar Todo
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                    importMode === 'merge'
                      ? 'bg-purple-600/40 text-purple-200 border border-purple-400/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Anexar / Combinar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="liquid-pill px-4 py-2.5 text-xs text-zinc-400 hover:text-white font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!parsedData || isParsing}
            onClick={handleConfirm}
            className={`liquid-button-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer ${
              !parsedData || isParsing ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <span>Confirmar e Importar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
