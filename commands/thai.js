import { SlashCommandBuilder } from 'discord.js';
import { Earl } from '../ute/earl.js';
import { domStroll } from '../ute/dom.js';
import parse from 'html-dom-parser';

export const data = new SlashCommandBuilder()
    .setName('thai')
    .setDescription('Check for a Thai word in thai-language.com and SEAlang')
    .addStringOption(option => option.setName('word').setDescription('word to check').setRequired(true));

export const execute = thai;

async function thai(interaction) {
    await interaction.deferReply();
    try {
        const word = interaction.options.getString('word');

        const replies = await Promise.all(
            [
                ['thaiLang', thaiLanguage],
                ['SEAlang', seaLang]
            ].map(async ([name, func]) => {
                const reply = await func(word);
                return reply !== null
                    ? `${name}: ${reply} results.`
                    : `${name}: error.`
            })
        );

        await interaction.editReply(replies.join('\n'));
    } catch (error) {
        console.error(error);
        await interaction.editReply(error);
    }
}

// the normal search on thai-language.com uses HTTP POST and converting naïvely to GET
// doesn't work. But it turns out the advanced search has an XML prefix search!
async function thaiLanguage(word) {
    // http://www.thai-language.com/xml/PrefixSearch?input=%E0%B8%99%E0%B8%B2
    const thaiLangEarl = new Earl('http://www.thai-language.com', '/xml/PrefixSearch', {
        input: word,
    });
    console.log(`thaiLangEarl: ${thaiLangEarl.getUrlString()}`);

    const dom = parse(await thaiLangEarl.fetchText());

    const results = domStroll('thailang', true, dom, [
        [1, 'tl-xml-response'],
        [0, 'results'],
    ]);

    // count the number of results whose 't' matches 'word'
    const matchingResults = results.children.filter(result => {
        if (result.name === 'result' && result.children.length > 0 && result.children[0].name === 't') {
            return result.children[0].children[0].data === word;
        }
    });

    const count = matchingResults.length;
    return count;
}

// SEAlang uses a self-signed certificate that throws an exception by default in fetch()
// So we turn off the NODE_TLS_REJECT_UNAUTHORIZED environment variable before and make
// sure we turn it back on afterwards no matter if the request succeeds, fails, or an exception is thrown
async function seaLang(word) {
    const seaEarl = new Earl('https://sealang.net', '/thai/search.pl', {
        'dict': 'thai',
        'hasFocus': 'orth',
        'approx': '',
        'orth': word,
        'phone': '',
        'def': '',
        //'filedata': '',
        'matchEntry': 'any',
        'matchLength': 'word',
        'matchPosition': 'any',
        'anon': 'on',
        'ety': '',
        'pos': '',
        'usage': '',
        'useTags': '1',
        'derivatives': 'always',
        'hyphenateSyls': '0',
        'redundantData': '0',
    });

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const dom = await (async () => {
        try {
            return parse(await seaEarl.fetchText());
        } catch (error) {
            console.error(`[THAI/sealang] ${word}:`, error);
            return null;
        }
    })();

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";

    if (dom) {
        const body = domStroll('sea', true, dom, [
            [4, 'html'],
            [3, 'body'],
        ]);

        if (6 in body.children && body.children[6].type === 'text') {
            const lines = body.children[6].data.trim().split('\n');

            if (lines.length > 0) {
                const matt = lines[0].trim().match(/^(Nothing|(\d+) items?) found/);

                if (matt) {
                    if (matt[1] === 'Nothing') return 0;
                    return Number(matt[2]);
                }
            }
        }
    }
    return null;
}