import React from 'react';

/* ── Shape-morphing loader (circle → triangle → square) ────────────────── */
const LoadingSpinner = ({
  text = '',
  fullScreen = false,
  className = ''
}) => {
  const loader = (
    <div className={`shape-loader-wrap ${className}`}>
      <div className="shape-loaders">
        {/* Circle */}
        <div className="shape-loader">
          <svg viewBox="0 0 80 80">
            <circle r={32} cy={40} cx={40} />
          </svg>
        </div>

        {/* Triangle */}
        <div className="shape-loader shape-loader--triangle">
          <svg viewBox="0 0 86 80">
            <polygon points="43 8 79 72 7 72" />
          </svg>
        </div>

        {/* Square */}
        <div className="shape-loader">
          <svg viewBox="0 0 80 80">
            <rect height={64} width={64} y={8} x={8} />
          </svg>
        </div>
      </div>

      {text && <p className="shape-loader-text">{text}</p>}

      <style>{`
        .shape-loader-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .shape-loaders {
          display: flex;
          align-items: center;
        }

        /* ── Base loader ── */
        .shape-loader {
          --path: #2f3545;
          --dot: #5628ee;
          --duration: 3s;
          width: 44px;
          height: 44px;
          position: relative;
          display: inline-block;
          margin: 0 16px;
        }

        .shape-loader::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          position: absolute;
          display: block;
          background: var(--dot);
          top: 37px;
          left: 19px;
          transform: translate(-18px, -18px);
          animation: sl-dotRect var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
        }

        .shape-loader svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .shape-loader svg rect,
        .shape-loader svg polygon,
        .shape-loader svg circle {
          fill: none;
          stroke: var(--path);
          stroke-width: 10px;
          stroke-linejoin: round;
          stroke-linecap: round;
        }

        /* ── Circle ── */
        .shape-loader svg circle {
          stroke-dasharray: 150 50 150 50;
          stroke-dashoffset: 75;
          animation: sl-pathCircle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
        }

        /* ── Triangle ── */
        .shape-loader--triangle {
          width: 48px;
        }

        .shape-loader--triangle::before {
          left: 21px;
          transform: translate(-10px, -18px);
          animation: sl-dotTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
        }

        .shape-loader svg polygon {
          stroke-dasharray: 145 76 145 76;
          stroke-dashoffset: 0;
          animation: sl-pathTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
        }

        /* ── Square ── */
        .shape-loader svg rect {
          stroke-dasharray: 192 64 192 64;
          stroke-dashoffset: 0;
          animation: sl-pathRect 3s cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
        }

        /* ── Label ── */
        .shape-loader-text {
          font-size: 0.85rem;
          color: #9ca3af;
          margin: 0;
          letter-spacing: 0.05em;
        }

        /* ═══════════════ Keyframes ═══════════════ */

        @keyframes sl-pathTriangle {
          33%  { stroke-dashoffset: 74; }
          66%  { stroke-dashoffset: 147; }
          100% { stroke-dashoffset: 221; }
        }

        @keyframes sl-dotTriangle {
          33%  { transform: translate(0, 0); }
          66%  { transform: translate(10px, -18px); }
          100% { transform: translate(-10px, -18px); }
        }

        @keyframes sl-pathRect {
          25%  { stroke-dashoffset: 64; }
          50%  { stroke-dashoffset: 128; }
          75%  { stroke-dashoffset: 192; }
          100% { stroke-dashoffset: 256; }
        }

        @keyframes sl-dotRect {
          25%  { transform: translate(0, 0); }
          50%  { transform: translate(18px, -18px); }
          75%  { transform: translate(0, -36px); }
          100% { transform: translate(-18px, -18px); }
        }

        @keyframes sl-pathCircle {
          25%  { stroke-dashoffset: 125; }
          50%  { stroke-dashoffset: 175; }
          75%  { stroke-dashoffset: 225; }
          100% { stroke-dashoffset: 275; }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        {loader}
      </div>
    );
  }

  return loader;
};

export default LoadingSpinner;
