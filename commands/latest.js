import { SlashCommandBuilder } from 'discord.js';
import { Earl } from '../ute/earl.js';
import { ago } from '../ute/ago.js';

const githubReleasesEarl = new Earl('https://api.github.com', '/repos/OWNER/REPO/releases/latest');
const nodejsEarl = new Earl('https://nodejs.org', '/dist/index.json');
const gimpEarl = new Earl('https://gitlab.gnome.org',
    '/Infrastructure/gimp-web/-/raw/testing/content/gimp_versions.json', {
    'inline': false
});
const xcodeEarl = new Earl('https://xcodereleases.com', '/data.json');
const pythonEarl = new Earl('https://api.github.com', '/repos/OWNER/REPO/tags');
const goEarl = new Earl('https://go.dev', '/dl/', { 'mode': 'json' });

export const data = new SlashCommandBuilder()
    .setName('latest')
    .setDescription('Latest releases of various projects');

export const execute = latest;

// TODO missing, but not on GitHub
// Android Studio
// Dart
// Intellij IDEA
// Kotlin

const xformNameSplit = (r, n, t) => n.split(' ');

const xformCapitalizeRepo = (r, n, t) => [r.charAt(0).toUpperCase() + r.slice(1), t];

function xformSwift(r, n, t) {
    const [name, ver, which] = n.split(' ');
    return [`${name} (${which})`, ver];
}

const githubRepos = [
    ['apple', 'swift', xformSwift],
    ['audacity', 'audacity', xformNameSplit],
    ['microsoft', 'TypeScript', (r, n, t) => [r, t]],
    ['NationalSecurityAgency', 'ghidra', xformNameSplit],
    ['nodejs', 'node', (r, n, t) => ['Node (Current)', t]],
    ['oven-sh', 'bun', xformNameSplit],
    ['rust-lang', 'rust', xformCapitalizeRepo],
    ['ziglang', 'zig', xformCapitalizeRepo],
];

async function latest(interaction) {
    await interaction.deferReply();
    let reply = 'An error occurred while fetching data.';
    try {
        await interaction.editReply('Being gentle on the Github API...', { ephemeral: true });
        const replies = await Promise.all([
            callGithub(),
            callNodejs(),
            callGimp(),
            callXcode(),
            callPython(),
            callGo(),
        ]);
        reply = replies.join('\n');
    } catch (error) {
        console.error(error);
    }
    await interaction.editReply(reply);
}

/**
 * Generates a string representation of a name, version, link, timestamp, and source.
 *
 * @param {object} nlt - An object containing the name, version, link, timestamp, and source.
 * @param {string} nlt.name - The name.
 * @param {string} nlt.ver - The version.
 * @param {string} [nlt.link] - The optional link.
 * @param {number} [nlt.timestamp] - The optional timestamp.
 * @param {string} nlt.src - The source.
 * @return {string} A string representation of the name, version, link, timestamp, and source.
 */
function nvltsToString(nlt) {
    const parts = [
        `${nlt.name}:`,
        nlt.link ? `[${nlt.ver}](<${nlt.link}>)` : nlt.ver
    ];

    if (nlt.timestamp) parts.push(`- ${ago(new Date() - nlt.timestamp)}`);
    parts.push(`(${nlt.src})`);
    return parts.join(' ');
}

async function callGithub() {
    let result = [];
    for (const repo of githubRepos) {
        githubReleasesEarl.setPathname(`/repos/${repo[0]}/${repo[1]}/releases/latest`);
        const ob = await githubReleasesEarl.fetchJson();
        //console.log(`callGithub: owner: ${repo[0]}, repo: ${repo[1]}, ${
        //    'name' in ob ? `ob.name: ${ob.name}` : 'API rate limit!'
        //}`);

        const nvlts = githubJsonToNVLTS(repo, ob);
        const nvltsString = nvlts ? nvltsToString(nvlts) : `${repo[1]}: GitHub Error! (API rate limit?)`;
        result.push(nvltsString);
        if (githubRepos.indexOf(repo) < githubRepos.length - 1)
            await new Promise(resolve => setTimeout(resolve, 4500)); // delay for GitHub API rate limit
    }
    return result.join('\n');
}

