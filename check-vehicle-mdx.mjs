import fs from "node:fs";
fs.writeFileSync("check-vehicle-mdx.log", "started\n");

const matter = (await import("gray-matter")).default;
const { z } = await import("zod");

const slugString = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80);
const faqItem = z.object({ q: z.string(), a: z.string() });
const baseFm = z.object({
  slug: slugString,
  locale: z.enum(["id", "en"]),
  seoTitle: z.string().min(30).max(65),
  seoDescription: z.string().min(70).max(160),
  heroHeadline: z.string().min(4).max(90),
  heroSubheadline: z.string().min(10).max(180),
  chauffeurOnly: z.literal(true),
  updatedAt: z.string().datetime(),
});
const vehicleFm = baseFm.extend({
  seats: z.number().int().min(1).max(30),
  luggage: z.number().int().min(0),
  useCases: z.array(z.string()).min(2).max(10),
  recommendedTripTypes: z.array(z.string()).min(2).max(10),
  faqs: z.array(faqItem).max(20).optional(),
});

const files = [
  "content/vehicles/id/innova.mdx",
  "content/vehicles/en/innova.mdx",
  "content/vehicles/id/hiace.mdx",
  "content/vehicles/en/hiace.mdx",
];

let failed = false;
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  const parsed = matter(t);
  const result = vehicleFm.safeParse(parsed.data);
  if (result.success) {
    fs.appendFileSync("check-vehicle-mdx.log", f + " OK\n");
  } else {
    failed = true;
    fs.appendFileSync(
      "check-vehicle-mdx.log",
      f + " FAIL\n" + JSON.stringify(result.error.issues, null, 2) + "\n",
    );
  }
}
if (failed) process.exit(1);
