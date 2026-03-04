interface LunesLogoProps {
  size?: number;
  className?: string;
}

export default function LunesLogo({ size = 24, className = "" }: LunesLogoProps) {
  return (
    <span
      role="img"
      aria-label="Lunes"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        WebkitMaskImage: "url(/icons/lunes-logo.svg)",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: "url(/icons/lunes-logo.svg)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}
