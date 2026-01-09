import { describe, it, expect } from 'vitest'; // @ts-ignore
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

describe('JSON Sources - Node.js', () => {
    it('should parse Node.js version from fixture', () => {
        const data = loadFixture('nodejs.json');
        const result = parseNodejs(data);

        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result[0]).toHaveProperty('name');
        expect(result[0].name).toMatch(/Node/);
        expect(result[0]).toHaveProperty('ver');
        expect(result[0]).toHaveProperty('src', 'nodejs.org');
    });
});

describe('JSON Sources - Gimp', () => {
    it('should parse Gimp version from fixture', () => {
        const data = loadFixture('gimp.json');
        const result = parseGimp(data);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Gimp');
        expect(result[0]).toHaveProperty('ver');
        expect(result[0]).toHaveProperty('src', 'gitlab');
    });
});

describe('JSON Sources - Xcode', () => {
    it('should parse Xcode version from fixture', () => {
        const data = loadFixture('xcode.json');
        const result = parseXcode(data);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Xcode');
        expect(result[0]).toHaveProperty('ver');
        expect(result[0]).toHaveProperty('src', 'xcodereleases.com');
    });
});

describe('JSON Sources - MAME', () => {
    it('should parse MAME version from fixture', () => {
        const data = loadFixture('mame.json');
        const result = parseMame(data);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'MAME');
        expect(result[0]).toHaveProperty('ver');
    });
});

describe('JSON Sources - Dart', () => {
    it('should parse Dart version from fixture', () => {
        const data = loadFixture('dart.json');
        const result = parseDart(data);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Dart');
        expect(result[0]).toHaveProperty('ver');
        expect(result[0]).toHaveProperty('src', 'googleapis.com');
    });
});

describe('JSON Sources - PHP', () => {
    it('should parse PHP version from fixture', () => {
        const data = loadFixture('php.json');
        const result = parsePhp(data);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'PHP');
        expect(result[0]).toHaveProperty('ver');
        expect(result[0]).toHaveProperty('src', 'php.net');
    });
});

describe('JSON Sources - Eclipse', () => {
    it('should parse Eclipse version from fixture', () => {
        const data = loadFixture('eclipse-data.json');
        const result = parseEclipse(data);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', 'Eclipse');
        expect(result[0]).toHaveProperty('ver');
        expect(result[0]).toHaveProperty('link');
        expect(result[0].link).toMatch(/eclipse\.org.*2025-12/);
        expect(result[0]).toHaveProperty('src', 'eclipse.org');
    });
});
