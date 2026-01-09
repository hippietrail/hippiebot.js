# HTML Sources Testing Guide

## Refactoring Summary

All HTML-based version checkers in `htmlsources.ts` have been refactored to separate the **parse** logic from the **fetch** logic. This enables:
- Unit testing without network calls
- DRY code (single implementation used by both tests and bot)
- Easy debugging and fixture-based development

## Structure

Each HTML scraper now has two functions:

```ts
// Parse function (pure, testable)
export function parse{Name}(body: DomNode, ...args): any[]

// Fetch wrapper (for Discord bot)
export async function call{Name}(): Promise<any[]>
```

### Example: Eclipse

```ts
// Parse: pure function that operates on DOM
export function parseEclipse(body: DomNode, eclipseEarl: Earl): any[] { ... }

// Call: fetch + parse
export async function callEclipse() {
    const eclipseEarl = new Earl('https://download.eclipse.org', '/eclipse/downloads/');
    return parseEclipse(await eclipseEarl.fetchDom(), eclipseEarl);
}
```

## Running Tests

### Prerequisites

```bash
npm install
```

### Run all HTML source tests

```bash
npm run test:html
```

### Run tests for a specific source (e.g., Eclipse)

```bash
npm run test:eclipse
```

### Run tests in watch mode (auto-reruns on file change)

```bash
npx vitest watch htmlsources.test.ts
```

### Run a single test by name

```bash
npx vitest run htmlsources.test.ts -t "should parse Eclipse"
```

## Creating Fixtures

Tests use HTML fixtures stored in `__fixtures__/` directory.

To create a fixture for testing Eclipse:

1. Save the actual HTML from `https://download.eclipse.org/eclipse/downloads/` to `__fixtures__/eclipse.html`
2. Unskip the Eclipse test in `htmlsources.test.ts`:
   ```ts
   it.skip('should parse Eclipse...') // Remove .skip
   ```
3. Run: `npm run test:eclipse`
4. Fix any parsing errors by inspecting the fixture HTML

### Downloading fixtures

You can fetch and save HTML for a source like this:

```bash
curl -s https://download.eclipse.org/eclipse/downloads/ > commands/latest/__fixtures__/eclipse.html
```

## Current Test Status

All tests are currently **skipped** (`.skip`) because fixtures haven't been created yet. To enable them:

1. Add fixture HTML files to `__fixtures__/`
2. Remove `.skip` from the test
3. Run the test and fix parsing if HTML structure changed

## Bot Integration

The refactoring is **fully backward compatible**. The Discord bot continues to use the `call{Name}()` functions exactly as before.

When you restart the bot, it should work identically. Any bugs in parsing will show up immediately when testing with fixtures.

## Adding a New HTML Source

1. Create two functions in `htmlsources.ts`:
   ```ts
   export function parse{Name}(body: DomNode, ...requiredArgs): any[] { ... }
   export async function call{Name}() { ... }
   ```

2. Add a test to `htmlsources.test.ts`:
   ```ts
   describe('HTML Sources - {Name}', () => {
       it.skip('should parse {Name} version from fixture', () => {
           const dom = loadFixture('{name}.html');
           const result = parse{Name}(dom);
           expect(result).toHaveLength(1);
       });
   });
   ```

3. Add fixture file to `__fixtures__/{name}.html`

4. Unskip test and run: `npm run test:html`
