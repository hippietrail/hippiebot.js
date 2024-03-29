import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Earl } from '../ute/earl';
import { config } from 'dotenv';

config();

if (!process.env.APILAYER_TOKEN) {
    throw new Error(`[Curr] missing APILAYER_TOKEN`);
}

const currEarl = new Earl('https://api.apilayer.com', '/fixer/latest', {
    apikey: process.env.APILAYER_TOKEN,
});

interface ApiLayerData {
    success: boolean;
    timestamp: number;
    base: string;
    date: string;
    rates: Record<string, number>;
}

let globalCachedApilayerData: ApiLayerData | null = null;
let globalFormattedDate = '';

// a map of ISO currency codes to various information
// TODO what about narrow vs wide won and yuan/yen symbols?
interface CurrencyCodeInfo {
    sym: string;
    defAmt: number;
    name: string;
    isAmbiguous?: boolean;
}

const globalCodeToInfo: Record<string, CurrencyCodeInfo> = {
    'AUD': { sym: '$', defAmt: 1, name: 'Aussie dollar' },          // TODO narrow/wide symbol and variants? 💲$﹩＄
    'BTC': { sym: '₿', defAmt: 1, name: 'Bitcoin' },
    'CAD': { sym: '$', defAmt: 1, name: 'Canadian dollar' },        // TODO narrow/wide symbol and variants? 💲$﹩＄
    'CNY': { sym: '¥', defAmt: 100, name: 'Chinese yuan' },         // TODO narrow/wide symbol and variants? ¥￥元
    'EUR': { sym: '€', defAmt: 1, name: 'Euro' },
    'GBP': { sym: '£', defAmt: 1, name: 'UK Pound' },
    'GEL': { sym: '₾', defAmt: 1, name: 'Georgian lari' },
    'GTQ': { sym: 'Q', defAmt: 100, name: 'Guatemalan quetzal' },
    'IDR': { sym: 'Rp', defAmt: 10_000, name: 'Indonesian rupiah' },
    'INR': { sym: '₹', defAmt: 10_000, name: 'Indian rupee' },
    'JPY': { sym: '¥', defAmt: 100, name: 'Japanese yen' },         // TODO narrow/wide symbol variants? ¥￥円
    'KHR': { sym: '៛', defAmt: 10_000, name: 'Cambodian riel' },
    'KRW': { sym: '₩', defAmt: 1000, name: 'South Korean won' },    // TODO narrow/wide symbol and variants? ₩￦
    'LAK': { sym: '₭', defAmt: 100_000, name: 'Lao kip' },
    'MYR': { sym: 'RM', defAmt: 100, name: 'Malaysian ringgit' },
    'MXN': { sym: '$', defAmt: 1, name: 'Mexican peso' },           // TODO narrow/wide symbol and variants? 💲$﹩＄
    'NZD': { sym: '$', defAmt: 1, name: 'New Zealand dollar' },     // TODO narrow/wide symbol and variants? 💲$﹩＄
    'SGD': { sym: '$', defAmt: 1, name: 'Singapore dollar' },       // TODO narrow/wide symbol and variants? 💲$﹩＄
    'THB': { sym: '฿', defAmt: 100, name: 'Thai baht' },
    'TRY': { sym: '₺', defAmt: 100, name: 'Turkish lira' },
    'TWD': { sym: '$', defAmt: 1, name: 'Taiwan dollar' },          // TODO narrow/wide symbol and variants? 💲$﹩＄
    'USD': { sym: '$', defAmt: 1, name: 'US Dollar' },              // TODO narrow/wide symbol and variants? 💲$﹩＄
    'VND': { sym: '₫', defAmt: 10_000, name: 'Vietnamese dong' },
}

interface CurrencySymInfo {
    iso: string;
    isAmbiguous?: boolean;
}

