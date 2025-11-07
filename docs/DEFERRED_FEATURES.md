# Deferred Features - For Later Implementation

## Phase 4: Database Layout Persistence (2-3 hours)
Currently using localStorage. Future improvements:

**API Endpoints Needed:**
- `POST /api/layouts` - Save layout to database
- `GET /api/layouts` - Load user's layouts
- `PATCH /api/layouts/[id]` - Update layout
- `DELETE /api/layouts/[id]` - Delete layout

**Features:**
- [ ] Save layouts to PostgreSQL
- [ ] Load user's saved layouts on login
- [ ] Multiple layout presets per user
- [ ] Default layout selection
- [ ] Share layouts between users
- [ ] Layout versioning

**Database:** Already have Layout and Widget models in Prisma schema

---

## Phase 5: Advanced Features (4-6 hours)

### WebSocket Real-Time Updates
Currently using 5-10 second polling. For sub-second updates:
- [ ] Replace polling with WebSocket connections
- [ ] Implement server-side WebSocket aggregator (already designed in Phase 2)
- [ ] Real-time price updates (<1 second)
- [ ] Real-time options chain updates
- [ ] Live options flow tracking

**Note:** WebSocket infrastructure already built in `src/lib/socket/` - just needs activation

### Options Advanced Features
- [ ] **Strategy Builder** - Multi-leg options strategies
- [ ] **Max Pain Calculator** - Calculate max pain strike
- [ ] **Greeks Calculator** - Full Greeks calculations (not just from API)
- [ ] **IV Surface** - 3D implied volatility surface
- [ ] **Options Screener** - Filter options by criteria

### Trading Features
- [ ] **Price Alerts** - Set price alerts with notifications
- [ ] **Watchlist Alerts** - Alert when watchlist symbols move
- [ ] **Options Alerts** - Alert on unusual options activity
- [ ] **Notifications System** - Browser notifications

### Analytics
- [ ] **Performance Tracking** - Track portfolio performance
- [ ] **Historical Analysis** - Backtest strategies
- [ ] **Market Sentiment** - Aggregate market sentiment
- [ ] **News Integration** - Real-time news widget

### UI/UX Enhancements
- [ ] **Theme System** - Dark/Light/Custom themes
- [ ] **Widget Templates** - Pre-made widget layouts
- [ ] **Export Dashboard** - Export to PDF/Image
- [ ] **Keyboard Shortcuts** - Power user shortcuts
- [ ] **Mobile Optimizations** - Better mobile experience
- [ ] **Widget Search** - Search within widget data

### Performance
- [ ] **Table Virtualization** - For large datasets (react-window)
- [ ] **Lazy Loading** - Lazy load widget data
- [ ] **Caching Strategy** - Better caching with Redis
- [ ] **WebWorkers** - Heavy calculations in workers
- [ ] **Service Worker** - PWA capabilities

---

## Phase 6: Production Readiness (2-3 hours)

### Security
- [ ] **Rate Limiting** - Implement per-user rate limits
- [ ] **API Key Management** - User-managed API keys
- [ ] **Session Management** - Better session handling
- [ ] **CSRF Protection** - Cross-site request forgery protection

### Deployment
- [ ] **Docker** - Containerize application
- [ ] **SSL/HTTPS** - Add SSL certificate
- [ ] **CDN** - Static asset delivery
- [ ] **Monitoring** - Application monitoring (Sentry)
- [ ] **Analytics** - Usage analytics
- [ ] **Backup Strategy** - Database backups

### Documentation
- [ ] **API Documentation** - Swagger/OpenAPI docs
- [ ] **User Guide** - Complete user documentation
- [ ] **Video Tutorials** - Screen recordings
- [ ] **FAQ** - Common questions

---

## Current Status (Phase 3 Complete)

**What's Working Now:**
- ✅ Complete dashboard grid with drag & drop
- ✅ 6 fully functional widgets
- ✅ Real-time stock data (5-second polling)
- ✅ Options chain with Greeks
- ✅ Live charts with TradingView
- ✅ Layout persistence (localStorage)
- ✅ Options API endpoints

**What Needs UI Polish (IMMEDIATE):**
- 🔧 Widget toolbar styling (too large)
- 🔧 Widget content overflow fixes
- 🔧 Better typography and readability
- 🔧 Improved spacing and padding
- 🔧 Better resize handles
- 🔧 Overall aesthetics

---

## Priority Order

**Immediate (Next 1-2 hours):**
1. Fix UI/UX issues (widget toolbar, overflow, readability)
2. Polish existing widgets
3. Improve overall aesthetics

**Short Term (Next session):**
4. Phase 4: Database persistence
5. WebSocket activation for real-time data

**Medium Term:**
6. Advanced options features
7. Alerts and notifications
8. Performance optimizations

**Long Term:**
9. Production deployment
10. Advanced analytics
11. Mobile app

---

## Notes

- WebSocket code is already written but using polling for stability
- Database schema supports all deferred features
- Most infrastructure is ready, just needs activation
- Focus on UX before adding more features
