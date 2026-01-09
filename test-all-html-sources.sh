#!/bin/bash

# Download all HTML fixtures
echo "📥 Downloading HTML fixtures..."

curl -s https://go.dev/doc/devel/release > commands/latest/__fixtures__/go.html && echo "  ✓ go.html"
curl -s https://www.retrovirtualmachine.org/changelog/ > commands/latest/__fixtures__/rvm.html && echo "  ✓ rvm.html"
curl -s "https://androidstudio.googleblog.com/search?max-results=24" > commands/latest/__fixtures__/as.html && echo "  ✓ as.html"
curl -s https://elixir-lang.org/blog/categories.html > commands/latest/__fixtures__/elixir.html && echo "  ✓ elixir.html"
curl -s https://exiftool.org/history.html > commands/latest/__fixtures__/exiftool.html && echo "  ✓ exiftool.html"
curl -s https://www.ruby-lang.org/en/downloads/releases/ > commands/latest/__fixtures__/ruby.html && echo "  ✓ ruby.html"
curl -s https://blog.jetbrains.com/idea/category/releases/ > commands/latest/__fixtures__/idea.html && echo "  ✓ idea.html"
curl -s https://blog.jetbrains.com/rust/category/releases/ > commands/latest/__fixtures__/rustrover.html && echo "  ✓ rustrover.html"
curl -s https://sdlmame.lngn.net/stable/ > commands/latest/__fixtures__/sdlmame.html && echo "  ✓ sdlmame.html"
curl -s https://www.sublimetext.com/download > commands/latest/__fixtures__/sublime.html && echo "  ✓ sublime.html"
curl -s https://www.python.org > commands/latest/__fixtures__/python.html && echo "  ✓ python.html"
curl -s https://www.python.org/downloads/release/python-312/ > commands/latest/__fixtures__/python-release.html && echo "  ✓ python-release.html"
curl -s https://dlang.org/changelog/ > commands/latest/__fixtures__/d.html && echo "  ✓ d.html"
curl -s https://c3-lang.org > commands/latest/__fixtures__/c3.html && echo "  ✓ c3.html"
curl -s https://download.eclipse.org/eclipse/downloads/ > commands/latest/__fixtures__/eclipse.html && echo "  ✓ eclipse.html"

echo ""
echo "🔧 Removing .skip from all tests..."
sed -i '' 's/it\.skip(/it(/g' commands/latest/htmlsources.test.ts
echo "  ✓ Tests enabled"

echo ""
echo "🧪 Running all HTML source tests..."
echo ""

npm run test:html

echo ""
echo "ℹ️  To re-disable tests, run:"
echo "   sed -i '' 's/it(/it.skip(/g' commands/latest/htmlsources.test.ts"
