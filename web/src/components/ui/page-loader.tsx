import { Skeleton } from "./skeleton";

export const PageLoader = () => {
  return (
    <div className="container w-[95%] md:w-2/3 mx-auto text-center text-white px-4 pt-24 pb-12">
      <div className="pt-20">
        <Skeleton className="h-10 w-48 mx-auto mb-8" />
        <Skeleton className="h-6 w-2/3 mx-auto mb-8" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index}>
            <div className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
            </div>
            <div className="p-4 text-left">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
