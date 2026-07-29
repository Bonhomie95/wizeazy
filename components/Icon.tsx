"use client";

import { icons, type LucideProps } from "lucide-react";

/**
 * Render a Lucide icon by its string name (used so categories can store an
 * icon name as data). Falls back to a neutral Tag icon if the name is unknown.
 */
export function Icon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const LucideIcon = icons[name as keyof typeof icons] ?? icons.Tag;
  return <LucideIcon {...props} />;
}

export const iconChoices = [
  "Smartphone",
  "Laptop",
  "Headphones",
  "Watch",
  "Gamepad2",
  "Tablet",
  "Camera",
  "Cable",
  "Tv",
  "Speaker",
  "Keyboard",
  "Mouse",
  "HardDrive",
  "Cpu",
  "BatteryCharging",
  "Router",
  "Tag",
];
