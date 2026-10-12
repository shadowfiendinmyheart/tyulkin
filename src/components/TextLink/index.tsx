import React from "react";

interface TextLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

// a link from the owner's text (see linkify): web pages open in a new tab;
// mailto: and tel: open an app, a new tab would stay blank
const TextLink: React.FC<TextLinkProps> = ({ href, className, children }) =>
  /^https?:/.test(href) ? (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <a className={className} href={href}>
      {children}
    </a>
  );

export default TextLink;
