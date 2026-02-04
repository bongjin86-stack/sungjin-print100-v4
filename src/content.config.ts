import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

import categoryData from "@/config/category.json";

const workCategories = categoryData.work.map((cat) => cat.id) as [
  string,
  ...string[],
];

const newsCategories = categoryData.news.map((cat) => cat.id) as [
  string,
  ...string[],
];

const works = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/data/works" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string(),
      client: z.string(),
      category: z.enum(workCategories),
      year: z.number(),
      image: image(),
      description: z.string(),
      overview: z.string(),
      support: z.array(z.string()),
      achievements: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
        })
      ),
      testimonial: z
        .object({
          text: z.string(),
          author: z.string(),
          position: z.string(),
        })
        .optional(),
    }),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/data/news" }),
  schema: z.object({
    title: z.string(),
    category: z.enum(newsCategories),
    pubDate: z.coerce.date(),
  }),
});

export const collections = { works, news };
