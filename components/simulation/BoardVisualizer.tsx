'use client';
import { useMemo } from 'react';
import type { Board } from '@/types';

interface BoardVisualizerProps {
  board: Board;
  pinStates: Record<number, number>; // digital HIGH/LOW
  analogStates?: Record<number, number>; // analog 0-1023
  simRunning: boolean;
  simMillis: number;
}

export default function BoardVisualizer({
  board,
  pinStates,
  analogStates = {},
  simRunning,
  simMillis,
}: BoardVisualizerProps) {
  const renderer = BOARD_RENDERERS[board.id] ?? BOARD_RENDERERS['arduino-mega'];
  return renderer({ board, pinStates, analogStates, simRunning, simMillis });
}

// ── Shared helpers ────────────────────────────────────────────────
function isHigh(pin: number, pinStates: Record<number, number>) {
  return (pinStates[pin] ?? 0) === 1;
}

function ledColor(on: boolean, color = '#22c55e') {
  return on ? color : '#1f2937';
}

function ledGlow(on: boolean, color = '#22c55e') {
  return on ? `drop-shadow(0 0 3px ${color})` : 'none';
}

// ── Pin label positioning helpers ─────────────────────────────────
interface PinDot {
  pin: number;
  x: number;
  y: number;
  label: string;
  side: 'top' | 'bottom' | 'left' | 'right';
}

