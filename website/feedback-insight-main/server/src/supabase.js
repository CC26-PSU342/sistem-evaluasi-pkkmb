import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

// Supabase is optional for generative AI proxy only
// if (!url || !key) {
//   console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
//   process.exit(1);
// }

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
