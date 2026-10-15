// One sign-in per role ("slot") in the same browser: a patient tab and a doctor tab keep separate
// Supabase sessions instead of overwriting one shared cookie. The slot for a request is chosen by:
//   1. the area in the URL (/patient, /doctor, /lab)
//   2. the x-cn-slot header, which every same-origin fetch from a page in an area carries (SLOT_SCRIPT)
//   3. the cn-slot cookie: the role of the tab that was focused last (links opened in a new tab, the landing page)
// The slot only picks which of the browser's own session cookies to read; it grants nothing by itself.

export const SLOTS = ["patient", "doctor", "lab"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_HEADER = "x-cn-slot";
export const SLOT_COOKIE = "cn-slot";

export const isSlot = (s: unknown): s is Slot => typeof s === "string" && (SLOTS as readonly string[]).includes(s);

export function slotFromPath(path: string): Slot | null {
  return SLOTS.find((s) => path === `/${s}` || path.startsWith(`/${s}/`)) ?? null;
}

export function authCookieName(slot: Slot): string {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return `sb-${ref}-auth-${slot}`;
}

/**
 * Runs in <head> before the app: tags same-origin fetches with the tab's slot, and records the
 * focused tab's slot in a cookie so header-less requests (new-tab links) use the right session.
 */
export const SLOT_SCRIPT = `(function(){try{
var S=${JSON.stringify(SLOTS)};
function slot(){var p=location.pathname;for(var i=0;i<S.length;i++){if(p==='/'+S[i]||p.indexOf('/'+S[i]+'/')===0)return S[i];}return null;}
function mark(){var s=slot();if(s)document.cookie='${SLOT_COOKIE}='+s+'; path=/; SameSite=Lax; max-age=2592000';}
mark();window.addEventListener('focus',mark);document.addEventListener('visibilitychange',function(){if(!document.hidden)mark();});
window.addEventListener('pointerdown',mark,true);
var f=window.fetch.bind(window);
window.fetch=function(input,init){try{var s=slot();if(s){var u=new URL(typeof input==='string'?input:(input instanceof URL?input.href:input.url),location.href);
if(u.origin===location.origin&&u.pathname.indexOf('/sb/')!==0){var h=new Headers((init&&init.headers)||(input instanceof Request?input.headers:undefined));h.set('${SLOT_HEADER}',s);init=Object.assign({},init,{headers:h});}}}catch(e){}return f(input,init);};
}catch(e){}})();`;
