import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const [bookCountRes, startDateRes] = await Promise.all([
      supabase
        .from("manual_orders")
        .select("book_count")
        .eq("is_published", true),
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", "edu100_stats_start_date")
        .maybeSingle(),
    ]);

    if (bookCountRes.error) throw bookCountRes.error;

    const total_book_count = (bookCountRes.data || []).reduce(
      (sum: number, row: { book_count: number }) => sum + (row.book_count || 0),
      0
    );

    return new Response(
      JSON.stringify({
        total_book_count,
        stats_start_date: startDateRes.data?.value || "",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
