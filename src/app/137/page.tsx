import type { Metadata } from "next";

const CONTENT = `The sound of the clock counting down grows even louder.
Hearing its powerful ticking makes my body ache.
Restless nights, hopeless days.
Every day feels like a faster sprint towards the collision.
Another day, another week, another month, another year...
Despite all of our progress, I feel like we're still so behind.
Of course, I am well aware of the many ways this could end.
Finite chains of events with infinite combinations, yet we only care for one.
Concluding this story doesn't only depend on us.
Other variables also need to be in the correct combination.
Not everything can be defined by ones and zeros.
To really understand, we must first learn how to ask and what to expect.
In this existence, we're creating ideals based on our own abstractions.
Normally, I would say our existence is not ready for these advancements.
Unfortunately, we can't accept that as an excuse.
It's our duty and responsibility to fix what has been broken.
Those who observe shall not be left unobserved.
Yun.




Deneb.
Altair.
Vega.`;

export const metadata: Metadata = {
  title: "1  3  7",
  description: "/ / /",
};

export default function Page() {
  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-white text-[#ff1000] pt-12 pl-14 md:pt-24 md:pl-28">
      <div className="font-geist-mono text-sm md:text-xl whitespace-pre-wrap">
        {CONTENT}
      </div>

      <div className="absolute bottom-12 left-14 md:bottom-24 md:left-28 tracking-widest text-sm md:text-2xl">
        CONTENT #XX
      </div>

      <div className="absolute bottom-12 right-14 md:bottom-24 md:right-28 tracking-widest text-sm md:text-2xl">
        / / /
      </div>

      <div className="border-2 md:border-4 border-[#ff1000] fixed top-12 right-14 md:top-24 md:right-28 border-l-0 border-b-0 md:border-l-0 md:border-b-0 w-12 h-12 md:w-24 md:h-24" />
    </div>
  );
}
