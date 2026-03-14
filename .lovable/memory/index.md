# Memory: index.md
Updated: now

Cards Against Humanity clone with dark theme, gold accents (HSL 43 100% 50%), Inter font.
- SP and MP modes are fully separate (sp_profiles, mp_profiles tables)
- StatusIndicator = small circle indicator (lucide Circle), StatusBadge = CVA badge component (named export only)
- Auth uses username-based login via get_email_by_username RPC
- Game has czar rotation with AI czar support in SP mode
- Chat: GameChat (SP, text only), RoomChat (MP, media+voice)
- Email domain: notify.devilexotic.com (DNS verifying)
- Never edit: client.ts, types.ts, config.toml, .env
