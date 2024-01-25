import { SlashCommandBuilder } from 'discord.js';
import { Earl } from '../ute/earl.js';
import { ago } from '../ute/ago.js';
import { domStroll } from '../ute/dom.js';
import { callGithubReleases } from './latest/githubreleases.js';
import { callGithubTags } from './latest/githubtags.js';
import { callWikiDump } from './latest/wikidump.js';
import parse from 'html-dom-parser';

export const data = new SlashCommandBuilder()
    .setName('latest')
    .setDescription('Latest releases of various projects')
        .addBooleanOption(option => option
            .setName('sortbyage')
            .setDescription('Sort by most recent first')
            .setRequired(true));

export const execute = latest;

// TODO
// C standard?
// C++ standard?
// C#
// EcmaScript standard?
// Erlang
// gcc
// Groovy
// Haskell
// Java/JDK/JVM?
// Julia
// Objective C? on GitHub tags only apple-oss-distributions/objc4
// Scala
// Unicode
//  CLDR
//  ICU
//  ICU4X
// Vim

async function latest(interaction) {
    await interaction.deferReply();

    try {
        let responses = [];

        let sortByAge = interaction.options.getBoolean('sortbyage');
        console.log(`[latest] sortByAge: ${sortByAge}`);

        async function reply(these, thisName, thatName) {
            console.log(`All ${thisName} have been fetched. ${responses.length === 0 ? 'First.' : 'Last.'}`);

            responses.push(these.flat());

            let reply = responses.flat()
                // TODO this breaks when we've used up our GitHub API rate limit
                // [Latest] TypeError: Cannot read properties of null (reading 'timestamp')
                .toSorted((a, b) => {
                    const nullComparison = a === null ? (b === null ? 0 : -1) : (b === null ? 1 : 0);
                    if (nullComparison !== 0)
                        return nullComparison;
                  
                    const ageDiff = !a.timestamp
                        ? !b.timestamp ? 0 : 2
                        : !b.timestamp ? -2 : b.timestamp - a.timestamp;

                    return sortByAge && ageDiff
                        ? ageDiff
                        : a.name.localeCompare(b.name);
                })
                .map(vi => versionInfoToString(vi))
                .join('\n');

            const note = responses.length === 1
                ? `\n\n(Just waiting for ${thatName} now)`
                : '';

            const initialReplyLength = reply.length + note.length;

            // if length > 2000, keep removing lines from the end until it's <= 2000
            let numRemoved = 0;
            while (reply.length + note.length > 2000) {
                reply = reply.split('\n').slice(0, -1).join('\n');
                numRemoved++;
            }

            if (responses.length === 1)
                reply = `${reply}${note}`;

            if (initialReplyLength !== reply.length)
                console.log(`[latest] trimmed ${numRemoved} lines (${initialReplyLength - reply.length} chars) from end of reply`);

            await interaction.editReply(reply);
        }

        const githubPromises = callGithubReleases(false)
            .then(async arr => await reply(arr, 'GitHub', 'non-GitHub'));

        const otherPromises = Promise.all([
            //callNodejs(), // JSON - just use the GitHub one for now, which has link
            callGimp(),     // JSON
            callXcode(),    // JSON
            callGithubTags(false),
            callGo(),       // scraper
            //callMame(),   // JSON - just use the GitHub one for now, which has link and date
            callDart(),     // JSON
            callRvm(),      // scraper
            callAS(),       // scraper
            callElixir(),   // scraper
            callPhp(),      // JSON
            callRuby(),     // scraper
            callIdea(),     // scraper
            callWikiDump(), // scraper
        ]).then(async arr => await reply(arr, 'Non-GitHub', 'GitHub'));

        await Promise.all([githubPromises, otherPromises]);
    } catch (error) {
        console.error('[Latest]', error);
    }
}

/**
 * Generates a string representation of a VersionInfo object.
 *
 * @param {object} vi - A VersionInfo object containing the name, version, link, timestamp, and source.
 * @param {string} vi.name - The name.
 * @param {string} vi.ver - The version.
 * @param {string} [vi.link] - The optional link.
 * @param {number} [vi.timestamp] - The optional timestamp.
 * @param {string} vi.src - The source.
 * @return {string} A string representation of the name, version, link, timestamp, and source.
 */
function versionInfoToString(vi) {
    const parts = [
        `${vi.name}:`,
        vi.link ? `[${vi.ver}](<${vi.link}>)` : vi.ver
    ];

    if (vi.timestamp) parts.push(`- ${ago(new Date() - vi.timestamp)}`);
    parts.push(`(${vi.src})`);
    return parts.join(' ');
}

