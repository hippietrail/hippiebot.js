//@ts-nocheck
import { Earl } from '../../ute/earl.js';

const githubReleasesEarl = new Earl('https://api.github.com', '/repos/OWNER/REPO/releases/latest');

// GitHub JSON name field is 'name version'
const xformNameSplit = (_, jn, __) => jn.split(' ');

// Repo name is name, version is GitHub JSON tag
const xformRepoTag = (gor, _, jt) => [gor.split('/')[1], jt];

// Repo name capitalized is name, version is GitHub JSON tag
function xformRepoCapTag(gor, _, jt) {
    // console.log(`[xformRepoCapTag]`, gor, jt);
    const rn = gor.split('/')[1];
    return [rn.charAt(0).toUpperCase() + rn.slice(1), jt];
}

// Repo name capitalized is name, version is GitHub JSON tag with _ converted to .
function xformRepoCapTagVersionUnderscore(gor, _, jt) {
    // console.log(`[xformRepoCapTagVersionUnderscore]`, gor, jt);
    const rn = gor.split('/')[1];
    return [rn.charAt(0).toUpperCase() + rn.slice(1), jt.replace(/_/g, '.')];
}

const ownerRepos = [
    ['apple/swift', xformNameSplit],
    ['audacity/audacity', xformNameSplit],
    ['discordjs/discord.js', xformRepoCapTag],
    /*['elixir-lang/elixir', xformRepoCapTag],*/
    ['exiftool/exiftool', xformNameSplit],
    ['JetBrains/kotlin', xformNameSplit],
    ['JuliaLang/julia', xformRepoCapTag],
    ['lampepfl/dotty', (_, __, jt) => ['Scala 3', jt]],     // "tag_name": "3.3.1", "name": "3.3.1",
    ['llvm/llvm-project', xformNameSplit],
    ['lua/lua', xformNameSplit],
    ['mamedev/mame', xformNameSplit],
    ['microsoft/TypeScript', xformRepoTag],
    ['NationalSecurityAgency/ghidra', xformNameSplit],
    ['nodejs/node', (_, __, jt) => ['Node (Current)', jt]],
    ['odin-lang/Odin', (_, __, jt) => ['Odin', jt]],
    ['oven-sh/bun', xformNameSplit],
    ['rakudo/rakudo', xformRepoCapTag],
    /*['ruby/ruby', xformRepoCapTagVersionUnderscore],*/
    ['scala/scala', (_, __, jt) => ['Scala 2', jt]],        // "tag_name": "v2.13.12", "name": "Scala 2.13.12",
    ['rust-lang/rust', xformRepoCapTag],
    ['vlang/v', xformRepoCapTag],
    ['zed-industries/zed', xformRepoTag],
    ['ziglang/zig', xformRepoCapTag],
];

export async function callGithubReleases(debug = false) {
    let result = [];

    // in debug mode, just take the first entry
    const chosenOwnerRepos = debug ? [ownerRepos[0]] : ownerRepos;

    for (const [i, repoEntry] of chosenOwnerRepos.entries()) {
        // console.log(`[callGithub] i: ${i}, owner/repo: ${repoEntry[0]}`);
        githubReleasesEarl.setPathname(`/repos/${repoEntry[0]}/releases/latest`);
        const ob = await githubReleasesEarl.fetchJson();
        console.log(`GitHub Rels [${i + 1}/${chosenOwnerRepos.length}] ${repoEntry[0]}`);
        const vi = githubJsonToVersionInfo(repoEntry, ob);
        result.push(vi);

        if (i < chosenOwnerRepos.length - 1)
            await new Promise(resolve => setTimeout(resolve, 4600)); // delay for GitHub API rate limit
    }
    return result;
}

function githubJsonToVersionInfo(repoEntry, jsonObj) {
    // if ob has just the two keys "message" and "documentation_url"
    // we've hit the API limit or some other error
    let [name, ver, link, timestamp, src] = [null, null, null, null, 'github'];

    if ('message' in jsonObj && 'documentation_url' in jsonObj) {
        console.log(`GitHub releases API error: ${jsonObj.message} ${jsonObj.documentation_url}`);
        [name, ver] = [repoEntry[0], 'GitHub API error R'];
    } else try {
        [name, ver] = xformRepoNameTagVer(repoEntry, jsonObj);
        [link, timestamp] = [jsonObj.html_url, new Date(jsonObj.published_at)];
    } catch (error) {
        // console.error("<<<", error);
        // console.log(JSON.stringify(ob, null, 2));
        // console.log(">>>");
    }
    return {
        name,
        ver,
        link,
        timestamp,
        src,
    };
}

// Call the appropriate xform function for the repo
// to get the [name, version] tuple in the right format.
// Depending on the repo, the xform function might
// derive either field from the GitHub owner and repo names
// or from the name and tag fields in the JSON.
// Will call one of: xformNameSplit, xformRepoTag, xformRepoCapTag, etc
function xformRepoNameTagVer(repo, jsonOb) {
    const [githubOwnerRepo, xform] = repo;
    const [jsonName, jsonTag] = [jsonOb.name, jsonOb.tag_name];

    if (xform) {
        return xform(githubOwnerRepo, jsonName, jsonTag);
    } else {
        // for newly added repos, output the name and version so we can see which
        // transform it should use, or if we need a new one
        const name = `${githubOwnerRepo} (GitHub owner/repo) / ${jsonName} (JSON name)`;
        const ver = `${jsonTag} (JSON tag)`;
        console.log(`[GitHub] New repo: ${name} / ${ver}`);
        return [name, ver];
    }
}