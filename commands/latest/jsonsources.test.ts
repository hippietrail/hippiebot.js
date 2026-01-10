import { describe, it, expect, beforeAll } from 'vitest'; // @ts-ignore
import * as fs from 'fs';
import * as path from 'path';
import {
    parseNodejs,
    parseGimp,
    parseXcode,
    parseMame,
    parseDart,
    parsePhp,
    parseEclipse,
} from './jsonsources';

const fixturesDir = path.join(__dirname, '__fixtures__');

/**
 * Load a fixture JSON file
 */
function loadFixture(filename: string) {
    const filepath = path.join(fixturesDir, filename);
    const json = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(json);
}

/**
 * Validate that a result object has expected structure
 */
function validateVersionResult(result: any) {
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('ver');
    expect(result).toHaveProperty('src');
    expect(typeof result.name).toBe('string');
    expect(typeof result.ver).toBe('string');
    expect(typeof result.src).toBe('string');
    expect(result.name.length).toBeGreaterThan(0);
    expect(result.ver.length).toBeGreaterThan(0);
}

describe('JSON Sources - Node.js', () => {
    it('should parse Node.js current and LTS versions from fixture', () => {
        const data = loadFixture('nodejs.json');
        const result = parseNodejs(data);

        expect(result.length).toBe(2);
        expect(result[0].name).toMatch(/Node.*Current/);
        expect(result[1].name).toMatch(/Node.*LTS/);
        result.forEach(validateVersionResult);
    });

    it('should have valid timestamps for Node.js results', () => {
        const data = loadFixture('nodejs.json');
        const result = parseNodejs(data);

        result.forEach(item => {
            expect(item.timestamp).toBeInstanceOf(Date);
            expect(item.timestamp.getTime()).toBeGreaterThan(0);
        });
    });

    it('should handle empty data gracefully', () => {
        const result = parseNodejs([]);
        expect(result).toEqual([]);
    });

    it('should handle malformed data gracefully', () => {
        const result = parseNodejs(null as any);
        expect(result).toEqual([]);
    });
});

describe('JSON Sources - Gimp', () => {
    it('should parse Gimp version from fixture', () => {
        const data = loadFixture('gimp.json');
        const result = parseGimp(data);

        expect(result).toHaveLength(1);
        validateVersionResult(result[0]);
        expect(result[0].name).toBe('Gimp');
        expect(result[0].src).toBe('gitlab');
    });

    it('should have valid link to GitLab releases', () => {
        const data = loadFixture('gimp.json');
        const result = parseGimp(data);

        expect(result[0].link).toMatch(/gitlab\.gnome\.org.*gimp.*releases/);
    });

    it('should handle missing STABLE property gracefully', () => {
        const result = parseGimp({});
        expect(result).toEqual([]);
    });

    it('should handle empty STABLE array gracefully', () => {
        const result = parseGimp({ STABLE: [] });
        expect(result).toEqual([]);
    });
});

