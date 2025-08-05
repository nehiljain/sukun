import { Check, X } from "lucide-react";

interface StatusIconProps {
  success: boolean | null | undefined;
}

export function StatusIcon({ success }: StatusIconProps) {
  return (
    <div className="inline-flex items-center justify-center">
      {success === true ? (
        <div className="p-2 bg-green-700 rounded-full">
          <Check
            className="w-6 h-6 text-white"
            strokeWidth={3}
            aria-label="Success"
          />
        </div>
      ) : success === false ? (
        <div className="p-2 bg-red-700 rounded-full">
          <X
            className="w-6 h-6 text-red-100"
            strokeWidth={3}
            aria-label="Failure"
          />
        </div>
      ) : (
        <div className="p-2 bg-gray-400 rounded-full">
          <div className="w-6 h-6 text-gray-100" aria-label="Unknown">
            ?
          </div>
        </div>
      )}
    </div>
  );
}
