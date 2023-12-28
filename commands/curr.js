import { SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';

config();

const currUrl = new URL('https://api.apilayer.com');
currUrl.pathname = '/fixer/latest';
currUrl.searchParams.set('apikey', process.env.APILAYER_TOKEN);

let globalCachedApilayerData = null;
let globalFormattedDate = '';

// a map of ISO currency codes to various information
// TODO what about narrow vs wide won and yuan/yen symbols?
const globalCodeToInfo = {
    'AUD': { sym: '$', defAmt: 1, name: 'Aussie dollar' },          // TODO narrow/wide symbol and variants? 💲$﹩＄
    'BTC': { sym: '₿', defAmt: 1, name: 'Bitcoin' },
    'CNY': { sym: '¥', defAmt: 100, name: 'Chinese yuan' },         // TODO narrow/wide symbol and variants? ¥￥元
    'EUR': { sym: '€', defAmt: 1, name: 'Euro' },
    'GBP': { sym: '£', defAmt: 1, name: 'UK Pound' },
    'GEL': { sym: '₾', defAmt: 1, name: 'Georgian lari' },
    'JPY': { sym: '¥', defAmt: 100, name: 'Japanese yen' },         // TODO narrow/wide symbol variants? ¥￥円
    'KHR': { sym: '៛', defAmt: 10_000, name: 'Cambodian riel' },
    'KRW': { sym: '₩', defAmt: 1000, name: 'South Korean won' },    // TODO narrow/wide symbol and variants? ₩￦
    'LAK': { sym: '₭', defAmt: 100_000, name: 'Lao kip' },
    'MYR': { sym: 'RM', defAmt: 100, name: 'Malaysian ringgit' },
    'SGD': { sym: '$', defAmt: 1, name: 'Singapore dollar' },       // TODO narrow/wide symbol and variants? 💲$﹩＄
    'THB': { sym: '฿', defAmt: 100, name: 'Thai baht' },
    'TWD': { sym: '$', defAmt: 1, name: 'Taiwan dollar' },          // TODO narrow/wide symbol and variants? 💲$﹩＄
    'USD': { sym: '$', defAmt: 1, name: 'US Dollar' },              // TODO narrow/wide symbol and variants? 💲$﹩＄
    'VND': { sym: '₫', defAmt: 10_000, name: 'Vietnamese dong' },
}

// a map of currency symbols to ISO currency codes
const globalSymToCode = {
    // non-alphabetic
    '$': { iso: 'AUD', isAmbiguous: true }, // symbol also used by: USD
    '฿': { iso: 'THB', isAmbiguous: false },
    '€': { iso: 'EUR', isAmbiguous: false},
    '£': { iso: 'GBP', isAmbiguous: false },
    '₾': { iso: 'GEL', isAmbiguous: false },
    '₭': { iso: 'LAK', isAmbiguous: false },
    '₩': { iso: 'KRW', isAmbiguous: false },
    '¥': { iso: 'JPY', isAmbiguous: true }, // symbol also used by : CNY
    '៛': { iso: 'KHR', isAmbiguous: false },
    '₫': { iso: 'VND', isAmbiguous: false },
    '₿': { iso: 'BTC', isAmbiguous: false},
    // alphabetic
    'RM': { iso: 'MYR', isAmbiguous: false },
    'RMB': { iso: 'CNY', isAmbiguous: false },
    'UKP': { iso: 'GBP', isAmbiguous: false },
}

class Token {
    constructor(value, isNumber = false) {
        this.value = value;
        this.isNum = isNumber;
    }

    // only checks if this token is three uppercase letters, the form of an ISO currency code
    isMaybeCode = () => /^[A-Z]{3}$/.test(this.value.toUpperCase());

    // checks if this token is actually a valid ISO currency code supported by apilayer
    // TODO isIsoCode might need to fetch the apilayer exchange rate data
    isSupportedCode = () => globalCachedApilayerData.rates[this.value.toUpperCase()] !== undefined;
    
    // checks if this token is one of our hard-coded currency symbols
    isCurrSym = () => globalSymToCode[this.value] !== undefined;
    
    // checks if this token is a number
    isNumber = () => this.isNum;
    
    // checks if this token is an ambiguous currency symbol
    isAmbigSym() {
        const e = globalSymToCode[this.value];
        return e && typeof e === 'object' ? e.isAmbiguous : false;
    }
}

function getCodeInfoForSym(sym) {
    const entry = globalSymToCode[sym];
    if (entry) {
        if (typeof entry === 'object') {
            return entry;
        } else {
            return { isAmbiguous: false, iso: entry };
        }
    }
    return null;
}

function getDefaultCodeForSym(sym) {
    const entry = globalSymToCode[sym];
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
 * Retrieves data from the apilayer API if the cached data is outdated or does not exist.
 *
 * @return {Object} The data retrieved from the apilayer API.
 */
async function getApilayerData(isDataStale) {
    if (isDataStale) {
        try {
            console.log('Fetching apilayer data...');
            globalCachedApilayerData = await (await fetch(currUrl)).json();
            console.log('Got apilayer data.');
            globalFormattedDate = (new Date(globalCachedApilayerData.timestamp * 1000)).toLocaleString();
        } catch (error) {
            console.error('An error occurred while fetching currency data:', error);
        }
    }

    return globalCachedApilayerData;
}

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

function createCurrencyConverterSlashCommand(code1, name1, code2, name2) {
    return new SlashCommandBuilder()
        .setName(`${code1}${code2}`)
        .setDescription(`${name1} / ${name2}`)
        .addStringOption(option => option.setName('freeform').setDescription('free form').setRequired(false));
}

export const data = createCurrencyConverterSlashCommand('aud', 'Aussie dollar', 'thb', 'Thai baht');
export const execute = async interaction => currencyPair(interaction, "AUD", "THB");

export const data2 = createCurrencyConverterSlashCommand('thb', 'Thai baht', 'aud', 'Aussie dollar');
export const execute2 = async interaction => currencyPair(interaction, "THB", "AUD");

export const data3 = createCurrencyConverterSlashCommand('aud', 'Aussie dollar', 'lak', 'Lao kip');
export const execute3 = async interaction => currencyPair(interaction, "AUD", "LAK");

export const data4 = createCurrencyConverterSlashCommand('lak', 'Lao kip', 'aud', 'Aussie dollar');
export const execute4 = async interaction => currencyPair(interaction, "LAK", "AUD");

export const data5 = new SlashCommandBuilder()
    .setName('curr')
    .setDescription('Currency conversion')
    .addStringOption(option => option.setName('freeform').setDescription('free form').setRequired(false));

export const execute5 = curr;

// Converts `amount` from `cur1` to `cur2`
function calculateCur1ToCur2Result(apilayerData, cur1, cur2, amount) {
    const cur1Amount = amount * (apilayerData.rates[cur2] / apilayerData.rates[cur1]);
    return `${
        amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } ${cur1} is ${
        cur1Amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } ${cur2}.`;
}

// Converts `amount1` from `cur1` to `cur2` and `amount2` from `cur2` to `cur1`
// Useful for getting two-way exchange rates
function calculateDefaultCur1ToCur2Results(apilayerData, cur1, cur2, amount1, amount2) {
    //console.log(`[HIPP] calculateDefaultCur1ToCur2Results: ${cur1}, ${cur2}, ${amount1}, ${amount2}`);
    return `${
        calculateCur1ToCur2Result(apilayerData, cur1, cur2, amount1)
    } ${
        calculateCur1ToCur2Result(apilayerData, cur2, cur1, amount2)
    }`;
}

async function replyOrEdit(interaction, isEdit, reply) {
    //console.log(`[HIPP] replyOrEdit: ${isEdit ? 'edit' : 'reply'}: ${reply}`);
    await (isEdit ? interaction.editReply(reply) : interaction.reply(reply));
}

// Currency converter
// This will be the main/only command
// Will do different things depending on its parameters
async function curr(interaction) {
    const needDeferEdit = needToRefreshApiLayerData();
    if (needDeferEdit) interaction.deferReply();
    try {
        const freeform = interaction.options.getString('freeform');
        console.log(`curr freeform: '${freeform}'`);

        const apilayerData = await getApilayerData(needDeferEdit);

        if (freeform !== null) {
            const regex = /^(.*?)((?:[0-9]+)(?:\.[0-9][0-9])?)(.*?)$/;
            const matches = freeform.match(regex);

            // four groups: full match, optional currency symbol or code 1, amount, optional currency symbol or code 2
            if (matches && matches.length === 4) {
                const pre = matches[1].trim();  // Text before the number
                const amt = matches[2].trim();  // The actual number
                const suf = matches[3].trim();  // Text after the number

                const toks = [];
                if (pre) toks.push(new Token(pre));
                if (amt) toks.push(new Token(amt, true));
                if (suf) toks.push(new Token(suf));

                console.log(`token array length ${toks.length}: ${toks.map(t => t.value)}`);

                // Example usage of the Token and NumberToken class methods with tokenArray
                if (toks.length === 1) {
                    await replyOrEdit(interaction, needDeferEdit, "error: hmm amount without either symbol or code?.");
                }
                else if (toks.length === 2) {
                    const amount = toks[0].isNumber() ? toks[0].value : toks[1].value;
                    const symOrCode = toks[0].isNumber() ? toks[1] : toks[0];
                    if (symOrCode.isCurrSym()) {
                        await currSymOnly(interaction, needDeferEdit, apilayerData, amount, symOrCode);
                    } else {
                        await currCodeOnly(interaction, needDeferEdit, apilayerData, amount, symOrCode);
                    }
                }
                else if (toks.length === 3) {
                    if (toks[0].isCurrSym() && toks[2].isCurrSym()) {
                        await replyOrEdit(interaction, needDeferEdit, "error: symbols on both sides.");
                    } else if (toks[0].isMaybeCode() && toks[2].isMaybeCode()) {
                        await replyOrEdit(interaction, needDeferEdit, "error. codes on both sides.");
                    } else if ((toks[0].isCurrSym() && toks[2].isMaybeCode()) || (toks[0].isMaybeCode() && toks[2].isCurrSym())) {
                        await currSymAndCode(interaction, needDeferEdit, apilayerData, toks);
                    } else {
                        const regex = /^(.+?)\s+(.+?)$/;
                        const matches = toks[2].value.match(regex);
                        if (matches && matches.length === 3) {
                            const fakeMoreToks = [...toks, matches[1], matches[2]];
                            await replyOrEdit(interaction, needDeferEdit, 'looks like four tokens actually. coming soon...');
                            console.log(`matches: ${JSON.stringify(fakeMoreToks)}`);
                        } else {
                            await replyOrEdit(interaction, needDeferEdit, `Syntax error. Prefix:{${toks[0].isCurrSym()}} number:{${toks[1].value}} suffix:{${toks[2].isCurrSym()}}`);
                        }
                    }
                } else {
                    await replyOrEdit(interaction, needDeferEdit, `Invalid number of tokens: ${toks.length}. So far only 3 tokens are supported.`);
                }
            }
            // any other number of groups we don't handle yet
            else {
                await replyOrEdit(interaction, needDeferEdit, 'Give me at least an amount and a currency. Amount can have two decimal places.');
            }
        } else {
            await replyOrEdit(interaction, needDeferEdit, 'Give me something to convert!');
        }
    } catch (error) {
        console.error(error);
        await replyOrEdit(interaction, needDeferEdit, 'You\'re probably holding it wrong. Try again.');
    }
}

// TODO are we really passing apilayerData around, or should we just get it from the global variable?
async function currSymAndCode(interaction, needDeferEdit, apilayerData, toks) {
    //console.log("* symbol on one side, code on the other...");
    const sym = toks[0].isCurrSym() ? toks[0].value : toks[2].value;
    const code = (toks[0].isCurrSym() ? toks[2].value : toks[0].value).toUpperCase();
    const code2ForSym = getCodeInfoForSym(sym).iso;
    if (code === code2ForSym) {
        const code2 = code === 'AUD' ? 'THB' : 'AUD';
        //console.log(`* code: ${code}, code2: ${code2}, amount: ${toks[1].value}`);
        const result = calculateCur1ToCur2Result(apilayerData, code, code2, toks[1].value);
        const reply = `${result} (as of ${globalFormattedDate})`;
        await replyOrEdit(interaction, needDeferEdit, reply);
    } else {
        const reply = `error: symbol ${sym} => ${code2ForSym}, not ${code}.`;
        await replyOrEdit(interaction, needDeferEdit, reply);
    }
}

// like currSymAndCode but only has three-letter code so doesn't have to check if it matches the currency symbol
// but does have to consider whether it's a code supported by apilayer
// TODO should we pass apilayerData here instead of globalCachedApilayerData?
async function currCodeOnly(interaction, needDeferEdit, apilayerData, amount, codeTok) {
    //console.log(`* code on one side. code: ${codeTok.value}, amount: ${amount}`);
    const code = codeTok.value.toUpperCase();
    const code2 = code === 'AUD' ? 'THB' : 'AUD';
    //console.log(`* code: ${code}, code2: ${code2}, amount: ${amount}`);
    const result = calculateCur1ToCur2Result(apilayerData, code, code2, amount);
    const reply = `${result} (as of ${globalFormattedDate})`;
    await replyOrEdit(interaction, needDeferEdit, reply);
}

// like currSymAndCode but only has currency symbol so doesn't have to check if it matches the ISO currency code
// but does have to consider whether the symbol is ambiguous
async function currSymOnly(interaction, needDeferEdit, apilayerData, amount, symTok) {
    //console.log(`* symbol on one side. symbol: ${symTok.value}, amount: ${amount}`);
    const code = getCodeInfoForSym(symTok.value).iso;
    const code2 = code === 'AUD' ? 'THB' : 'AUD';
    //console.log(`* code: ${code}, code2: ${code2}, amount: ${amount}`);
    const result = calculateCur1ToCur2Result(apilayerData, code, code2, amount);
    const reply = `${result} (as of ${globalFormattedDate})`;
    await replyOrEdit(interaction, needDeferEdit, reply);
}

// Called from the 'currency pair' slash commands: /audthb, /audlak, etc
// Without the optional freeform parameter, convert the default amount from each currency to the other
// With the optional parameter, it should be an amount to convert from the first currency to the second
// 
async function currencyPair(interaction, cur1, cur2) {
    const needDeferEdit = needToRefreshApiLayerData();
    if (needDeferEdit) await interaction.deferReply();
    try {
        const freeform = interaction.options.getString('freeform');

        const apilayerData = await getApilayerData(needDeferEdit);

        if (freeform === null) {
            const results = calculateDefaultCur1ToCur2Results(apilayerData, cur1, cur2,
                globalCodeToInfo[cur1].defAmt, globalCodeToInfo[cur2].defAmt);
            await replyOrEdit(interaction, needDeferEdit, `${results} (as of ${globalFormattedDate})`);
        } else {
            const result = currencyPairWithFreeFormParam(interaction, apilayerData, needDeferEdit, cur1, cur2, freeform);
            await replyOrEdit(interaction, needDeferEdit, result);
        }
    } catch (error) {
        console.error(error);
        await replyOrEdit(interaction, needDeferEdit, 'An error occurred while fetching data.');
    }
}

function currencyPairWithFreeFormParam(interaction, apilayerData, needDeferEdit, cur1, cur2, freeform) {
    const regex = /^(.*?)((?:[0-9]+)(?:\.[0-9][0-9])?)(.*?)$/;
    const matches = freeform.match(regex);

    if (matches && matches.length === 4) {
        const pre = matches[1]; // Text before the number
        const num = matches[2]; // The actual number
        const suf = matches[3]; // Text after the number

        if (pre === "" && suf === "") {
            const result = calculateCur1ToCur2Result(apilayerData, cur1, cur2, parseFloat(num));
            return `${result} (as of ${globalFormattedDate})`;
        } else {
            // TODO handle cases where pre and/or suf are not empty?
            // TODO for instance, if pre is "฿" or "₭" or "$"
            // Use Token.isMaybeCode
            const p = new Token(pre);
            const s = new Token(suf);
            console.log(`[HIPP] currencyPairWithFreeFormParam: pre: ${p.value} ${p.isCurrSym()}, suf: ${s.value} ${s.isCurrSym()}`);
            return 'hmm prefix and/or suffix present?';
        }
    } else {
        // this should only happen if the regex is broken
        console.log('[HIPP] currencyPairWithFreeFormParam: Regex did not match.');
        return 'wut??';
    }
}
