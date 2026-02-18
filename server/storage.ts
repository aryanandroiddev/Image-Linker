import { type User, type InsertUser, type Image, type InsertImage, users, images } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getImagesByUserId(userId: string): Promise<Image[]>;
  getImageById(id: string): Promise<Image | undefined>;
  getImageByShareToken(token: string): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  deleteImage(id: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getImagesByUserId(userId: string): Promise<Image[]> {
    return db.select().from(images).where(eq(images.userId, userId)).orderBy(desc(images.createdAt));
  }

  async getImageById(id: string): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async getImageByShareToken(token: string): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.shareToken, token));
    return image;
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const [image] = await db.insert(images).values(insertImage).returning();
    return image;
  }

  async deleteImage(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(images).where(eq(images.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
