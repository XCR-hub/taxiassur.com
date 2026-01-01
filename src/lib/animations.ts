export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const scale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.3 },
};

export const bounce = {
  initial: { opacity: 0, y: -50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 50 },
  transition: { type: 'spring', stiffness: 300, damping: 20 },
};

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function createCSSAnimation(
  name: string,
  keyframes: Record<string, Record<string, string>>,
  duration: number = 300,
  easing: string = 'ease'
): string {
  const keyframesStr = Object.entries(keyframes)
    .map(([percentage, styles]) => {
      const stylesStr = Object.entries(styles)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(' ');
      return `${percentage} { ${stylesStr} }`;
    })
    .join(' ');

  const animationName = `animation-${name}`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ${animationName} {
      ${keyframesStr}
    }
    .${animationName} {
      animation: ${animationName} ${duration}ms ${easing};
    }
  `;

  if (!document.querySelector(`style[data-animation="${name}"]`)) {
    style.setAttribute('data-animation', name);
    document.head.appendChild(style);
  }

  return animationName;
}

export class AnimationController {
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  fadeIn(duration: number = 300): Promise<void> {
    return this.animate(
      [{ opacity: '0' }, { opacity: '1' }],
      { duration, easing: 'ease' }
    );
  }

  fadeOut(duration: number = 300): Promise<void> {
    return this.animate(
      [{ opacity: '1' }, { opacity: '0' }],
      { duration, easing: 'ease' }
    );
  }

  slideUp(duration: number = 400): Promise<void> {
    return this.animate(
      [
        { opacity: '0', transform: 'translateY(20px)' },
        { opacity: '1', transform: 'translateY(0)' },
      ],
      { duration, easing: 'ease-out' }
    );
  }

  slideDown(duration: number = 400): Promise<void> {
    return this.animate(
      [
        { opacity: '1', transform: 'translateY(0)' },
        { opacity: '0', transform: 'translateY(20px)' },
      ],
      { duration, easing: 'ease-in' }
    );
  }

  scale(from: number = 0.9, to: number = 1, duration: number = 300): Promise<void> {
    return this.animate(
      [
        { opacity: '0', transform: `scale(${from})` },
        { opacity: '1', transform: `scale(${to})` },
      ],
      { duration, easing: 'ease-out' }
    );
  }

  private animate(
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      const animation = this.element.animate(keyframes, options);
      animation.onfinish = () => resolve();
    });
  }
}

export function useAnimationController(ref: React.RefObject<HTMLElement>) {
  return ref.current ? new AnimationController(ref.current) : null;
}
