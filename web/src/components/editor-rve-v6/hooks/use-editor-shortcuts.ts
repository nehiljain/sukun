import { useHotkeys } from "react-hotkeys-hook";
import { useTray } from "../contexts/tray-context";

/**
 * A custom hook that sets up editor-wide keyboard shortcuts
 *
 * Keyboard shortcuts:
 * - Cmd/Ctrl + K: Open chat tray
 * - Esc: Close any active tray
 *
 * @returns Object with functions to toggle chat visibility
 */
export const useEditorShortcuts = () => {
  const { activeTray, setActiveTray } = useTray();

  // Toggle chat tray visibility with Cmd/Ctrl + K
  useHotkeys(
    "meta+k, ctrl+k",
    (e) => {
      e.preventDefault();
      // Toggle chat tray (open if closed, close if open)
      setActiveTray(activeTray === "chat" ? null : "chat");
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
      preventDefault: true,
    },
  );

  // Close any tray with Escape key
  useHotkeys(
    "escape",
    (e) => {
      if (activeTray) {
        e.preventDefault();
        setActiveTray(null);
      }
    },
    {
      enableOnFormTags: false, // Don't capture escape in form fields
      preventDefault: false,
    },
  );

  // Return functions for programmatic control
  return {
    openChatTray: () => setActiveTray("chat"),
    closeTray: () => setActiveTray(null),
    toggleChatTray: () => setActiveTray(activeTray === "chat" ? null : "chat"),
    isAnyTrayOpen: activeTray !== null,
    isChatTrayOpen: activeTray === "chat",
  };
};
