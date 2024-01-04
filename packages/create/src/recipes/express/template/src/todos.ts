import express from "express";
import { AuthRequest } from "@edgedb/auth-express";

import { requireAuth } from "./auth.js";

export const router = express.Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const todos = await req.session!.client.query(`
    select Todo { * }
  `);
  res.json(todos);
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const todo = await req.session!.client.querySingle(
    `
    select Todo { * }
    filter .id = <uuid>$id
  `,
    { id }
  );
  res.json(todo);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { content } = req.body;
  const todo = await req.session!.client.querySingle(
    `
    insert Todo {
      content := <str>$content
    }
  `,
    { content }
  );
  res.json(todo);
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { content, completed } = req.body;
  const todo = await req.session!.client.querySingle(
    `
    update Todo
    filter .id = <uuid>$id
    set {
      content := <str>$content,
      completed := <bool>$completed
    }
  `,
    {
      id,
      content,
      completed,
    }
  );
  res.json(todo);
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  await req.session!.client.querySingle(
    `
    delete Todo
    filter .id = $id
  `,
    { id }
  );
  res.sendStatus(204);
});
