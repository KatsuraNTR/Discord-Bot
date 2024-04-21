import mongoose, { Document, Schema } from 'mongoose';

let Config = require('../../../config/config.json');

interface INotificationConfig {
    guildId: string;
    notificationChannelId: string;
    youtubeChannelId: string;
    latestVideo?: {
        snippet: {
            url: string;
            publishedAt: string;
        };
    };
    scheduledVideos?: {
        items: {
            snippet: {
                url: string;
                publishedAt: string;
                scheduledStartTime: string;
            };
        }[];
    };
}

interface INotificationConfigModel extends INotificationConfig, Document {}

const notificationConfigSchema = new Schema<INotificationConfig>(
    {
        guildId: {
            type: String,
            required: true,
        },
        notificationChannelId: {
            type: String,
            required: true,
        },
        youtubeChannelId: {
            type: String,
            required: true,
        },
        latestVideo: {
            snippet: {
                url: {
                    type: String,
                },
                publishedAt: {
                    type: String,
                },
            }
        },
        scheduledVideos: {
            items: [
                {
                    snippet: {
                        url: {
                            type: String,
                        },
                        publishedAt: {
                            type: String,
                        },
                        scheduledStartTime: {
                            type: String,
                        },
                    },
                },
            ]
        },
    }
);

export const NotificationConfig = mongoose.model<INotificationConfigModel>(
    'NotificationConfig_' + Config.client.id,
    notificationConfigSchema
);
