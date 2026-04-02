# Learning Records

## 2026-03-24

### Category: best_practice

### Vite/esbuild Security Vulnerability Decision

**Issue**: esbuild <=0.24.2 and vite <=6.1.6 have security vulnerabilities that allow malicious websites to read responses from the development server.

**Decision**: Not fixing since:
1. User only builds the app, doesn't run dev server
2. Vulnerabilities only affect `npm run dev` (development server)
3. Production builds and end users are not affected

**Location**: package.json dependencies

**Status**: Recorded but not fixed

---

## Summary of All Fixes Completed (2026-03-24)

### Security Fixes
| Issue | Status |
|-------|--------|
| Electron upgrade to 41.0.3 | ✅ Completed |
| xlsx → exceljs replacement | ✅ Completed |
| flatted vulnerability | ✅ Fixed via npm audit fix |
| esbuild/vite vulnerability | 📝 Recorded (not fixing - not needed) |

### Code Fixes
| Issue | Status |
|-------|--------|
| H-1: RAR validation silently returning valid:true | ✅ Fixed |
| H-2: 7z files have no validation | ✅ Fixed |
| H-3: reset function preserves file state | ✅ Fixed |
| M-1: cancel operation state transition | ✅ Fixed |
| M-2: memory cache cleanup | ✅ Fixed |
| M-3: progress parsing regex | ✅ Fixed |
| L-1: Homebrew PATH detection | ✅ Fixed |