describe('JSON Sources - Xcode', () => {
    it('should parse Xcode version from fixture', () => {
        const data = loadFixture('xcode.json');
        const result = parseXcode(data);

        expect(result).toHaveLength(1);
        validateVersionResult(result[0]);
        expect(result[0].name).toBe('Xcode');
        expect(result[0].src).toBe('xcodereleases.com');
    });

    it('should have valid release notes link', () => {
        const data = loadFixture('xcode.json');
        const result = parseXcode(data);

        expect(result[0].link).toBeDefined();
        expect(result[0].link).toMatch(/https?:\/\//);
    });

    it('should have valid timestamp', () => {
        const data = loadFixture('xcode.json');
        const result = parseXcode(data);

        expect(result[0].timestamp).toBeInstanceOf(Date);
        expect(result[0].timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should handle empty array gracefully', () => {
        const result = parseXcode([]);
        expect(result).toEqual([]);
    });
});

describe('JSON Sources - MAME', () => {
    it('should parse MAME version from fixture', () => {
        const data = loadFixture('mame.json');
        const result = parseMame(data);

        expect(result).toHaveLength(1);
        validateVersionResult(result[0]);
        expect(result[0].name).toBe('MAME');
    });

    it('should identify GitHub raw content source', () => {
        const data = loadFixture('mame.json');
        const result = parseMame(data);

        expect(result[0].src).toBe('githubusercontent.com');
    });

    it('should return result with undefined version if version missing', () => {
        // Note: parseMame doesn't validate input, just extracts properties
        const result = parseMame({});
        expect(result).toHaveLength(1);
        expect(result[0].ver).toBeUndefined();
    });
});

describe('JSON Sources - Dart', () => {
    it('should parse Dart version from fixture', () => {
        const data = loadFixture('dart.json');
        const result = parseDart(data);

        expect(result).toHaveLength(1);
        validateVersionResult(result[0]);
        expect(result[0].name).toBe('Dart');
        expect(result[0].src).toBe('googleapis.com');
    });

    it('should have valid GitHub release link', () => {
        const data = loadFixture('dart.json');
        const result = parseDart(data);

        expect(result[0].link).toMatch(/github\.com\/dart-lang\/sdk\/releases\/tag\//);
    });

    it('should have valid timestamp', () => {
        const data = loadFixture('dart.json');
        const result = parseDart(data);

        expect(result[0].timestamp).toBeInstanceOf(Date);
        expect(result[0].timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should create link even with partial data', () => {
        // Note: parseDart doesn't validate input, constructs link from version
        const result = parseDart({ version: '1.0', date: '2025-01-01' });
        expect(result).toHaveLength(1);
        expect(result[0].link).toMatch(/github\.com\/dart-lang\/sdk\/releases\/tag\/1\.0/);
    });
});

describe('JSON Sources - PHP', () => {
    it('should parse PHP version from fixture', () => {
        const data = loadFixture('php.json');
        const result = parsePhp(data);

        expect(result).toHaveLength(1);
        validateVersionResult(result[0]);
        expect(result[0].name).toBe('PHP');
        expect(result[0].src).toBe('php.net');
    });

    it('should parse latest major version', () => {
        const data = loadFixture('php.json');
        const result = parsePhp(data);

        // Should parse the last entry (highest major version)
        expect(result[0].ver).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have valid link to changelog', () => {
        const data = loadFixture('php.json');
        const result = parsePhp(data);

        expect(result[0].link).toMatch(/php\.net\/ChangeLog-\d+\.php/);
    });

    it('should have valid timestamp', () => {
        const data = loadFixture('php.json');
        const result = parsePhp(data);

        expect(result[0].timestamp).toBeInstanceOf(Date);
        expect(result[0].timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should handle empty object gracefully', () => {
        const result = parsePhp({});
        expect(result).toEqual([]);
    });
});

describe('JSON Sources - Eclipse', () => {
    it('should parse Eclipse version from fixture', () => {
        const data = loadFixture('eclipse-data.json');
        const result = parseEclipse(data);

        expect(result).toHaveLength(1);
        validateVersionResult(result[0]);
        expect(result[0].name).toBe('Eclipse');
        expect(result[0].src).toBe('eclipse.org');
    });

    it('should have valid year-month format in link', () => {
        const data = loadFixture('eclipse-data.json');
        const result = parseEclipse(data);

        expect(result[0].link).toMatch(/eclipse\.org\/downloads\/packages\/release\/\d{4}-\d{2}\/r/);
    });

    it('should parse version as number only (not year-month)', () => {
        const data = loadFixture('eclipse-data.json');
        const result = parseEclipse(data);

        // Eclipse version should be something like "4.38", not "2025-12"
        expect(result[0].ver).toMatch(/^\d+\.\d+$/);
    });

    it('should have valid timestamp', () => {
        const data = loadFixture('eclipse-data.json');
        const result = parseEclipse(data);

        expect(result[0].timestamp).toBeInstanceOf(Date);
        expect(result[0].timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should handle empty releases array gracefully', () => {
        const result = parseEclipse({ releases: [] });
        expect(result).toEqual([]);
    });

    it('should handle missing releases property gracefully', () => {
        const result = parseEclipse({});
        expect(result).toEqual([]);
    });
});
