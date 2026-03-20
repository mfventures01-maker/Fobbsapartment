// ================================================================
// 🛸 ANTI-GRAVITY PROBE v1.0
// Team telemetry utility - DO NOT MODIFY WITHOUT REVIEW
// ================================================================
// Status: LEVITATING ABOVE THE SYSTEM
// Mission: Map EVERY handshake, payload, and resonance point
// ================================================================

(function () {
    if (typeof console !== 'undefined') {
        console.log('%c🚀 ANTI-GRAVITY PROBE DEPLOYED', 'font-size:24px; color: #00ffff; text-shadow: 0 0 10px cyan;');
        console.log('%cMapping all terminal handshakes...\n', 'font-size:16px; color: #ff00ff;');
    }
})();

// ================================================================
// TERMINAL TELEMETRY COLLECTORS
// ================================================================

function generateHandshakeId() { return 'hs_' + Math.random().toString(36).substr(2, 9); }
function extractFormData(target) { return target ? {} : null; } // Placeholder

const TerminalProbes = {
    staff: {
        selector: '[data-terminal="staff"], .staff-terminal, #staff-pos',
        events: ['click', 'keypress', 'submit', 'payment'],
        intercept: (e) => ({
            terminal: 'STAFF',
            action: e.type,
            target: e.target.id || e.target.className,
            timestamp: new Date().toISOString(),
            payload: e.detail || extractFormData(e.target),
            handshakeId: generateHandshakeId()
        })
    },
    manager: {
        selector: '[data-terminal="manager"], .manager-dashboard, #manager-panel',
        events: ['click', 'approve', 'reject', 'override'],
        intercept: (e) => ({
            terminal: 'MANAGER',
            action: e.type,
            target: e.target.id || e.target.className,
            timestamp: new Date().toISOString(),
            decision: e.detail?.decision,
            reason: e.detail?.reason,
            handshakeId: generateHandshakeId()
        })
    },
    ceo: {
        selector: '[data-terminal="ceo"], .ceo-dashboard, #executive-view',
        events: ['view', 'export', 'audit', 'override-system'],
        intercept: (e) => ({
            terminal: 'CEO',
            action: e.type,
            target: e.target.id || e.target.className,
            timestamp: new Date().toISOString(),
            scope: 'GLOBAL',
            handshakeId: generateHandshakeId()
        })
    },
    store: {
        selector: '[data-terminal="store"], .store-dashboard, #inventory-view',
        events: ['inventory-check', 'stock-update', 'reorder'],
        intercept: (e) => ({
            terminal: 'STORE',
            action: e.type,
            target: e.target.id || e.target.className,
            timestamp: new Date().toISOString(),
            inventory: e.detail?.inventory,
            handshakeId: generateHandshakeId()
        })
    },
    kitchen: {
        selector: '[data-terminal="kitchen"], .kitchen-display, #order-ticket',
        events: ['order-received', 'order-started', 'order-completed'],
        intercept: (e) => ({
            terminal: 'KITCHEN',
            action: e.type,
            orderId: e.detail?.orderId,
            items: e.detail?.items,
            status: e.detail?.status,
            timestamp: new Date().toISOString(),
            handshakeId: generateHandshakeId()
        })
    }
};

const rpcLog = [];

// ================================================================
// 🕸️ RPC FUNCTION SNIFFER
// ================================================================

const RPCProbe = {
    originalFetch: typeof window !== 'undefined' ? window.fetch : null,

    initialize() {
        if (typeof window === 'undefined') return;
        console.log('%c🔍 RPC Probe: Monitoring all Supabase calls', 'color: #ffaa00;');

        window.fetch = async (...args) => {
            const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
            const options = args[1] || {};

            if (url.includes('/rest/v1/rpc/') || url.includes('supabase.co')) {
                const rpcCall = {
                    type: 'RPC_FETCH',
                    function: url.split('/rpc/')[1] || 'unknown',
                    method: options.method || 'GET',
                    payload: options.body ? JSON.parse(options.body) : null,
                    headers: options.headers,
                    timestamp: new Date().toISOString(),
                    handshakeId: generateHandshakeId()
                };

                rpcLog.push(rpcCall);
                console.log('%c📡 RPC CALL DETECTED', 'color: #00ff00; font-weight: bold;', rpcCall);
                window.dispatchEvent(new CustomEvent('rpc-call', { detail: rpcCall }));
            }

            return this.originalFetch.apply(window, args);
        };

        const originalWebSocket = window.WebSocket;
        if (originalWebSocket) {
            window.WebSocket = function (...args) {
                const ws = new originalWebSocket(...args);
                if (args[0].includes('supabase') || args[0].includes('realtime')) {
                    console.log('%c🔌 REALTIME CHANNEL OPENED', 'color: #ff66ff;', args[0]);
                    ws.addEventListener('message', (e) => {
                        try {
                            const data = JSON.parse(e.data);
                            console.log('%c📨 REALTIME MESSAGE', 'color: #66ff66;', {
                                channel: args[0],
                                data: data,
                                timestamp: new Date().toISOString()
                            });
                        } catch (err) { }
                    });
                }
                return ws;
            };
        }
    }
};

