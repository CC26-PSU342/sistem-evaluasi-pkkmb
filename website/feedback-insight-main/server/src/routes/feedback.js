import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

const SENTIMENTS = ["positive", "negative", "neutral"];

const CreateSchema = z.object({
  name: z.string().trim().max(100).optional().nullable(),
  prodi: z.string().trim().min(2).max(100),
  comment: z.string().trim().min(5).max(1000),
  sentiment: z.enum(SENTIMENTS),
  confidence: z.number().min(0).max(1).optional().default(0.8),
});

const UpdateSchema = CreateSchema.partial();

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  sentiment: z.enum(SENTIMENTS).optional(),
  prodi: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(["created_at", "confidence"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/v1/feedback  -> list (paginated, filterable)
router.get("/", async (req, res, next) => {
  try {
    const q = ListQuerySchema.parse(req.query);
    const from = (q.page - 1) * q.limit;
    const to = from + q.limit - 1;

    let query = supabase
      .from("feedback")
      .select("*", { count: "exact" })
      .order(q.sort, { ascending: q.order === "asc" })
      .range(from, to);

    if (q.sentiment) query = query.eq("sentiment", q.sentiment);
    if (q.prodi) query = query.ilike("prodi", `%${q.prodi}%`);
    if (q.search) query = query.ilike("comment", `%${q.search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      data,
      pagination: {
        page: q.page,
        limit: q.limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / q.limit) : 0,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid query", details: err.flatten() });
    }
    next(err);
  }
});

// GET /api/v1/feedback/:id  -> single
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Feedback not found" });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/feedback  -> create (admin)
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const body = CreateSchema.parse(req.body);
    const { data, error } = await supabase
      .from("feedback")
      .insert(body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).location(`/api/v1/feedback/${data.id}`).json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid body", details: err.flatten() });
    }
    next(err);
  }
});

// PUT /api/v1/feedback/:id  -> full/partial update (admin)
router.put("/:id", requireAdmin, async (req, res, next) => {
  try {
    const body = UpdateSchema.parse(req.body);
    if (Object.keys(body).length === 0) {
      return res.status(400).json({ error: "Body must contain at least one field" });
    }
    const { data, error } = await supabase
      .from("feedback")
      .update(body)
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Feedback not found" });
    res.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid body", details: err.flatten() });
    }
    next(err);
  }
});

// DELETE /api/v1/feedback/:id  -> remove (admin)
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Feedback not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
