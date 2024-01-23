import { Earl } from '../../ute/earl.js';
import { ago } from '../../ute/ago.js';

const githubTagsEarl = new Earl('https://api.github.com', '/repos/OWNER/REPO/tags');

const regexMajMinPatch = /^(\d+)\.(\d+)\.(\d+)$/
const regexVmajMinPatch = /^v(\d+)\.(\d+)\.(\d+)$/

const ownerRepos = [
    ['Nim', 'nim-lang/Nim', regexMajMinPatch],
    ['Perl', 'Perl/perl5', regexMajMinPatch],
    ['Python', 'python/cpython', regexMajMinPatch],
    ['V8', 'v8/v8', regexVmajMinPatch],
];

export async function callGithubTags() {
    let result = [];

    for (const [i, repoEntry] of ownerRepos.entries()) {
        const ob = await callGithubTagsRepo(repoEntry[0], repoEntry[1]);
        console.log(`GitHub Tags [${i + 1}/${ownerRepos.length}] ${repoEntry[0]}`);
        result = result.concat(ob);

        if (i < ownerRepos.length - 1)
            await new Promise(resolve => setTimeout(resolve, 2300)); // delay for GitHub API rate limit
    }

    return result;
}

async function callGithubTagsRepo(name, ownerRepo, regex) {
    githubTagsEarl.setPathname(`/repos/${ownerRepo}/tags`);

    try {
        const ght = await githubTagsEarl.fetchJson();

        if (ght.message && ght.documentation_url) {
            console.log(`[${name}] GitHub tags API error: '${name}'${ght.message} ${ght.documentation_url}`);
        } else {
            const rel = ght.find(obj => obj.name.match(regex));

            if (rel) {
                const json = await (await fetch(rel.commit.url)).json();

                // there is commit.author.date and commit.committer.date...
                const [authorDate, committerDate] = ["author", "committer"].map(k => new Date(json.commit[k].date));
                // print which is newer, and by how many seconds/minutes
                // in the one I checked, the committer is newer by about 15 minutes
                const [newer, older, diff, date] = committerDate > authorDate
                    ? ['committer', 'author', committerDate - authorDate, committerDate]
                    : ['author', 'committer', authorDate - committerDate, authorDate];

                if (diff)
                    console.log(`[${name}] ${newer} is newer than ${older} by ${ago(diff).replace(' ago', '')} (diff: ${diff})`);

                return [{
                    name: name,
                    ver: rel.name,
                    link: json.html_url,
                    timestamp: date,
                    src: 'github',
                }];
            }
        }
    } catch (error) {
        console.error(`[${name}]`, error);
    }
    return [];
}