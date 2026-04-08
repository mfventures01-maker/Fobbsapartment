-- Analytics for QR codes and Restaurant Orders
CREATE TABLE IF NOT EXISTS public.qr_scan_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id TEXT NOT NULL,
    session_id UUID,
    user_agent TEXT,
    scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_submission_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
    total_amount NUMERIC(10, 2),
    item_count INT,
    session_id UUID,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Turn on RLS
ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_submission_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Allow anonymous inserts for qr_scan_events" ON public.qr_scan_events
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts for order_submission_events" ON public.order_submission_events
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow public reads for analytics (since it's protected by password in UI)
CREATE POLICY "Allow public reads for qr_scan_events" ON public.qr_scan_events
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public reads for order_submission_events" ON public.order_submission_events
    FOR SELECT TO anon, authenticated USING (true);
