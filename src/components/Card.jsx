import { memo } from "react";

export const Card = memo(function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
});

export const CardContent = memo(function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
});
