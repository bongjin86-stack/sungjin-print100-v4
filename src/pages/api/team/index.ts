export const prerender = false;

import type { APIRoute } from "astro";

import { supabase } from "@/lib/supabase";

export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("team")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { data, error } = await supabase.from("team").insert([body]).select();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  return new Response(JSON.stringify(data), { status: 201 });
};