function transformRepoNameTagVer(repo, ob) {
    const [, repoName, xform] = repo;
    const [obName, obTag] = [ob.name, ob.tag_name];

    if (xform) {
        //console.log(`Transforming repo: ${repoName}, name: ${obName}, tag: ${obTag}, xform: ${xform}`);
        const xformed = xform(repoName, obName, obTag);
        //console.log(`xformed: ${JSON.stringify(xformed, null, 2)}`);
        return xformed;
    } else {
        //console.log(`*NOT* transforming repo: ${repoName}, name: ${obName}, tag: ${obTag}`);
        // name and ver already set to '?name?' and '?ver?'
        console.log(`Unrecognized repo: ${repoName}, name: ${obName}, tag: ${obTag}`);
        return ['?name?', '?ver?'];
    }
}

function githubJsonToNVLTS(repo, ob) {
    // if ob has just the two keys "message" and "documentation_url"
    // we've hit the API limit or some other error
    if (ob.message && ob.documentation_url) {
        console.log(`GitHub releases API error: ${ob.message} ${ob.documentation_url}`);
        return null;
    }

    try {
        const nameVersion = transformRepoNameTagVer(repo, ob);
        const [name, version] = nameVersion;

        return {
            name,
            ver: version,
            link: ob.html_url,
            timestamp: new Date(ob.published_at),
            src: 'github',
        };
    } catch (error) {
        // console.error("<<<", error);
        // console.log(JSON.stringify(ob, null, 2));
        // console.log(">>>");
        return null;
    }
}

async function callNodejs() {
    const rels = await nodejsEarl.fetchJson();
    const curRel = rels.find(rel => rel.lts === false);
    const ltsRel = rels.find(rel => typeof rel.lts === 'string');

    const nvlts = [curRel, ltsRel].map(obj => {
        return {
            name: `Node (${obj.lts === false ? 'Current' : `LTS ${obj.lts}`})`,
            ver: obj.version,
            link: undefined,
            timestamp: new Date(obj.date),
            src: 'nodejs.org',
        };
    });

    const reply = nvlts.map(nvlts => nvltsToString(nvlts)).join('\n');

    return reply;
}

async function callGimp() {
    const gj = await gimpEarl.fetchJson();
    if ('STABLE' in gj) {
        if (gj.STABLE.length > 0) {
            if ('version' in gj.STABLE[0]) {
                return nvltsToString({
                    name: 'Gimp',
                    ver: gj.STABLE[0].version,
                    link: undefined,
                    timestamp: new Date(gj.STABLE[0].date),
                    src: 'gitlab',
                });
            }
        }
    }
    return '';
}

async function callXcode() {
    const xcj = await xcodeEarl.fetchJson();
    const rel = xcj.find(obj => obj.name === 'Xcode' && obj.version.release.release === true);
    if (rel) {
        return nvltsToString({
            name: 'Xcode',
            ver: rel.version.number,
            link: rel.links.notes.url,
            timestamp: new Date(rel.date.year, rel.date.month - 1, rel.date.day),
            src: 'xcodereleases.com',
        });
    }
    return '';
}

async function callPython() {
    pythonEarl.setPathname('/repos/python/cpython/tags');
    const pya = await pythonEarl.fetchJson();
    // first, check if we got an error, usually hitting the GitHub rate limit
    if (pya.message && pya.documentation_url) {
        console.log(`GitHub tags API error: 'python'${pya.message} ${pya.documentation_url}`);
        return '';
    }

    //console.log(`callPython: pya: ${JSON.stringify(pya, null, 2)}`);
    // pya is an array of objects. each has a 'name' field
    // we want the first one whose name field is of the form vN.N.N
    // where N is an integer, aka one or more digits
    const rel = pya.find(obj => {
        const match = obj.name.match(/^v(\d+)\.(\d+)\.(\d+)$/);
        return match !== null;
    });

    console.log(`callPython: rel: ${JSON.stringify(rel, null, 2)}`);

    if (rel) {
        return nvltsToString({
            name: 'Python',
            ver: rel.name,
            link: undefined,
            timestamp: undefined,
            src: 'github',
        });
    }

    return '';
}

async function callGo() {
    const goj = await goEarl.fetchJson();
    return nvltsToString({
        name: 'Go',
        ver: goj[0].version.replace(/^go/, ''),
        link: undefined,
        timestamp: undefined,
        src: 'go.dev',
    });
}