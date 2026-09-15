"use client";

import { useRef, useState, useEffect, InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (v: string) => void;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "").slice(0, 6); // максимум 6 цифр: ММ СС СС (сотые)
}

/** Собирает "мм:сс.д" из последовательности цифр справа налево: последние
 *  2 цифры — сотые, следующие 2 — секунды, остальное — минуты. Так же
 *  работает ввод суммы в рублях/копейках — вводишь только цифры. */
function formatFromDigits(digits: string): string {
  if (!digits) return "";
  const padded = digits.padStart(3, "0");
  const cc = padded.slice(-2);
  const rest = padded.slice(0, -2);
  const ss = rest.slice(-2).padStart(2, "0");
  const mmRaw = rest.slice(0, -2);
  const mm = mmRaw ? String(parseInt(mmRaw, 10)) : "0";
  return `${mm}:${ss}.${cc}`;
}

/** Маска для ввода времени в формате мм:сс.д — судья набирает только
 *  цифры (например "23580"), разделители ":" и "." подставляются сами.
 *  Убирает неудобство ручного набора мм:сс,мс на протоколах бега. */
export default function TimeMaskInput({ value, onChange, ...rest }: Props) {
  const [digits, setDigits] = useState(() => digitsOnly(value));
  // Что мы сами последний раз отдали наружу — чтобы отличить "родитель
  // просто эхом вернул то, что мы прислали" от реального внешнего сброса
  // значения (например открыли редактирование другого результата).
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDigits(digitsOnly(value));
      lastEmitted.current = value;
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextDigits = digitsOnly(e.target.value);
    const formatted = formatFromDigits(nextDigits);
    setDigits(nextDigits);
    lastEmitted.current = formatted;
    onChange(formatted);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatFromDigits(digits)}
      onChange={handleChange}
      {...rest}
    />
  );
}
