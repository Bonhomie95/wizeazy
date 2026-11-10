"use client";

import {
  BatteryCharging,
  Cable,
  Camera,
  Cpu,
  Fan,
  Gamepad2,
  Gift,
  HardDrive,
  Headphones,
  House,
  Keyboard,
  Laptop,
  LayoutGrid,
  Lightbulb,
  Monitor,
  Mouse,
  Package,
  Plug,
  Printer,
  Router,
  Smartphone,
  Speaker,
  Tablet,
  Tag,
  Tv,
  Usb,
  Watch,
  Wifi,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Renders a category icon by its stored string name.
 *
 * An explicit map (instead of lucide's full `icons` object) keeps the
 * bundle tiny: importing every lucide icon used to add ~110 KB gzipped of
 * JavaScript to every page. Unknown names fall back to a neutral Tag.
 */
const ICONS: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Gamepad2,
  Tablet,
  Camera,
  Cable,
  Tv,
  Monitor,
  Speaker,
  Keyboard,
  Mouse,
  HardDrive,
  Cpu,
  BatteryCharging,
  Router,
  Wifi,
  Usb,
  Plug,
  Printer,
  Fan,
  Lightbulb,
  House,
  Gift,
  Package,
  Tag,
  LayoutGrid,
};

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const LucideIcon = ICONS[name] ?? Tag;
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
  "Monitor",
  "Speaker",
  "Keyboard",
  "Mouse",
  "HardDrive",
  "Cpu",
  "BatteryCharging",
  "Router",
  "Wifi",
  "Plug",
  "Printer",
  "Fan",
  "Lightbulb",
  "House",
  "Tag",
];
