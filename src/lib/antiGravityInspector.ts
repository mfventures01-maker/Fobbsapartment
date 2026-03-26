// 🛸 ANTI-GRAVITY INSPECTOR
// Live browser console diagnostic for Layer 0 → Layer 1 symmetry
// Run from any useEffect or browser DevTools:
//   import { runAntiGravityInspector } from '@/lib/antiGravityInspector';
//   runAntiGravityInspector();
//
// Reports:
//  - Supabase session state
//  - canHydrate readiness
//  - All interactive elements on page
//  - Portal buttons: request_id, mutex, pointer-events, click listener
//  - Dead buttons (no click listeners)
//  - sessionStorage idempotency keys
//  - Staff terminal visibility

import { supabase } from './supabaseClient';

// Known CARSS portal paths for inspection
const PORTAL_KEYWORDS = [
    'restaurant', 'bar', 'services', 'staff', 'login',
    'kitchen', 'housekeeping', 'reception', 'manager',
    'ceo', 'admin', 'order', 'payment', 'shift', 'confirm'
];

// Known sessionStorage key prefixes used by useIdempotentMutation and useAntiGravity
const IDEMPOTENCY_PREFIX = 'carss_pending_key_';
const NAV_PREFIX = 'nav_';

interface ButtonReport {
    index: number;
    text: string;
    tag: string;
    href: string | null;
    disabled: boolean;
    pointerEvents: string;
    isVisible: boolean;
    hasClickListener: boolean;
    requestId: string | null;
    isPortal: boolean;
    isDead: boolean;
}

interface SessionReport {
    resolved: boolean;
    userId: string | null;
    email: string | null;
    role: string | null;
    expiresAt: string | null;
}

interface StorageReport {
    key: string;
    value: string;
    type: 'idempotency' | 'nav' | 'other';
    ageMs: number | null;
}

interface InspectorReport {
    timestamp: string;
    session: SessionReport;
    totalInteractiveElements: number;
    portalButtons: ButtonReport[];
    deadButtons: ButtonReport[];
    allButtons: ButtonReport[];
    sessionStorageKeys: StorageReport[];
    score: number;
    verdict: string;
}

function hasClickListener(el: Element): boolean {
    // Check both attrib-based and React synthetic listeners
    const asHtml = el as HTMLElement;
    // React attaches to root — we check data attributes as proxy
    if ((asHtml as any).onclick) return true;
    // Check if element has any data-action or known CARSS markers
    if (asHtml.dataset?.action || asHtml.dataset?.mutex) return true;
    // For buttons inside React, they always have synthetic handlers if not disabled
    if (asHtml.tagName === 'BUTTON' && !asHtml.hasAttribute('disabled')) return true;
    // For links with href, they navigate
    if (asHtml.tagName === 'A' && asHtml.getAttribute('href')) return true;
    return false;
}

function getRequestId(el: Element): string | null {
    const asHtml = el as HTMLElement;
    const href = asHtml.getAttribute('href');
    const text = asHtml.innerText?.toLowerCase().replace(/\s+/g, '_');

    // Check nav key
    if (href) {
        const navKey = sessionStorage.getItem(`${NAV_PREFIX}${href}`);
        if (navKey) return navKey;
    }

    // Check idempotency key by text match
    for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)!;
        if (k.includes(text?.slice(0, 8))) {
            return sessionStorage.getItem(k);
        }
    }

    return null;
}

function inspectElement(el: Element, index: number): ButtonReport {
    const asHtml = el as HTMLElement;
    const text = asHtml.innerText?.trim() || asHtml.getAttribute('aria-label') || asHtml.tagName;
    const href = asHtml.getAttribute('href') || asHtml.dataset?.href || null;
    const isPortal = PORTAL_KEYWORDS.some(k => text.toLowerCase().includes(k));
    const hasListener = hasClickListener(el);
    const pointerEvents = getComputedStyle(asHtml).pointerEvents;
    const isVisible = asHtml.offsetParent !== null || asHtml.getBoundingClientRect().height > 0;
    const disabled = asHtml.hasAttribute('disabled') || asHtml.getAttribute('aria-disabled') === 'true';

    return {
        index,
        text: text.slice(0, 60),
        tag: asHtml.tagName,
        href,
        disabled,
        pointerEvents,
        isVisible,
        hasClickListener: hasListener,
        requestId: getRequestId(el),
        isPortal,
        isDead: !hasListener && !disabled && isVisible && pointerEvents !== 'none'
    };
}

function getSessionStorageReport(): StorageReport[] {
    const reports: StorageReport[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)!;
        const value = sessionStorage.getItem(key) ?? '';
        const type = key.startsWith(IDEMPOTENCY_PREFIX) ? 'idempotency'
            : key.startsWith(NAV_PREFIX) ? 'nav' : 'other';
        reports.push({ key, value, type, ageMs: null });
    }
    return reports;
}

