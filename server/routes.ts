import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import express from "express";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const authTokens = new Map<string, string>();

function generateToken(): string {
  return randomUUID() + "-" + randomUUID();
}

function requireAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const userId = authTokens.get(token);
    if (userId) {
      (req as any).userId = userId;
      return next();
    }
  }

  if (req.session?.userId) {
    (req as any).userId = req.session.userId;
    return next();
  }

  return res.status(401).json({ message: "Not authenticated" });
}

function getUserId(req: Request): string {
  return (req as any).userId;
}

async function seedSampleData() {
  const existing = await storage.getUserByUsername("demo");
  if (existing) return;

  const hashedPassword = await bcrypt.hash("demo123", 10);
  const user = await storage.createUser({
    username: "demo",
    email: "demo@pixeldrop.app",
    password: hashedPassword,
  });

  const sampleImages = [
    { title: "Mountain Sunrise", color: "#FF6B35" },
    { title: "Ocean Waves", color: "#0EA5E9" },
    { title: "City Lights", color: "#8B5CF6" },
    { title: "Forest Trail", color: "#10B981" },
    { title: "Golden Desert", color: "#F59E0B" },
  ];

  for (const img of sampleImages) {
    const filename = `sample_${randomUUID()}.png`;
    const filepath = path.join(uploadsDir, filename);
    const pngBuffer = generateSimplePng(img.color);
    fs.writeFileSync(filepath, pngBuffer);

    await storage.createImage({
      userId: user.id,
      title: img.title,
      filename: filename,
      shareToken: randomUUID().replace(/-/g, "").slice(0, 12),
      mimeType: "image/png",
      fileSize: fs.statSync(filepath).size,
    });
  }

  console.log("Sample data seeded: user=demo, password=demo123");
}

function generateSimplePng(color: string): Buffer {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const width = 800;
  const height = 600;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  function crc32(data: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function createChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const typeAndData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      const cx = x / width;
      const cy = y / height;
      const factor = 0.7 + 0.3 * (1 - cy);
      rawData.push(Math.floor(r * factor));
      rawData.push(Math.floor(g * factor));
      rawData.push(Math.floor(b * factor));
    }
  }

  const { deflateSync } = require("zlib");
  const compressed = deflateSync(Buffer.from(rawData));

  const ihdr = createChunk("IHDR", ihdrData);
  const idat = createChunk("IDAT", compressed);
  const iend = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "pixeldrop-secret-key",
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax" as const,
      },
    })
  );

  app.use("/uploads", express.static(uploadsDir));

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, email, password: hashedPassword });

      req.session.userId = user.id;
      const token = generateToken();
      authTokens.set(token, user.id);

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        token,
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const token = generateToken();
      authTokens.set(token, user.id);

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      return res.json({
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      let userId: string | undefined;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        userId = authTokens.get(token);
      }

      if (!userId && req.session?.userId) {
        userId = req.session.userId;
      }

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Me error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      authTokens.delete(token);
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/images", requireAuth, async (req: Request, res: Response) => {
    try {
      const imgs = await storage.getImagesByUserId(getUserId(req));
      return res.json(imgs);
    } catch (error) {
      console.error("Get images error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/images/upload", requireAuth, upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const title = req.body.title || "Untitled";
      const shareToken = randomUUID().replace(/-/g, "").slice(0, 12);

      const image = await storage.createImage({
        userId: getUserId(req),
        title,
        filename: req.file.filename,
        shareToken,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      });

      return res.json(image);
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/images/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const image = await storage.getImageById(req.params.id);
      if (!image || image.userId !== getUserId(req)) {
        return res.status(404).json({ message: "Image not found" });
      }

      const filepath = path.join(uploadsDir, image.filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      await storage.deleteImage(req.params.id, getUserId(req));
      return res.json({ message: "Image deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/share/:token", async (req: Request, res: Response) => {
    try {
      const image = await storage.getImageByShareToken(req.params.token);
      if (!image) {
        return res.status(404).send(getNotFoundHtml());
      }

      const user = await storage.getUser(image.userId);
      const protocol = req.header("x-forwarded-proto") || req.protocol || "https";
      const host = req.header("x-forwarded-host") || req.get("host");
      const baseUrl = `${protocol}://${host}`;
      const imageUrl = `${baseUrl}/uploads/${image.filename}`;

      return res.send(getSharePageHtml(image.title, imageUrl, user?.username || "Anonymous", image.createdAt));
    } catch (error) {
      console.error("Share error:", error);
      return res.status(500).send("Internal server error");
    }
  });

  await seedSampleData().catch((err) => console.error("Seed error:", err));

  const httpServer = createServer(app);
  return httpServer;
}

function getSharePageHtml(title: string, imageUrl: string, username: string, createdAt: Date): string {
  const dateStr = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} - PixelDrop</title>
  <meta property="og:title" content="${title}"/>
  <meta property="og:image" content="${imageUrl}"/>
  <meta property="og:type" content="website"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0F172A;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
    .card{background:#1E293B;border-radius:16px;overflow:hidden;max-width:640px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4)}
    .card img{width:100%;display:block;max-height:70vh;object-fit:contain;background:#0F172A}
    .info{padding:20px 24px}
    .title{font-size:20px;font-weight:600;margin-bottom:4px}
    .meta{font-size:14px;color:#94A3B8;display:flex;gap:12px;align-items:center}
    .brand{margin-top:24px;font-size:13px;color:#475569;text-align:center}
    .brand span{color:#0EA5E9;font-weight:600}
    @media(prefers-color-scheme:light){
      body{background:#F8F9FB;color:#1A1D26}
      .card{background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
      .meta{color:#6B7280}
      .brand{color:#9CA3AF}
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="${imageUrl}" alt="${title}"/>
    <div class="info">
      <div class="title">${title}</div>
      <div class="meta">
        <span>by ${username}</span>
        <span>${dateStr}</span>
      </div>
    </div>
  </div>
  <div class="brand">Shared via <span>PixelDrop</span></div>
</body>
</html>`;
}

function getNotFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Not Found - PixelDrop</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0F172A;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
    h1{font-size:24px;margin-bottom:8px}
    p{color:#94A3B8;font-size:16px}
  </style>
</head>
<body>
  <div>
    <h1>Image Not Found</h1>
    <p>This image may have been deleted or the link is invalid.</p>
  </div>
</body>
</html>`;
}
