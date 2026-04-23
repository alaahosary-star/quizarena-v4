'use client';

import { useState } from 'react';
import { formatTime } from '@/lib/utils';

interface TimePickerProps {
  value: number; // seconds
  onChange: (seconds: number) => void;
  label?: string;
  presets?: number[];
  min?: number;
  max?: number;
}

const DEFAULT_PRESETS = [10, 20, 30, 40, 50, 60];

export function TimePicker({
  value,
  onChange,
  label = 'مدة السؤال',
  presets = DEFAULT_PRESETS,
  min = 5,
  max = 300,
}: TimePickerProps) {
  const [customMode, setCustomMode] = useState(!presets.includes(value));
  const [customInput, setCustomInput] = useState<string>(
    presets.includes(value) ? '' : String(value)
  );

  const handlePreset = (sec: number) => {
    setCustomMode(false);
    setCustomInput('');
    onChange(sec);
  };

  const handleCustomChange = (raw: string) => {
    // قبول الأرقام فقط
    const digits = raw.replace(/[^0-9]/g, '');
    setCustomInput(digits);
    if (digits) {
      const n = parseInt(digits, 10);
      if (!isNaN(n) && n >= min && n <= max) {
        onChange(n);
      }
    }
  };

  const isPresetActive = (sec: number) => !customMode && value === sec;

  return (
    <div>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--muted)',
            marginBottom: 10,
            fontFamily: 'var(--font-cairo)',
          }}
        >
          ⏱️ {label}
        </label>
      )}

      {/* Presets Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
          gap: 8,
          marginBottom: 10,
        }}
      >
        {presets.map((sec) => {
          const active = isPresetActive(sec);
          return (
            <button
              key={sec}
              type="button"
              onClick={() => handlePreset(sec)}
              style={{
                padding: '12px 8px',
                borderRadius: 12,
                border: active
                  ? '2px solid var(--pink)'
                  : '1px solid var(--border)',
                background: active
                  ? 'linear-gradient(135deg, rgba(255,51,102,.2), rgba(124,77,255,.15))'
                  : 'var(--bg-2)',
                color: active ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'var(--font-cairo)',
                fontWeight: 900,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all .2s',
                boxShadow: active ? '0 4px 14px rgba(255,51,102,.25)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: 18,
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                {sec}
              </span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>ثانية</span>
            </button>
          );
        })}

        {/* زر مخصص */}
        <button
          type="button"
          onClick={() => {
            setCustomMode(true);
            setCustomInput(String(value));
          }}
          style={{
            padding: '12px 8px',
            borderRadius: 12,
            border: customMode
              ? '2px solid var(--yellow)'
              : '1px solid var(--border)',
            background: customMode
              ? 'linear-gradient(135deg, rgba(255,215,0,.2), rgba(255,143,0,.15))'
              : 'var(--bg-2)',
            color: customMode ? 'var(--text)' : 'var(--muted)',
            fontFamily: 'var(--font-cairo)',
            fontWeight: 900,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all .2s',
            display: 'grid',
            placeItems: 'center',
            lineHeight: 1.2,
          }}
        >
          <span style={{ fontSize: 16 }}>✎</span>
          <span style={{ fontSize: 10 }}>مخصص</span>
        </button>
      </div>

      {/* Custom Input */}
      {customMode && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '6px 14px',
            animation: 'fadeIn .2s ease',
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            value={customInput}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="مثال: 45"
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--text)',
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: 18,
              fontWeight: 700,
              padding: '8px 0',
              width: 80,
              outline: 'none',
              textAlign: 'center',
            }}
            dir="ltr"
          />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>ثانية</span>
          <span
            style={{
              marginInlineStart: 'auto',
              fontSize: 12,
              color: 'var(--muted)',
            }}
          >
            من {min} إلى {max}
          </span>
        </div>
      )}

      {/* Summary */}
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ color: 'var(--green)' }}>●</span>
        الوقت الحالي:{' '}
        <strong
          style={{
            color: 'var(--text)',
            fontFamily: 'var(--font-space-grotesk)',
            fontWeight: 700,
          }}
        >
          {formatTime(value)}
        </strong>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
