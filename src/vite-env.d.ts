/// <reference types="vite/client" />

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        challengeurl?: string;
        auto?: string;
        hidelogo?: boolean;
        hidefooter?: boolean;
      }, HTMLElement>;
    }
  }
}
