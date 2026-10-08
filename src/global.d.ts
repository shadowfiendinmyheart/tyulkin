declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.module.sass" {
  const classes: { [key: string]: string };
  export default classes;
}

// fontsource CSS entry (side-effect import in main.tsx): checked since TS 6 (noUncheckedSideEffectImports)
declare module "@fontsource/ibm-plex-mono/400";
