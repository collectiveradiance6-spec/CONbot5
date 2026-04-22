// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — Shared Types v5.0
// ═══════════════════════════════════════════════════════════════════════

export interface QueueTrack {
  id?:         string;
  title:       string;
  url:         string;
  duration:    number;
  thumbnail?:  string | null;
  source:      'youtube' | 'spotify' | 'soundcloud' | string;
  requestedBy?: string;
  ytId?:       string | null;
  addedAt?:    number;
  playedAt?:   string;
}

export interface RoomState {
  guildId:       string;
  voiceChannelId?: string | null;
  textChannelId?:  string | null;
  mood:          string | null;
  volume:        number;
  loop:          boolean;
  loopQueue:     boolean;
  shuffle:       boolean;
  autoplay:      boolean;
  queue:         QueueTrack[];
  history:       QueueTrack[];
  current?:      QueueTrack | null;
  elapsed:       number;
  paused:        boolean;
  eq:            string;
  skipVotes:     string[];
  updatedAt?:    string;
}

export interface SearchResult {
  title:        string;
  url:          string;
  durationInSec: number;
  thumbnail?:   string | null;
  channel?:     string;
}

export interface AdminDigestEntry {
  guildId:   string;
  playing:   boolean;
  track?:    string | null;
  mood?:     string | null;
  volume:    number;
  queue:     number;
  elapsed:   number;
  paused:    boolean;
  updatedAt?: string;
}

export interface BotCommand {
  command: string;
  payload: Record<string, unknown>;
  ts:      number;
}

export type MoodId =
  | 'midnight-lofi' | 'synthwave-lounge' | 'ambient-void'
  | 'raid-prep' | 'party-room' | 'vgm-lounge' | 'metal-forge' | 'chill-rnb'
  | 'off';

export type GenreId =
  | 'lofi' | 'synthwave' | 'ambient' | 'epicbattle' | 'hiphop' | 'electronic'
  | 'rock' | 'jazz' | 'classical' | 'kpop' | 'vgm' | 'party'
  | 'metal' | 'rnb' | 'country' | 'reggae';

export type EQPreset = 'flat' | 'bassboost' | 'nightcore' | 'vaporwave' | 'earrape';
