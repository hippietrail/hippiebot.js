import { SlashCommandBuilder } from 'discord.js';
import { YoutubeVidsEarl } from '../ute/earl.js';
import { ago } from '../ute/ago.js';

const ytEarl = new YoutubeVidsEarl();
ytEarl.setMaxResults(10);

function fetchVideos(playlistId) {
    ytEarl.setPlaylistId(playlistId);
    return ytEarl.fetchJson();
}

export const data = new SlashCommandBuilder()
    .setName('ytcoding')
    .setDescription('Latest from my favourite coding youtube channels');

export const execute = ytcoding;

export const data2 = new SlashCommandBuilder()
    .setName('ytretro')
    .setDescription('Latest from my favourite retrocomputing youtube channels');

export const execute2 = ytretro;

export const data3 = new SlashCommandBuilder()
    .setName('ytcoding2')
    .setDescription('Latest from other coding youtube channels');

export const execute3 = ytcoding2;

export const data4 = new SlashCommandBuilder()
    .setName('ytretro2')
    .setDescription('Latest from other retrocomputing youtube channels');

export const execute4 = ytretro2;

export const data5 = new SlashCommandBuilder()
    .setName('ytstories')
    .setDescription('Latest from storytelling youtube channels');

export const execute5 = ytstories;

export const data6 = new SlashCommandBuilder()
    .setName('ytother')
    .setDescription('Latest from other youtube channels');

export const execute6 = ytother;

// make a map of my favourite coding youtube channel names to their channel IDs
// IDs starting with UU are the playlists for the whole channel
// and are derived from the channel IDs, which start with UC
const codingChans = {
    name: 'Coding',
    list: {
        'Acerola':                      'UUQG40havu4kNpB4pxUDQhYQ',
        'AngeTheGreat':                 'UUV0t1y4h_6-2SqEpXBXgwFQ',
        'AppleProgramming':             'UUDg-YmnNehm3KB0BpytkUJg',
        'Ben Eater':                    'UUS0N5baNlQWJCUrhCEo8WlA',
        'Bisqwit':                      'UUKTehwyGCKF-b2wo0RKwrcg',
        'Code Bullet':                  'UU0e3QhIYukixgh5VVpKHH9Q',
        'fasterthanlime':               'UUs4fQRyl1TJvoeOdekW6lYA',
        'Inigo Quilez':                 'UUdmAhiG8HQDlz8uyekw4ENw',
        'javidx9':                      'UU-yuWVUplUJZvieEligKBkA',
        'Sebastian Lague':              'UUmtyQOKKmrMVaKuRXz02jbQ',
        'StatQuest with Josh Starmer':  'UUtYLUTtgS3k1Fg4y5tAhLbw',
        'suckerpinch':                  'UU3azLjQuz9s5qk76KEXaTvA',
        'The Art of Code':              'UUcAlTqd9zID6aNX3TzwxJXg',
        'The Coding Train':             'UUvjgXvBlbQiydffZU7m1_aw',
        'Tom Marks Talks Code':         'UUknRd0bSUDYJ-_oA2r2S6IA',
        'Tsoding Daily':                'UUrqM0Ym_NbK1fqeQG2VIohg',
    }
};

const codingChans2 = {
    name: 'Coding (2)',
    list: {
        'ChibiAkumas':      'UU8t99gp5IN-FTf5rGVaRevw',
        'sphaerophoria':    'UUXzL31BCxf8En1KT34gSK6g',
        'Let\'s Get Rusty': 'UUSp-OaMpsO8K0KkOqyBl7_w',
        'No Boilerplates':  'UCUMwY9iS8oMyWDYIe6_RmoA',
        'Paul Hudson':      'UUmJi5RdDLgzvkl3Ly0DRMlQ', // Swift, SwiftUI
        'Philipp Lackner':  'UUKNTZMRHPLXfqlbdOI7mCkg', // Android, Jetpack Compose, Kotlin
        'ThePrimeTime':     'UUUyeluBRhGPCW4rPe_UvBZQ',
        'Zig SHOWTIME':     'UU2EQzAewrC10KCDFSS4j-zA',
    }
};

