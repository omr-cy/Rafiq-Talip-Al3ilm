import React, { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ar } from "date-fns/locale";
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value) : new Date(),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Get day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const handleDateSelect = (date: Date) => {
    // Preserve time if editing existing date
    if (selectedDate) {
      date.setHours(selectedDate.getHours());
      date.setMinutes(selectedDate.getMinutes());
    } else {
      date.setHours(12, 0, 0, 0); // Default to noon
    }
    // Adjust for local timezone offset to avoid UTC date shift
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
    onChange(localISOTime);
  };

  const handleTimeChange = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setHours(hours, minutes, 0, 0);
    
    const offset = newDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(newDate.getTime() - offset)
      .toISOString()
      .slice(0, 16);
    onChange(localISOTime);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 bg-card border border-olive-200 rounded-xl text-sm font-medium text-olive-900 hover:bg-olive-50 transition-colors focus:outline-none focus:ring-2 focus:ring-olive-200",
          className,
        )}
      >
        <CalendarIcon className="w-4 h-4 text-olive-500" />
        {selectedDate
          ? format(selectedDate, "dd MMMM yyyy - hh:mm a", { locale: ar })
          : "اختر التاريخ والوقت"}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] md:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Popover / Modal */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:top-full md:left-auto md:-translate-x-0 md:-translate-y-0 md:mt-2 md:right-0 z-[101] md:z-50 bg-card rounded-3xl md:rounded-2xl shadow-2xl md:shadow-xl border border-olive-100 p-5 md:p-4 w-[90vw] max-w-[320px] md:w-72"
              dir="rtl"
            >
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 hover:bg-olive-50 rounded-full text-olive-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-olive-900">
                {format(currentMonth, "MMMM yyyy", { locale: ar })}
              </h3>
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 hover:bg-olive-50 rounded-full text-olive-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map((day) => (
                <div
                  key={day}
                  className="text-xs font-bold text-olive-400 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}
              {days.map((date) => {
                const isSelected =
                  selectedDate && isSameDay(date, selectedDate);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all",
                      !isCurrentMonth && "text-gray-300",
                      isSelected &&
                        "bg-olive-900 text-white font-bold shadow-md scale-110",
                      !isSelected &&
                        isTodayDate &&
                        "bg-olive-100 text-olive-900 font-bold",
                      !isSelected &&
                        !isTodayDate &&
                        isCurrentMonth &&
                        "text-olive-700 hover:bg-olive-50",
                    )}
                  >
                    {format(date, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-olive-100">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-olive-700">الوقت:</label>
                <input
                  type="time"
                  value={selectedDate ? format(selectedDate, "HH:mm") : "12:00"}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="px-3 py-1.5 bg-olive-50 border border-olive-200 rounded-lg text-sm font-bold text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-200 text-center"
                  dir="ltr"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const offset = d.getTimezoneOffset() * 60000;
                      onChange(
                        new Date(d.getTime() - offset).toISOString().slice(0, 16),
                      );
                    }}
                    className="text-xs font-bold text-olive-600 hover:text-olive-900 transition-colors px-2 py-1 rounded-md hover:bg-olive-50"
                  >
                    الآن
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                  >
                    مسح
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-white bg-olive-800 hover:bg-olive-900 transition-colors px-4 py-1.5 rounded-lg"
                >
                  تم
                </button>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
