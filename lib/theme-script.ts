/**
 * Inline <head> scripts, kept in a plain (server-safe) module.
 *
 * They must NOT live in a "use client" file: a Server Component importing a
 * non-component value from a client module receives an opaque client
 * reference, which rendered as "[object Object]" and silently broke the
 * theme bootstrap (saved light/dark preference was ignored on reload).
 */

export const THEME_STORAGE_KEY = "wizeazy.theme";

/** Applies the saved (or system) theme before first paint — no flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;

/** Shows the branded splash once per browser session (pure CSS afterwards). */
export const splashInitScript = `(function(){try{if(sessionStorage.getItem('wz-intro')){document.documentElement.classList.add('wz-no-splash')}else{sessionStorage.setItem('wz-intro','1')}}catch(e){document.documentElement.classList.add('wz-no-splash')}})();`;
