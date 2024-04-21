import { Client } from 'discord.js';
import mongoose from 'mongoose';

import { ClientUtils, YoutubeUtils } from '../../utils/index.js';
import { NotificationConfig } from '../mongodb/index.js';

export class YoutubeNotifier {
    updateInterval = 60000;
    subscriptions = [];

    constructor(
        private client: Client,
        private mongoUri: string,
        private apiKey: string
    ) {
        this.mongodbConnect();
        this.checkForNewVideos();
    }

    async mongodbConnect(): Promise<void> {
        await mongoose.connect(this.mongoUri);
    }

    async checkForNewVideos(): Promise<void> {
        this.subscriptions = await NotificationConfig.find();
        for (const subscription of this.subscriptions) {
            let guild = await ClientUtils.getGuild(this.client, subscription.guildId);
            await YoutubeUtils.updateLatestVideo(subscription.youtubeChannelId, this.apiKey, guild);
        }
    }

    async start(): Promise<void> {
        setInterval(() => this.checkForNewVideos(), this.updateInterval);
    }
}
