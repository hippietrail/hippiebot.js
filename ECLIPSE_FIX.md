# Eclipse Scraper - What Happened

## The Problem

The Eclipse downloads page completely changed its architecture. 

**Old approach (what the code expects):**
- Static HTML with `<body id="body_solstice">`
- Table with class `downloads` containing release data
- Could scrape version/date directly from HTML

**New approach (what's actually there):**
- HTML is a shell with empty `<table class="builds-table">` elements
- Uses JavaScript to load data from `data.json`
- Populates tables dynamically on the client side
- The static HTML has no version information

## The HTML Structure

Looking at the fixture (`__fixtures__/eclipse.html`):

```html
<body>
  <main>
    <h3 id="latest-downloads">Latest Downloads</h3>
    <table class="builds-table" data-path="latest"></table>
    
    <h3 id="latest-release">Latest Release</h3>
    <table class="builds-table" data-path="releases"></table>
    
    <!-- More empty tables... -->
  </main>
  <script>
    loadPageData('data.json')  // <-- Data comes from here
    // JavaScript populates the tables
  </script>
</body>
```

## Two Ways to Fix This

### Option 1: Fetch JSON Directly (Recommended)

Since Eclipse now uses a JSON file for data, fetch `data.json` directly:

```ts
export async function callEclipse() {
    const jsonEarl = new Earl('https://download.eclipse.org/eclipse/downloads/', 'data.json');
    const data = await jsonEarl.fetchJson();
    
    // data.releases[0] should have the latest release
    if (data.releases && data.releases[0]) {
        return [{
            name: 'Eclipse',
            ver: data.releases[0].label,
            // ... extract date, etc
        }];
    }
    return [];
}
```

### Option 2: Drop Support

If the JSON format isn't stable or documented, consider deprecating Eclipse support.

## Current Test Status

The test is marked `.skip` because Eclipse is broken. To fix it:

1. Choose Option 1 or Option 2 above
2. Implement the fix in `parseEclipse()`
3. Update `__fixtures__/eclipse.html` (or create a fixture of `data.json`)
4. Remove `.skip` and run: `npm run test:eclipse`

## Files to Modify

- `commands/latest/htmlsources.ts` - Update `parseEclipse()` function
- `commands/latest/htmlsources.test.ts` - Update test when fixed
- `commands/latest/__fixtures__/` - Update or add fixture files