const retroChans = {
    name: 'Retrocomputing',
    list: {
        'Action Retro':                     'UUoL8olX-259lS1N6QPyP4IQ',
        'Adrian\'s Digital Basement':       'UUE5dIscvDxrb7CD5uiJJOiw',
        'Adrian\'s Digital Basement ][':    'UUbtwi4wK1YXd9AyV_4UcE6g',
        'Jan Beta':                         'UUftUpOO4h9EgH0eDOZtjzcA',
        'Modern Vintage Gamer':             'UUjFaPUcJU1vwk193mnW_w1w',
        'Noel\'s Retro Lab':                'UU2-SP1bYi3ueKlVU7I75wFw',
        'Nostalgia Nerd':                   'UU7qPftDWPw9XuExpSgfkmJQ',
        'PCRetroTech':                      'UUWYne_mhlRE1AiN2ApjmZDA',
        'Retro Hack Shack':                 'UUN_u47_wJuhh249H9E8sjtw',
        'RetroVirtualMachine':              'UUgNfOsqL76T13tUex62gonA',
        'RMC - The Cave':                   'UULEoyoOKZK0idGqSc6Pi23w',
        'Tech Tangents':                    'UUerEIdrEW-IqwvlH8lTQUJQ',
        'The 8-Bit Guy':                    'UU8uT9cgJorJPWu7ITLGo9Ww',
        'The Byte Attic':                   'UUfzZNuoHys1t-AdwYDhOz8g',
        'The Clueless Engineer':            'UURgWN7MQrH4V3o9wB47DYzA',
        'The Retro Desk':                   'UUWihlGXWuyJbjP5vjzD03Rw',
        'Usagi Electric':                   'UUE4xstUnu0YmkG-W9_PyYrQ',
    }
};

const retroChans2 = {
    name: 'Retrocomputing (2)',
    list: {
        'Cathode Ray Dude':     'UUXnNibvR_YIdyPs8PZIBoEw',
        'ChibiAkumas':          'UU8t99gp5IN-FTf5rGVaRevw',
        'Kim Justice':          'UU9ZWVL1Elyt2cdiQYjxS_1w',
        'LGR':                  'UULx053rWZxCiYWsBETgdKrQ',
        'Retro Recipes':        'UU6gARF3ICgaLfs3o2znuqXA',
        'The Spectrum Show':    'UUDOV38mSrjtoFkNpaPuIjLQ',
    }
};

const storiesChans = {
    name: 'Storytelling',
    list: {
        'amglimpse':    'UUv766eFS-V6auawYiqXyU1w',
        'MrBallen':     'UUtPrkXdtCM5DACLufB9jbsA',
        'Qxir':         'UUGHDQtN_vzFYJaq_Fx1eikg',
        'Thoughty2':    'UURlICXvO4XR4HMeEB9JjDlA',
    }
};

const otherChans = {
    name: 'Other',
    list: {
        'Barn Find Hunter':     'UULgEVx4mzk3T3mzgbKG54Eg',
        'Captain Disillusion':  'UUEOXxzW2vU0P-0THehuIIeg',
        'ColdFusion':           'UU4QZ_LsYcvcq7qOsOhpAX4A',
        'coldwarmotors':        'UUoculxk4_H8XzjPS_zbYUpQ',
        'Darknet Diaries':      'UUMIqrmh2lMdzhlCPK5ahsAg',
        'Jay Leno\'s Garage':   'UUQMELFlXQL38KPm8kM-4Adg',
        'Mustie1':              'UUcSeeATlWJJbXpOZRYOfaDg',
        'Trash Theory':         'UUxHcoI9ndIdAihEB7ODTOfQ',
    }
};

async function ytcoding(interaction) {
    await yt(interaction, codingChans);
}

async function ytcoding2(interaction) {
    await yt(interaction, codingChans2);
}

async function ytretro(interaction) {
    await yt(interaction, retroChans);
}

async function ytretro2(interaction) {
    await yt(interaction, retroChans2);
}

async function ytstories(interaction) {
    await yt(interaction, storiesChans);
}

async function ytother(interaction) {
    await yt(interaction, otherChans);
}

async function yt(interaction, chanGroup) {
    await interaction.deferReply();
    try {
        const now = new Date();

        if (Object.keys(chanGroup.list).length === 0) {
            await interaction.editReply(`No channels in group '${chanGroup.name}'`);
            return;
        }

        const allVids = (await Promise.all(Object.values(chanGroup.list).map(
            async plid => await fetchVideos(plid)
        ))).map(chanVids => chanVids.items).flat();
        
        allVids.sort((a, b) => b.snippet.publishedAt.localeCompare(a.snippet.publishedAt));

        const reply = `${
            allVids.slice(0, 10).map(v => `${v.snippet.channelTitle}: [${
                v.snippet.title
            }](<https://www.youtube.com/watch?v=${
                v.snippet.resourceId.videoId
            }>) - ${
                ago(now - new Date(v.snippet.publishedAt))
            }`).join('\n')
        }`;
        await interaction.editReply(reply);
    } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while fetching data.');
    }
}
