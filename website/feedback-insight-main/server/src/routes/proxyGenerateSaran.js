import { Router } from "express";
import http from "http";
import https from "https";

const router = Router();

// Proxy route to forward requests to external generative AI endpoint.
// Set target via env var GENERATIVE_AI_URL or default to provided ngrok URL.
const TARGET = process.env.GENERATIVE_AI_URL || "https://argacac-generative-ai.hf.space";
const REQUEST_TIMEOUT_MS = 15000;

const isInferenceResponse = (data) => {
  if (!data) return false;
  if (typeof data === "string") {
    return !/^\s*<\/?(html|!doctype)/i.test(data);
  }
  if (data["hasil\ninferensi"] || data.hasOwnProperty("hasil_inferensi") || data.result || data.text) return true;
  return Object.keys(data || {}).some((key) => key.replace(/[^a-zA-Z]/g, "").toLowerCase().includes("hasilinferensi"));
};

const parseResponseBody = async (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildUrl = (base, path) => {
  const trimmedBase = base.replace(/\/$/, "");
  const trimmedPath = path.replace(/^\//, "");
  return `${trimmedBase}/${trimmedPath}`;
};

const httpFetch = (url, options) => {
  const parsedUrl = new URL(url);
  const client = parsedUrl.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = client.request(parsedUrl, {
      method: options.method,
      headers: options.headers,
      timeout: REQUEST_TIMEOUT_MS,
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        resolve({ statusCode: response.statusCode || 0, headers: response.headers, body });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });

    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

const fetchTarget = async (url, requestBody) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  };

  const res = await httpFetch(url, options);

  if (res.statusCode === 405) {
    const qs = requestBody.reviews_text ? `?reviews_text=${encodeURIComponent(requestBody.reviews_text)}` : "";
    return await httpFetch(url + qs, { method: "GET", headers: { Accept: "application/json" } });
  }

  return res;
};

router.all("/proxy", async (req, res) => {
  try {
    const targetUrl = TARGET.replace(/\/$/, "");
    const summaryUrl = targetUrl.endsWith("/api/summarize")
      ? targetUrl
      : buildUrl(targetUrl, "/api/summarize");

    const requestBody = {
      ...req.body,
      reviews_text: req.body?.reviews_text || req.body?.comment || "",
    };
    let r = await fetchTarget(summaryUrl, requestBody);
    let data = parseResponseBody(r.body);

    if (!r.statusCode || r.statusCode >= 500) {
      const fallbackUrl = targetUrl;
      if (fallbackUrl !== summaryUrl) {
        const fallbackResponse = await fetchTarget(fallbackUrl, requestBody);
        if (fallbackResponse.statusCode === 200) {
          r = fallbackResponse;
          data = parseResponseBody(r.body);
        }
      }
    }

    if (r.statusCode === 200 && !isInferenceResponse(data) && !summaryUrl.endsWith("/api/summarize")) {
      const resolvedSummaryUrl = buildUrl(targetUrl, "/api/summarize");
      const summaryResponse = await fetchTarget(resolvedSummaryUrl, requestBody);
      const summaryData = parseResponseBody(summaryResponse.body);
      if (summaryResponse.statusCode === 200 && isInferenceResponse(summaryData)) {
        r = summaryResponse;
        data = summaryData;
      }
    }

    if (r.statusCode === 404 && typeof data === "string" && /ngrok is offline|ERR_NGROK_3200/i.test(data)) {
      return res.json({
        hasil_inferensi: `RINGKASAN:\nSistem AI eksternal sedang tidak tersedia saat ini. Silakan jalankan layanan generative AI Anda untuk hasil aktual.\n\nREKOMENDASI:\nSementara itu, pertimbangkan untuk melakukan evaluasi manual berdasarkan masukan komentar siswa dan tanggapi masalah utama seperti fasilitas, komunikasi, dan logistik.`,
      });
    }

    if (typeof data === "object") {
      return res.status(r.statusCode).json(data);
    }

    return res.status(r.statusCode).send(data);
  } catch (err) {
    return res.status(502).json({ error: "Bad gateway", detail: String(err) });
  }
});

export default router;
