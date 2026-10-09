import React from "react";
const sprites = {
  sun: [
    ".......YY.......",
    "..Y....YY....Y..",
    "...Y........Y...",
    ".....YYYYYY.....",
    "....YYYYYYYY....",
    "...YYYYYYYYYY...",
    "...YYYYYYYYYY...",
    "YY.YYYYYYYYYY.YY",
    "YY.YYYYYYYYYY.YY",
    "...YYYYYYYYYY...",
    "....YYYYYYYY....",
    ".....YYYYYY.....",
    "...Y........Y...",
    "..Y....YY....Y..",
    ".......YY.......",
  ],
  moon: [
    "......YYYY......",
    "....YYYY........",
    "...YYYY.........",
    "..YYYY..........",
    "..YYYY..........",
    ".YYYY...........",
    ".YYYY...........",
    ".YYYY...........",
    ".YYYYY........Y.",
    "..YYYYY.....YYY.",
    "..YYYYYYYYYYYY..",
    "...YYYYYYYYYY...",
    "....YYYYYYYY....",
    "......YYYY......",
  ],
  hammer: [
    "................",
    "...##########...",
    "..#LLLLLLLLLL#..",
    "..#LWWWWWWLLL#..",
    "..#LLLLLLLLLL#..",
    "...####HH####...",
    ".......HH.......",
    ".......HH.......",
    ".......HH.......",
    ".......HH.......",
    ".......HH.......",
    "......#HH#......",
    "......#HH#......",
    ".......##.......",
  ],
  paper: [
    "....########....",
    "...#WWWWWWWW#...",
    "...#WWWWWWWW#...",
    "...#WWLLLLWW#...",
    "...#WWWWWWWW#...",
    "...#WWLLLLWW#...",
    "...#WWWWWWWW#...",
    "...#WWLLLLWW#...",
    "...#WWWWWWWW#...",
    "...#WWLLLLWW#...",
    "...#WWWWWWWW#...",
    "...#WWWWWWWW#...",
    "....########....",
  ],
  scissors: [
    "...##......##...",
    "...#W#....#W#...",
    "....#W#..#W#....",
    ".....#W##W#.....",
    "......#WW#......",
    "......#LL#......",
    ".....#L##L#.....",
    "....#L#..#L#....",
    "..##LL#..#LL##..",
    ".#LLLL#..#LLLL#.",
    ".#L##L#..#L##L#.",
    ".#LLLL#..#LLLL#.",
    "..####....####..",
  ],
  bot: [
    ".....######.....",
    ".....#LLWL#.....",
    "...##########...",
    "..#LLLLLLLLLL#..",
    "..#L##LLLL##L#..",
    "..#LWWLLLLWWL#..",
    "..#LLLLLLLLLL#..",
    "...###LLLL###...",
    "..#LL######LL#..",
    "..#LL#LLLL#LL#..",
    "...###LLLL###...",
    ".....######.....",
    "....#LL##LL#....",
    "....#######.....",
  ],
  trophy: [
    "..############..",
    "..#YYYYYYYYYY#..",
    "###YYYYYYYYYY###",
    "#Y#YYYYYYYYYY#Y#",
    "#Y#YYYYYYYYYY#Y#",
    "###YYYYYYYYYY###",
    "...#YYYYYYYY#...",
    "....#YYYYYY#....",
    ".....######.....",
    "......#YY#......",
    "......#YY#......",
    "....###YY###....",
    "...#YYYYYYYY#...",
    "...##########...",
  ],
  flag: [
    "....#...........",
    "....#########...",
    "....#YYYYYYY#...",
    "....#YYYYYYY#...",
    "....#YYYYYYY#...",
    "....#########...",
    "....#...........",
    "....#...........",
    "....#...........",
    "....#...........",
    "....#...........",
    "...###..........",
  ],
};
export function Pixel({ kind = "bot", side = "white", className = "" }) {
  const rows = sprites[kind === "rock" ? "hammer" : kind] || sprites.bot;
  const palette = {
    "#": "#18221d",
    L: side === "white" ? "#f5a641" : "#458de0",
    W: "#fff8df",
    H: "#ac7044",
    Y: "#ffd33d",
  };
  return (
    <svg
      className={`pixel ${className}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {rows.flatMap((r, y) =>
        [...r].map((c, x) =>
          c === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={palette[c]}
            />
          ),
        ),
      )}
    </svg>
  );
}
