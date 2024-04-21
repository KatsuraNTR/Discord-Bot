import { GuildMember } from 'discord.js';
import { createRequire } from 'node:module';

import { EventHandler } from './index.js';
import { EventDataService, Lang, Logger } from '../services/index.js';
import { ClientUtils, FormatUtils, MessageUtils } from '../utils/index.js';

const require = createRequire(import.meta.url);
let Logs = require('../../lang/logs.json');

export class MemberJoinHandler implements EventHandler {
    constructor(private eventDataService: EventDataService) {}

    public async process(member: GuildMember): Promise<void> {
        Logger.info(
            Logs.info.memberJoined
                .replaceAll('{MEMBER_NAME}', member.user.username)
                .replaceAll('{MEMBER_ID}', member.user.id)
                .replaceAll('{GUILD_NAME}', member.guild.name)
                .replaceAll('{GUILD_ID}', member.guild.id)
        );

        // Get data from database
        let data = await this.eventDataService.create({
            user: member.user,
            guild: member.guild,
        });

        // Send welcome message to the server's notify channel
        let notifyChannel = await ClientUtils.findNotifyChannel(member.guild, data.langGuild);
        if (notifyChannel) {
            await MessageUtils.send(
                notifyChannel,
                Lang.getEmbed('displayEmbeds.welcomeMember', data.langGuild, {
                    GUILD_NAME: member.guild.name,
                    USER_MENTION: FormatUtils.userMention(member.user.id),
                })
            );
        }
    }
}