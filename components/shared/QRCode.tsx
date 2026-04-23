'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
}

/**
 * مولّد QR — يعرض رابط الانضمام للجلسة
 * يُعرض داخل بطاقة بيضاء بحواف ناعمة
 */
export function QRCode({ value, size = 180 }: QRCodeProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#fff',
        borderRadius: 16,
        padding: 14,
        margin: '16px auto',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <QRCodeSVG value={value} size={size - 28} level="M" bgColor="#fff" fgColor="#0B0B1E" />
    </div>
  );
}