function PinIndicator({
  dot,
  high,
  color = '#22c55e',
}: {
  dot: PinDot;
  high: boolean;
  color?: string;
}) {
  const r = 4;
  return (
    <g key={dot.pin}>
      <circle
        cx={dot.x}
        cy={dot.y}
        r={r}
        fill={high ? color : 'transparent'}
        stroke={high ? color : '#374151'}
        strokeWidth={1.5}
        style={{ filter: high ? `drop-shadow(0 0 3px ${color})` : 'none' }}
      />
      <title>
        Pin {dot.label}: {high ? 'HIGH' : 'LOW'}
      </title>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────
// ARDUINO MEGA 2560
// ─────────────────────────────────────────────────────────────────
function MegaBoard({
  board,
  pinStates,
  simRunning,
  simMillis,
}: BoardVisualizerProps) {
  const ledOn = isHigh(13, pinStates);
  const txOn = isHigh(1, pinStates);
  const rxOn = isHigh(0, pinStates);
  const pwrOn = simRunning;

  // Digital pins along the top (D0-D53)
  const topPins: PinDot[] = useMemo(() => {
    const pins: PinDot[] = [];
    // Top row: D0–D13 (right side, digital)
    for (let i = 0; i <= 13; i++) {
      pins.push({
        pin: i,
        x: 420 - i * 14,
        y: 22,
        label: `D${i}`,
        side: 'top',
      });
    }
    // Top row continued: D14–D21 (TX/RX pairs + I2C)
    for (let i = 14; i <= 21; i++) {
      pins.push({
        pin: i,
        x: 420 - i * 14,
        y: 22,
        label: `D${i}`,
        side: 'top',
      });
    }
    return pins;
  }, []);

  const analogPinDots: PinDot[] = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      pin: 54 + i,
      x: 40 + i * 14,
      y: 210,
      label: `A${i}`,
      side: 'bottom' as const,
    }));
  }, []);

  return (
    <svg
      viewBox="0 0 560 240"
      className="w-full h-full"
      style={{ userSelect: 'none' }}
    >
      {/* PCB body */}
      <rect
        x="20"
        y="10"
        width="520"
        height="220"
        rx="8"
        ry="8"
        fill="#1a5276"
        stroke="#1e6091"
        strokeWidth="2"
      />

      {/* Inner PCB area */}
      <rect
        x="28"
        y="18"
        width="504"
        height="204"
        rx="5"
        ry="5"
        fill="#154360"
        stroke="#1f618d"
        strokeWidth="1"
      />

      {/* Silk screen text */}
      <text
        x="200"
        y="130"
        fontFamily="monospace"
        fontSize="22"
        fontWeight="bold"
        fill="#2e86c1"
        textAnchor="middle"
        opacity="0.6"
      >
        Arduino
      </text>
      <text
        x="350"
        y="130"
        fontFamily="monospace"
        fontSize="22"
        fontWeight="bold"
        fill="#2e86c1"
        textAnchor="middle"
        opacity="0.6"
      >
        MEGA
      </text>

      {/* MCU chip */}
      <rect
        x="200"
        y="85"
        width="100"
        height="80"
        rx="3"
        fill="#0d1117"
        stroke="#374151"
        strokeWidth="1.5"
      />
      <text
        x="250"
        y="127"
        fontFamily="monospace"
        fontSize="7"
        fill="#6b7280"
        textAnchor="middle"
      >
        ATmega2560
      </text>
      <text
        x="250"
        y="137"
        fontFamily="monospace"
        fontSize="6"
        fill="#4b5563"
        textAnchor="middle"
      >
        MEGA 2560
      </text>
      {/* Chip legs */}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <rect
            x={198 - 4}
            y={91 + i * 9}
            width={4}
            height={3}
            fill="#9ca3af"
          />
          <rect x={302} y={91 + i * 9} width={4} height={3} fill="#9ca3af" />
        </g>
      ))}

      {/* Crystal */}
      <rect
        x="318"
        y="105"
        width="16"
        height="28"
        rx="2"
        fill="#d4a017"
        stroke="#b7860b"
        strokeWidth="1"
      />
      <text
        x="326"
        y="122"
        fontFamily="monospace"
        fontSize="5"
        fill="#1a1a1a"
        textAnchor="middle"
      >
        16MHz
      </text>

      {/* USB connector */}
      <rect
        x="22"
        y="80"
        width="28"
        height="45"
        rx="3"
        fill="#6b7280"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <rect x="26" y="85" width="20" height="35" rx="2" fill="#374151" />
      <text
        x="36"
        y="145"
        fontFamily="monospace"
        fontSize="6"
        fill="#9ca3af"
        textAnchor="middle"
      >
        USB
      </text>

      {/* Power barrel */}
      <ellipse
        cx="36"
        cy="190"
        rx="14"
        ry="14"
        fill="#374151"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <ellipse cx="36" cy="190" rx="7" ry="7" fill="#1f2937" />
      <ellipse cx="36" cy="190" rx="3" ry="3" fill="#6b7280" />
      <text
        x="36"
        y="213"
        fontFamily="monospace"
        fontSize="6"
        fill="#9ca3af"
        textAnchor="middle"
      >
        PWR
      </text>

      {/* Voltage regulator */}
      <rect
        x="70"
        y="165"
        width="18"
        height="28"
        rx="1"
        fill="#374151"
        stroke="#4b5563"
        strokeWidth="1"
      />
      <text
        x="79"
        y="206"
        fontFamily="monospace"
        fontSize="5.5"
        fill="#6b7280"
        textAnchor="middle"
      >
        REG
      </text>

      {/* ── Top pin headers (D0–D13) ─────────────────────── */}
      <rect x="305" y="12" width="210" height="12" rx="2" fill="#111827" />
      <text
        x="410"
        y="9"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        DIGITAL PWM
      </text>
      {Array.from({ length: 15 }, (_, i) => {
        const pin = 13 - i;
        const x = 508 - i * 14;
        const high = isHigh(pin, pinStates);
        const isPwm = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(pin);
        return (
          <g key={pin}>
            <rect
              x={x - 3}
              y={14}
              width={6}
              height={10}
              rx={1}
              fill={high ? '#22c55e' : '#1f2937'}
              stroke="#374151"
              strokeWidth={0.5}
            />
            <text
              x={x}
              y={11}
              fontFamily="monospace"
              fontSize="5"
              fill="#4b5563"
              textAnchor="middle"
              transform={`rotate(-60, ${x}, 9)`}
            >
              {isPwm ? '~' : ''}
              {pin}
            </text>
            {high && (
              <circle
                cx={x}
                cy={13}
                r={2}
                fill="#22c55e"
                style={{ filter: 'drop-shadow(0 0 2px #22c55e)' }}
              />
            )}
          </g>
        );
      })}

      {/* D14–D21 (TX1/RX1/TX2/RX2/TX3/RX3/SDA/SCL) */}
      <rect x="100" y="12" width="120" height="12" rx="2" fill="#111827" />
      {Array.from({ length: 8 }, (_, i) => {
        const pin = 21 - i;
        const x = 210 - i * 14;
        const high = isHigh(pin, pinStates);
        const lbl =
          ['SCL', 'SDA', 'RX3', 'TX3', 'RX2', 'TX2', 'RX1', 'TX1'][i] ??
          `D${pin}`;
        return (
          <g key={pin}>
            <rect
              x={x - 3}
              y={14}
              width={6}
              height={10}
              rx={1}
              fill={high ? '#3b82f6' : '#1f2937'}
              stroke="#374151"
              strokeWidth={0.5}
            />
            <text
              x={x}
              y={11}
              fontFamily="monospace"
              fontSize="5"
              fill="#4b5563"
              textAnchor="middle"
              transform={`rotate(-60, ${x}, 9)`}
            >
              {lbl}
            </text>
          </g>
        );
      })}

      {/* ── Bottom pin headers (A0–A15) ─────────────────── */}
      <rect x="115" y="216" width="224" height="12" rx="2" fill="#111827" />
      <text
        x="225"
        y="235"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        ANALOG IN
      </text>
      {Array.from({ length: 16 }, (_, i) => {
        const pin = 54 + i;
        const x = 120 + i * 14;
        const high = isHigh(pin, pinStates);
        return (
          <g key={pin}>
            <rect
              x={x - 3}
              y={216}
              width={6}
              height={10}
              rx={1}
              fill={high ? '#a855f7' : '#1f2937'}
              stroke="#374151"
              strokeWidth={0.5}
            />
            <text
              x={x}
              y={235}
              fontFamily="monospace"
              fontSize="5"
              fill="#4b5563"
              textAnchor="middle"
            >
              A{i}
            </text>
          </g>
        );
      })}

      {/* ── Power header ─────────────────────────────────── */}
      <rect x="366" y="216" width="96" height="12" rx="2" fill="#111827" />
      <text
        x="414"
        y="235"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        POWER
      </text>
      {(['IOREF', 'RESET', '3V3', '5V', 'GND', 'GND', 'VIN'] as const).map(
        (lbl, i) => (
          <g key={lbl + i}>
            <rect
              x={369 + i * 13}
              y={216}
              width={10}
              height={10}
              rx={1}
              fill={
                lbl === '5V'
                  ? '#dc2626'
                  : lbl === 'GND'
                    ? '#000'
                    : lbl === '3V3'
                      ? '#f59e0b'
                      : '#374151'
              }
              stroke="#4b5563"
              strokeWidth={0.5}
            />
            <text
              x={374 + i * 13}
              y={235}
              fontFamily="monospace"
              fontSize="5"
              fill="#4b5563"
              textAnchor="middle"
            >
              {lbl}
            </text>
          </g>
        )
      )}

      {/* ── Status LEDs ─────────────────────────────────── */}
      {/* PWR LED */}
      <circle
        cx="110"
        cy="28"
        r="5"
        fill={pwrOn ? '#22c55e' : '#14532d'}
        stroke={pwrOn ? '#16a34a' : '#166534'}
        strokeWidth={1}
        style={{ filter: pwrOn ? 'drop-shadow(0 0 4px #22c55e)' : 'none' }}
      />
      <text
        x="110"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        PWR
      </text>

      {/* L (pin 13) LED */}
      <circle
        cx="128"
        cy="28"
        r="5"
        fill={ledOn ? '#f97316' : '#431407'}
        stroke={ledOn ? '#ea580c' : '#7c2d12'}
        strokeWidth={1}
        style={{ filter: ledOn ? 'drop-shadow(0 0 4px #f97316)' : 'none' }}
      />
      <text
        x="128"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        L
      </text>

      {/* TX LED */}
      <circle
        cx="146"
        cy="28"
        r="5"
        fill={txOn ? '#3b82f6' : '#1e3a5f'}
        stroke={txOn ? '#2563eb' : '#1e40af'}
        strokeWidth={1}
        style={{ filter: txOn ? 'drop-shadow(0 0 4px #3b82f6)' : 'none' }}
      />
      <text
        x="146"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        TX
      </text>

      {/* RX LED */}
      <circle
        cx="164"
        cy="28"
        r="5"
        fill={rxOn ? '#3b82f6' : '#1e3a5f'}
        stroke={rxOn ? '#2563eb' : '#1e40af'}
        strokeWidth={1}
        style={{ filter: rxOn ? 'drop-shadow(0 0 4px #3b82f6)' : 'none' }}
      />
      <text
        x="164"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        RX
      </text>

      {/* Reset button */}
      <rect
        x="470"
        y="190"
        width="28"
        height="20"
        rx="4"
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1}
      />
      <rect
        x="478"
        y="195"
        width="12"
        height="10"
        rx="2"
        fill="#ef4444"
        stroke="#dc2626"
        strokeWidth={1}
      />
      <text
        x="484"
        y="218"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        RESET
      </text>

      {/* ICSP header */}
      <rect
        x="456"
        y="30"
        width="30"
        height="20"
        rx="2"
        fill="#111827"
        stroke="#374151"
        strokeWidth={1}
      />
      <text
        x="471"
        y="26"
        fontFamily="monospace"
        fontSize="5.5"
        fill="#4b5563"
        textAnchor="middle"
      >
        ICSP
      </text>
      {Array.from({ length: 6 }, (_, i) => (
        <circle
          key={i}
          cx={460 + (i % 3) * 10}
          cy={36 + Math.floor(i / 3) * 10}
          r={2.5}
          fill="#6b7280"
          stroke="#4b5563"
          strokeWidth={0.5}
        />
      ))}

      {/* Board label */}
      <text
        x="360"
        y="75"
        fontFamily="monospace"
        fontSize="9"
        fill="#1e6091"
        textAnchor="middle"
        opacity="0.8"
      >
        2560
      </text>

      {/* Sim status overlay */}
      {!simRunning && (
        <text
          x="280"
          y="175"
          fontFamily="monospace"
          fontSize="9"
          fill="#374151"
          textAnchor="middle"
          opacity="0.5"
        >
          ▶ Press Compile &amp; Run
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// ARDUINO UNO R3
// ─────────────────────────────────────────────────────────────────
function UnoBoard({ board, pinStates, simRunning }: BoardVisualizerProps) {
  const ledOn = isHigh(13, pinStates);
  const txOn = isHigh(1, pinStates);
  const rxOn = isHigh(0, pinStates);
  const pwrOn = simRunning;

  return (
    <svg
      viewBox="0 0 340 240"
      className="w-full h-full"
      style={{ userSelect: 'none' }}
    >
      {/* PCB */}
      <rect
        x="15"
        y="15"
        width="310"
        height="210"
        rx="8"
        fill="#1a5276"
        stroke="#1e6091"
        strokeWidth="2"
      />
      <rect
        x="22"
        y="22"
        width="296"
        height="196"
        rx="5"
        fill="#154360"
        stroke="#1f618d"
        strokeWidth="1"
      />

      {/* Board name */}
      <text
        x="165"
        y="130"
        fontFamily="monospace"
        fontSize="20"
        fontWeight="bold"
        fill="#2e86c1"
        textAnchor="middle"
        opacity="0.5"
      >
        UNO R3
      </text>

      {/* MCU */}
      <rect
        x="120"
        y="80"
        width="80"
        height="80"
        rx="3"
        fill="#0d1117"
        stroke="#374151"
        strokeWidth="1.5"
      />
      <text
        x="160"
        y="118"
        fontFamily="monospace"
        fontSize="7"
        fill="#6b7280"
        textAnchor="middle"
      >
        ATmega328P
      </text>
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <rect
            x={118 - 4}
            y={86 + i * 10}
            width={4}
            height={4}
            fill="#9ca3af"
          />
          <rect x={200} y={86 + i * 10} width={4} height={4} fill="#9ca3af" />
        </g>
      ))}

      {/* Crystal */}
      <rect
        x="205"
        y="105"
        width="14"
        height="24"
        rx="2"
        fill="#d4a017"
        stroke="#b7860b"
        strokeWidth="1"
      />

      {/* USB */}
      <rect
        x="17"
        y="75"
        width="26"
        height="40"
        rx="3"
        fill="#6b7280"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <rect x="21" y="80" width="18" height="30" rx="2" fill="#374151" />
      <text
        x="30"
        y="125"
        fontFamily="monospace"
        fontSize="6"
        fill="#9ca3af"
        textAnchor="middle"
      >
        USB
      </text>

      {/* Power barrel */}
      <ellipse
        cx="30"
        cy="185"
        rx="12"
        ry="12"
        fill="#374151"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <ellipse cx="30" cy="185" rx="6" ry="6" fill="#1f2937" />

      {/* Digital pins top row: D0–D13 */}
      <rect x="175" y="17" width="140" height="11" rx="2" fill="#111827" />
      <text
        x="245"
        y="14"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        DIGITAL (PWM~)
      </text>
      {Array.from({ length: 14 }, (_, i) => {
        const pin = 13 - i;
        const x = 308 - i * 10;
        const high = isHigh(pin, pinStates);
        const isPwm = [3, 5, 6, 9, 10, 11].includes(pin);
        return (
          <g key={pin}>
            <rect
              x={x - 3}
              y={18}
              width={6}
              height={9}
              rx={1}
              fill={high ? '#22c55e' : '#1f2937'}
              stroke="#374151"
              strokeWidth={0.5}
            />
            <text
              x={x}
              y={15}
              fontFamily="monospace"
              fontSize="5"
              fill="#4b5563"
              textAnchor="middle"
              transform={`rotate(-60, ${x}, 13)`}
            >
              {isPwm ? '~' : ''}
              {pin}
            </text>
            {high && (
              <circle
                cx={x}
                cy={17}
                r={2}
                fill="#22c55e"
                style={{ filter: 'drop-shadow(0 0 2px #22c55e)' }}
              />
            )}
          </g>
        );
      })}

      {/* Analog pins A0–A5 */}
      <rect x="175" y="212" width="70" height="11" rx="2" fill="#111827" />
      <text
        x="210"
        y="232"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        ANALOG IN
      </text>
      {Array.from({ length: 6 }, (_, i) => {
        const pin = 14 + i;
        const x = 180 + i * 11;
        const high = isHigh(pin, pinStates);
        return (
          <g key={pin}>
            <rect
              x={x - 3}
              y={212}
              width={6}
              height={9}
              rx={1}
              fill={high ? '#a855f7' : '#1f2937'}
              stroke="#374151"
              strokeWidth={0.5}
            />
            <text
              x={x}
              y={232}
              fontFamily="monospace"
              fontSize="5"
              fill="#4b5563"
              textAnchor="middle"
            >
              A{i}
            </text>
          </g>
        );
      })}

      {/* Power pins */}
      <rect x="80" y="212" width="84" height="11" rx="2" fill="#111827" />
      {(['IOREF', 'RST', '3V3', '5V', 'GND', 'GND', 'VIN'] as const).map(
        (lbl, i) => (
          <g key={lbl + i}>
            <rect
              x={82 + i * 11}
              y={212}
              width={9}
              height={9}
              rx={1}
              fill={
                lbl === '5V' ? '#dc2626' : lbl === 'GND' ? '#000' : '#374151'
              }
              stroke="#4b5563"
              strokeWidth={0.5}
            />
            <text
              x={86 + i * 11}
              y={232}
              fontFamily="monospace"
              fontSize="4.5"
              fill="#4b5563"
              textAnchor="middle"
            >
              {lbl}
            </text>
          </g>
        )
      )}

      {/* LEDs */}
      <circle
        cx="88"
        cy="28"
        r="5"
        fill={pwrOn ? '#22c55e' : '#14532d'}
        stroke={pwrOn ? '#16a34a' : '#166534'}
        strokeWidth={1}
        style={{ filter: pwrOn ? 'drop-shadow(0 0 4px #22c55e)' : 'none' }}
      />
      <text
        x="88"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        PWR
      </text>

      <circle
        cx="106"
        cy="28"
        r="5"
        fill={ledOn ? '#f97316' : '#431407'}
        stroke={ledOn ? '#ea580c' : '#7c2d12'}
        strokeWidth={1}
        style={{ filter: ledOn ? 'drop-shadow(0 0 4px #f97316)' : 'none' }}
      />
      <text
        x="106"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        L
      </text>

      <circle
        cx="124"
        cy="28"
        r="5"
        fill={txOn ? '#3b82f6' : '#1e3a5f'}
        stroke={txOn ? '#2563eb' : '#1e40af'}
        strokeWidth={1}
        style={{ filter: txOn ? 'drop-shadow(0 0 4px #3b82f6)' : 'none' }}
      />
      <text
        x="124"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        TX
      </text>

      <circle
        cx="142"
        cy="28"
        r="5"
        fill={rxOn ? '#3b82f6' : '#1e3a5f'}
        stroke={rxOn ? '#2563eb' : '#1e40af'}
        strokeWidth={1}
        style={{ filter: rxOn ? 'drop-shadow(0 0 4px #3b82f6)' : 'none' }}
      />
      <text
        x="142"
        y="42"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        RX
      </text>

      {/* Reset */}
      <rect
        x="265"
        y="190"
        width="24"
        height="16"
        rx="4"
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1}
      />
      <rect x="271" y="194" width="12" height="8" rx="2" fill="#ef4444" />
      <text
        x="277"
        y="215"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        RESET
      </text>

      {!simRunning && (
        <text
          x="170"
          y="175"
          fontFamily="monospace"
          fontSize="9"
          fill="#374151"
          textAnchor="middle"
          opacity="0.5"
        >
          ▶ Press Compile &amp; Run
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// ARDUINO NANO
// ─────────────────────────────────────────────────────────────────
function NanoBoard({ board, pinStates, simRunning }: BoardVisualizerProps) {
  const ledOn = isHigh(13, pinStates);
  const pwrOn = simRunning;

  // Nano is a narrow board — 2 rows of pins along sides
  const leftPins = [
    'TX',
    'RX',
    'RST',
    'GND',
    'D2',
    'D3',
    'D4',
    'D5',
    'D6',
    'D7',
    'D8',
    'D9',
    'D10',
    'D11',
    'D12',
    'D13',
    '3V3',
    'AREF',
    'A0',
    'A1',
    'A2',
    'A3',
    'A4',
    'A5',
  ];
  const rightPins = [
    'VIN',
    'GND',
    'RST',
    '5V',
    'A7',
    'A6',
    'A5',
    'A4',
    'A3',
    'A2',
    'A1',
    'A0',
    'AREF',
    '3V3',
    'D13',
    'D12',
    'D11',
    'D10',
    'D9',
    'D8',
    'D7',
    'D6',
    'D5',
    'D4',
  ];

  return (
    <svg
      viewBox="0 0 280 340"
      className="w-full h-full"
      style={{ userSelect: 'none' }}
    >
      {/* Board body (narrow) */}
      <rect
        x="70"
        y="10"
        width="140"
        height="320"
        rx="5"
        fill="#1a5276"
        stroke="#1e6091"
        strokeWidth="2"
      />
      <rect
        x="76"
        y="16"
        width="128"
        height="308"
        rx="4"
        fill="#154360"
        stroke="#1f618d"
        strokeWidth="1"
      />

      {/* Board name */}
      <text
        x="140"
        y="170"
        fontFamily="monospace"
        fontSize="14"
        fontWeight="bold"
        fill="#2e86c1"
        textAnchor="middle"
        opacity="0.5"
      >
        NANO
      </text>

      {/* Mini-USB */}
      <rect
        x="112"
        y="12"
        width="56"
        height="20"
        rx="3"
        fill="#6b7280"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <rect x="118" y="16" width="44" height="12" rx="2" fill="#374151" />
      <text
        x="140"
        y="38"
        fontFamily="monospace"
        fontSize="6"
        fill="#9ca3af"
        textAnchor="middle"
      >
        MINI-USB
      </text>

      {/* MCU */}
      <rect
        x="100"
        y="140"
        width="80"
        height="60"
        rx="3"
        fill="#0d1117"
        stroke="#374151"
        strokeWidth="1.5"
      />
      <text
        x="140"
        y="172"
        fontFamily="monospace"
        fontSize="6"
        fill="#6b7280"
        textAnchor="middle"
      >
        ATmega328P
      </text>

      {/* Left pin header */}
      {leftPins.slice(0, 15).map((lbl, i) => {
        const y = 55 + i * 17;
        const pin = lbl.startsWith('D')
          ? parseInt(lbl.slice(1))
          : lbl.startsWith('A')
            ? 14 + parseInt(lbl.slice(1))
            : -1;
        const high = pin >= 0 ? isHigh(pin, pinStates) : false;
        return (
          <g key={lbl + i}>
            <rect
              x={72}
              y={y - 4}
              width={8}
              height={8}
              rx={1}
              fill={high ? '#22c55e' : '#1f2937'}
              stroke="#374151"
              strokeWidth={0.5}
            />
            <text
              x={62}
              y={y + 3}
              fontFamily="monospace"
              fontSize="6"
              fill="#4b5563"
              textAnchor="end"
            >
              {lbl}
            </text>
          </g>
        );
      })}

      {/* Right pin header */}
      {rightPins.slice(0, 15).map((lbl, i) => {
        const y = 55 + i * 17;
        const pin = lbl.startsWith('D')
          ? parseInt(lbl.slice(1))
          : lbl.startsWith('A')
            ? 14 + parseInt(lbl.slice(1))
            : -1;
        const high = pin >= 0 ? isHigh(pin, pinStates) : false;
        return (
          <g key={lbl + i}>
            <rect
              x={200}
              y={y - 4}
              width={8}
              height={8}
              rx={1}
              fill={high ? '#22c55e' : '#1f2937'}
              stroke="#374151"
              strokeWidth={0.5}
            />
            <text
              x={212}
              y={y + 3}
              fontFamily="monospace"
              fontSize="6"
              fill="#4b5563"
            >
              {lbl}
            </text>
          </g>
        );
      })}

      {/* LEDs */}
      <circle
        cx="110"
        cy="52"
        r="4"
        fill={pwrOn ? '#22c55e' : '#14532d'}
        stroke="#166534"
        strokeWidth={1}
        style={{ filter: pwrOn ? 'drop-shadow(0 0 3px #22c55e)' : 'none' }}
      />
      <text
        x="110"
        y="62"
        fontFamily="monospace"
        fontSize="5"
        fill="#6b7280"
        textAnchor="middle"
      >
        PWR
      </text>
      <circle
        cx="126"
        cy="52"
        r="4"
        fill={ledOn ? '#f97316' : '#431407'}
        stroke="#7c2d12"
        strokeWidth={1}
        style={{ filter: ledOn ? 'drop-shadow(0 0 3px #f97316)' : 'none' }}
      />
      <text
        x="126"
        y="62"
        fontFamily="monospace"
        fontSize="5"
        fill="#6b7280"
        textAnchor="middle"
      >
        L
      </text>

      {!simRunning && (
        <text
          x="140"
          y="230"
          fontFamily="monospace"
          fontSize="8"
          fill="#374151"
          textAnchor="middle"
          opacity="0.5"
        >
          ▶ Run to see pins
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// ESP32 DevKit
// ─────────────────────────────────────────────────────────────────
function ESP32Board({ board, pinStates, simRunning }: BoardVisualizerProps) {
  const ledOn = isHigh(2, pinStates);
  const pwrOn = simRunning;

  const leftPins = [
    3,
    1,
    36,
    39,
    34,
    35,
    32,
    33,
    25,
    26,
    27,
    14,
    12,
    'GND',
    13,
    9,
    10,
    11,
  ];
  const rightPins = [
    '3V3',
    'GND',
    15,
    2,
    0,
    4,
    16,
    17,
    5,
    18,
    19,
    'GND',
    21,
    3,
    1,
    22,
    23,
    'GND',
  ];

  return (
    <svg
      viewBox="0 0 300 360"
      className="w-full h-full"
      style={{ userSelect: 'none' }}
    >
      {/* PCB */}
      <rect
        x="75"
        y="10"
        width="150"
        height="340"
        rx="5"
        fill="#1a1a2e"
        stroke="#16213e"
        strokeWidth="2"
      />
      <rect
        x="80"
        y="16"
        width="140"
        height="328"
        rx="4"
        fill="#0f0f23"
        stroke="#1a1a4e"
        strokeWidth="1"
      />

      {/* ESP32 module */}
      <rect
        x="90"
        y="120"
        width="120"
        height="80"
        rx="3"
        fill="#1a1a1a"
        stroke="#333"
        strokeWidth="1.5"
      />
      <rect x="95" y="125" width="110" height="30" rx="2" fill="#111" />
      <text
        x="150"
        y="143"
        fontFamily="monospace"
        fontSize="7"
        fill="#888"
        textAnchor="middle"
      >
        ESP32
      </text>
      <text
        x="150"
        y="153"
        fontFamily="monospace"
        fontSize="6"
        fill="#555"
        textAnchor="middle"
      >
        WROOM-32
      </text>
      {/* Antenna */}
      <rect
        x="120"
        y="105"
        width="60"
        height="16"
        rx="2"
        fill="#222"
        stroke="#333"
        strokeWidth={1}
      />
      <text
        x="150"
        y="116"
        fontFamily="monospace"
        fontSize="5.5"
        fill="#555"
        textAnchor="middle"
      >
        ANTENNA
      </text>

      {/* Board name */}
      <text
        x="150"
        y="230"
        fontFamily="monospace"
        fontSize="11"
        fontWeight="bold"
        fill="#1a1a4e"
        textAnchor="middle"
        opacity="0.6"
      >
        ESP32
      </text>
      <text
        x="150"
        y="243"
        fontFamily="monospace"
        fontSize="8"
        fill="#1a1a4e"
        textAnchor="middle"
        opacity="0.6"
      >
        DevKit v1
      </text>

      {/* USB */}
      <rect
        x="112"
        y="11"
        width="56"
        height="18"
        rx="3"
        fill="#6b7280"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <rect x="118" y="14" width="44" height="12" rx="2" fill="#374151" />

      {/* Left pins */}
      {leftPins.map((pin, i) => {
        const y = 50 + i * 16.5;
        const high = typeof pin === 'number' ? isHigh(pin, pinStates) : false;
        const lbl =
          typeof pin === 'number'
            ? pin < 32
              ? `GPIO${pin}`
              : `GPIO${pin}`
            : pin;
        return (
          <g key={String(pin) + i}>
            <rect
              x={77}
              y={y - 4}
              width={8}
              height={8}
              rx={1}
              fill={high ? '#22c55e' : '#1a1a1a'}
              stroke="#333"
              strokeWidth={0.5}
            />
            <text
              x={67}
              y={y + 3}
              fontFamily="monospace"
              fontSize="5.5"
              fill="#4b5563"
              textAnchor="end"
            >
              {lbl}
            </text>
          </g>
        );
      })}

      {/* Right pins */}
      {rightPins.map((pin, i) => {
        const y = 50 + i * 16.5;
        const high = typeof pin === 'number' ? isHigh(pin, pinStates) : false;
        const lbl = typeof pin === 'number' ? `GPIO${pin}` : pin;
        return (
          <g key={String(pin) + i + 'r'}>
            <rect
              x={215}
              y={y - 4}
              width={8}
              height={8}
              rx={1}
              fill={high ? '#22c55e' : '#1a1a1a'}
              stroke="#333"
              strokeWidth={0.5}
            />
            <text
              x={226}
              y={y + 3}
              fontFamily="monospace"
              fontSize="5.5"
              fill="#4b5563"
            >
              {lbl}
            </text>
          </g>
        );
      })}

      {/* LEDs */}
      <circle
        cx="100"
        cy="60"
        r="4"
        fill={pwrOn ? '#ef4444' : '#450a0a'}
        stroke="#7f1d1d"
        strokeWidth={1}
        style={{ filter: pwrOn ? 'drop-shadow(0 0 3px #ef4444)' : 'none' }}
      />
      <text
        x="100"
        y="70"
        fontFamily="monospace"
        fontSize="5"
        fill="#6b7280"
        textAnchor="middle"
      >
        PWR
      </text>
      <circle
        cx="115"
        cy="60"
        r="4"
        fill={ledOn ? '#3b82f6' : '#1e1b4b'}
        stroke="#1e1b4b"
        strokeWidth={1}
        style={{ filter: ledOn ? 'drop-shadow(0 0 3px #3b82f6)' : 'none' }}
      />
      <text
        x="115"
        y="70"
        fontFamily="monospace"
        fontSize="5"
        fill="#6b7280"
        textAnchor="middle"
      >
        D2
      </text>

      {/* Boot / EN buttons */}
      <rect x="170" y="270" width="18" height="14" rx="3" fill="#374151" />
      <rect x="174" y="273" width="10" height={8} rx="2" fill="#ef4444" />
      <text
        x="179"
        y="292"
        fontFamily="monospace"
        fontSize="5"
        fill="#6b7280"
        textAnchor="middle"
      >
        EN
      </text>
      <rect x="194" y="270" width="18" height="14" rx="3" fill="#374151" />
      <rect
        x="198"
        y="273"
        width="10"
        height={8}
        rx="2"
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1}
      />
      <text
        x="203"
        y="292"
        fontFamily="monospace"
        fontSize="5"
        fill="#6b7280"
        textAnchor="middle"
      >
        BOOT
      </text>

      {!simRunning && (
        <text
          x="150"
          y="310"
          fontFamily="monospace"
          fontSize="8"
          fill="#374151"
          textAnchor="middle"
          opacity="0.5"
        >
          ▶ Run to see pins
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// Generic fallback for boards without a specific renderer
// ─────────────────────────────────────────────────────────────────
function GenericBoard({ board, pinStates, simRunning }: BoardVisualizerProps) {
  const cols = 8;
  const allPins = board.pins.slice(0, 40);

  return (
    <svg
      viewBox="0 0 320 280"
      className="w-full h-full"
      style={{ userSelect: 'none' }}
    >
      <rect
        x="10"
        y="10"
        width="300"
        height="260"
        rx="8"
        fill="#1c1c2e"
        stroke="#2d2d4e"
        strokeWidth="2"
      />

      <text
        x="160"
        y="36"
        fontFamily="monospace"
        fontSize="13"
        fontWeight="bold"
        fill="#4a4a8a"
        textAnchor="middle"
      >
        {board.name}
      </text>
      <text
        x="160"
        y="50"
        fontFamily="monospace"
        fontSize="8"
        fill="#3a3a6a"
        textAnchor="middle"
      >
        {board.mcu}
      </text>

      {/* Pin grid */}
      {allPins.map((pin, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 25 + col * 35;
        const y = 70 + row * 36;
        const high = isHigh(pin.number, pinStates);
        const isAnalog = board.analogPins.includes(pin.number);
        const color = isAnalog ? '#a855f7' : '#22c55e';
        return (
          <g key={pin.number}>
            <rect
              x={x - 12}
              y={y - 10}
              width={24}
              height={20}
              rx="3"
              fill={high ? color + '33' : '#1f2937'}
              stroke={high ? color : '#374151'}
              strokeWidth={1}
            />
            <text
              x={x}
              y={y - 2}
              fontFamily="monospace"
              fontSize="5.5"
              fill={high ? color : '#4b5563'}
              textAnchor="middle"
            >
              {pin.label}
            </text>
            {high && (
              <circle
                cx={x + 8}
                cy={y - 8}
                r={2.5}
                fill={color}
                style={{ filter: `drop-shadow(0 0 2px ${color})` }}
              />
            )}
          </g>
        );
      })}

      <text
        x="160"
        y="255"
        fontFamily="monospace"
        fontSize="7"
        fill="#3a3a5a"
        textAnchor="middle"
      >
        {board.pins.length} pins · {(board.fcpu / 1_000_000).toFixed(0)}MHz ·{' '}
        {board.flashKB}KB flash
      </text>
    </svg>
  );
}

// ── Registry ──────────────────────────────────────────────────────
type Renderer = (props: BoardVisualizerProps) => JSX.Element;
const BOARD_RENDERERS: Record<string, Renderer> = {
  'arduino-mega': MegaBoard,
  'arduino-uno': UnoBoard,
  'arduino-nano': NanoBoard,
  esp32: ESP32Board,
  esp8266: GenericBoard,
  rp2040: GenericBoard,
};
