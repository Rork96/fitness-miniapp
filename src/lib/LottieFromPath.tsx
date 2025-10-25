"use client";

import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";

type Props = {
  path: string;
  className?: string;
  loop?: boolean;
  play?: boolean;
};

type LottieController = {
  play?: () => void;
  stop?: () => void;
};

export function LottieFromPath({ path, className, loop = false, play = true }: Props) {
  const ref = useRef<LottieController | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(path);
        if (!response.ok) return;
        const json = (await response.json()) as Record<string, unknown>;
        if (active) setData(json);
      } catch {
        if (active) setData(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [path]);

  useEffect(() => {
    const controller = ref.current;
    if (!controller) return;
    if (play) controller.play?.();
    else controller.stop?.();
  }, [play]);

  if (!data) {
    return <div className={className} />;
  }

  return (
    <Lottie
      // @ts-expect-error lottieRef is missing from lottie-react types
      lottieRef={ref}
      animationData={data}
      autoplay={false}
      loop={loop}
      className={className}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  );
}
