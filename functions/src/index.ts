import cors from "cors";
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";

const corsHandler = cors({ origin: true });

export const validarContenidoImagen = functions.https.onRequest(
  async (req, res) => {
    // ==== HEADERS CORS ====
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // ==== Preflight ====
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // ==== Middleware CORS ====
    corsHandler(req, res, async () => {
      // Solo POST
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      try {
        const { imageUrl } = req.body as { imageUrl: string };

        if (!imageUrl || typeof imageUrl !== "string") {
          logger.error("URL de imagen no válida", { imageUrl });
          res.status(400).json({
            valida: false,
            motivo: "URL de imagen no válida",
            detalles: { nivelRiesgo: "alto" }
          });
          return;
        }

        logger.info("Validando imagen", { imageUrl });

        // === Comprobar accesibilidad ===
        try {
          const response = await fetch(imageUrl, { method: "HEAD" });
          if (!response.ok) {
            res.status(200).json({
              valida: false,
              motivo: "No se pudo acceder a la imagen",
              detalles: { nivelRiesgo: "alto" }
            });
            return;
          }
        } catch (error) {
          logger.error("Error accediendo a la imagen", { error, imageUrl });
          res.status(200).json({
            valida: false,
            motivo: "Error al validar la imagen",
            detalles: { nivelRiesgo: "alto" }
          });
          return;
        }

        // === Moderación Sightengine ===
        const USER = process.env.SIGHTENGINE_API_USER;
        const SECRET = process.env.SIGHTENGINE_API_SECRET;

        if (USER && SECRET) {
          try {
            const params = new URLSearchParams({
              models: "nudity-2.0,offensive,text-content,wad",
              api_user: USER,
              api_secret: SECRET,
              url: imageUrl
            });

            const response = await fetch(
              `https://api.sightengine.com/1.0/check.json?${params.toString()}`
            );
            const data = await response.json();

            if (data.status !== "success") {
              logger.error("Error en Sightengine", data.error);
              res.status(200).json({
                valida: false,
                motivo: "Error al validar el contenido",
                detalles: { nivelRiesgo: "alto" }
              });
              return;
            }

            // Umbrales
            const nudity = data.nudity?.raw || 0;
            const weapons = data.weapon || 0;
            const offensive = data.offensive?.prob || 0;

            const safe =
              nudity < 0.5 && weapons < 0.5 && offensive < 0.5;

            if (!safe) {
              const reasons: string[] = [];
              if (nudity >= 0.5) reasons.push("contenido inapropiado");
              if (weapons >= 0.5) reasons.push("armas");
              if (offensive >= 0.5) reasons.push("contenido ofensivo");

              res.status(200).json({
                valida: false,
                motivo: reasons.join(", "),
                detalles: { nivelRiesgo: "alto" }
              });
              return;
            }

            res.status(200).json({
              valida: true,
              motivo: null,
              detalles: { nivelRiesgo: "bajo" }
            });
            return;
          } catch (e: any) {
            logger.error("Error en moderación", { error: e.message });
            res.status(200).json({
              valida: false,
              motivo: "Error al validar el contenido",
              detalles: { nivelRiesgo: "alto" }
            });
            return;
          }
        }

        // === Si no hay moderador configurado ===
        logger.warn("Moderación desactivada");
        res.status(200).json({
          valida: true,
          motivo: null,
          detalles: { nivelRiesgo: "bajo" }
        });
        return;

      } catch (err: any) {
        logger.error("Error inesperado", { error: err.message });
        res.status(500).json({
          valida: false,
          motivo: "Error interno",
          detalles: { nivelRiesgo: "alto" }
        });
        return;
      }
    });
  }
);
