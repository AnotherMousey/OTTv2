import React from "react";
import { Pixel } from "./Pixel";
export function Button({ children, onClick, secondary = false, ...props }) {
  return (
    <button
      className={`button ${secondary ? "secondary" : ""}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
export const ranks = [
  ["Byte Knights", 1842, "Java", 32],
  ["Null Pointer", 1816, "C", 29],
  ["Atlas Team", 1789, "Python", 26],
  ["Stack Wizards", 1754, "Java", 24],
  ["Paper Planes", 1728, "Python", 22],
  ["Segfault Society", 1690, "C", 20],
  ["The Recursives", 1664, "Python", 18],
  ["Hello World", 1638, "Java", 16],
];
export function Landscape({ children, className = "" }) {
  return (
    <div className={`landscape ${className}`}>
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="mountain m1" />
      <div className="mountain m2" />
      <div className="ground" />
      {children}
    </div>
  );
}
