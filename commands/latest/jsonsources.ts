import { Earl } from '../../ute/earl';

// ============================================================================
// NODE.JS
// ============================================================================

interface Rel {
    lts: false | string;
    version: string;
    date: string;
}

export function parseNodejs(data: Rel[]): any[] {
    try {
        return [
            data.find(rel => rel.lts === false),
            data.find(rel => typeof rel.lts === 'string')
        ].map(obj => ({
            name: `Node ${obj!.lts === false ? '(Current)' : `'${obj!.lts}' (LTS)`}`,
            ver: obj!.version,
            link: undefined,
            timestamp: new Date(obj!.date),
            src: 'nodejs.org',
        }));
    } catch (error) {
        console.error(`[Node.js]`, error);
    }
    return [];
}

export async function callNodejs() {
    const nodejsEarl = new Earl('https://nodejs.org', '/dist/index.json');
    return parseNodejs(await nodejsEarl.fetchJson() as Rel[]);
}

// ============================================================================
// GIMP
// ============================================================================

interface GimpJson {
    STABLE: {
        version: string;
        date: string;
    }[];
}

export function parseGimp(gj: GimpJson): any[] {
    try {
        if ('STABLE' in gj && gj.STABLE.length > 0 && 'version' in gj.STABLE[0]) {
            const ver = gj.STABLE[0].version;
            const date = new Date(gj.STABLE[0].date);
            return [{
                name: 'Gimp',
                ver: ver,
                link: `https://gitlab.gnome.org/GNOME/gimp/-/releases/GIMP_${gj.STABLE[0].version.replace(/\./g, '_')}`,
                // the day is not accurate for the news link. 2.10.36 is off by 2 days
                /*link: `https://www.gimp.org/news/${
                    date.getFullYear()
                }/${
                    date.getMonth() + 1
                }/${
                    date.getDate().toString().padStart(2, '0')
                }/gimp-${ver.replace(/\./g, '-')}-released`,*/
                timestamp: date,
                src: 'gitlab',
            }];
        }
    } catch (error) {
        console.error(`[Gimp]`, error);
    }
    return [];
}

let gimpCache: any[] | null = null;
let gimpCacheTime = 0;

export async function callGimp() {
     // Return cached version if less than 24 hours old
     if (gimpCache && Date.now() - gimpCacheTime < 86400000) {
         return gimpCache;
     }

     try {
         const gimpEarl = new Earl('https://gitlab.gnome.org',
             '/Infrastructure/gimp-web/-/raw/testing/content/gimp_versions.json',
             undefined,
             {
                 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                 'Accept': 'application/json',
                 'Accept-Language': 'en-US,en;q=0.9',
                 'Referer': 'https://www.gitlab.gnome.org/'
             });
         const text = await gimpEarl.fetchText();
         const json = JSON.parse(text);
         gimpCache = parseGimp(json as GimpJson);
         gimpCacheTime = Date.now();
         return gimpCache;
     } catch (error) {
         console.error(`[Gimp]`, error);
         // Return stale cache if fetch fails
         if (gimpCache) return gimpCache;
     }
     return [];
}

// ============================================================================
// XCODE
// ============================================================================

interface XcodeJson {
    name: string;
    version: {
        release: { release: boolean; };
        number: string;
    };
    date: {
        year: number;
        month: number;
        day: number;
    };
    links: { notes: { url: string; }; };
}

export function parseXcode(xcj: XcodeJson[]): any[] {
    try {
        const rel = xcj.find(obj => obj.name === 'Xcode' && obj.version.release.release === true);

        if (rel) {
            const timestamp = new Date(rel.date.year, rel.date.month - 1, rel.date.day);
            return [{
                name: 'Xcode',
                ver: rel.version.number,
                link: rel.links.notes.url,
                timestamp,
                src: 'xcodereleases.com',
            }/*, {
                name: 'Swift',
                ver: rel.compilers.swift[0].number,
                link: undefined,
                timestamp,
                src: 'xcodereleases.com',
            }*/];
        }
    } catch (error) {
        console.error(`[Xcode]`, error);
    }
    return [];
}

