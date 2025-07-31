import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  useMemo,
} from "react";
import { Label } from "@/components/ui/label";
import { Play, Pause, GalleryHorizontalEnd, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { audioController } from "./Tourify";
import { MusicTrack, Mood } from "@/types/sound-gen";

interface MusicSelectorProps {
  tracks: MusicTrack[];
  selectedTrackId: string | null;
  initialSelectedMood: string | null;
  onTrackSelect: (trackId: string) => void;
  onMoodSelect: (moodId: string) => void;
  showTracks?: boolean;
}

// Memoized track item component to prevent unnecessary re-renders
const TrackItem = memo(
  ({
    track,
    isSelected,
    isPlaying,
    onSelect,
    onPlayPause,
  }: {
    track: MusicTrack;
    isSelected: boolean;
    isPlaying: boolean;
    onSelect: (trackId: string) => void;
    onPlayPause: (
      trackId: string,
      trackSrc: string,
      event: React.MouseEvent,
    ) => void;
  }) => {
    // Format duration from seconds to MM:SS
    const formatDuration = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    // Format artists string
    const getArtistsString = (main: string[], featured: string[]) => {
      const mainStr = main.join(", ");
      if (featured.length === 0) return mainStr;
      return `${mainStr} ft. ${featured.join(", ")}`;
    };

    return (
      <div
        key={track.id}
        onClick={() => onSelect(track.id)}
        className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          isSelected
            ? "border-2 border-indigo-500 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            : "border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60"
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="min-w-0">
            <Label
              htmlFor={track.id}
              className="text-sm font-medium text-white tracking-wide flex items-center gap-2"
            >
              {track.title}
              {track.is_explicit && (
                <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                  Explicit
                </span>
              )}
            </Label>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">
              {getArtistsString(track.main_artists, track.featured_artists)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {track.markers && (
              <span className="text-xs flex items-center gap-1 text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                {track.markers.length - 2}
                <GalleryHorizontalEnd size={16} />
                needed
              </span>
            )}
            {track.has_vocals && (
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                Vocals
              </span>
            )}
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
              {formatDuration(track.length)}
            </span>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isPlaying
                ? "bg-indigo-500 text-white hover:bg-indigo-600"
                : "text-white hover:bg-slate-700"
            }`}
            onClick={(e) =>
              onPlayPause(track.id, track.preview_url || track.audio_file, e)
            }
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </Button>
        </div>
      </div>
    );
  },
);

TrackItem.displayName = "TrackItem";

// Add new interfaces for filter options
interface FilterOption {
  id: string;
  name: string;
}

// Get unique moods from tracks
const getMoodOptions = (tracks: MusicTrack[]): FilterOption[] => {
  // Use a Map to deduplicate by ID
  const moodMap = new Map<string, Mood>();
  tracks.forEach((track) => {
    track.moods.forEach((mood) => {
      if (!moodMap.has(mood.id)) {
        moodMap.set(mood.id, mood);
      }
    });
  });

  return Array.from(moodMap.values()).map((mood) => ({
    id: mood.id,
    name: mood.name.charAt(0).toUpperCase() + mood.name.slice(1),
  }));
};

// Add a FilterButton component
const FilterButton = memo(
  ({
    label,
    isSelected,
    onClick,
  }: {
    label: string;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border border-slate-700 ${
        isSelected
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      }`}
    >
      {label}
    </button>
  ),
);

FilterButton.displayName = "FilterButton";

export function MusicSelector({
  tracks,
  selectedTrackId,
  initialSelectedMood,
  onTrackSelect,
  onMoodSelect,
  showTracks = true,
}: MusicSelectorProps) {
  // Use refs for audio management to prevent re-renders
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Get mood options from tracks
  const moodOptions = useMemo(() => getMoodOptions(tracks), [tracks]);

  // Add filter state
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  // Filter handling functions
  const toggleMood = useCallback((moodId: string) => {
    setSelectedMoods((prev) =>
      prev.includes(moodId)
        ? prev.filter((id) => id !== moodId)
        : [...prev, moodId],
    );
    setSelectedMoods([moodId]);
  }, []);

  // Filter tracks based on selected moods
  const filteredTracks = useMemo(() => {
    if (selectedMoods.length === 0) {
      return tracks;
    }

    return tracks.filter((track) =>
      track.moods.some((mood) => selectedMoods.includes(mood.id)),
    );
  }, [tracks, selectedMoods]);

  // Set default track on mount
  useEffect(() => {
    if (!selectedTrackId && tracks.length > 0) {
      onTrackSelect(tracks[0].id);
    }
  }, []);

  useEffect(() => {
    let initialSelectedMoodFilterOption = undefined;
    if (initialSelectedMood) {
      initialSelectedMoodFilterOption = moodOptions.find((m) => {
        return m.name == initialSelectedMood;
      });
    }
    if (initialSelectedMoodFilterOption == undefined) {
      initialSelectedMoodFilterOption = moodOptions[0];
    }
    if (moodOptions.length > 0) {
      toggleMood(initialSelectedMoodFilterOption.id);
    }
  }, [moodOptions, initialSelectedMood, toggleMood]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
        audioController.audioElement = null;
      }
    };
  }, []);

  // Handle track ended event
  useEffect(() => {
    if (audioRef.current) {
      const handleEnded = () => setPlayingTrackId(null);
      audioRef.current.addEventListener("ended", handleEnded);

      return () => {
        audioRef.current?.removeEventListener("ended", handleEnded);
      };
    }
  }, [audioRef.current]);

  // Optimized play/pause handler with useCallback to prevent recreation on each render
  const handlePlayPause = useCallback(
    (trackId: string, trackSrc: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (playingTrackId === trackId) {
        // Currently playing track, pause it
        if (audioRef.current) {
          audioRef.current.pause();
          setPlayingTrackId(null);
        }
      } else {
        // Either a different track or no track is playing

        // If we already have an audio element, reuse it
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = trackSrc;

          // Play with error handling
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setPlayingTrackId(trackId);
                audioController.audioElement = audioRef.current;
              })
              .catch((error) => {
                console.error("Playback error:", error);
                setPlayingTrackId(null);
              });
          }
        } else {
          // Create a new audio element if none exists
          const audio = new Audio(trackSrc);

          // Set up event listeners
          audio.addEventListener("ended", () => setPlayingTrackId(null));
          audio.addEventListener("error", () => {
            console.error("Audio error occurred");
            setPlayingTrackId(null);
          });

          // Play with error handling
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                audioRef.current = audio;
                audioController.audioElement = audio;
                setPlayingTrackId(trackId);
              })
              .catch((error) => {
                console.error("Playback error:", error);
                setPlayingTrackId(null);
              });
          }
        }
      }
    },
    [playingTrackId],
  );

  // Listen for external stop commands
  useEffect(() => {
    const checkIfStopped = () => {
      if (audioRef.current && audioRef.current.paused && playingTrackId) {
        setPlayingTrackId(null);
      }
    };

    // Check every second if audio has been stopped externally
    const intervalId = setInterval(checkIfStopped, 1000);
    return () => clearInterval(intervalId);
  }, [playingTrackId]);

  return (
    <div className="space-y-6">
      {/* Filter UI */}
      <div className="space-y-4">
        {/* Moods filter */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {moodOptions.map((mood) => (
              <FilterButton
                key={mood.id}
                label={mood.name}
                isSelected={selectedMoods.includes(mood.id)}
                onClick={() => {
                  toggleMood(mood.id);
                  onMoodSelect(mood.name);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-3">
        {showTracks ? (
          filteredTracks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No tracks match the selected filters
            </div>
          ) : (
            filteredTracks.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                isPlaying={playingTrackId === track.id}
                onSelect={onTrackSelect}
                onPlayPause={handlePlayPause}
              />
            ))
          )
        ) : null}
      </div>
      {/* ES Track Disclaimer */}
      {useMemo(() => {
        const selectedTrack = tracks.find(
          (track) => track.id === selectedTrackId,
        );
        const isEsTrack =
          selectedTrack &&
          (selectedTrack.title.includes("ES_") ||
            selectedTrack.audio_file.includes("ES_"));

        return isEsTrack ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-yellow-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500" />
            <p className="text-xs">
              This is an Epidemic Sounds track, please ensure you have a valid
              license for commercial use.
            </p>
          </div>
        ) : null;
      }, [selectedTrackId, tracks])}
    </div>
  );
}
