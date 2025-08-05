export interface MusicTrack {
  id: string;
  title: string;
  length: number;
  audio_file: string;
  preview_url: string;
  main_artists: string[];
  featured_artists: string[];
  has_vocals: boolean;
  is_explicit: boolean;
  bpm?: number;
  created_at: string;
  moods: Mood[];
  genres: string[];
  markers: Marker[];
}

export interface Mood {
  name: string;
  cover_art_url: null;
  id: string;
}

export interface Marker {
  label: string;
  timestamp: number;
}
