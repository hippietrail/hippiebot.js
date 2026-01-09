import { Earl } from '../ute/earl';

interface WikiApiJson {
    query: {
        pages: [
            {
                pageid?: unknown,
                missing?: unknown,
            }
        ]
    }
}

// export async function wikt(wikiLang: string, word: string) {
//     const wiktEarl = new Earl(`https://${wikiLang}.wiktionary.org`, '/w/api.php', {
//         'action': 'query',
//         'format': 'json',
//         'titles': word
//     });
//     try {
//         const data = await wiktEarl.fetchJson() as WikiApiJson;

//         if (Object.keys(data.query.pages).length === 1) {
//             const page = Object.values(data.query.pages)[0];

//             if ('pageid' in page) return 1;
//             else if ('missing' in page) return 0;
//         }
//     } catch (error) {
//         console.error(`[wikt]`, error);
//     }

//     return null;
// }

export async function wikt(wikiLang: string, word: string) {
    const [link, num] = await wiktInternal(wikiLang, word);
    // we can't use this linke, because it's a JSON API link! we need a human link for the word in the browser
    const humanLink = `https://${wikiLang}.wiktionary.org/wiki/${word}`
    console.log(`[wikt] ignoring link: ${link} -> ${humanLink}`);
    return num;
}

async function wiktInternal(wikiLang: string, word: string): Promise<[string, number | null]> {
    const wiktEarl = new Earl(`https://${wikiLang}.wiktionary.org`, '/w/api.php', {
        'action': 'query',
        'format': 'json',
        'titles': word
    });
    const link = wiktEarl.getUrlString();
    try {
        const data = await wiktEarl.fetchJson() as WikiApiJson;

        if (Object.keys(data.query.pages).length === 1) {
            const page = Object.values(data.query.pages)[0];

            if ('pageid' in page) return [link, 1];
            else if ('missing' in page) return [link, 0];
        }
    } catch (error) {
        console.error(`[wikt]`, error);
    }
    
    return [link, null];
}