// a map of currency symbols to ISO currency codes
const globalSymToInfo: Record<string, CurrencySymInfo> = {
    // non-alphabetic
    '$': { iso: 'AUD', isAmbiguous: true }, // symbol also used by: USD, CAD, MXN, NZD, SGD, TWD
    '₿': { iso: 'BTC', isAmbiguous: false},
    '€': { iso: 'EUR', isAmbiguous: false},
    '£': { iso: 'GBP', isAmbiguous: false },
    '₾': { iso: 'GEL', isAmbiguous: false },
    '₹': { iso: 'INR', isAmbiguous: false },
    '¥': { iso: 'JPY', isAmbiguous: true }, // symbol also used by : CNY
    '៛': { iso: 'KHR', isAmbiguous: false },
    '₩': { iso: 'KRW', isAmbiguous: false },
    '₭': { iso: 'LAK', isAmbiguous: false },
    '฿': { iso: 'THB', isAmbiguous: false },
    '₺': { iso: 'TRY', isAmbiguous: false },
    '₫': { iso: 'VND', isAmbiguous: false },
    // alphabetic
    'Q': { iso: 'GTQ', isAmbiguous: false },
    'RM': { iso: 'MYR', isAmbiguous: false },
    'RMB': { iso: 'CNY', isAmbiguous: false },
    'UKP': { iso: 'GBP', isAmbiguous: false },
}

// could be configurable via .env but per-user would be better...
const get1stCurrency = () => 'AUD';
const get2ndCurrency = (cur1: string) => cur1 === 'AUD' ? 'THB' : 'AUD';

class Token {
    value: string;
    isNum: boolean;
    constructor(value: string, isNumber = false) {
        this.value = value;
        this.isNum = isNumber;
    }

    // only checks if this token is three uppercase letters, the form of an ISO currency code
    isMaybeCode = () => /^[A-Z]{3}$/.test(this.value.toUpperCase());

    // checks if this token is actually a valid ISO currency code supported by apilayer
    // TODO isIsoCode might need to fetch the apilayer exchange rate data
    isSupportedCode = () => globalCachedApilayerData?.rates[this.value.toUpperCase()] !== undefined;
    
    // checks if this token is one of our hard-coded currency symbols
    isCurrSym = () => globalSymToInfo[this.value.toUpperCase()] !== undefined;
    
    // checks if this token is a number
    isNumber = () => this.isNum;
    
    // checks if this token is an ambiguous currency symbol
    isAmbigSym() {
        const e = globalSymToInfo[this.value];
        return e && typeof e === 'object' ? e.isAmbiguous : false;
    }

    // checks if this token is a preposition used in conversion expressions
    // ex: dollars as euro, dollars in yen, dollars into pounds, dollars to baht
    isPreposition() {
        return ['as', 'in', 'into', 'to'].includes(this.value.toLowerCase());
    }

    // cycle through isXYZ methods to get token type
    getType() {
        if (this.isMaybeCode()) {
            return 'code';
        } else if (this.isCurrSym()) {
            return 'sym';
        } else if (this.isNumber()) {
            return 'num';
        } else if (this.isPreposition()) {
            return 'prep';
        } else {
            return '???';
        }
    }
}

function getCodeInfoForSym(sym: string) {
    const entry = globalSymToInfo[sym];
    if (entry) {
        if (typeof entry === 'object') {
            return entry;
        } else {
            return { isAmbiguous: false, iso: entry };
        }
    }
    return null;
}

