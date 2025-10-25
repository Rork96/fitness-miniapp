declare module "lottie-react" {
  import * as React from "react";

  export interface LottieProps {
    animationData?: object;
    path?: string;
    loop?: boolean | number;
    autoplay?: boolean;
    className?: string;
    style?: React.CSSProperties;
  }

  const Lottie: React.FC<LottieProps>;
  export default Lottie;
}

declare module "*.json" {
  const value: unknown;
  export default value;
}
