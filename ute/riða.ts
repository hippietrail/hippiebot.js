import { Earl } from './earl';
import { DomNode } from './dom';
import parse from 'html-dom-parser';

// Android Studio - https://androidstudio.googleblog.com/
// document.querySelector("#BlogArchive1_ArchiveList")
// document.querySelector("#BlogArchive1 > div")
//
// document.querySelector("body > div.cols-wrapper > div > div.col-left > div.blogger-archives")

// IntelliJ IDEA - https://blog.jetbrains.com/idea/category/releases/
// document.querySelector("#main > section > div > div.row.card_container")

interface Att {
    id?: string
    class?: string
}

class Riða extends Earl {
    async skrapa() {
        console.log('skrapa', this.getUrlString());

        const html = await this.fetchText();
        const domo = parse(html) as DomNode[];

        const site = (n => {
            const a = n.split('.');
            return a.slice(+(a[0] === 'www'), -1).join('.').slice(0, 4);
        })(this.url.hostname);
        console.log(`hostname: ${this.url.hostname} site: ${site}`);

        if (site === 'blog') {
            console.log("blog.jetbrains...");
            const foo = wonda(domo, site, 0, 3, [], true, (att: Att) => att.id === 'main')
            if (foo) {
                const { node:startNode, depth, index } = foo;
                console.log("I.I. startNode:", depth, index);
                printNode(site, depth, index, 'tag', 'I.I. START NODE FOUND', null, startNode && startNode.attribs ? startNode.attribs : null, []);
                console.log();

                const fooBar = wonda(
                    startNode.children,
                    site,
                    depth+1,
                    depth+4,
                    [],
                    false,
                    (att?: Att) => att && 'class' in att && att.class && att.class.includes('card_container') ? true : false
                );

                if (fooBar) {
                    const { node:startNode, depth, index } = fooBar;
                    console.log("I.I. startNode#2:", depth, index);
                    printNode(site, depth, index, 'tag', 'I.I. START NODE#2 FOUND', null, startNode && startNode.attribs ? startNode.attribs : null, []);
                    console.log();
                }
            } else {
                console.log("I.I. startNode is null");
            }
        } else {
            console.log("unknown site:", site);
        }
    }
}

interface WondaReturn {
    node: any       // TODO fix 'any' type
    depth: number
    index: number
}

export function wonda(
    nodar: DomNode[],
    site: string,
    depp: number,
    tooDeep: number,
    path: number[],
    quiet: boolean = false,
    optFunk?: (att: Att) => boolean
): WondaReturn | null | undefined {
    //console.log('wonda', quiet ? 'quiet' : 'not quiet');
    for (const [i, nod] of nodar.entries()) {
        const [t, nn, att] = [nod.type, nod.name, nod.attribs];
        if (t === 'text' && nod.data?.trim().length === 0) continue;
        
        if (!quiet || (att && 'id' in att)) printNode(site, depp, i, t, nn, nod.data, att, path);

        if (optFunk) {
            //if (att && att.id) if (!quiet) console.log('@@@', att.id, optionalIdToFind, att.id === optionalIdToFind);
            //if (att && att.id === optionalIdToFind) {
            if (att && optFunk(att)) {
                // /*if (!quiet)*/ console.log(`${site}${' '.repeat(depp)} ${depp}.${i} -- found ${optionalIdToFind} --`);
                /*if (!quiet)*/ console.log(`${site}${' '.repeat(depp)} ${depp}.${i} -- found --`);
                return { node:nod, depth:depp, index:i };
            }
        }

        if (nod.children) {
            /*if (depp > tooDeep) {
                if (!quiet) console.log(`${site}${' '.repeat(depp)} ${depp}.${i} -- too deep --`);
                return null;
            } else*/ {
                const foo = wonda(nod.children, site, depp + 1, tooDeep, [...path, i], quiet, optFunk);
                if (foo) return foo;
            }
        }
    }
}

export function imLost(nodar: DomNode[]) {
    for (const nod of nodar) {
        printNode('imLost', 0, 0, 'tag', nod.name, null, nod.attribs, []);
        if (nod.children) imLost(nod.children);
    }
}

function printNode(
    siteName: string,
    depth: number,
    childNum: number,
    type: string,
    tagName?: string,
    nodeData?: string | null,
    att?: Att,
    path: number[] = []
) {
    console.log(`${siteName}${' '.repeat(depth)} ${depth}.${childNum} ${type} ${
        type === 'tag' ? `<${tagName}>`
        //: type === 'text' ? `""${nodeData.slice(0, 12).replace(/\n/g, '\\n')}${nodeData.length > 12 ? '...' : ''}""`
        : type === 'text' ? `""${nodeData!.slice(0, 24).replace(/\n/g, '\\n')}${nodeData!.length > 24 ? '...' : ''}""`
        : ''
    }${
        !att || !att.id ? '' : ` #${att.id}`}${!att || !att.class ? '' : ` ${
            att.class.split(/\s+/).map(c => `.${c}`).join('')
        }`
    }${
        ` ${[...path, childNum].join('.')}`
    }`);
}

export class IIRiða extends Riða {
    constructor() {
        super('https://blog.jetbrains.com', '/idea/category/releases/');
    }
}

export class RubyRiða extends Riða {
    constructor() {
        super('https://www.ruby-lang.org', '/en/downloads/releases/');
    }
}