function getDefaultCodeForSym(sym: string) {
    const entry = globalSymToInfo[sym];
    if (entry) {
        if (typeof entry === 'object') {
            return entry.iso;
        } else {
            return entry;
        }
    }
    return null;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves the APILayer data.
 *
 * @param {boolean} isDataStale - Returned from a prior call to needToRefreshApiLayerData().
 * @return {Object} The apilayer data.
 */
async function getApilayerData(isDataStale: boolean) {
    if (isDataStale) {
        try {
            console.log('Fetching apilayer data...');
            globalCachedApilayerData = await currEarl.fetchJsonWithError() as ApiLayerData;
            console.log('Got apilayer data.');
            //console.log(`Got apilayer data:\n  ${Object.keys(globalCachedApilayerData)}\n  ${Object.keys(globalCachedApilayerData.rates)}`);
            globalFormattedDate = (new Date(globalCachedApilayerData.timestamp * 1000)).toLocaleString();
        } catch (error) {
            console.error('An error occurred while fetching currency data:', error);
        }
    }

    return globalCachedApilayerData;
}

/**
 * Checks if the APILayer data needs to be refreshed.
 *
 * @return {boolean} True if the APILayer data needs to be refreshed, false otherwise.
 */
function needToRefreshApiLayerData() {
    let needsRefresh = false;
    if (globalCachedApilayerData === undefined || globalCachedApilayerData === null) {
        console.log('no cached apilayer data');
        needsRefresh = true;
    } else {
        const mins = Math.floor((Date.now() - globalCachedApilayerData.timestamp * 1_000) / 60_000); // Calculate elapsed minutes
        console.log(`Elapsed: ${mins} minutes`);

        if (mins > 15) {
            console.log('cached apilayer data is over 15 minutes old');
            needsRefresh = true;
        }
    }
    return needsRefresh;
}

export const data = new SlashCommandBuilder()
    .setName('curr')
    .setDescription('Currency conversion')
    .addStringOption(option => option.setName('freeform').setDescription('free form').setRequired(false));

export const execute = curr;

export const data2 = new SlashCommandBuilder()
    .setName('curr2')
    .setDescription('Currency conversion')
    .addStringOption(option =>
        option.setName('from-cur')
            .setDescription('Currency to convert from')
            .setRequired(true)
            //.setAutocomplete(true) // TODO
            .setMinLength(3).setMaxLength(3))
    .addStringOption(option =>
        option.setName('to-cur')
            .setDescription('currency to convert to')
            .setRequired(true)
            //.setAutocomplete(true) // TODO
            .setMinLength(3).setMaxLength(3))
    .addNumberOption(option =>
        option.setName('amount')
            .setDescription('amount to convert')
            .setRequired(true)
            .setMinValue(0));

export const execute2 = curr2;

export const data3 = new SlashCommandBuilder()
        .setName('currplus')
        .setDescription('Add two arbitrary currencies')
        .addStringOption(option =>
            option.setName('cur1')
                .setDescription('First currency')
                .setRequired(true)
                .setMinLength(3).setMaxLength(3))
        .addNumberOption(option =>
            option.setName('amt1')
                .setDescription('First amount')
                .setRequired(true)
                .setMinValue(0))
        .addStringOption(option =>
            option.setName('cur2')
                .setDescription('Second currency')
                .setRequired(true)
                .setMinLength(3).setMaxLength(3))
        .addNumberOption(option =>
            option.setName('amt2')
                .setDescription('Second amount')
                .setRequired(true)
                .setMinValue(0))
        .addStringOption(option =>
            option.setName('rescur')
                .setDescription('Result currency')
                .setRequired(true)
                .setMinLength(3).setMaxLength(3));

export const execute3 = currplus;

export const data4 = new SlashCommandBuilder()
        .setName('currdiff')
        .setDescription('Difference between two arbitrary currencies')
        .addStringOption(option =>
            option.setName('cur1')
                .setDescription('First currency')
                .setRequired(true)
                .setMinLength(3).setMaxLength(3))
        .addNumberOption(option =>
            option.setName('amt1')
                .setDescription('First amount')
                .setRequired(true)
                .setMinValue(0))
        .addStringOption(option =>
            option.setName('cur2')
                .setDescription('Second currency')
                .setRequired(true)
                .setMinLength(3).setMaxLength(3))
        .addNumberOption(option =>
            option.setName('amt2')
                .setDescription('Second amount')
                .setRequired(true)
                .setMinValue(0))
        .addStringOption(option =>
            option.setName('rescur')
                .setDescription('Result currency')
                .setRequired(true)
                .setMinLength(3).setMaxLength(3));

export const execute4 = currdiff;

// Converts `amount` from `cur1` to `cur2`
function calculateCur1ToCur2Result(apilayerData: ApiLayerData, cur1: string, cur2: string, amount: number) {
    const cur1Amount = amount * (apilayerData.rates[cur2] / apilayerData.rates[cur1]);
    console.log(`[HIPP] calculateCur1ToCur2Result: ${apilayerData.rates[cur1]}, ${apilayerData.rates[cur2]}, ${amount}, ${cur1Amount}`);
    console.log(`[HIPP] calculateCur1ToCur2Result: ${cur1}, ${cur2}, ${amount}, ${cur1Amount}`);
    return `${
        (+amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } ${cur1} is ${
        cur1Amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } ${cur2}.`;
}

// Converts `amount1` from `cur1` to `cur2` and `amount2` from `cur2` to `cur1`
// Useful for getting two-way exchange rates
function calculateDefaultCur1ToCur2Results(apilayerData: ApiLayerData, cur1: string, cur2: string, amount1: number, amount2: number) {
    //console.log(`[HIPP] calculateDefaultCur1ToCur2Results: ${cur1}, ${cur2}, ${amount1}, ${amount2}`);
    return `${
        calculateCur1ToCur2Result(apilayerData, cur1, cur2, amount1)
    } ${
        calculateCur1ToCur2Result(apilayerData, cur2, cur1, amount2)
    }`;
}

/**
 * Asynchronously replies to or edits an interaction based on the provided parameters.
 *
 * @param {Object} interaction - The interaction object representing the user's interaction.
 * @param {boolean} isEdit - A boolean flag indicating whether the interaction should be edited or replied to.
 * @param {string} reply - The reply message to be sent or edited.
 * @return {Promise<void>} - A promise that resolves when the reply or edit operation is complete.
 */
async function replyOrEdit(interaction: ChatInputCommandInteraction, isEdit: boolean, reply: string) {
    console.log(`[HIPP] replyOrEdit: ${isEdit ? 'edit' : 'reply'}: ${reply}`);
    await (isEdit ? interaction.editReply(reply) : interaction.reply(reply));
}

// Currency converter
// This does different things depending on its parameters
async function curr(interaction: ChatInputCommandInteraction) {
    const needDeferEdit = needToRefreshApiLayerData();
    console.log(`[HIPP] curr: ${needDeferEdit ? 'edit' : 'reply'}`);
    if (needDeferEdit) await interaction.deferReply();
    try {
        const freeform = interaction.options.getString('freeform');
        console.log(`curr freeform: '${freeform}'`);

        const apilayerData = await getApilayerData(needDeferEdit);

        if (freeform === null) {
            await replyOrEdit(interaction, needDeferEdit, 'Give me something to convert!');
            return;
        }

        interface CurrencyFunc {
            (apilayerData: ApiLayerData, match: string[]): string;
        }

        interface Parsley {
            0: RegExp;
            1: number;
            2: CurrencyFunc;
            [Symbol.iterator](): IterableIterator<RegExp | number | CurrencyFunc>;
        }

        const parsley: Parsley[] = [
            [/^(.*?)((?:[0-9]+)(?:\.[0-9][0-9])?)(.*?)$/, 3, currAmountWithCodeAndOrSym],
            [/^([A-Za-z]{3})\s?([A-Za-z]{3})$/, 2, currTwoCodes],
            [/^([A-Za-z]{3})$/, 1, currOneCode]
        ];
    
        let matched = false;
        for (const [reg, num, fun] of parsley) {
            const match = freeform.match(reg);
            if (match && match.length === num + 1) {
                await replyOrEdit(interaction, needDeferEdit, fun(apilayerData!, match));
                matched = true;
                break;
            }
        }
    
        if (!matched) {
            await replyOrEdit(interaction, needDeferEdit, 'Give me at least an amount and a currency. Amount can have two decimal places.');
        }
    } catch (error) {
        console.error(error);
        await replyOrEdit(interaction, needDeferEdit, 'You\'re probably holding it wrong. Try again.');
    }
}

function currOneCode(apilayerData: ApiLayerData, matches: string[]) {
    const cur1 = matches[1].toUpperCase();
    const cur2 = get2ndCurrency(cur1);
    const results = calculateDefaultCur1ToCur2Results(apilayerData, cur1, cur2,
        globalCodeToInfo[cur1].defAmt, globalCodeToInfo[cur2].defAmt);
    return results;
}

function currTwoCodes(apilayerData: ApiLayerData, matches: string[]) {
    const cur1 = matches[1].toUpperCase();
    const cur2 = matches[2].toUpperCase();
    const results = calculateDefaultCur1ToCur2Results(apilayerData, cur1, cur2,
        globalCodeToInfo[cur1].defAmt, globalCodeToInfo[cur2].defAmt);
    return results;
}

function currAmountWithCodeAndOrSym(apilayerData : ApiLayerData, matches: string[]) {
    console.log(`[HIPP] amountWithCodeAndOrSym: ${matches[1]}, ${matches[2]}, ${matches[3]}`);
    const pre = matches[1].trim(); // Text before the number
    const amt = matches[2].trim(); // The actual number
    const suf = matches[3].trim(); // Text after the number

    const toks = [];
    if (pre) toks.push(new Token(pre));
    if (amt) toks.push(new Token(amt, true));
    if (suf) toks.push(new Token(suf));

    console.log(`token array length ${toks.length}: ${toks.map(t => t.value)}`);

    if (toks.length === 1) {
        return "error: hmm amount without either symbol or code?.";
    } else if (toks.length === 2) {
        const amount = toks[0].isNumber() ? toks[0].value : toks[1].value;
        const symOrCode = toks[0].isNumber() ? toks[1] : toks[0];
        if (symOrCode.isCurrSym()) {
            return currSymOnly(apilayerData, +amount, symOrCode);
        } else if (symOrCode.isMaybeCode()) {
            return currCodeOnly(apilayerData, +amount, symOrCode);
        } else {
            // TODO stuff like "100 JPY to LAK" ends up here expecting "JPY to LAK" to be either a code or a symbol...
            console.log(`[HIPP] ${symOrCode.value} is neither a symbol nor a code.`);
            //return currCodeOnly(apilayerData, amount, symOrCode);
            return "not a symbol or a code.";
        }
    } else if (toks.length === 3) {
        if (toks[0].isCurrSym() && toks[2].isCurrSym()) {
            return "error: symbols on both sides.";
        } else if (toks[0].isMaybeCode() && toks[2].isMaybeCode()) {
            return "error. codes on both sides.";
        } else if ((toks[0].isCurrSym() && toks[2].isMaybeCode()) || (toks[0].isMaybeCode() && toks[2].isCurrSym())) {
            return currSymAndCode(apilayerData, toks);
        } else {
            console.log('[HIPP] splitting the suffix into multiple tokens...');
            const matches = toks[2].value.split(/\s+/);
            if (matches) {//} && matches.length >= 3) {
                console.log(`[HIPP] ${matches.length} matches: ${matches.join(', ')}`);
                const oldToks = [...toks.slice(0, 2)];
                const newToks = matches.map(m => new Token(m));
                return currThreeOrMoreTokens(apilayerData, oldToks.concat(newToks));
            } else {
                return `Syntax error. Prefix:{${toks[0].isCurrSym()}} number:{${toks[1].value}} suffix:{${toks[2].isCurrSym()}}`;
            }
        }
    } else {
        return `Invalid number of tokens: ${toks.length}. So far only 3 tokens are supported.`;
    }
}

function currThreeOrMoreTokens(apilayerData: ApiLayerData, toks: Token[]) {
    console.log(`[3TOKS] ${toks.map(t => `${t.value} [${t.getType()}]`).join(', ')}`);
    const types = toks.map(t => t.getType());
    // look for any combination of A followed by B where
    // A is an amount (number) with either a currency symbol or code on either or both sides
    // B is a preposition followed by a currency code
    
    const possibleStartSeqs = [
        ['code', 'num'],
        ['code', 'num', 'sym'],
        ['num'],
        ['num', 'code'],
        ['num', 'sym'],
        ['sym', 'num'],
        ['sym', 'num', 'code'],
    ];

    const possibleEndSeqs = [
        ['prep', 'code'],
        ['prep', 'code', 'sym'],
        ['prep', 'sym'],
        ['prep', 'sym', 'code'],
    ];

    // check if the token array starts with one of the possible start sequences
    // and ends with one of the possible end sequences
    // with nothing in between
    const startsWith = possibleStartSeqs.find(seq => types.slice(0, seq.length).every((t, i) => t === seq[i]));
    const endsWith   =   possibleEndSeqs.find(seq => types.slice(  -seq.length).every((t, i) => t === seq[i]));
    if (!startsWith || !endsWith) {
        return `Syntax error. Prefix:{${toks[0].isCurrSym()}} number:{${toks[1].value}} suffix:{${toks[2].isCurrSym()}}`;
    }
    console.log(`startsWith: ${startsWith}, endsWith: ${endsWith}`);

    return 'looks like more than 3 tokens actually. coming soon...';
}

function currSymAndCode(apilayerData: ApiLayerData, toks: Token[]) {
    const sym = toks[0].isCurrSym() ? toks[0].value : toks[2].value;
    const code = (toks[0].isCurrSym() ? toks[2].value : toks[0].value).toUpperCase();
    const symForCode = globalCodeToInfo[code].sym;
    if (sym === symForCode) {
        const code2 = get2ndCurrency(code);
        const result = calculateCur1ToCur2Result(apilayerData, code, code2, +toks[1].value);
        return `${result} (as of ${globalFormattedDate})`;
    } else {
        var reply = `Umm ${code} is ${symForCode}, not ${sym}, which is ${getDefaultCodeForSym(sym)}`;
        if (globalSymToInfo[sym].isAmbiguous) {
            reply += ', etc';
        }
        reply += '.';
        return reply;
    }
}

// like currSymAndCode but only has three-letter code so doesn't have to check if it matches the currency symbol
// but does have to consider whether it's a code supported by apilayer
function currCodeOnly(apilayerData: ApiLayerData, amount: number, codeTok: Token) {
    const code = codeTok.value.toUpperCase();
    if (!(code in apilayerData.rates)) {
        return `${code} isn't a known currency code.`;
    }
    const code2 = get2ndCurrency(code);
    const result = calculateCur1ToCur2Result(apilayerData, code, code2, amount);
    return `${result} (as of ${globalFormattedDate})`;
}

// like currSymAndCode but only has currency symbol so doesn't have to check if it matches the ISO currency code
// but does have to consider whether the symbol is ambiguous
function currSymOnly(apilayerData: ApiLayerData, amount: number, symTok: Token) {
    const sym = symTok.value.toUpperCase();
    const code = getCodeInfoForSym(sym)!.iso;
    const code2 = get2ndCurrency(code);
    const result = calculateCur1ToCur2Result(apilayerData, code, code2, amount);
    const reply = [result];
    if (globalSymToInfo[sym].isAmbiguous) {
        reply.push(`(assuming ${sym} means ${getDefaultCodeForSym(sym)})`);
    }
    reply.push(`(as of ${globalFormattedDate})`);
    return reply.join(' ');
}

async function curr2(interaction: ChatInputCommandInteraction) {
    const needDeferEdit = needToRefreshApiLayerData();
    console.log(`[HIPP] curr2: ${needDeferEdit ? 'edit' : 'reply'}`);
    if (needDeferEdit) await interaction.deferReply();
    try {
        const [fromCurrCode, toCurrCode] = ['from-cur', 'to-cur'].map(code => interaction.options.getString(code)!.toUpperCase());
        const amount = interaction.options.getNumber('amount')!;
        console.log(`curr2 fromCurr: '${fromCurrCode}', toCurr: '${toCurrCode}', amount: '${amount}'`);

        const apilayerData = await getApilayerData(needDeferEdit);
        if (!apilayerData) {
            await replyOrEdit(interaction, needDeferEdit, 'Oops currencies failed to load!');
            return;
        }
        const invalids = [fromCurrCode, toCurrCode].map(code => [code, code in apilayerData.rates] as [string, boolean]).filter(([code, valid]) => !valid);
        if (invalids.length > 0) {
            await replyOrEdit(interaction, needDeferEdit, `Invalid currencies: ${invalids.map(([code]) => code).join(', ')}`);
            return;
        }
        const result = calculateCur1ToCur2Result(apilayerData, fromCurrCode, toCurrCode, amount);
        const reply = [result];

        await replyOrEdit(interaction, needDeferEdit, reply.join(' '));
    } catch (err) {
        console.error(err);
        await replyOrEdit(interaction, needDeferEdit, `That's your fault!`);
    }
}

async function currplus(interaction: ChatInputCommandInteraction) {
    const needDeferEdit = needToRefreshApiLayerData();
    console.log(`[HIPP] currplus: ${needDeferEdit ? 'edit' : 'reply'}`);
    if (needDeferEdit) await interaction.deferReply();
    try {
        const [curCode1, curCode2, curCodeRes] = ['cur1', 'cur2', 'rescur'].map(code => interaction.options.getString(code)!.toUpperCase());
        const [amount1, amount2] = ['amt1', 'amt2'].map(code => interaction.options.getNumber(code)!);
        console.log(`currplus curCode1: '${curCode1}', curCode2: '${curCode2}', result: '${curCodeRes}', amount1: '${amount1}', amount2: '${amount2}'`);

        const apilayerData = await getApilayerData(needDeferEdit);
        if (!apilayerData) {
            await replyOrEdit(interaction, needDeferEdit, 'Oops currencies failed to load!');
            return;
        }
        const invalids = [curCode1, curCode2, curCodeRes].map(code => [code, code in apilayerData.rates] as [string, boolean]).filter(([code, valid]) => !valid);
        if (invalids.length > 0) {
            await replyOrEdit(interaction, needDeferEdit, `Invalid currencies: ${invalids.map(([code]) => code).join(', ')}`);
            return;
        }
        // do conversion from cur1 to rescur and from cur2 to rescur, add them, and result will be shown in rescur
        await replyOrEdit(interaction, needDeferEdit, `maybe someday`);
    } catch (err) {
        console.error(err);
        await replyOrEdit(interaction, needDeferEdit, `Was I supposed to add something?`);
    }
}

async function currdiff(interaction: ChatInputCommandInteraction) {
    const needDeferEdit = needToRefreshApiLayerData();
    console.log(`[HIPP] currdiff: ${needDeferEdit ? 'edit' : 'reply'}`);
    if (needDeferEdit) await interaction.deferReply();
    try {
        const [curCode1, curCode2, result] = ['cur1', 'cur2', 'rescur'].map(code => interaction.options.getString(code)!.toUpperCase());
        const [amount1, amount2] = ['amt1', 'amt2'].map(code => interaction.options.getNumber(code));
        console.log(`currdiff curCode1: '${curCode1}', curCode2: '${curCode2}', result: '${result}', amount1: '${amount1}', amount2: '${amount2}'`);

        const apilayerData = await getApilayerData(needDeferEdit);
        if (!apilayerData) {
            await replyOrEdit(interaction, needDeferEdit, 'Oops currencies failed to load!');
            return;
        }
        const invalids = [curCode1, curCode2, result].map(code => [code, code in apilayerData.rates] as [string, boolean]).filter(([code, valid]) => !valid);
        if (invalids.length > 0) {
            await replyOrEdit(interaction, needDeferEdit, `Invalid currencies: ${invalids.map(([code]) => code).join(', ')}`);
            return;
        }
        // do conversion from cur1 to rescur and from cur2 to rescur, subtract them, and result will be shown in rescur
        await replyOrEdit(interaction, needDeferEdit, `hold your horses, I'll get to it`);
    } catch (err) {
        console.error(err);
        await replyOrEdit(interaction, needDeferEdit, `Was I supposed to diff something?`);
    }
}