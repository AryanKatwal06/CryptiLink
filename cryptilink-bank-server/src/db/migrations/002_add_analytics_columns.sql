ALTER TABLE settled_transactions ADD COLUMN IF NOT EXISTS channel_hint TEXT;
ALTER TABLE settled_transactions ADD COLUMN IF NOT EXISTS settlement_latency_ms BIGINT;