export async function callXcode() {
    const xcodeEarl = new Earl('https://xcodereleases.com', '/data.json');
    return parseXcode(await xcodeEarl.fetchJson() as XcodeJson[]);
}

// ============================================================================
// MAME
// ============================================================================

interface MameJson { version: string; }

export function parseMame(mamej: MameJson): any[] {
    try {
        return [{
            name: 'MAME',
            ver: mamej.version,
            link: undefined,
            timestamp: undefined,
            src: 'githubusercontent.com',
        }];
    } catch (error) {
        console.error(`[MAME]`, error);
    }
    return [];
}

export async function callMame() {
    const mameEarl = new Earl('https://raw.githubusercontent.com', '/Calinou/scoop-games/master/bucket/mame.json');
    return parseMame(await mameEarl.fetchJson() as MameJson);
}

// ============================================================================
// DART
// ============================================================================

interface DartJson {
    version: string;
    date: string;
}

export function parseDart(dartj: DartJson): any[] {
    try {
        return [{
            name: 'Dart',
            ver: dartj.version,
            link: `https://github.com/dart-lang/sdk/releases/tag/${dartj.version}`,
            timestamp: new Date(dartj.date),
            src: 'googleapis.com',
        }];
    } catch (error) {
        console.error(`[Dart]`, error);
    }
    return [];
}

export async function callDart() {
    const dartEarl = new Earl('https://storage.googleapis.com', '/dart-archive/channels/stable/release/latest/VERSION');
    return parseDart(await dartEarl.fetchJson() as DartJson);
}

// ============================================================================
// PHP
// ============================================================================

interface PhpJson {
    version: string;
    date: string;
}

export function parsePhp(phpj: PhpJson[]): any[] {
    try {
        // we get an object with a key for each major version number, in ascending order
        const latest = Object.values(phpj).pop()!;
        const maj = latest.version.match(/^(\d+)\.\d+\.\d+$/)![1];
        return [{
            name: 'PHP',
            ver: latest.version,
            link: `https://www.php.net/ChangeLog-${maj}.php#${latest.version}`,
            timestamp: new Date(latest.date),
            src: 'php.net',
        }];
    } catch (error) {
        console.error(`[PHP]`, error);
    }
    return [];
}

export async function callPhp() {
    const phpEarl = new Earl('https://www.php.net', '/releases/index.php');
    phpEarl.setSearchParam('json', '');
    return parsePhp(await phpEarl.fetchJson() as PhpJson[]);
}

// ============================================================================
// ECLIPSE
// ============================================================================

interface EclipseBuild {
    label: string;
    date: string;
    path: string;
    status: string;
}

interface EclipseJson {
    releases: EclipseBuild[];
    stableBuilds: EclipseBuild[];
    iBuilds: EclipseBuild[];
    yBuilds: EclipseBuild[];
}

export function parseEclipse(ej: EclipseJson): any[] {
    try {
        if (!ej.releases || ej.releases.length === 0) {
            return [];
        }

        // Find the most recent release by date
        let latestRelease = ej.releases[0];
        let latestDate = new Date(latestRelease.date);

        for (const release of ej.releases) {
            const releaseDate = new Date(release.date);
            if (releaseDate > latestDate) {
                latestDate = releaseDate;
                latestRelease = release;
            }
        }

        // Extract version from label (e.g., "4.38")
        const label = latestRelease.label.trim();

        // Extract year-month from date for URL (e.g., "2025-12" from "2025-12-01T14:20Z")
        const dateStr = latestRelease.date;
        const yearMonth = dateStr.substring(0, 7); // "2025-12"

        // Construct download link in format: https://www.eclipse.org/downloads/packages/release/{year-month}/r
        const downloadLink = `https://www.eclipse.org/downloads/packages/release/${yearMonth}/r`;

        return [{
            name: 'Eclipse',
            ver: label,
            link: downloadLink,
            timestamp: latestDate,
            src: 'eclipse.org',
        }];
    } catch (error) {
        console.error(`[Eclipse]`, error);
    }
    return [];
}

export async function callEclipse() {
    const eclipseEarl = new Earl('https://download.eclipse.org', '/eclipse/downloads/data.json');
    return parseEclipse(await eclipseEarl.fetchJson() as EclipseJson);
}
