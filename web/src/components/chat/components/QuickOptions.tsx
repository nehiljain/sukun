import { Button } from "@/components/ui/button";
import { Clock, Link, PenToolIcon, LucideIcon } from "lucide-react";

interface QuickOption {
  icon: LucideIcon;
  text: string;
}

const quickOptions: QuickOption[] = [
  { icon: Clock, text: "When will I get the video?" },
  { icon: Link, text: "Give me the latest video export" },
  { icon: PenToolIcon, text: "Make the video no longer than 10 seconds" },
];

interface QuickOptionsProps {
  onOptionSelect: (optionText: string) => void;
}

export const QuickOptions = ({ onOptionSelect }: QuickOptionsProps) => {
  const handleQuickOptionClick = (optionText: string) => {
    // We call onOptionSelect directly, the submit logic is handled in the parent
    onOptionSelect(optionText);
  };

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {quickOptions.map((option, index) => (
        <Button
          key={index}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => handleQuickOptionClick(option.text)}
          type="button"
          aria-label={`Quick option: ${option.text}`}
        >
          <option.icon className="w-4 h-4" />
          {option.text}
        </Button>
      ))}
    </div>
  );
};