async function callNodejs() {
    const nodejsEarl = new Earl('https://nodejs.org', '/dist/index.json');
    try {
        const rels = await nodejsEarl.fetchJson();

        return [
            rels.find(rel => rel.lts === false),
            rels.find(rel => typeof rel.lts === 'string')
        ].map(obj => ({
            name: `Node ${obj.lts === false ? '(Current)' : `'${obj.lts}' (LTS)`}`,
            ver: obj.version,
            link: undefined,
            timestamp: new Date(obj.date),
            src: 'nodejs.org',
        }));
    } catch (error) {
        console.error(`[Node.js]`, error);
    }
    return [];
}

async function callGimp() {
    const gimpEarl = new Earl('https://gitlab.gnome.org',
        '/Infrastructure/gimp-web/-/raw/testing/content/gimp_versions.json', {
        'inline': false
    });
    try {
        const gj = await gimpEarl.fetchJson();

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

async function callXcode() {
    const xcodeEarl = new Earl('https://xcodereleases.com', '/data.json');
    try {
        const xcj = await xcodeEarl.fetchJson();

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

async function callGo() {
    const verCmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

    const goEarl = new Earl('https://go.dev', '/doc/devel/release');
    try {
        const dom = parse(await goEarl.fetchText());

        const article = domStroll('Go', false, dom, [
            [2, 'html'],
            [3, 'body', { cls: 'Site' }],
            [9, 'main', { id: 'main-content' }],
            [1, 'article', { cls: 'Doc' }],
        ]);

        const paras = article.children.filter(e => e.type === 'tag' && e.name === 'p');

        let biggestVer = null;
        let dateOfBiggestVer = null;

        for (const para of paras) {
            const mat = para.children[0].data.trim().match(/^go(\d+(?:\.\d+)*)\s+\(released (\d+-\d+-\d+)\)/m);
            if (mat && (biggestVer === null || verCmp(mat[1], biggestVer) > 0)) {
                biggestVer = mat[1];
                dateOfBiggestVer = mat[2];
            }
        }

        if (biggestVer) {
            return [{
                name: 'Go',
                ver: biggestVer,
                link: `https://go.dev/doc/devel/release#go${biggestVer}`,
                timestamp: new Date(dateOfBiggestVer),
                src: 'go.dev',
            }];
        }
    } catch (error) {
        console.error(`[Go]`, error);
    }
    return [];
}

async function callMame() {
    const mameEarl = new Earl('https://raw.githubusercontent.com', '/Calinou/scoop-games/master/bucket/mame.json');
    try {
        const mamej = await mameEarl.fetchJson();

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

async function callDart() {
    const dartEarl = new Earl('https://storage.googleapis.com', '/dart-archive/channels/stable/release/latest/VERSION');
    try {
        const dartj = await dartEarl.fetchJson();

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

async function callRvm() {
    const rvmEarl = new Earl('https://www.retrovirtualmachine.org', '/changelog/');
    try {
        const dom = parse(await rvmEarl.fetchText());

        const article = domStroll('RVM', false, dom, [
            [2, 'html'],
            [1, 'body'],
            [2, 'div', { cls: 'mainContent' }],
            [3, 'article', { cls: 'content' }],
        ]);

        const h2s = article.children.filter(e => e.type === 'tag' && e.name === 'h2');

        for (const h2 of h2s) {
            const mat = h2.children[0]?.data?.trim().match(/^RetroVM v(\d+(?:\.\d+)*)\s+\((\d+\/\d+\/\d+)\)/m);
            if (mat) {
                const date = mat[2]?.split('/')?.reverse()?.join('-');

                return [{
                    name: 'Retro Virtual Machine',
                    ver: mat[1],
                    link: 'https://www.retrovirtualmachine.org/changelog/',
                    timestamp: date ? new Date(date) : undefined,
                    src: 'retrovirtualmachine.org',
                }];
            }
        }
    } catch (error) {
        console.error(`[RVM]`, error);
    }
    return [];
}

async function callAS() {
    // note we can use a URL like
    // https://androidstudio.googleblog.com/search?updated-max=2022-12-26T10:01:00-08:00&max-results=25
    // we can use just the `max-results` param - it actually only goes up to 24 though
    const asEarl = new Earl('https://androidstudio.googleblog.com', '/search', {
        'max-results': 24,
    });

    try {
        const dom = parse(await asEarl.fetchText());

        const blog1 = domStroll('AS2a', false, dom, [
           [2, 'html', { cls: 'v2' }],
           [3, 'body'],
           [15, 'div', { cls: 'cols-wrapper' }],
           [1, 'div', { cls: 'col-main-wrapper' }],
           [3, 'div', { cls: 'col-main' }],
           [3, 'div', { id: 'main' }],
           [0, 'div', { id: 'Blog1' }],
        ]);

        const posts = blog1.children.filter(e => e.type === 'tag' && e.name === 'div' && e.attribs?.class?.includes('post'));

        const chosenPostPerChannel = new Map();

        for (const post of posts) {
            const linkAnchor = domStroll('AS2b', false, post.children, [
                [1, 'h2', { cls: 'title' }],
                [1, 'a'],
            ]);

            const link = linkAnchor.attribs.href;

            const publishDate = domStroll('AS2c', false, post.children, [
                [3, 'div', { cls: 'post-header' }],
                [1, 'div', { cls: 'published' }],
                [1, 'span', { cls: 'publishdate' }],
            ]);

            const dmat = publishDate.children[0].data.trim().match(/(\w+), (\w+) (\d+), (\d+)/);

            const timestamp = dmat ? new Date(`${dmat[2]} ${dmat[3]}, ${dmat[4]}`) : null;

            const postContent = domStroll('AS2d', false, post.children, [
                [5, 'div', { cls: 'post-body' }],
                [1, 'div', { cls: 'post-content' }],
            ]);

            const script = postContent.children[1];

            if (script && script.children[0]) {
                const scriptDom = parse(script.children[0].data);

                const para = domStroll('AS2e', false, scriptDom, [
                    [1, 'p'],
                ]);

                const releaseString = para.children[0].data.trim();

                const mack = releaseString.match(/^Android Studio (\w+) \| (\d\d\d\d\.\d\.\d) (?:(\w+) (\d+) )?is now available in the (\w+) channel\.$/);
                if (mack) {
                    const channel = mack[5];

                    if (!chosenPostPerChannel.has(channel)) {
                        chosenPostPerChannel.set(channel, {
                            name: `Android Studio ${mack[1]}`,
                            ver: mack.slice(2, 5).filter(Boolean).join(' '),
                            link,
                            timestamp,
                            src: 'androidstudio.googleblog.com',
                        });
                    }
                } else {
                    console.log(`[AS] couldn't parse title/codename/version/channel from '${codenameVerChan}'`);
                }
            }
        }

        return Array.from(chosenPostPerChannel.values());
    } catch (error) {
        console.error(`[AS]`, error);
    }
    return [];
}

async function callElixir() {
    const elixirEarl = new Earl('https://elixir-lang.org', '/blog/categories.html');
    try {
        const dom = parse(await elixirEarl.fetchText());

        const releasesLI = domStroll('Elixir', false, dom, [
            [2, 'html'],
            [3, 'body', { cls: 'blog' }],
            [1, 'div', { id: 'container' }],
            [1, 'div', { cls: 'wrap' }],
            [3, 'div', { id: 'main' }],
            [1, 'div', { id: 'content' }],
            [1, 'div', { cls: 'hcat' }],
            [3, 'ul'],
            [7, 'li'],
        ]);

        domStroll('Elixir2', false, releasesLI.children, [
            [1, 'h5', { id: 'Releases' }],
        ]);

        const releasesUL = domStroll('Elixir3', false, releasesLI.children, [
            [3, 'ul']
        ]);

        const releaseLIs = releasesUL.children.filter(e => e.type === 'tag' && e.name === 'li');

        for (const rli of releaseLIs) {
            const a = domStroll('Elixir4', false, rli.children, [
                [0, 'a']
            ]);

            const byline = domStroll('Elixir5', false, rli.children, [
                [2, 'span', { cls: 'byline' }],
            ]);

            // raw version text is like: `Elixir v1.13 released`
            // but also possible: `Elixir v0.13.0 released, hex.pm and ElixirConf announced`
            const version = a.children[0].data.match(/^Elixir (v\d+\.\d+) released\b/)[1];

            return [{
                name: 'Elixir',
                ver: version,
                link: `${elixirEarl.getOrigin()}${a.attribs.href}`,
                timestamp: new Date(byline.children[0].data),
                src: 'elixir-lang.org',
            }];
        }

    } catch (error) {
        console.error(`[Elixir]`, error);
    }
    return [];
}

async function callPhp() {
    const phpEarl = new Earl('https://www.php.net', '/releases/index.php');
    phpEarl.setSearchParam('json', '');
    try {
        const phpj = await phpEarl.fetchJson();
        // we get an object with a key for each major version number, in ascending order
        const latest = Object.values(phpj).pop();
        const maj = latest.version.match(/^(\d+)\.\d+\.\d+$/)[1];
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

async function callRuby() {
    const rubyEarl = new Earl('https://www.ruby-lang.org', '/en/downloads/releases/');
    try {
        const dom = parse(await rubyEarl.fetchText());

        const relList = domStroll('Ruby', false, dom, [
            [2, 'html'],
            [3, 'body'],
            [3, 'div', { id: 'page' }],
            [1, 'div', { id: 'main-wrapper' }],
            [1, 'div', { id: 'main' }],
            [1, 'div', { id: 'content-wrapper' }],
            [3, 'div', { id: 'content' }],
            [9, 'table', { cls: 'release-list' }],
        ]);

        const releases = [];

        relList.children.forEach(ch => {
            if (ch.type === 'tag' && ch.name === 'tr' && ch.children.filter((_c, i) => i % 2).every(c => c.type === 'tag' && c.name === 'td')) {
                const [v, d, , l] = ch.children.filter((_c, i) => i % 2);

                const rawVer = v.children[0].data;
                const rawDate = d.children[0].data;
                const relativeLink = l.children[0].attribs.href;

                // ignore release candidates and previews
                const ver = rawVer.includes('-') ? null : rawVer.replace(/^Ruby /, '');

                if (ver) {
                    const [maj, min] = ver.split('.').map(v => Number(v));

                    releases.push([maj, min, ver, rawDate, relativeLink]);
                }
            }
        })

        const currMaj = Math.max(...releases.map(r => r[0]));

        // let's just get the two latest minor versions
        const minsForMaj = [...new Set(releases.filter(r => r[0] === currMaj).map(r => r[1]))]
            .sort((a, b) => b - a)
            .slice(0, 2);

        const latestOfEach = minsForMaj
            .map(min => releases.find(r => r[0] === currMaj && r[1] === min));

        return latestOfEach.map(([maj, min, ver, date, relLink]) => {
            const url = new URL(rubyEarl.url);
            url.pathname = relLink;

            return {
                name: `Ruby ${maj}.${min}`,
                ver,
                link: url.href,
                timestamp: new Date(date),
                src: 'ruby-lang.org',
            }
        });

    } catch (error) {
        console.error(`[Ruby]`, error);
    }
    return [];
}

async function callIdea() {
    const ideaEarl = new Earl('https://blog.jetbrains.com', '/idea/category/releases/');

    try {
        const dom = parse(await ideaEarl.fetchText());

        const row = domStroll('IdeaA', false, dom, [
            [2, 'html'],
            [3, 'body'],
            [6, 'div', { id: 'wrapper' }],
            [3, 'main', { id: 'main' }],
            [3, 'section', { cls: 'tax-archive' }],
            [1, 'div', { cls: 'container' }],
            [3, 'div', { cls: 'row' }],
        ]);

        const cols = row.children.filter(e => e.type === 'tag' && e.name === 'div' && e.attribs?.class?.includes('col'));

        for (const col of cols) {
            const aLink = domStroll('IdeaB', false, col.children, [
                [1, 'a', { cls: 'card' }],
            ]);

            const headerIndex = aLink.children.findIndex(e => e.type === 'tag' && e.name === 'div' && e.attribs?.class?.includes('card__header'));

            if (headerIndex) {
                const header = aLink.children[headerIndex];
                const footer = aLink.children[headerIndex + 4];
                // card header and footer are normally children #3 and #7
                // but sometimes an image is missing so the header and footer are #1 and #5

                // if header and footer were wrong (1 and 5 instead of 3 and 7) then h4 will be at 3 instead of 1
                const h4index = 4 - headerIndex;

                const h4 = domStroll('IdeaC', false, header.children, [
                    [h4index, 'h4'],
                ]);

                const publishDate = domStroll('IdeaD', false, footer.children, [
                    [1, 'div', { cls: 'author' }],
                    [3, 'div', { cls: 'author__info' }],
                    [3, 'time', { cls: 'publish-date' }],
                ]);

                // title will be this form: IntelliJ IDEA 2023.1.4 Is Here!
                const matt = h4.children[0].data.match(/IntelliJ IDEA (\d+\.\d+(?:\.\d+)?) Is (?:Here|Out)!/);
                if (matt) {
                    return [{
                        name: 'IntelliJ IDEA',
                        ver: matt[1],
                        link: aLink.attribs.href,
                        timestamp: new Date(publishDate.attribs.datetime),
                        src: 'jetbrains.com',
                    }];
                } else {
                    console.log(`[Idea] ${col.attribs.post_id} :couldn't parse version from '${title}'`);
                }
            }
        }

    } catch (error) {
        console.error(`[Idea]`, error);
    }

    return [];
}
