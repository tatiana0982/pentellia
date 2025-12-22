
'use client';

import Lottie from 'lottie-react';
import type { ComponentProps } from 'react';

type LottiePlayerProps = Omit<ComponentProps<typeof Lottie>, 'animationData'> & {
  animationData: unknown;
};

export default function LottiePlayer({ animationData, ...props }: LottiePlayerProps) {
  return <Lottie animationData={animationData} {...props} />;
}
