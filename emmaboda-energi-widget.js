(function () {
  if (document.getElementById('ee-widget-container')) return;

  // ─────────────────────────────────────────────
  //  ⚙️  KONFIGURATION — byt ut dessa värden
  // ─────────────────────────────────────────────
  var CHATBOT_ID     = 'cmlr04ide001k6rv82sd9tfs9';   // Zapier chatbot-ID för Emma
  var RAPPORT_HOOK   = 'https://hooks.zapier.com/hooks/catch/XXXXX/XXXXX/'; // Webhook för felrapporter
  var MINA_SIDOR_URL = 'https://www.emmabodaenergi.se/mina-sidor.html';
  var SMS_URL        = 'https://www.emmabodaenergi.se/'; // Sida för SMS-prenumeration

  // ─── DRIFTSTÖRNINGSDATA ───────────────────────────────────────────────
  //  I produktion: ersätt detta objekt med ett fetch()-anrop mot ert API
  //  Status-värden: 'ok' | 'warn' (planerat arbete) | 'err' (aktiv störning)
  // ─────────────────────────────────────────────────────────────────────
  var driftStatus = {
    updated: '2026-03-30 08:30',
    services: [
      { key: 'elnat',      label: 'Elnät',           icon: '⚡', status: 'ok',   message: null },
      { key: 'fjarrvarme', label: 'Fjärrvärme',      icon: '🔥', status: 'ok',   message: null },
      { key: 'va',         label: 'Vatten & Avlopp', icon: '💧', status: 'ok',   message: null },
      { key: 'fiber',      label: 'Fiber / Stadsnät',icon: '🌐', status: 'ok',   message: null },
      { key: 'avfall',     label: 'Avfall',           icon: '♻️', status: 'ok',   message: null }
    ]
  };
  // ─────────────────────────────────────────────────────────────────────

  // ── Ladda Zapier chatbot ──────────────────────────────────────────────
  var zapierScript = document.createElement('script');
  zapierScript.async = true;
  zapierScript.type = 'module';
  zapierScript.src = 'https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js';
  document.head.appendChild(zapierScript);

  // ── Typsnitt ──────────────────────────────────────────────────────────
  var fontLink = document.createElement('link');
  fontLink.rel  = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(fontLink);

  // ─── CSS ──────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `
    #ee-widget-container * {
      font-family: 'Source Sans 3', sans-serif !important;
      box-sizing: border-box;
    }

    /* ── LAUNCHER ── */
    #ee-launcher {
      position: fixed; bottom: 24px; right: 24px;
      width: 64px; height: 64px; border-radius: 50%;
      background: #fff; border: 1.5px solid #e0e8e3;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      z-index: 9999; overflow: visible;
    }
    #ee-launcher:hover { transform: scale(1.07); box-shadow: 0 6px 24px rgba(29,52,117,0.28); border-color: #1d3475; }
    #ee-launcher.open .si-chat  { display: none; }
    #ee-launcher.open .si-close { display: block !important; }

    #ee-launcher-badge {
      position: absolute; top: 2px; right: 2px;
      width: 20px; height: 20px; border-radius: 50%;
      background: #c62828; color: #fff;
      font-size: 10px; font-weight: 700;
      display: none; align-items: center; justify-content: center;
      border: 2px solid #fff;
      animation: eePulse 1.8s ease-in-out infinite;
    }
    #ee-launcher-badge.show { display: flex; }

    /* ── WIDGET PANEL ── */
    #ee-widget {
      position: fixed; bottom: 100px; right: 24px;
      width: 420px; height: 720px;
      border-radius: 18px;
      box-shadow: 0 10px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
      background: #fff; display: flex; flex-direction: column;
      overflow: hidden;
      transform: scale(0.92) translateY(18px); opacity: 0; pointer-events: none;
      transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease, width 0.25s ease, height 0.25s ease;
      z-index: 9998;
    }
    #ee-widget.visible  { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    #ee-widget.expanded { height: 800px; }
    #ee-widget.expanded-chat { width: 520px; height: 840px; }
    @media (max-width: 580px) {
      #ee-widget { width: calc(100vw - 16px); right: 8px; bottom: 96px; }
      #ee-widget.expanded { height: calc(100dvh - 108px); }
      #ee-widget.expanded-chat { width: calc(100vw - 16px); height: calc(100dvh - 108px); }
    }

    /* ── HEADER ── */
    .ew-header {
      background: #fff;
      padding: 11px 16px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
      border-bottom: 1px solid #dde4f0;
    }
    .ew-header-left { display: flex; align-items: center; gap: 0; }
    .ew-back {
      background: rgba(0,0,0,0.06); border: 0.5px solid rgba(0,0,0,0.12);
      cursor: pointer; width: 28px; height: 28px; border-radius: 50%;
      display: none; align-items: center; justify-content: center;
      color: #1d3475; font-size: 17px; flex-shrink: 0; margin-right: 11px;
      transition: background 0.15s; line-height: 1;
    }
    .ew-back.show { display: flex; }
    .ew-back:hover { background: rgba(0,0,0,0.12); }
    .ew-brand { display: flex; flex-direction: column; }
    .ew-brand-name { font-size: 13.5px; font-weight: 700; color: #1d3475; letter-spacing: 0.03em; line-height: 1.15; }
    .ew-brand-sub  { font-size: 8.5px; color: #8a96b0; text-transform: uppercase; letter-spacing: 0.14em; margin-top: 2px; }
    .ew-divider    { width: 1px; height: 28px; background: #dde4f0; margin: 0 12px; flex-shrink: 0; }
    .ew-header-right { display: flex; flex-direction: column; }
    .ew-page-title { font-size: 9px; font-weight: 600; color: #8a96b0; letter-spacing: 0.12em; text-transform: uppercase; }
    .ew-status-row { display: flex; align-items: center; gap: 5px; margin-top: 4px; }
    .ew-hdot { width: 6px; height: 6px; border-radius: 50%; }
    .ew-hdot.ok   { background: #2e7d52; }
    .ew-hdot.warn { background: #f59e0b; animation: eePulse 1.5s ease-in-out infinite; }
    .ew-hdot.err  { background: #c62828; animation: eePulse 1s ease-in-out infinite; }
    @keyframes eePulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
    .ew-status-text { font-size: 9px; font-weight: 600; color: #4a5568; letter-spacing: 0.07em; }

    /* ── SCREENS ── */
    .ew-content { flex: 1; overflow: hidden; position: relative; min-height: 0; }
    .ew-screen {
      position: absolute; top:0; right:0; bottom:0; left:0;
      overflow-y: auto; -webkit-overflow-scrolling: touch;
      background: #f4f6fb; display: none; flex-direction: column;
      z-index: 1; visibility: hidden;
    }
    .ew-screen.active { display: flex !important; visibility: visible; z-index: 2; }
    .ew-screen.slide-in   { animation: eeSlideIn   0.22s ease forwards; }
    .ew-screen.slide-back { animation: eeSlideBack 0.2s  ease forwards; }
    @keyframes eeSlideIn   { from{opacity:0;transform:translateX(26px)} to{opacity:1;transform:translateX(0)} }
    @keyframes eeSlideBack { from{opacity:0;transform:translateX(-26px)} to{opacity:1;transform:translateX(0)} }

    /* ════════════════════════════════════════════
       DRIFTSTÖRNING HERO (startskärm, toppkort)
       ════════════════════════════════════════════ */
    .drift-hero {
      margin: 12px 12px 0;
      border-radius: 14px; padding: 14px 16px 12px;
      cursor: pointer; user-select: none;
      transition: filter 0.15s, transform 0.1s;
    }
    .drift-hero:hover  { filter: brightness(0.95); }
    .drift-hero:active { transform: scale(0.99); }

    .drift-hero.ok   { background: linear-gradient(135deg, #0d1f4e 0%, #1d3475 100%); }
    .drift-hero.warn { background: linear-gradient(135deg, #bf6000 0%, #e8971e 100%); }
    .drift-hero.err  { background: linear-gradient(135deg, #8b0000 0%, #c62828 100%); }

    .drift-hero-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 11px;
    }
    .drift-hero-tag {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 20px; padding: 3px 10px;
    }
    .drift-hero-tag-dot { width: 6px; height: 6px; border-radius: 50%; }
    .drift-hero.ok   .drift-hero-tag-dot { background: #b7f7c4; }
    .drift-hero.warn .drift-hero-tag-dot { background: #ffe082; animation: eePulse 1.5s infinite; }
    .drift-hero.err  .drift-hero-tag-dot { background: #ef9a9a; animation: eePulse 1s infinite; }
    .drift-hero-tag-text { font-size: 9.5px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: 0.1em; text-transform: uppercase; }
    .drift-hero-time { font-size: 9px; color: rgba(255,255,255,0.45); }

    .drift-hero-main { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 13px; }
    .drift-hero-icon-wrap {
      width: 40px; height: 40px; border-radius: 12px;
      background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .drift-hero-title { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.25; margin-top: 2px; }
    .drift-hero-subtitle { font-size: 11.5px; color: rgba(255,255,255,0.65); margin-top: 4px; line-height: 1.4; }

    .drift-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .drift-pill {
      display: flex; align-items: center; gap: 5px;
      background: rgba(255,255,255,0.11); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 20px; padding: 4px 10px;
      font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.88);
    }
    .drift-pill-dot { width: 5px; height: 5px; border-radius: 50%; }
    .drift-pill-dot.ok   { background: #74c69d; }
    .drift-pill-dot.warn { background: #ffe082; animation: eePulse 1.5s infinite; }
    .drift-pill-dot.err  { background: #ef9a9a; animation: eePulse 1s infinite; }

    .drift-hero-footer {
      display: flex; align-items: center; justify-content: flex-end;
      margin-top: 10px;
      font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 600;
    }
    .drift-hero-footer span { margin-right: 4px; }

    /* ── HOME BODY ── */
    .home-body { padding: 10px 12px 14px; }
    .home-section-label {
      font-size: 9.5px; font-weight: 700; color: #8a8a9a;
      text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; margin-top: 12px;
    }
    .home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .home-card {
      background: #fff; border: 1px solid #dde4f0; border-radius: 12px;
      padding: 13px 11px; display: flex; flex-direction: column;
      align-items: center; gap: 6px; cursor: pointer; text-align: center;
      transition: border-color 0.15s, transform 0.1s, box-shadow 0.15s;
    }
    .home-card:hover { border-color: #1d3475; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(29,52,117,0.1); }
    .home-card:active { transform: scale(0.97); }
    .home-card.full {
      grid-column: span 2; flex-direction: row; text-align: left;
      gap: 13px; padding: 13px 15px; align-items: center;
    }
    .home-card.full .hc-text { flex: 1; }
    .home-card.full .hc-arrow { color: #ccc; font-size: 20px; font-weight: 300; flex-shrink: 0; }
    .hc-icon {
      width: 36px; height: 36px; border-radius: 10px; background: #eef1f9;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .hc-icon svg { stroke: #1d3475; }
    .hc-label { font-size: 11.5px; font-weight: 700; color: #111; }
    .hc-sub   { font-size: 10px; color: #a0a8a4; }

    /* Rapport-kort — röd accent */
    .home-card.report-card { border-color: #fde0de; background: #fff9f9; }
    .home-card.report-card .hc-icon { background: #fce8e6; }
    .home-card.report-card .hc-icon svg { stroke: #c62828; }
    .home-card.report-card:hover { border-color: #c62828; box-shadow: 0 3px 10px rgba(198,40,40,0.1); }

    /* Emma-chat-kort — dark green full width */
    .home-card.chat-card {
      background: linear-gradient(135deg, #0d1f4e 0%, #1d3475 100%);
      border-color: transparent; color: #fff;
    }
    .home-card.chat-card .hc-icon { background: rgba(255,255,255,0.15); }
    .home-card.chat-card .hc-icon svg { stroke: #fff; }
    .home-card.chat-card .hc-label { color: #fff; }
    .home-card.chat-card .hc-sub   { color: rgba(255,255,255,0.6); }
    .home-card.chat-card .hc-arrow { color: rgba(255,255,255,0.35); }
    .home-card.chat-card:hover { opacity: 0.92; transform: translateY(-1px); border-color: transparent; }

    /* ── INNER SCREENS ── */
    .inner-body { padding: 16px; flex: 1; }
    .inner-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px; }
    .inner-sub   { font-size: 11.5px; color: #8a8a9a; margin-bottom: 16px; line-height: 1.55; }

    /* ── DRIFTSTÖRNINGAR SCREEN ── */
    .drift-row {
      background: #fff; border: 1px solid #dde4f0; border-radius: 12px;
      padding: 13px 14px; margin-bottom: 8px;
      display: flex; align-items: center; gap: 12px;
    }
    .drift-row-icon { font-size: 20px; flex-shrink: 0; }
    .drift-row-info { flex: 1; min-width: 0; }
    .drift-row-name { font-size: 12.5px; font-weight: 700; color: #111; }
    .drift-row-msg  { font-size: 11px; color: #6b7870; margin-top: 2px; line-height: 1.4; }
    .drift-row-badge {
      flex-shrink: 0; border-radius: 20px; padding: 4px 10px;
      font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .drift-row-badge.ok   { background: #e8ecf9; color: #0d1f4e; }
    .drift-row-badge.warn { background: #fff3e0; color: #bf6000; }
    .drift-row-badge.err  { background: #ffebee; color: #c62828; }

    .drift-updated {
      font-size: 10px; color: #a0a8a4; text-align: center;
      margin: 4px 0 14px; font-weight: 500;
    }

    .sms-box {
      background: linear-gradient(135deg, #0d1f4e 0%, #1a2966 100%);
      border-radius: 12px; padding: 14px 16px;
      display: flex; align-items: center; gap: 13px; margin-top: 4px;
    }
    .sms-box-icon { font-size: 22px; flex-shrink: 0; }
    .sms-box-text { flex: 1; font-size: 11.5px; color: rgba(255,255,255,0.85); line-height: 1.5; }
    .sms-box-text strong { color: #fff; display: block; margin-bottom: 2px; font-size: 12.5px; }
    .sms-btn {
      background: #4a6fc0; border: none; border-radius: 8px;
      padding: 9px 13px; font-size: 11px; font-weight: 700; color: #fff;
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
      font-family: 'Source Sans 3', sans-serif !important; transition: opacity 0.15s;
    }
    .sms-btn:hover { opacity: 0.85; }

    /* ── FAQ ── */
    .faq-item { border: 1px solid #dde4f0; border-radius: 10px; margin-bottom: 8px; overflow: hidden; background: #fff; }
    .faq-q {
      width: 100%; text-align: left; background: none; border: none;
      padding: 12px 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: space-between;
      font-size: 12px; font-weight: 600; color: #111;
      transition: background 0.1s; gap: 10px;
    }
    .faq-q:hover { background: #f4f6fb; }
    .faq-chevron { flex-shrink: 0; transition: transform 0.2s; color: #a0a8a4; font-size: 13px; }
    .faq-item.open .faq-chevron { transform: rotate(180deg); }
    .faq-a {
      display: none; padding: 0 14px 12px;
      font-size: 11.5px; color: #5a6662; line-height: 1.7;
      border-top: 1px solid #eef2ee; padding-top: 10px;
    }
    .faq-item.open .faq-a { display: block; }

    /* ── KONTAKT ── */
    .jour-box {
      background: linear-gradient(135deg, #8b0000 0%, #c62828 100%);
      border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;
      display: flex; align-items: center; gap: 14px;
    }
    .jour-box-icon { font-size: 24px; flex-shrink: 0; }
    .jour-box-text { flex: 1; }
    .jour-box-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
    .jour-box-num   { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .jour-box-sub   { font-size: 10.5px; color: rgba(255,255,255,0.65); margin-top: 2px; }

    .contact-card { background: #fff; border: 1px solid #dde4f0; border-radius: 12px; padding: 14px; margin-bottom: 10px; }
    .contact-head { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
    .contact-av {
      width: 40px; height: 40px; border-radius: 50%; background: #eef1f9;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #1d3475; flex-shrink: 0;
    }
    .contact-name { font-size: 13px; font-weight: 700; color: #111; }
    .contact-role { font-size: 11px; color: #a0a8a4; }
    .contact-links { display: flex; flex-direction: column; gap: 2px; }
    .contact-link {
      display: flex; align-items: center; gap: 10px;
      font-size: 12px; color: #333; text-decoration: none;
      padding: 8px 10px; border-radius: 8px; transition: background 0.1s;
    }
    .contact-link:hover { background: #f4f6fb; }
    .contact-link-icon {
      width: 28px; height: 28px; border-radius: 8px; background: #eef1f9;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .contact-link-icon svg { stroke: #1d3475; }
    .contact-link-info { flex: 1; }
    .contact-link-label { font-size: 9.5px; color: #a0a8a4; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .contact-link-val   { font-size: 12px; color: #111; font-weight: 600; margin-top: 1px; }
    .opening-box {
      background: #eef1f9; border-radius: 10px; padding: 12px 14px;
      font-size: 12px; color: #1d3475; font-weight: 600; line-height: 1.7;
    }
    .opening-box-title { font-size: 9.5px; color: #3d5a99; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }

    /* ── MINA SIDOR ── */
    .mina-card { background: #fff; border: 1px solid #dde4f0; border-radius: 14px; padding: 22px 18px; text-align: center; margin-bottom: 10px; }
    .mina-card-icon { width: 56px; height: 56px; border-radius: 16px; background: #eef1f9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .mina-card-icon svg { stroke: #1d3475; }
    .mina-card-title { font-size: 15px; font-weight: 700; color: #111; margin-bottom: 6px; }
    .mina-card-sub   { font-size: 12px; color: #6b7870; margin-bottom: 18px; line-height: 1.6; }
    .mina-btn {
      display: block; width: 100%; padding: 12px;
      background: #1d3475; color: #fff; border: none; border-radius: 10px;
      font-size: 13px; font-weight: 700; cursor: pointer; text-align: center;
      text-decoration: none; transition: background 0.15s;
      font-family: 'Source Sans 3', sans-serif !important;
    }
    .mina-btn:hover { background: #0d1f4e; }
    .mina-features { display: flex; flex-direction: column; gap: 8px; }
    .mina-feature  { display: flex; align-items: center; gap: 9px; font-size: 12px; color: #5a6662; }
    .mina-feature-check { width: 18px; height: 18px; border-radius: 50%; background: #e8ecf9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 10px; color: #0d1f4e; font-weight: 700; }

    /* ── RAPPORTERA FEL ── */
    .rf-field { margin-bottom: 12px; }
    .rf-label { font-size: 10.5px; font-weight: 700; color: #5a6662; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
    .rf-select, .rf-textarea, .rf-input {
      width: 100%; border: 1.5px solid #dde8e2; border-radius: 10px;
      padding: 10px 12px; font-size: 12.5px;
      font-family: 'Source Sans 3', sans-serif !important;
      color: #111; background: #fff; outline: none;
      transition: border-color 0.15s; -webkit-appearance: none; appearance: none;
    }
    .rf-select:focus, .rf-textarea:focus, .rf-input:focus { border-color: #1d3475; }
    .rf-textarea { min-height: 76px; resize: none; }
    .rf-input::placeholder { color: #bbb; }

    /* ── BUTTONS ── */
    .ew-btn {
      display: block; width: 100%; padding: 12px; border: none;
      border-radius: 10px; font-size: 13px; font-weight: 700;
      cursor: pointer; text-align: center;
      transition: opacity 0.15s, transform 0.1s;
      font-family: 'Source Sans 3', sans-serif !important; letter-spacing: 0.01em;
    }
    .ew-btn:active { transform: scale(0.98); }
    .ew-btn-primary { background: #1d3475; color: #fff; }
    .ew-btn-primary:hover { background: #0d1f4e; }
    .ew-btn-outline { background: transparent; color: #1d3475; border: 1.5px solid #1d3475; }
    .ew-btn-outline:hover { background: #eef1f9; }
    .ew-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── SUCCESS STATE ── */
    .success-box { text-align: center; padding: 28px 20px; }
    .success-emoji { font-size: 52px; margin-bottom: 14px; }
    .success-title { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 8px; }
    .success-sub   { font-size: 12px; color: #6b7870; line-height: 1.6; }

    /* ── CHAT ── */
    #ew-chat { flex: 1; display: flex; flex-direction: column; }
    #ew-chat.active zapier-interfaces-chatbot-embed { flex:1; width:100% !important; height:100% !important; border:none; display:block; }

    /* ── TOOLTIP ── */
    #ee-tooltip {
      position: fixed; bottom: 102px; right: 24px;
      background: #0d1f4e; color: #fff;
      padding: 14px 18px 14px 15px; border-radius: 14px 14px 4px 14px;
      font-size: 13px; font-weight: 500; line-height: 1.55; max-width: 250px;
      cursor: pointer; box-shadow: 0 4px 24px rgba(0,0,0,0.22);
      opacity: 0; transform: translateY(8px) scale(0.95);
      transition: opacity 0.3s ease, transform 0.3s ease;
      z-index: 9999; pointer-events: all;
    }
    #ee-tooltip.show { opacity: 1; transform: translateY(0) scale(1); }
    #ee-tooltip::after {
      content: ''; position: absolute; bottom: -8px; right: 22px;
      border-left: 8px solid transparent; border-right: 8px solid transparent;
      border-top: 8px solid #0d1f4e;
    }
    #ee-tooltip-close {
      position: absolute; top: 7px; right: 9px; background: none; border: none;
      color: rgba(255,255,255,0.4); cursor: pointer; font-size: 13px; line-height: 1; padding: 0;
    }
    #ee-tooltip-close:hover { color: #fff; }
    @keyframes eeBlink { 0%,100%{opacity:1} 50%{opacity:0} }

    /* ── KARTA ── */
    .map-place-card {
      background: #fff; border: 1px solid #dde4f0; border-radius: 12px;
      margin-bottom: 10px; overflow: hidden;
    }
    .map-place-header {
      display: flex; align-items: center; gap: 12px; padding: 13px 14px 10px;
    }
    .map-place-icon {
      width: 38px; height: 38px; border-radius: 10px; background: #eef1f9;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .map-place-name { font-size: 12.5px; font-weight: 700; color: #111; }
    .map-place-addr { font-size: 11px; color: #8a96b0; margin-top: 2px; }
    .map-place-hours { font-size: 11px; color: #5a6662; padding: 0 14px 6px; }
    .map-embed {
      width: 100%; height: 160px; border: none; display: block;
      border-top: 1px solid #eef1f9;
    }
    .map-open-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 14px; background: #eef1f9; border: none; width: 100%;
      font-size: 11.5px; font-weight: 700; color: #1d3475; cursor: pointer;
      font-family: 'Source Sans 3', sans-serif !important;
      transition: background 0.15s;
    }
    .map-open-btn:hover { background: #dde4f0; }

    /* ── FOOTER ── */
    .ew-footer {
      padding: 8px 14px; border-top: 1px solid #e4eaf5;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; background: #fff;
    }
    .ew-footer a {
      font-size: 10.5px; color: #b0b8b4; text-decoration: none;
      display: flex; align-items: center; gap: 5px;
      font-weight: 600; letter-spacing: 0.02em; transition: opacity 0.15s;
    }
    .ew-footer a:hover { opacity: 0.65; }
    .ew-pdot { width: 5px; height: 5px; border-radius: 50%; background: #7c3aed; display: inline-block; }
  `;
  document.head.appendChild(style);

  // ─────────────────────────────────────────────────────────────────────────
  //  HTML-STRUKTUR
  // ─────────────────────────────────────────────────────────────────────────
  var wrap = document.createElement('div');
  wrap.id = 'ee-widget-container';
  wrap.style.cssText = 'position:fixed;bottom:0;right:0;width:0;height:0;overflow:visible;z-index:9997;';
  wrap.innerHTML = `
    <!-- LAUNCHER -->
    <button id="ee-launcher" onclick="eeToggle()" aria-label="Öppna kundtjänst">
      <div id="ee-launcher-badge">!</div>
      <svg class="si-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d3475" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="si-close" style="display:none" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d3475" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <!-- WIDGET PANEL -->
    <div id="ee-widget">

      <!-- HEADER -->
      <div class="ew-header" id="ew-header">
        <div class="ew-header-left">
          <button class="ew-back" id="ew-back" onclick="eeGoHome()">‹</button>
          <div class="ew-brand">
            <img src="https://www.emmabodaenergi.se/images/18.2566d402159ad99912a19ab9/1487592022927/Emmaboda%20Energi.png" alt="Emmaboda Energi" style="height:36px;width:auto;display:block;" />
            <div class="ew-brand-sub">Kundtjänst</div>
          </div>
          <div class="ew-divider"></div>
          <div class="ew-header-right">
            <div class="ew-page-title" id="ew-page-title">Startsida</div>
            <div class="ew-status-row">
              <div class="ew-hdot ok" id="ew-hdot"></div>
              <span class="ew-status-text" id="ew-status-text">Alla tjänster OK</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SCREENS -->
      <div class="ew-content">

        <!-- ═══ HOME ════════════════════════════════════════════════ -->
        <div class="ew-screen active" id="ew-home">

          <!-- DRIFTSTÖRNING HERO -->
          <div id="drift-hero-el" class="drift-hero ok" onclick="eeNav('ew-drift','Driftstörningar')">
            <div class="drift-hero-top">
              <div class="drift-hero-tag">
                <div class="drift-hero-tag-dot"></div>
                <span class="drift-hero-tag-text" id="dhero-tag">Driftstatus</span>
              </div>
              <span class="drift-hero-time" id="dhero-time"></span>
            </div>
            <div class="drift-hero-main">
              <div class="drift-hero-icon-wrap" id="dhero-icon">✅</div>
              <div>
                <div class="drift-hero-title" id="dhero-title">Alla tjänster fungerar normalt</div>
                <div class="drift-hero-subtitle" id="dhero-sub">Elnät · Fjärrvärme · VA · Fiber · Avfall</div>
              </div>
            </div>
            <div class="drift-pills" id="dhero-pills"></div>
            <div class="drift-hero-footer"><span>Se detaljerad status</span>›</div>
          </div>

          <!-- MENY-GRID -->
          <div class="home-body">
            <div class="home-section-label">Vad kan vi hjälpa dig med?</div>
            <div class="home-grid">

              <!-- Emma AI — full width -->
              <div class="home-card full chat-card" onclick="eeNav('ew-chat','Chatta med Emma')">
                <div class="hc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div class="hc-text">
                  <div class="hc-label">Chatta med Emma</div>
                  <div class="hc-sub">Svar dygnet runt från vår AI</div>
                </div>
                <div class="hc-arrow">›</div>
              </div>

              <!-- Mina sidor -->
              <div class="home-card" onclick="eeNav('ew-mina','Mina sidor')">
                <div class="hc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="hc-label">Mina sidor</div>
                <div class="hc-sub">Faktura & avtal</div>
              </div>

              <!-- FAQ -->
              <div class="home-card" onclick="eeNav('ew-faq','Vanliga frågor')">
                <div class="hc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div class="hc-label">Vanliga frågor</div>
                <div class="hc-sub">Snabba svar</div>
              </div>

              <!-- Kontakt -->
              <div class="home-card" onclick="eeNav('ew-kontakt','Kontakt')">
                <div class="hc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div class="hc-label">Kontakt</div>
                <div class="hc-sub">Tider & telefon</div>
              </div>

              <!-- Hitta oss -->
              <div class="home-card" onclick="eeNav('ew-karta','Hitta oss')">
                <div class="hc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div class="hc-label">Hitta oss</div>
                <div class="hc-sub">Kontor & anläggningar</div>
              </div>

              <!-- Rapportera fel — röd -->
              <div class="home-card full report-card" onclick="eeNav('ew-rapportera','Rapportera fel')">
                <div class="hc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div class="hc-text">
                  <div class="hc-label">Rapportera fel</div>
                  <div class="hc-sub">Anmäl störning eller skada</div>
                </div>
                <div class="hc-arrow">›</div>
              </div>


            </div>
          </div>
        </div><!-- /ew-home -->

        <!-- ═══ DRIFTSTÖRNINGAR ══════════════════════════════════════ -->
        <div class="ew-screen" id="ew-drift">
          <div class="inner-body">
            <div class="inner-title">Driftstörningar</div>
            <div class="inner-sub">Aktuell status för alla våra tjänster</div>
            <div class="drift-updated" id="drift-updated-text"></div>
            <div id="drift-rows"></div>
            <div class="sms-box">
              <div class="sms-box-icon">📲</div>
              <div class="sms-box-text">
                <strong>Få SMS vid störningar</strong>
                Anmäl ditt nummer så meddelar vi dig direkt vid driftstörningar och planerade arbeten.
              </div>
              <button class="sms-btn" onclick="eeOpenURL('${SMS_URL}')">Anmäl →</button>
            </div>
          </div>
        </div>

        <!-- ═══ CHAT (Emma) ══════════════════════════════════════════ -->
        <div class="ew-screen" id="ew-chat">
          <!-- Chatbot injekteras dynamiskt när skärmen öppnas -->
        </div>

        <!-- ═══ FAQ ══════════════════════════════════════════════════ -->
        <div class="ew-screen" id="ew-faq">
          <div class="inner-body">
            <div class="inner-title">Vanliga frågor</div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Vad gör jag vid strömavbrott?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Kontrollera först om era säkringar löst ut. Kontrollera också om grannar är drabbade. Om fler är utan ström, ring vår jour på <strong>0471-24 97 50</strong>. Akuta fel hanteras dygnet runt.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur anmäler jag en driftstörning?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Använd knappen "Rapportera fel" i den här menyn, eller ring kundtjänst på 0471-24 97 50. Utanför kontorstid når du vår jourtekniker på samma nummer.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur prenumererar jag på SMS-notiser?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Gå till vår webbplats och anmäl ditt mobilnummer för SMS-avisering. Du väljer själv vilka tjänster (elnät, fjärrvärme, VA, fiber, avfall) du vill få notiser om.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur betalar jag min faktura?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Fakturor kan betalas via bankgiro, autogiro eller e-faktura. Logga in på Mina sidor för att se dina fakturor och välja betalningsmetod. Vill du ha e-faktura? Kontakta oss så ordnar vi det.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur anmäler jag flytt?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Flytta in eller ut? Fyll i vår flyttanmälan på emmabodaenergi.se minst 5 dagar i förväg. Du behöver uppge adress, inflyttningsdatum och ditt personnummer.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur läser jag av min elmätare?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">De flesta mätare läses av automatiskt. Om du har en äldre mätare och behöver läsa av manuellt, hittar du instruktioner på Mina sidor. Mätarställningen anges i kWh.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Vad är avbrottsersättning?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Du har rätt till avbrottsersättning om strömmen är borta i minst 12 sammanhängande timmar. Ersättningen beror på avbrottets längd och beräknas som en procentsats av din årliga nätkostnad. Ansök via Mina sidor.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Kan jag ansluta mig till fibernätet?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Vi bygger ut fibernätet löpande i Emmaboda kommun. Kontakta oss för att ta reda på om din fastighet kan anslutas. Anslutningskostnaden är en engångsinvestering som följer fastigheten.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Vad tar ÅVC emot?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">På återvinningscentralen (ÅVC) kan du lämna grovavfall, farligt avfall, elavfall och förpackningar. Öppet Tis–Fre 10–17, Lördag 10–13. Stängt helgdagar.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur fungerar sophämtningen?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Sophämtning sker varannan vecka för hushållsavfall. Matavfall hämtas varje vecka. Kontakta oss för att se ditt hämtningsschema eller logga in på Mina sidor.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Vad gör jag vid vattenstopp?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Kontrollera om det är ett planerat avbrott via vår driftinformation. Vid akut vattenstopp — ring jouren på <strong>0471-24 97 50</strong> dygnet runt.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur ansluter jag mig till fjärrvärme?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Kontakta oss för en kostnadsfri genomgång av om din fastighet kan anslutas till fjärrvärmenätet. Vi hjälper dig med hela processen från offert till driftsättning.</div>
            </div>

            <div class="faq-item">
              <button class="faq-q" onclick="eeFaq(this)">
                Hur beställer jag slamtömning?
                <svg class="faq-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-a">Slamtömning ingår i VA-abonnemanget och sker enligt kommunens schema. Behöver du extra tömning utanför schemat? Kontakta oss på 0471-24 97 50 eller kundservice@emmabodaenergi.se.</div>
            </div>

        <!-- ═══ KARTA ═════════════════════════════════════════════════ -->
        <div class="ew-screen" id="ew-karta">
          <div class="inner-body">
            <div class="inner-title">Hitta oss</div>
            <div class="inner-sub">Våra anläggningar och kontor i Emmaboda</div>

            <!-- Kontoret -->
            <div class="map-place-card">
              <div class="map-place-header">
                <div class="map-place-icon">🏢</div>
                <div>
                  <div class="map-place-name">Emmaboda Energi — Kontor</div>
                  <div class="map-place-addr">Industrigatan 5, 361 31 Emmaboda</div>
                </div>
              </div>
              <div class="map-place-hours">Mån–Fre 08:00–16:30</div>
              <iframe class="map-embed" loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=15.532,56.617,15.552,56.627&layer=mapnik&marker=56.622285,15.542151"></iframe>
              <button class="map-open-btn" onclick="eeOpenURL('https://maps.google.com/?q=Industrigatan+5,+Emmaboda')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Öppna i Google Maps →
              </button>
            </div>

            <!-- ÅVC -->
            <div class="map-place-card">
              <div class="map-place-header">
                <div class="map-place-icon">♻️</div>
                <div>
                  <div class="map-place-name">Återvinningscentralen (ÅVC)</div>
                  <div class="map-place-addr">Långgatan 21, 361 31 Emmaboda</div>
                </div>
              </div>
              <div class="map-place-hours">Tis–Fre 10:00–17:00 · Lör 10:00–13:00</div>
              <iframe class="map-embed" loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=15.522,56.624,15.542,56.634&layer=mapnik&marker=56.62864,15.53092"></iframe>
              <button class="map-open-btn" onclick="eeOpenURL('https://maps.google.com/?q=L%C3%A5nggatan+21,+Emmaboda')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Öppna i Google Maps →
              </button>
            </div>

            <!-- Reningsverk -->
            <div class="map-place-card">
              <div class="map-place-header">
                <div class="map-place-icon">💧</div>
                <div>
                  <div class="map-place-name">Reningsverket</div>
                  <div class="map-place-addr">361 91 Emmaboda</div>
                </div>
              </div>
              <iframe class="map-embed" loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=15.544,56.611,15.564,56.621&layer=mapnik&marker=56.61595,15.55445"></iframe>
              <button class="map-open-btn" onclick="eeOpenURL('https://maps.google.com/?q=56.61595,15.55445')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Öppna i Google Maps →
              </button>
            </div>

          </div>
        </div>

        <!-- ═══ MINA SIDOR ════════════════════════════════════════════ -->
        <div class="ew-screen" id="ew-mina">
          <div class="inner-body">
            <div class="inner-title">Mina sidor</div>
            <div class="mina-card">
              <div class="mina-card-icon">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="mina-card-title">Logga in på Mina sidor</div>
              <div class="mina-card-sub">Se och betala fakturor, hantera avtal, anmäl flytt och kontrollera din förbrukning.</div>
              <a href="${MINA_SIDOR_URL}" target="_blank" class="mina-btn">Gå till Mina sidor →</a>
            </div>
            <div class="mina-features">
              <div class="mina-feature"><div class="mina-feature-check">✓</div>Se och betala fakturor</div>
              <div class="mina-feature"><div class="mina-feature-check">✓</div>Kontrollera din förbrukning</div>
              <div class="mina-feature"><div class="mina-feature-check">✓</div>Hantera dina avtal</div>
              <div class="mina-feature"><div class="mina-feature-check">✓</div>Anmäl flytt enkelt</div>
              <div class="mina-feature"><div class="mina-feature-check">✓</div>Ansök om avbrottsersättning</div>
            </div>
          </div>
        </div>

        <!-- ═══ KONTAKT ════════════════════════════════════════════════ -->
        <div class="ew-screen" id="ew-kontakt">
          <div class="inner-body">
            <div class="inner-title">Kontakta oss</div>

            <!-- Jourtelefon — röd, prominent -->
            <div class="jour-box">
              <div class="jour-box-icon">🚨</div>
              <div class="jour-box-text">
                <div class="jour-box-label">Akuta fel & jour</div>
                <div class="jour-box-num">0471-24 97 50</div>
                <div class="jour-box-sub">Dygnet runt, alla dagar</div>
              </div>
            </div>

            <!-- Kontaktkort -->
            <div class="contact-card">
              <div class="contact-head">
                <div class="contact-av">EE</div>
                <div>
                  <div class="contact-name">Emmaboda Energi</div>
                  <div class="contact-role">Lokalt energibolag · Emmaboda</div>
                </div>
              </div>
              <div class="contact-links">
                <a href="tel:0471249750" class="contact-link">
                  <div class="contact-link-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                  <div class="contact-link-info">
                    <div class="contact-link-label">Telefon</div>
                    <div class="contact-link-val">0471-24 97 50</div>
                  </div>
                </a>
                <a href="mailto:kundservice@emmabodaenergi.se" class="contact-link">
                  <div class="contact-link-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                  <div class="contact-link-info">
                    <div class="contact-link-label">E-post</div>
                    <div class="contact-link-val">kundservice@emmabodaenergi.se</div>
                  </div>
                </a>
                <a href="https://www.emmabodaenergi.se" target="_blank" class="contact-link">
                  <div class="contact-link-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
                  <div class="contact-link-info">
                    <div class="contact-link-label">Webb</div>
                    <div class="contact-link-val">emmabodaenergi.se</div>
                  </div>
                </a>
              </div>
            </div>

            <!-- Öppettider -->
            <div class="contact-card">
              <div class="opening-box-title">Öppettider kundtjänst</div>
              <div class="opening-box">
                Mån–Fre &nbsp; 08:00–16:30<br>
                Lördag &nbsp;&nbsp;&nbsp; Stängt<br>
                Söndag &nbsp;&nbsp; Stängt<br>
                <span style="font-size:11px;color:#5a6662;font-weight:400;">Jourteknik nås på 0471-24 97 50 dygnet runt</span>
              </div>
            </div>

            <!-- Adress -->
            <div class="contact-card" style="padding:12px 14px;">
              <div style="font-size:10px;font-weight:700;color:#a0a8a4;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;">Besöksadress</div>
              <div style="font-size:12.5px;font-weight:600;color:#111;">Industrigatan 5</div>
              <div style="font-size:12px;color:#6b7870;">361 31 Emmaboda</div>
            </div>

          </div>
        </div>

        <!-- ═══ RAPPORTERA FEL ═══════════════════════════════════════ -->
        <div class="ew-screen" id="ew-rapportera">
          <div class="inner-body" id="ew-rapport-form">
            <div class="inner-title">Rapportera fel</div>
            <div class="inner-sub">Beskriv problemet så kontaktar vi dig. Akuta fel — ring alltid 0471-24 97 50.</div>

            <div class="rf-field">
              <div class="rf-label">Gäller</div>
              <select class="rf-select" id="rf-service">
                <option value="">Välj tjänst…</option>
                <option value="Elnät">⚡ Elnät</option>
                <option value="Fjärrvärme">🔥 Fjärrvärme</option>
                <option value="Vatten & Avlopp">💧 Vatten & Avlopp</option>
                <option value="Fiber / Stadsnät">🌐 Fiber / Stadsnät</option>
                <option value="Avfall">♻️ Avfall</option>
                <option value="Övrigt">❓ Övrigt</option>
              </select>
            </div>

            <div class="rf-field">
              <div class="rf-label">Beskrivning</div>
              <textarea class="rf-textarea" id="rf-desc" placeholder="Beskriv felet kortfattat…" oninput="eeCheckReport()"></textarea>
            </div>

            <div class="rf-field">
              <div class="rf-label">Ditt telefonnummer (för återkoppling)</div>
              <input type="tel" class="rf-input" id="rf-phone" placeholder="07X-XXX XX XX" oninput="eeCheckReport()">
            </div>

            <button class="ew-btn ew-btn-primary" id="rf-btn" onclick="eeSubmitReport()" disabled style="margin-top:4px;">
              Skicka rapport →
            </button>
          </div>

          <div class="inner-body" id="ew-rapport-success" style="display:none;">
            <div class="success-box">
              <div class="success-emoji">✅</div>
              <div class="success-title">Rapport skickad!</div>
              <div class="success-sub">Vi har tagit emot din felanmälan och återkommer så snart som möjligt.<br><br>Akut? Ring <strong>0471-24 97 50</strong> dygnet runt.</div>
              <button class="ew-btn ew-btn-outline" onclick="eeGoHome()" style="margin-top:20px;">Tillbaka till start</button>
            </div>
          </div>
        </div>

      </div><!-- /.ew-content -->

      <!-- FOOTER -->
      <div class="ew-footer">
        <a href="https://samify.se" target="_blank">
          <span style="color:#b0b8b4;font-weight:600;font-size:10.5px;">Powered by</span>
          <img src="https://samify.se/wp-content/uploads/go-x/u/7c566770-2e09-4b98-98b8-c4afcbbeeeaa/image-160x62.png"
               alt="Samify" style="height:15px;width:auto;display:block;opacity:0.55;"/>
          <span class="ew-pdot"></span>
        </a>
      </div>
    </div><!-- /#ee-widget -->

    <!-- TOOLTIP -->
    <div id="ee-tooltip" onclick="eeOpenFromTooltip()">
      <button id="ee-tooltip-close" onclick="event.stopPropagation();eeCloseTooltip()">✕</button>
      <span id="ee-tooltip-text"></span><span id="ee-tooltip-cursor" style="display:inline-block;width:1.5px;height:11px;background:rgba(255,255,255,0.8);margin-left:2px;vertical-align:middle;animation:eeBlink 0.7s step-end infinite;">​</span>
    </div>
  `;
  document.body.appendChild(wrap);

  // ─────────────────────────────────────────────────────────────────────────
  //  DRIFTSTATUS — BERÄKNA & RENDERA
  // ─────────────────────────────────────────────────────────────────────────
  function eeGetOverallStatus() {
    if (driftStatus.services.some(function(s) { return s.status === 'err';  })) return 'err';
    if (driftStatus.services.some(function(s) { return s.status === 'warn'; })) return 'warn';
    return 'ok';
  }

  function eeGetActiveCount() {
    return driftStatus.services.filter(function(s) { return s.status !== 'ok'; }).length;
  }

  function eeRenderDriftHero() {
    var overall   = eeGetOverallStatus();
    var activeCount = eeGetActiveCount();
    var heroEl    = document.getElementById('drift-hero-el');
    var tagEl     = document.getElementById('dhero-tag');
    var timeEl    = document.getElementById('dhero-time');
    var iconEl    = document.getElementById('dhero-icon');
    var titleEl   = document.getElementById('dhero-title');
    var subEl     = document.getElementById('dhero-sub');
    var pillsEl   = document.getElementById('dhero-pills');

    // Hero class
    heroEl.className = 'drift-hero ' + overall;

    // Tag text
    var tagTexts = { ok: 'Alla tjänster OK', warn: 'Planerat arbete', err: 'Aktiv störning' };
    tagEl.textContent = tagTexts[overall];

    // Timestamp
    timeEl.textContent = 'Uppdaterad ' + driftStatus.updated;

    // Icon + title
    if (overall === 'ok') {
      iconEl.textContent = '✅';
      titleEl.textContent = 'Alla tjänster fungerar normalt';
      subEl.textContent = 'Elnät · Fjärrvärme · VA · Fiber · Avfall';
    } else if (overall === 'warn') {
      iconEl.textContent = '🔧';
      titleEl.textContent = activeCount + (activeCount === 1 ? ' planerat arbete pågår' : ' planerade arbeten pågår');
      subEl.textContent = 'Klicka för att se detaljer';
    } else {
      iconEl.textContent = '⚠️';
      titleEl.textContent = activeCount + (activeCount === 1 ? ' aktiv störning' : ' aktiva störningar');
      subEl.textContent = 'Klicka för att se detaljer';
    }

    // Pills
    pillsEl.innerHTML = '';
    driftStatus.services.forEach(function(svc) {
      var pill = document.createElement('div');
      pill.className = 'drift-pill';
      pill.innerHTML = '<div class="drift-pill-dot ' + svc.status + '"></div>' + svc.label;
      pillsEl.appendChild(pill);
    });

    // Header dot
    var hdot = document.getElementById('ew-hdot');
    var htext = document.getElementById('ew-status-text');
    hdot.className = 'ew-hdot ' + overall;
    htext.textContent = overall === 'ok' ? 'Alla tjänster OK'
                      : overall === 'warn' ? 'Planerat arbete'
                      : 'Aktiv störning';

    // Launcher badge
    var badge = document.getElementById('ee-launcher-badge');
    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  }

  function eeRenderDriftRows() {
    var container = document.getElementById('drift-rows');
    var updatedEl = document.getElementById('drift-updated-text');
    container.innerHTML = '';
    updatedEl.textContent = 'Senast uppdaterad: ' + driftStatus.updated;

    var badgeLabels = { ok: 'Normal drift', warn: 'Planerat arbete', err: 'Störning' };

    driftStatus.services.forEach(function(svc) {
      var row = document.createElement('div');
      row.className = 'drift-row';
      row.innerHTML =
        '<div class="drift-row-icon">' + svc.icon + '</div>' +
        '<div class="drift-row-info">' +
          '<div class="drift-row-name">' + svc.label + '</div>' +
          (svc.message ? '<div class="drift-row-msg">' + svc.message + '</div>' : '') +
        '</div>' +
        '<div class="drift-row-badge ' + svc.status + '">' + badgeLabels[svc.status] + '</div>';
      container.appendChild(row);
    });
  }

  // Init drift rendering
  eeRenderDriftHero();
  eeRenderDriftRows();

  // ─────────────────────────────────────────────────────────────────────────
  //  NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  var expandedScreens = ['ew-chat', 'ew-drift', 'ew-faq', 'ew-mina', 'ew-kontakt', 'ew-rapportera', 'ew-karta'];

  var eeWidgetEverOpened = false;

  function eeToggle() {
    var w = document.getElementById('ee-widget');
    var l = document.getElementById('ee-launcher');
    w.classList.toggle('visible');
    l.classList.toggle('open');
    if (w.classList.contains('visible')) {
      eeWidgetEverOpened = true;
      eeCloseTooltip();
    }
  }

  function eeGoHome() {
    document.querySelectorAll('.ew-screen').forEach(function(s) {
      s.classList.remove('active', 'slide-in', 'slide-back');
    });
    document.getElementById('ew-home').classList.add('active', 'slide-back');
    document.getElementById('ew-back').classList.remove('show');
    document.getElementById('ew-page-title').textContent = 'Startsida';
    var widget = document.getElementById('ee-widget');
    widget.classList.remove('expanded', 'expanded-chat');
  }

  function eeNav(screenId, title) {
    document.querySelectorAll('.ew-screen').forEach(function(s) {
      s.classList.remove('active', 'slide-in', 'slide-back');
    });
    var screen = document.getElementById(screenId);
    screen.classList.add('active', 'slide-in');
    document.getElementById('ew-back').classList.add('show');
    document.getElementById('ew-page-title').textContent = title;

    var widget = document.getElementById('ee-widget');
    widget.classList.remove('expanded', 'expanded-chat');
    if (screenId === 'ew-chat') {
      widget.classList.add('expanded-chat');
    } else if (expandedScreens.indexOf(screenId) !== -1) {
      widget.classList.add('expanded');
    }

    // Injektera Zapier-chatbot dynamiskt första gången chat-skärmen öppnas
    if (screenId === 'ew-chat' && !screen.dataset.loaded) {
      screen.dataset.loaded = '1';
      var embed = document.createElement('zapier-interfaces-chatbot-embed');
      embed.setAttribute('is-popup', 'false');
      embed.setAttribute('chatbot-id', CHATBOT_ID);
      embed.style.cssText = 'flex:1;width:100%;height:100%;border:none;display:block;';
      screen.appendChild(embed);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  FAQ
  // ─────────────────────────────────────────────────────────────────────────
  function eeFaq(btn) {
    btn.closest('.faq-item').classList.toggle('open');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RAPPORTERA FEL
  // ─────────────────────────────────────────────────────────────────────────
  function eeCheckReport() {
    var desc  = (document.getElementById('rf-desc').value || '').trim();
    var phone = (document.getElementById('rf-phone').value || '').trim();
    document.getElementById('rf-btn').disabled = !(desc.length > 5 && phone.length > 5);
  }

  async function eeSubmitReport() {
    var service = document.getElementById('rf-service').value;
    var desc    = (document.getElementById('rf-desc').value  || '').trim();
    var phone   = (document.getElementById('rf-phone').value || '').trim();

    var btn = document.getElementById('rf-btn');
    btn.disabled = true;
    btn.textContent = 'Skickar…';

    var payload = {
      timestamp: new Date().toISOString(),
      source:    window.location.href,
      service:   service || 'Ej angiven',
      description: desc,
      phone:     phone
    };

    try {
      if (RAPPORT_HOOK && RAPPORT_HOOK.indexOf('XXXXX') === -1) {
        await fetch(RAPPORT_HOOK, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        });
      }
    } catch(e) {
      console.warn('Rapport-webhook misslyckades:', e);
    }

    // Visa success oavsett webhook-status
    document.getElementById('ew-rapport-form').style.display    = 'none';
    document.getElementById('ew-rapport-success').style.display = 'block';
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  HJÄLPFUNKTIONER
  // ─────────────────────────────────────────────────────────────────────────
  function eeOpenURL(url) {
    window.open(url, '_blank');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  TOOLTIP — med typewriter & bugg-fix (swTypewriteId)
  // ─────────────────────────────────────────────────────────────────────────
  var eeTypewriteId = null;

  function eeTypewriteTooltip(msg) {
    var el = document.getElementById('ee-tooltip-text');
    if (!el) return;
    if (eeTypewriteId) clearTimeout(eeTypewriteId); // avbryt pågående animation
    el.textContent = '';
    var i = 0;
    function type() {
      if (i < msg.length) {
        el.textContent += msg[i];
        i++;
        eeTypewriteId = setTimeout(type, 40 + Math.random() * 25);
      }
    }
    eeTypewriteId = setTimeout(type, 300);
  }

  function eeCloseTooltip() {
    var t = document.getElementById('ee-tooltip');
    if (t) {
      t.classList.remove('show');
      setTimeout(function() { t.style.display = 'none'; }, 300);
    }
  }

  function eeOpenFromTooltip() {
    eeCloseTooltip();
    document.getElementById('ee-widget').classList.add('visible');
    document.getElementById('ee-launcher').classList.add('open');
  }

  // Visa välkomsttooltip efter 1.5 sek — bara om widgeten inte redan öppnats
  setTimeout(function() {
    if (eeWidgetEverOpened) return;
    var w = document.getElementById('ee-widget');
    if (w && w.classList.contains('visible')) return;
    var t = document.getElementById('ee-tooltip');
    if (t) {
      t.style.display = '';
      t.classList.add('show');
      var overallStatus = eeGetOverallStatus();
      var activeCount   = eeGetActiveCount();
      var msg = overallStatus === 'ok'
        ? 'Hej! 👋 Hur kan vi hjälpa dig idag?'
        : activeCount + (activeCount === 1 ? ' aktiv störning' : ' aktiva störningar') + ' — klicka för att se status.';
      eeTypewriteTooltip(msg);
    }
  }, 1500);

  // ─────────────────────────────────────────────────────────────────────────
  //  GLOBALA EXPORTS
  // ─────────────────────────────────────────────────────────────────────────
  window.eeToggle           = eeToggle;
  window.eeGoHome           = eeGoHome;
  window.eeNav              = eeNav;
  window.eeFaq              = eeFaq;
  window.eeCheckReport      = eeCheckReport;
  window.eeSubmitReport     = eeSubmitReport;
  window.eeOpenURL          = eeOpenURL;
  window.eeCloseTooltip     = eeCloseTooltip;
  window.eeOpenFromTooltip  = eeOpenFromTooltip;

})();
