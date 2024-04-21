import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';

import { YoutubeCommandName } from '../../enums/index.js';
import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { Lang } from '../../services/index.js';
import { InteractionUtils, YoutubeUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

export class YoutubeCommand implements Command {
    public names = [Lang.getRef('chatCommands.youtube', Language.Default)];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = ['Administrator'];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        let args = {
            command: intr.options.getString(
                Lang.getRef('arguments.command', Language.Default)
            ) as YoutubeCommandName,
        };

        let embed: EmbedBuilder;
        switch (args.command) {
            case YoutubeCommandName.SUBSCRIBE: {
                let youtubeChannelId = intr.options.getString(
                    Lang.getRef('arguments.option', Language.Default)
                );
                let subscribed = await YoutubeUtils.subscribeToChannel(
                    youtubeChannelId,
                    intr.guildId,
                    intr.channelId
                );
                if (subscribed) {
                    embed = Lang.getEmbed('displayEmbeds.youtubeSubscribed', data.lang);
                }
                break;
            }
            case YoutubeCommandName.UNSUBSCRIBE: {
                let youtubeChannelId = intr.options.getString(
                    Lang.getRef('arguments.option', Language.Default)
                );
                let unsubscribed = await YoutubeUtils.unsubscribeFromChannel(
                    youtubeChannelId,
                    intr.guildId
                );
                if (unsubscribed) {
                    embed = Lang.getEmbed('displayEmbeds.youtubeUnsubscribed', data.lang);
                }
                break;
            }
            default: {
                return;
            }
        }

        await InteractionUtils.send(intr, embed);
    }
}
