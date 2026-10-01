import React from "react";

export interface WhatsAppIconProps {
  size?: number;
}

export function WhatsAppIcon({ size = 24 }: WhatsAppIconProps): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20.1 11.8a8.1 8.1 0 0 1-12 7.1L3 20l1.2-5a8.1 8.1 0 1 1 15.9-3.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.7c.1.2.1.4-.1.6l-.5.6c-.2.2-.2.4 0 .6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .3-.2 1-.7 1.4-.5.5-1.2.7-1.9.6-1-.2-2.3-.8-3.5-1.9-1.4-1.2-2.3-2.7-2.5-3.8-.2-.8.1-1.6.5-2.2.2-.3.5-.5.9-.6Z"
        fill="currentColor"
      />
    </svg>
  );
}