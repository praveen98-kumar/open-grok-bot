import type { Shape } from "./data";

// Star-burst outline with rounded points.
const burst = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8 - Math.PI / 2;
  const r = i % 2 ? 22 : 29;
  return `${32 + r * Math.cos(a)},${33 + r * Math.sin(a)}`;
}).join(" ");

function Body({ shape, color }: { shape: Shape; color: string }) {
  const round = { fill: color, stroke: color, strokeWidth: 6, strokeLinejoin: "round" as const };
  const antenna = (y: number) => (
    <>
      <rect x={30.5} y={y} width={3} height={8} fill={color} />
      <circle cx={32} cy={y} r={3.5} fill={color} />
    </>
  );
  switch (shape) {
    case "superbot":
      return (
        <>
          {antenna(7)}
          <circle cx={32} cy={33} r={21} fill={color} />
          <ellipse cx={22} cy={55} rx={7} ry={4} fill={color} />
          <ellipse cx={42} cy={55} rx={7} ry={4} fill={color} />
        </>
      );
    case "dome":
      return <path d="M7 46C7 22 19 8 32 8s25 14 25 38q0 12-12 12H19Q7 58 7 46Z" fill={color} />;
    case "pentagon":
      return <polygon points="32,8 57,24 50,55 14,55 7,24" {...round} />;
    case "oval":
      return (
        <>
          {antenna(10)}
          <ellipse cx={32} cy={38} rx={27} ry={19} fill={color} />
        </>
      );
    case "capsule":
      return (
        <>
          {antenna(9)}
          <rect x={5} y={17} width={54} height={41} rx={20} fill={color} />
        </>
      );
    case "circle":
      return <circle cx={32} cy={32} r={27} fill={color} />;
    case "burst":
      return <polygon points={burst} {...round} strokeWidth={5} />;
    case "heart":
      return <path d="M32 59C12 46 3 36 4 23 5 12 14 6 22 7c5 .5 8 3 10 6 2-3 5-5.5 10-6 8-1 17 5 18 16 1 13-8 23-28 36Z" fill={color} />;
    case "tilted":
      return (
        <g transform="rotate(-14 32 34)">
          {antenna(8)}
          <rect x={8} y={15} width={48} height={44} rx={20} fill={color} />
        </g>
      );
  }
}

const faceY: Record<Shape, number> = {
  superbot: 33, dome: 38, pentagon: 34, oval: 39, capsule: 38,
  circle: 32, burst: 33, heart: 31, tilted: 37,
};

export default function BotAvatar({ shape, color, size = 46, badge = false }: {
  shape: Shape; color: string; size?: number; badge?: boolean;
}) {
  const y = faceY[shape];
  const eye = shape === "circle" ? "#e5e5e5" : color;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <Body shape={shape} color={color} />
        <g transform={shape === "tilted" ? "rotate(-14 32 34)" : undefined}>
          <rect x={17} y={y - 8} width={30} height={16} rx={8} fill="#151515" />
          <rect x={23.5} y={y - 4} width={4} height={8} rx={2} fill={eye} />
          <rect x={36.5} y={y - 4} width={4} height={8} rx={2} fill={eye} />
        </g>
      </svg>
      {badge && (
        <span className="absolute right-[-2px] bottom-[6%] grid size-[24%] place-items-center rounded-full bg-[#f2a33a] ring-2 ring-side">
          <svg viewBox="0 0 24 24" className="size-[70%]" fill="#fff">
            <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1-4.5-4.2 6.1-.8z" />
          </svg>
        </span>
      )}
    </div>
  );
}
