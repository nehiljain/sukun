import React from "react";
import { Tourify } from "@/components/tourify/Tourify";
import { ErrorBoundary } from "@/components/tourify/ErrorBoundary";

export default function TourifyPage() {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: "hsla(240,10%,3%,1)",
        backgroundImage: `
          radial-gradient(at 6% 65%, hsla(267,73%,2%,1) 0px, transparent 50%),
          radial-gradient(at 49% 4%, hsla(93,0%,0%,0.91) 0px, transparent 50%),
          radial-gradient(at 0% 99%, hsla(346,23%,28%,0.82) 0px, transparent 50%),
          radial-gradient(at 6% 82%, hsla(225,59%,10%,1) 0px, transparent 50%),
          radial-gradient(at 6% 37%, hsla(0,4%,13%,1) 0px, transparent 50%),
          radial-gradient(at 78% 0%, hsla(346,42%,85%,0.72) 0px, transparent 50%),
          radial-gradient(at 12% 66%, hsla(211,22%,24%,1) 0px, transparent 50%),
          radial-gradient(at 72% 32%, hsla(256,11%,26%,1) 0px, transparent 50%),
          radial-gradient(at 51% 66%, hsla(7,38%,60%,1) 0px, transparent 50%),
          radial-gradient(at 22% 74%, hsla(270,17%,13%,1) 0px, transparent 50%),
          radial-gradient(at 48% 37%, hsla(22,80%,87%,1) 0px, transparent 50%),
          radial-gradient(at 78% 83%, hsla(2,34%,46%,1) 0px, transparent 50%
        `,
      }}
    >
      <div className="container max-w-screen-xl mx-auto py-8 px-4">
        <ErrorBoundary>
          <Tourify />
        </ErrorBoundary>
      </div>
    </div>
  );
}
