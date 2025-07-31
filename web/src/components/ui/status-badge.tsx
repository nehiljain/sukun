// Status badge component to show render status with appropriate color
export const StatusBadge = ({
  status,
  className,
}: {
  status: string;
  className?: string;
}) => {
  const getStatusColor = () => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "generated":
      case "complete":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "accepted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "changes_requested":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()} ${className}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
    </span>
  );
};
