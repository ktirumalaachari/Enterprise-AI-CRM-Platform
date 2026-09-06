import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 select-none flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
      )}

      {/* Select Box Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 text-xs rounded-xl border flex items-center justify-between transition-all outline-none select-none cursor-pointer ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-zinc-900 shadow-md'
            : 'border-slate-200 dark:border-zinc-700/80 bg-slate-50/70 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800/80'
        } text-slate-900 dark:text-white`}
      >
        <span className={`truncate font-medium ${!selectedOption ? 'text-slate-400 dark:text-zinc-500' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Options Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-[9999] bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden max-h-60 flex flex-col"
          >
            {/* Search filter if more than 5 options */}
            {options.length > 5 && (
              <div className="p-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-48 scrollbar-hide">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/80 dark:border-blue-800/80'
                          : 'hover:bg-slate-100/90 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-100 font-medium'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-400 truncate font-normal">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