// ================================================================
// 🔄 HANDSHAKE RESONANCE MAPPER
// ================================================================

const HandshakeVisualizer = {
    handshakes: [],

    init() {
        if (typeof document === 'undefined') return;
        console.log('%c🔄 Handshake Visualizer: Mapping all connections', 'color: #00aaff;');

        Object.keys(TerminalProbes).forEach(terminal => {
            document.addEventListener(terminal, (e) => {
                this.recordHandshake(e.detail);
            });
        });

        window.addEventListener('rpc-call', (e) => {
            this.recordHandshake({ ...e.detail, type: 'backend' });
        });

        this.render();
    },

    recordHandshake(data) {
        this.handshakes.push({
            ...data,
            id: generateHandshakeId(),
            receivedAt: new Date().toISOString()
        });
        this.updateUI();
    },

    render() {
        const container = document.createElement('div');
        container.id = 'handshake-visualizer';
        container.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; width: 400px; height: 300px;
            background: rgba(0,0,0,0.9); border: 2px solid #00ffff; border-radius: 10px;
            padding: 10px; z-index: 999999; font-family: monospace; color: #00ff00;
            overflow-y: auto; box-shadow: 0 0 20px cyan;
        `;

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid cyan;">
                <span>🔄 LIVE HANDSHAKES</span>
                <span style="color: yellow;" id="handshake-count">0</span>
            </div>
            <div id="handshake-list" style="margin-top: 10px;"></div>
        `;

        document.body.appendChild(container);
    },

    updateUI() {
        const list = document.getElementById('handshake-list');
        const count = document.getElementById('handshake-count');

        if (list) {
            list.innerHTML = this.handshakes.slice(-10).reverse().map(h => `
                <div style="border-bottom: 1px solid #333; padding: 5px; font-size: 11px;">
                    <span style="color: ${this.getTerminalColor(h.terminal)}">⬤</span>
                    <span style="color: #fff;">${h.terminal || h.type}:</span>
                    <span style="color: #ffaa00;">${h.function || h.action}</span>
                    <span style="color: #666; float: right;">${(h.timestamp || new Date().toISOString()).slice(11, 19)}</span>
                </div>
            `).join('');
            if (count) count.textContent = this.handshakes.length;
        }
    },

    getTerminalColor(terminal) {
        const colors = { staff: '#00ff00', manager: '#ffff00', ceo: '#ff00ff', store: '#00ffff', kitchen: '#ff6600', backend: '#ff0000' };
        return colors[terminal ? terminal.toLowerCase() : ''] || '#ffffff';
    }
};

// ================================================================
// DEPLOYMENT
// ================================================================

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    (function deployAntiGravityProbe() {
        console.log('%c🚀 ANTI-GRAVITY PROBE: INITIALIZING...', 'font-size:20px; color: #ff00ff;');
        RPCProbe.initialize();
        HandshakeVisualizer.init();

        Object.keys(TerminalProbes).forEach(terminal => {
            const probe = TerminalProbes[terminal];
            document.querySelectorAll(probe.selector).forEach(el => {
                probe.events.forEach(eventType => {
                    el.addEventListener(eventType, (e) => {
                        const data = probe.intercept(e);
                        console.log('%c[' + terminal.toUpperCase() + '] ' + eventType, 'color: ' + HandshakeVisualizer.getTerminalColor(terminal), data);
                        window.dispatchEvent(new CustomEvent(terminal, { detail: data }));
                    }, true);
                });
            });
        });

        console.log('%c✅ ANTI-GRAVITY PROBE ACTIVE - LEVITATING ABOVE SYSTEM', 'color: #00ff00; font-size: 16px;');
    })();
}
