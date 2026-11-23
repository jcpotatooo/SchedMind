import logoImg from "../../assets/logo.png";

// SchedMind logo: brand icon + wordmark.
// size: "sm" for headers/sidebar, "lg" for the login/auth card.
export default function Logo({ size = "sm", showText = true }) {
  const imgSize = size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-11 w-11";
  const text = size === "lg" ? "text-3xl" : "text-xl";

  return (
    <div className="flex items-center gap-3">
      <img
        src={logoImg}
        alt="SchedMind Logo"
        className={`${imgSize} shrink-0 object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105`}
      />
      {showText && (
        <span className={`${text} font-extrabold tracking-tight text-brand-600`}>
          SchedMind
        </span>
      )}
    </div>
  );
}