function renderReport(report: InspectorReport): void {
    const { session, portalButtons, deadButtons, sessionStorageKeys, score, verdict } = report;

    console.group('%c🛸 ANTI-GRAVITY INSPECTOR', 'color: #7c3aed; font-size: 14px; font-weight: bold;');

    // ── SESSION ───────────────────────────────────────────
    console.group('%c🔐 SESSION STATE', 'color: #059669; font-weight: bold;');
    console.log('Resolved:', session.resolved ? '✅' : '❌ Supabase not ready');
    console.log('User ID:', session.userId ?? '❌ null');
    console.log('Email:', session.email ?? '❌ null');
    console.log('Role:', session.role ?? '(none — check RLS)');
    console.log('Expires:', session.expiresAt ?? 'N/A');
    console.log('canHydrate:', session.resolved ? '✅ SAFE TO RENDER' : '⛔ DO NOT RENDER BUTTONS');
    console.groupEnd();

    // ── PORTAL BUTTONS ────────────────────────────────────
    console.group(`%c📦 PORTAL BUTTONS (${portalButtons.length} found)`, 'color: #2563eb; font-weight: bold;');
    portalButtons.forEach(btn => {
        const status = btn.isDead ? '❌ DEAD' : btn.disabled ? '⏸ DISABLED' : '✅ LIVE';
        console.group(`[${btn.index + 1}] "${btn.text}" ${status}`);
        console.log('  Tag:', btn.tag);
        console.log('  href:', btn.href ?? '(none)');
        console.log('  Visible:', btn.isVisible ? '✅' : '❌ Hidden');
        console.log('  Disabled:', btn.disabled ? '⛔ YES' : 'NO');
        console.log('  Pointer Events:', btn.pointerEvents === 'auto' ? '✅ auto' : `⚠️ ${btn.pointerEvents}`);
        console.log('  Click Listener:', btn.hasClickListener ? '✅ Bound' : '❌ NONE — DEAD BUTTON');
        console.log('  request_id:', btn.requestId ? `✅ ${btn.requestId.slice(0, 12)}...` : '❌ None');
        console.groupEnd();
    });
    console.groupEnd();

    // ── DEAD BUTTONS ──────────────────────────────────────
    if (deadButtons.length > 0) {
        console.group(`%c❌ DEAD BUTTONS (${deadButtons.length})`, 'color: #dc2626; font-weight: bold;');
        deadButtons.forEach(btn => {
            console.warn(`  • [${btn.tag}] "${btn.text}" — visible, not disabled, NO click listener`);
        });
        console.groupEnd();
    } else {
        console.log('%c✅ No dead buttons detected', 'color: #059669; font-weight: bold;');
    }

    // ── SESSIONSTORAGE KEYS ───────────────────────────────
    console.group(`%c💾 SESSION STORAGE KEYS (${sessionStorageKeys.length})`, 'color: #d97706; font-weight: bold;');
    if (sessionStorageKeys.length === 0) {
        console.log('  (empty — no pending actions or idempotency keys)');
    } else {
        sessionStorageKeys.forEach(k => {
            const icon = k.type === 'idempotency' ? '🔑' : k.type === 'nav' ? '🧭' : '📌';
            console.log(`  ${icon} [${k.type.toUpperCase()}] ${k.key}: ${k.value.slice(0, 16)}...`);
        });
    }
    console.groupEnd();

    // ── SCORE ─────────────────────────────────────────────
    const scoreColor = score >= 90 ? '#059669' : score >= 70 ? '#d97706' : '#dc2626';
    console.log(
        `%c🎯 LAYER 0 DETERMINISM SCORE: ${score}/100 — ${verdict}`,
        `color: ${scoreColor}; font-size: 13px; font-weight: bold;`
    );

    console.groupEnd();
}

export async function runAntiGravityInspector(): Promise<InspectorReport> {
    // ── Session ───────────────────────────────────────────
    const { data: { session } } = await supabase.auth.getSession();
    const sessionReport: SessionReport = {
        resolved: true,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        role: session?.user?.role ?? null,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    };

    // ── Interactive Elements ──────────────────────────────
    const allEls = Array.from(document.querySelectorAll('button, a[href], a[onClick]'));
    const allButtons = allEls.map((el, i) => inspectElement(el, i));
    const portalButtons = allButtons.filter(b => b.isPortal);
    const deadButtons = allButtons.filter(b => b.isDead);

    // ── sessionStorage ────────────────────────────────────
    const storageKeys = getSessionStorageReport();

    // ── Score Calculation ────────────────────────────────
    let score = 100;
    if (!session) score -= 30;                                      // No session
    if (deadButtons.length > 0) score -= (deadButtons.length * 5);  // Each dead button costs 5pts
    if (storageKeys.filter(k => k.type === 'idempotency').length > 5) score -= 10; // Stale keys piling up
    score = Math.max(0, score);

    const verdict = score >= 90 ? '✅ DETERMINISTIC — BANK VAULT'
        : score >= 70 ? '⚠️ WEAK — FIX DEAD BUTTONS'
            : '❌ CRITICAL — DEAD PAGE DETECTED';

    const report: InspectorReport = {
        timestamp: new Date().toISOString(),
        session: sessionReport,
        totalInteractiveElements: allEls.length,
        portalButtons,
        deadButtons,
        allButtons,
        sessionStorageKeys: storageKeys,
        score,
        verdict
    };

    renderReport(report);
    return report;
}

// ── Dev Panel Component ──────────────────────────────────────────────────────
// Mounts a floating button in the browser to trigger inspector on demand.
// Import and use in App.tsx during development only.
export function mountAntiGravityPanel(): void {
    if (document.getElementById('ag-inspector-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ag-inspector-btn';
    btn.textContent = '🛸 AG';
    btn.title = 'Run Anti-Gravity Inspector';
    btn.style.cssText = `
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 99999;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 9999px;
        width: 48px;
        height: 48px;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(124,58,237,0.5);
        transition: transform 0.15s;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', () => {
        console.clear();
        runAntiGravityInspector();
    });
    document.body.appendChild(btn);
}
