import { describe, it, expect } from 'vitest'; // @ts-ignore
import * as fs from 'fs';
import * as path from 'path';
import parse from 'html-dom-parser';
import {
    parseGo,
    parseRvm,
    parseAS,
    parseElixir,
    parseExifTool,
    parseRuby,
    parseIntelliJ,
    parseSdlMame,
    parseSublime,
    parsePython,
    parseD,
    parseC3,
    parseEclipse,
} from './htmlsources';
import { Earl } from '../../ute/earl';

const fixturesDir = path.join(__dirname, '__fixtures__');

/**
 * Load a fixture HTML file and parse it into a DOM
 */
function loadFixture(filename: string) {
    const filepath = path.join(fixturesDir, filename);
    const html = fs.readFileSync(filepath, 'utf-8');
    return parse(html) as any;
}

describe('HTML Sources - Go', () => {
    it('should parse Go version from fixture', () => {
        const dom = loadFixture('go.html');
        const result = parseGo(dom);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Go');
        expect(result[0]).toHaveProperty('ver');
        expect(result[0]).toHaveProperty('src', 'go.dev');
    });
});

describe('HTML Sources - RVM', () => {
    it('should parse RVM version from fixture', () => {
        const dom = loadFixture('rvm.html');
        const result = parseRvm(dom);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Retro Virtual Machine');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - Android Studio', () => {
    it('should parse Android Studio version from fixture', () => {
        const dom = loadFixture('as.html');
        const result = parseAS(dom);
        
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('name');
        expect(result[0].name).toMatch(/Android Studio/);
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - Elixir', () => {
    it('should parse Elixir version from fixture', () => {
        const dom = loadFixture('elixir.html');
        const result = parseElixir(dom);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Elixir');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - ExifTool', () => {
    it('should parse ExifTool version from fixture', () => {
        const dom = loadFixture('exiftool.html');
        const result = parseExifTool(dom);
        
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - Ruby', () => {
    it('should parse Ruby version from fixture', () => {
        const dom = loadFixture('ruby.html');
        const result = parseRuby(dom);
        
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('name');
        expect(result[0].name).toMatch(/Ruby/);
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - IntelliJ', () => {
    it('should parse IntelliJ IDEA version from fixture', () => {
        const dom = loadFixture('idea.html');
        const result = parseIntelliJ('Idea', /IntelliJ IDEA (\d+\.\d+(?:\.\d+)?)/, 'IntelliJ IDEA', dom);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'IntelliJ IDEA');
        expect(result[0]).toHaveProperty('ver');
    });

    it('should parse RustRover version from fixture', () => {
        const dom = loadFixture('rustrover.html');
        const result = parseIntelliJ('RR', /IntelliJ Rust for (\d+\.\d+(?:\.\d+)?)/, 'RustRover', dom);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'RustRover');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - SDL MAME', () => {
    it('should parse SDL MAME version from fixture', () => {
        const dom = loadFixture('sdlmame.html');
        const result = parseSdlMame(dom);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'SDL MAME');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - Sublime', () => {
    it('should parse Sublime version from fixture', () => {
        const dom = loadFixture('sublime.html');
        const result = parseSublime(dom);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Sublime Text');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - Python', () => {
    it('should parse Python version from fixture', async () => {
        const dom = loadFixture('python.html');
        const mockEarl = {
            setPathname: () => {},
            fetchDom: async () => loadFixture('python-release.html'),
            getUrlString: () => 'https://www.python.org/release',
        } as unknown as Earl;
        
        const result = await parsePython(dom, mockEarl);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Python');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - D', () => {
    it('should parse D version from fixture', () => {
        const dom = loadFixture('d.html');
        const mockEarl = {
            getUrlString: () => 'https://dlang.org/changelog/',
        } as unknown as Earl;
        
        const result = parseD(dom, mockEarl);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'D');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('HTML Sources - C3', () => {
    it('should parse C3 version from fixture', () => {
        const dom = loadFixture('c3.html');
        const mockEarl = {
            getUrlString: () => 'https://c3-lang.org',
        } as unknown as Earl;
        
        const result = parseC3(dom, mockEarl);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'C3');
        expect(result[0]).toHaveProperty('ver');
    });
});

// NOTE: Eclipse HTML scraper is deprecated - now using JSON version in jsonsources.ts
// This test is permanently skipped. Eclipse is tested in jsonsources.test.ts
describe('HTML Sources - Eclipse', () => {
    it.skip('Eclipse migrated to JSON sources (jsonsources.ts)', () => {
        // See commands/latest/jsonsources.test.ts for Eclipse tests
    });
});
