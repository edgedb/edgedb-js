import express from "express";
import cookieParser from "cookie-parser";
import { type AuthRequest } from "@edgedb/auth-express";

import { styles } from "./styles.js";
import { auth, requireAuth, signoutRoute, builtinUIRouter } from "./auth.js";
import { router as todosRouter } from "./todos.js";
import { PORT } from "./env.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(auth.createSessionMiddleware());

app.use("/api/todos", todosRouter);

app.use("/auth", builtinUIRouter);
app.use("/auth/signout", signoutRoute);

const pageTemplate = (body: string) => `
<html>
  <head>
    <style>
${styles}
    </style>
  </head>
  <body>
    <main>
${body}
    </main>
  </body>
</html>
`;

app.get("/onboarding", requireAuth, (req, res) => {
  res.send(
    pageTemplate(`
    <h1>Onboarding</h1>
    <a href="/auth/signout">Sign out</a>
  `)
  );
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.send(
    pageTemplate(`
    <h1>Dashboard</h1>
    <a href="/auth/signout">Sign out</a>
  `)
  );
});

app.get("/verify", (req, res) => {
  res.send(
    pageTemplate(`
    <p>Check your email for a verification message.</p>
  `)
  );
});

app.get("/signin", (_, res) => {
  res.redirect("/auth/signin");
});

app.get("/", requireAuth, async (req: AuthRequest, res) => {
  res.redirect("/dashboard");
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
