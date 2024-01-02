import { SlashCommandBuilder } from 'discord.js';
import { Earl } from '../ute/earl.js';
import { ago } from '../ute/ago.js';
import { config } from 'dotenv';

config();

class GithubEarl extends Earl {
    constructor() {
        super('https://api.github.com', '/users/USER/events/public');
    }
    setUserName(username) {
        this.setPathname(`/users/${username}/events/public`)
    }
}

const githubEarl = new GithubEarl();

export const data = new SlashCommandBuilder()
    .setName('github')
    .setDescription('GitHub events')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('GitHub username')
            .setRequired(false));

export const execute = async interaction => {
    await interaction.deferReply();
    try {
        const username = interaction.options.getString('username');
        const usernames = username
            ? [username] : process.env.GITHUB_USERS
                ? process.env.GITHUB_USERS.split('|') : [];

        if (usernames.length === 0) {
            await interaction.editReply('No GitHub usernames specified or in the .env file');
            return;
        }
        const now = new Date();

        const promises = usernames.map(async user => {
            githubEarl.setUserName(user);
            const events = (await (await fetch(githubEarl.getUrlString())).json()).slice(0, 3);

            return events.map(e => ({
                user: e.actor.login,
                type: e.type.split(/(?=[A-Z])/).slice(0, -1).join(' ').toLowerCase(),
                payloadAction: e.payload.action,
                repo: e.repo.name,
                created_at: e.created_at,
                elapsed_time: now - new Date(e.created_at),
            }));
        });

        const replies = await Promise.all(promises);
        const events = replies.flat();
        const sortedEvents = events.sort((a, b) => a.elapsed_time - b.elapsed_time);

        const reply = sortedEvents.map(e => `${e.user}: ${e.type}${
            e.payloadAction ? `.${e.payloadAction}` : ''
        } ${e.repo} - ${ago(e.elapsed_time)}`).join('\n');

        await interaction.editReply(reply !== "" ? reply : 'No events found');
    } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while fetching data.');
    }
}
