import { useHotkeys } from "react-hotkeys-hook";

interface UseTimelineRowsShortcutsProps {
  handleDeleteOverlay: (id: number) => void;
  handleSplitItem: (
    id: number,
    info: { itemId: number; position: number } | null,
  ) => void;
  selectedOverlayId?: number | null;
  lastKnownHoverInfo: {
    itemId: number;
    position: number;
  } | null;
}

/**
 * A custom hook that sets up keyboard shortcuts for timeline controls
 *
 * Keyboard shortcuts:
 * - Delete: Delete selected overlay
 * - Shift + Delete: Delete selected overlay (alternative)
 *
 * @param {Object} props
 * @param {(id: number) => void} props.handleDeleteOverlay - Function to delete overlay
 * @param {number | null} props.selectedOverlayId - ID of the currently selected overlay
 */
export const useTimelineRowsShortcuts = ({
  handleDeleteOverlay,
  handleSplitItem,
  selectedOverlayId,
  lastKnownHoverInfo,
}: UseTimelineRowsShortcutsProps) => {
  // Add a console log to see if the hook is being called at all

  useHotkeys(
    ["shift+delete", "shift+del", "shift+backspace"], // Include both variants for cross-browser compatibility
    (e) => {
      console.log("Delete key pressed", { selectedOverlayId });
      e.preventDefault();
      if (selectedOverlayId !== null && selectedOverlayId !== undefined) {
        handleDeleteOverlay(selectedOverlayId);
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
      enabled: true, // Explicitly enable
      keydown: true, // Listen for keydown events
      keyup: false, // Don't listen for keyup
      preventDefault: true,
    },
  );

  useHotkeys(
    ["meta+c"],
    (e) => {
      console.log("Meta+C key pressed", { selectedOverlayId });
      e.preventDefault();
      if (selectedOverlayId !== null && selectedOverlayId !== undefined) {
        handleSplitItem(selectedOverlayId, lastKnownHoverInfo);
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
      enabled: true,
      keydown: true,
      keyup: false,
      preventDefault: true,
    },
  );
};
