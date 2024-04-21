import { Guild } from 'discord.js';

import { Language } from '../models/enum-helpers/index.js';
import { NotificationConfig } from '../models/mongodb/index.js';
import { Lang } from '../services/index.js';
import { ClientUtils, MessageUtils } from '../utils/index.js';

interface VideoData {
    title: string;
    channelTitle: string;
    thumbnail: string;
    url: string;
    publishedAt: string;
    scheduledStartTime?: string;
}

export class YoutubeUtils {
    public static async getLatestVideoId(channelId: string, apiKey: string): Promise<string> {
        let videoId = '';

        const playlistData = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );

        if (playlistData.ok) {
            const playlistDataJson = (await playlistData.json()) as {
                pageInfo: { totalResults: number };
                items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
            };

            if (playlistDataJson.pageInfo.totalResults > 0) {
                let playlistId = playlistDataJson.items[0].contentDetails.relatedPlaylists.uploads;

                const videoData = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=1&key=${apiKey}`
                );

                if (videoData.ok) {
                    const videoDataJson = (await videoData.json()) as {
                        pageInfo: { totalResults: number };
                        items: { contentDetails: { videoId: string } }[];
                    };

                    if (videoDataJson.pageInfo.totalResults > 0) {
                        videoId = videoDataJson.items[0].contentDetails.videoId;
                    }
                }
            }
        }
        return videoId;
    }

    public static async getVideoData(videoId: string, apiKey: string): Promise<VideoData> {
        const videoData = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
        );

        if (videoData.ok) {
            const videoDataJson = (await videoData.json()) as {
                items: {
                    snippet: {
                        title: string;
                        channelTitle: string;
                        thumbnails: { high: { url: string } };
                        publishedAt: string;
                        liveBroadcastContent: string;
                    };
                }[];
            };

            const videoSnippet = videoDataJson.items[0].snippet;
            if (videoSnippet.liveBroadcastContent === 'upcoming') {
                const liveStreamData = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`
                );

                if (liveStreamData.ok) {
                    const liveStreamDataJson = (await liveStreamData.json()) as {
                        items: {
                            liveStreamingDetails: {
                                scheduledStartTime: string;
                            };
                        }[];
                    };

                    return {
                        title: videoSnippet.title,
                        channelTitle: videoSnippet.channelTitle,
                        thumbnail: videoSnippet.thumbnails.high.url,
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        publishedAt: videoSnippet.publishedAt,
                        scheduledStartTime:
                            liveStreamDataJson.items[0].liveStreamingDetails.scheduledStartTime,
                    };
                }
            }
            return {
                title: videoSnippet.title,
                channelTitle: videoSnippet.channelTitle,
                thumbnail: videoSnippet.thumbnails.high.url,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                publishedAt: videoSnippet.publishedAt,
            };
        }
    }

    public static async updateLatestVideo(
        channelId: string,
        apiKey: string,
        guild: Guild
    ): Promise<void> {
        const videoId = await this.getLatestVideoId(channelId, apiKey);
        if (!videoId) return;

        const latestVideoData = await this.getVideoData(videoId, apiKey);
        if (!latestVideoData) return;

        const existingConfig = await NotificationConfig.findOne({
            guildId: guild.id,
            youtubeChannelId: channelId,
        });
        if (!existingConfig) return;

        const existingLatestVideo = existingConfig.latestVideo.snippet;
        if (
            !existingLatestVideo.url ||
            (existingLatestVideo.url !== latestVideoData.url &&
                new Date(existingLatestVideo.publishedAt).getTime() <
                    new Date(latestVideoData.publishedAt).getTime())
        ) {
            existingConfig.latestVideo = {
                snippet: {
                    url: latestVideoData.url,
                    publishedAt: latestVideoData.publishedAt,
                },
            };
            await existingConfig.save();

            let notificationChannel = await ClientUtils.findTextChannel(
                guild,
                existingConfig.notificationChannelId
            );

            if (notificationChannel) {
                if (latestVideoData.scheduledStartTime) {
                    const isScheduled = existingConfig.scheduledVideos.items.some(
                        item => item.snippet.url === latestVideoData.url
                    );
                    if (!isScheduled) {
                        existingConfig.scheduledVideos.items.push({
                            snippet: {
                                url: latestVideoData.url,
                                publishedAt: latestVideoData.publishedAt,
                                scheduledStartTime: latestVideoData.scheduledStartTime,
                            },
                        });
                        await existingConfig.save();
                        await MessageUtils.send(
                            notificationChannel,
                            Lang.getRef('youtubeCommandReplies.newScheduledVideo', Language.Default, {
                                channelTitle: latestVideoData.channelTitle,
                                url: latestVideoData.url,
                                scheduledStartTime: latestVideoData.scheduledStartTime,
                            })
                        );
                    }
                } else {
                    await MessageUtils.send(
                        notificationChannel,
                        Lang.getRef('youtubeCommandReplies.newVideo', Language.Default, {
                            channelTitle: latestVideoData.channelTitle,
                            url: latestVideoData.url,
                        })
                    );
                }
            } else {
                existingConfig.deleteOne();
            }
        }
    }

    public static async subscribeToChannel(
        youtubeChannelId: string,
        guildId: string,
        notificationChannelId: string
    ): Promise<boolean> {
        const existingSubscription = await NotificationConfig.findOne({
            guildId: guildId,
            youtubeChannelId: youtubeChannelId,
        });

        if (existingSubscription) {
            return false;
        }

        let notificationConfig = new NotificationConfig({
            guildId: guildId,
            notificationChannelId: notificationChannelId,
            youtubeChannelId: youtubeChannelId,
        });

        await notificationConfig.save();
        return true;
    }

    public static async unsubscribeFromChannel(
        youtubeChannelId: string,
        guildId: string
    ): Promise<boolean> {
        const existingSubscription = await NotificationConfig.findOne({
            guildId: guildId,
            youtubeChannelId: youtubeChannelId,
        });

        if (!existingSubscription) {
            return false;
        }

        await existingSubscription.deleteOne();
        return true;
    }
}
