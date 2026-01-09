# Earl API Audit

## Earl Constructor API

```ts
constructor(origin: string, optionalBasicPathname?: string, optionalSearchParams?: Record<string, string | number>)
```

**Correct Usage:**
- `origin`: Domain only (e.g., `https://example.com`)
- `optionalBasicPathname`: Path (e.g., `/api/v1` or `/search`)
- `optionalSearchParams`: Query parameters as object

## Issues Found

### 1. ❌ Dynamic paths in constructor

**Problem:** Paths that include user input or variables are passed directly to the constructor, which doesn't support URL encoding or query param handling.

**Files:**
- `commands/es.ts:40` - `new Earl('https://dle.rae.es', word)`
- `commands/isaword.ts:180` - `new Earl(..., '/definition/english/' + word)`
- `commands/isaword.ts:148` - `new Earl(..., '/search/', { query: word })` (mixing path and params)

**Fix:** Use `setPathname()` or `setLastPathSegment()` after construction for dynamic values, or use query params instead.

### 2. ⚠️ Origin with path included

**Problem:** Some uses pass a path as part of the origin string.

**File:**
- `commands/textsources.ts:13` - `new Earl(origin, pathname)` where origin might already include path

**Fix:** Ensure origin is domain-only.

### 3. ✅ Correct Usage Examples

These are correct:
- `new Earl('https://nodejs.org', '/dist/index.json')`
- `new Earl('https://www.php.net', '/releases/index.php')` + `setSearchParam()`
- `new Earl('https://deepdreamgenerator.com/', '/search-text', { q: searchTerm })`

## Recommendation

Create a helper or validation to ensure all Earl instantiations follow the pattern:
1. Origin is domain-only
2. Paths don't include variables (use `setPathname()` or `setLastPathSegment()`)
3. Dynamic values go in query params or are added after construction

## Related Issues

- This was the root cause of the Eclipse JSON scraper bug we fixed
