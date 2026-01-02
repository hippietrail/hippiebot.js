import { Earl } from '../../ute/earl';

interface VersionInfoLoose {
    name?: string | null;
    ver?: string | null;
    link?: string | null;
    timestamp?: Date | null;
    src?: string | null;
}

async function fetchTextVersion(name: string, origin: string, pathname: string, src: string): Promise<VersionInfoLoose[]> {
    try {
        const earl = new Earl(origin, pathname);
        const versionStr = await earl.fetchText();
        const ver = versionStr.trim();
        
        console.log(`[${src}] version: ${ver}`);
        
        return [{
            name: name,
            ver: ver,
            link: undefined,
            timestamp: undefined,
            src: src
        }];
    } catch (error) {
        console.error(`[${src}]`, error);
        return [{
            name: name,
            ver: 'error fetching',
            link: undefined,
            timestamp: undefined,
            src: src
        }];
    }
}

export async function callAmpcode(): Promise<VersionInfoLoose[]> {
    return fetchTextVersion('Ampcode', 'https://storage.googleapis.com', '/amp-public-assets-prod-0/cli/cli-version.txt', 'ampcode');
}

export async function callHarper(): Promise<VersionInfoLoose[]> {
    return fetchTextVersion('Harper', 'https://writewithharper.com', '/latestversion', 'harper');
}
