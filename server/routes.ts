import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSellerApplicationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.get("/api/users/:firebaseUid", async (req, res) => {
    try {
      const { firebaseUid } = req.params;
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seller application routes
  app.post("/api/seller-applications", async (req, res) => {
    try {
      const applicationData = insertSellerApplicationSchema.parse(req.body);
      
      // Check if user already has an application
      const existingApplication = await storage.getSellerApplicationByUserId(applicationData.userId);
      if (existingApplication) {
        return res.status(409).json({ message: "Seller application already exists" });
      }
      
      const application = await storage.createSellerApplication(applicationData);
      res.json(application);
    } catch (error) {
      console.error("Error creating seller application:", error);
      res.status(400).json({ message: "Invalid application data" });
    }
  });

  app.get("/api/seller-applications/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const application = await storage.getSellerApplicationByUserId(userId);
      
      if (!application) {
        return res.status(404).json({ message: "Seller application not found" });
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error fetching seller application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
