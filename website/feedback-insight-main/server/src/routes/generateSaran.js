import { Router } from "express";

const router = Router();

// Simple mock generative endpoint that returns the requested response shape.
// In production replace this with calls to your real generative AI provider.
router.post("/", async (req, res) => {
  try {
    const { comment } = req.body || {};
    const cleaned = String(comment || "").trim();

    const summary = cleaned
      ? `RINGKASAN:\nKomentar singkat: ${cleaned.slice(0, 200)}.`
      : "RINGKASAN:\nTidak ada komentar yang diberikan.";

    const recommendation = cleaned
      ? `REKOMENDASI:\nTindak lanjut yang disarankan: tinjau komentar, siapkan perbaikan operasional, dan sampaikan komunikasi ke peserta.`
      : "REKOMENDASI:\nTidak ada rekomendasi spesifik.";

    const hasil = `${summary}\n\n${recommendation}`;

    // Note: key intentionally includes newline to match the example format
    res.json({ "hasil\ninferensi": hasil });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
