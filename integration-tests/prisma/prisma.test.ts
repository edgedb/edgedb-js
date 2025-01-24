import assert from "node:assert/strict";
import { spawnSync } from "child_process";
import path from "path";
import { Client } from "edgedb";
import { execSync } from "child_process";
import { PrismaClient, Prisma } from "@prisma/client";

import { setupTests, teardownTests, testIfVersionGTE } from "./setupTeardown";

let client: Client;
let prisma: PrismaClient;

class Rollback {}

describe("prisma", () => {
  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);

    // the postgres DSN that prisma needs is nearly identical to the EdgeDB
    // DSN, so we'll use it as the baseline
    const dsn = spawnSync("gel", [
      "instance",
      "credentials",
      "-I",
      "prisma",
      "--insecure-dsn",
    ]).stdout.toString();

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dsn.replace(/^edgedb:/, "postgresql:"),
        },
      },
    });
  });

  afterAll(async () => {
    await teardownTests(client);
  });

  testIfVersionGTE(6)("check read models 01", async () => {
    const res = await prisma.user.findMany({ orderBy: { name: "asc" } });
    assert.deepEqual(
      res.map((rec) => rec["name"]),
      ["Alice", "Billie", "Cameron", "Dana", "Elsa", "Zoe"],
    );
  });

  testIfVersionGTE(6)("check read models 02", async () => {
    const res = await prisma.userGroup.findMany({ orderBy: { name: "asc" } });
    assert.deepEqual(
      res.map((rec) => rec["name"]),
      ["blue", "green", "red"],
    );
  });

  testIfVersionGTE(6)("check read models 03", async () => {
    const res = await prisma.gameSession.findMany({ orderBy: { num: "asc" } });
    assert.deepEqual(
      res.map((rec) => rec["num"]),
      [123, 456],
    );
  });

  testIfVersionGTE(6)("check read models 04", async () => {
    const res = await prisma.post.findMany({ orderBy: { body: "asc" } });
    assert.deepEqual(
      res.map((rec) => rec["body"]),
      ["*magic stuff*", "Hello", "I'm Alice", "I'm Cameron"],
    );
  });

  testIfVersionGTE(6)("check read models 05", async () => {
    const res = await prisma.named.findMany({ orderBy: { name: "asc" } });
    assert.deepEqual(
      res.map((rec) => rec["name"]),
      [
        "Alice",
        "Billie",
        "Cameron",
        "Dana",
        "Elsa",
        "Zoe",
        "blue",
        "green",
        "red",
      ],
    );
  });

  testIfVersionGTE(6)("check read models 06", async () => {
    const res = await prisma.post.findMany({
      select: {
        body: true,
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { body: "asc" },
    });
    assert.deepEqual(res, [
      { body: "*magic stuff*", author: { name: "Elsa" } },
      { body: "Hello", author: { name: "Alice" } },
      { body: "I'm Alice", author: { name: "Alice" } },
      { body: "I'm Cameron", author: { name: "Cameron" } },
    ]);
  });

  testIfVersionGTE(6)("check read models 07", async () => {
    const res = await prisma.user.findMany({
      select: {
        name: true,
        back_to_Post: {
          select: {
            body: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    assert.deepEqual(res, [
      {
        name: "Alice",
        back_to_Post: [{ body: "Hello" }, { body: "I'm Alice" }],
      },
      {
        name: "Billie",
        back_to_Post: [],
      },
      {
        name: "Cameron",
        back_to_Post: [{ body: "I'm Cameron" }],
      },
      {
        name: "Dana",
        back_to_Post: [],
      },
      {
        name: "Elsa",
        back_to_Post: [{ body: "*magic stuff*" }],
      },
      {
        name: "Zoe",
        back_to_Post: [],
      },
    ]);
  });

  testIfVersionGTE(6)("check read models 08", async () => {
    const res = await prisma.gameSession.findMany({
      select: {
        num: true,
        players: {
          select: {
            target: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { num: "asc" },
    });
    assert.deepEqual(res, [
      {
        num: 123,
        players: [
          { target: { name: "Alice" } },
          { target: { name: "Billie" } },
        ],
      },
      {
        num: 456,
        players: [{ target: { name: "Dana" } }],
      },
    ]);
  });

  testIfVersionGTE(6)("check read models 09", async () => {
    const res = await prisma.user.findMany({
      select: {
        name: true,
        back_to_GameSession: {
          select: {
            source: {
              select: {
                num: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    assert.deepEqual(res, [
      {
        name: "Alice",
        back_to_GameSession: [{ source: { num: 123 } }],
      },
      {
        name: "Billie",
        back_to_GameSession: [{ source: { num: 123 } }],
      },
      {
        name: "Cameron",
        back_to_GameSession: [],
      },
      {
        name: "Dana",
        back_to_GameSession: [{ source: { num: 456 } }],
      },
      {
        name: "Elsa",
        back_to_GameSession: [],
      },
      {
        name: "Zoe",
        back_to_GameSession: [],
      },
    ]);
  });

  testIfVersionGTE(6)("check read models 10", async () => {
    const res = await prisma.userGroup.findMany({
      select: {
        name: true,
        users: {
          select: {
            target: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    assert.deepEqual(res, [
      {
        name: "blue",
        users: [],
      },
      {
        name: "green",
        users: [{ target: { name: "Alice" } }, { target: { name: "Billie" } }],
      },
      {
        name: "red",
        users: [
          { target: { name: "Alice" } },
          { target: { name: "Billie" } },
          { target: { name: "Cameron" } },
          { target: { name: "Dana" } },
        ],
      },
    ]);
  });

  testIfVersionGTE(6)("check read models 11", async () => {
    const res = await prisma.user.findMany({
      select: {
        name: true,
        back_to_UserGroup: {
          select: {
            source: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    assert.deepEqual(res, [
      {
        name: "Alice",
        back_to_UserGroup: [
          { source: { name: "red" } },
          { source: { name: "green" } },
        ],
      },
      {
        name: "Billie",
        back_to_UserGroup: [
          { source: { name: "red" } },
          { source: { name: "green" } },
        ],
      },
      {
        name: "Cameron",
        back_to_UserGroup: [{ source: { name: "red" } }],
      },
      {
        name: "Dana",
        back_to_UserGroup: [{ source: { name: "red" } }],
      },
      {
        name: "Elsa",
        back_to_UserGroup: [],
      },
      {
        name: "Zoe",
        back_to_UserGroup: [],
      },
    ]);
  });

  testIfVersionGTE(6)("check create models 01", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            name: "Yvonne",
          },
        });

        const res = await tx.user.findFirst({
          where: {
            name: "Yvonne",
          },
        });

        assert.equal(res!.name, "Yvonne");
        assert.ok(res!.id);
        throw new Rollback();
      });
    } catch (err) {
      if (!(err instanceof Rollback)) {
        throw err;
      }
    }
  });

  testIfVersionGTE(6)("check create models 02", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.userGroup.create({
          data: {
            name: "cyan",
            users: {
              create: [
                { target: { create: { name: "Yvonne" } } },
                { target: { create: { name: "Xander" } } },
              ],
            },
          },
        });

        for (const name of ["Yvonne", "Xander"]) {
          const res = await tx.user.findFirst({
            where: {
              name: name,
            },
            include: {
              back_to_UserGroup: {
                include: {
                  source: true,
                },
              },
            },
          });

          assert.equal(res!.name, name);
          assert.equal(res!.back_to_UserGroup[0].source.name, "cyan");
          assert.ok(res!.id);
        }

        throw new Rollback();
      });
    } catch (err) {
      if (!(err instanceof Rollback)) {
        throw err;
      }
    }
  });

  testIfVersionGTE(6)("check create models 03", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        // create user and then 2 posts
        const user = await tx.user.create({
          data: {
            name: "Yvonne",
          },
        });
        await tx.post.create({
          data: {
            body: "this is a test",
            author_id: user.id,
          },
        });
        await tx.post.create({
          data: {
            body: "also a test",
            author_id: user.id,
          },
        });

        const res = await tx.post.findMany({
          where: {
            author: {
              name: "Yvonne",
            },
          },
          select: {
            body: true,
            author: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            body: "asc",
          },
        });

        assert.deepEqual(res, [
          {
            body: "also a test",
            author: { name: "Yvonne" },
          },
          {
            body: "this is a test",
            author: { name: "Yvonne" },
          },
        ]);

        throw new Rollback();
      });
    } catch (err) {
      if (!(err instanceof Rollback)) {
        throw err;
      }
    }
  });

  testIfVersionGTE(6)("check delete models 01", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findFirst({
          where: {
            name: "Zoe",
          },
        });
        assert.ok(user?.id);

        // name is not unique so deleteMany is used
        await tx.user.deleteMany({
          where: {
            name: "Zoe",
          },
        });

        const res = await tx.user.findMany({
          where: {
            name: "Zoe",
          },
        });
        assert.deepEqual(res, []);

        throw new Rollback();
      });
    } catch (err) {
      if (!(err instanceof Rollback)) {
        throw err;
      }
    }
  });

  testIfVersionGTE(6)("check delete models 02", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const posts = await tx.post.findMany({
          where: {
            author: {
              name: "Elsa",
            },
          },
        });
        assert.equal(posts.length, 1);
        assert.ok(posts[0]?.id);

        // name is not unique so deleteMany is used
        await tx.post.delete({
          where: {
            id: posts[0].id,
          },
        });

        const res = await tx.user.findFirst({
          where: {
            name: "Elsa",
          },
          select: {
            name: true,
            back_to_Post: true,
          },
        });
        assert.deepEqual(res, {
          name: "Elsa",
          back_to_Post: [],
        });

        throw new Rollback();
      });
    } catch (err) {
      if (!(err instanceof Rollback)) {
        throw err;
      }
    }
  });

  testIfVersionGTE(6)("check delete models 03", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const red = await tx.userGroup.findFirst({
          where: {
            name: "red",
          },
          include: {
            users: {
              include: {
                target: true,
              },
            },
          },
        });
        assert.deepEqual(
          red!.users.map((rec) => rec["target"]["name"]),
          ["Alice", "Billie", "Cameron", "Dana"],
        );

        // drop Billie and Cameron from the group
        for (const link of red!.users) {
          if (link.target.name === "Billie" || link.target.name === "Cameron") {
            await tx.userGroup_users.delete({
              where: {
                source_id_target_id: {
                  source_id: link.source_id,
                  target_id: link.target_id,
                },
              },
            });
          }
        }

        const res = await tx.userGroup.findFirst({
          where: {
            name: "red",
          },
          include: {
            users: {
              include: {
                target: true,
              },
            },
          },
        });
        assert.deepEqual(
          res!.users.map((rec) => rec["target"]["name"]),
          ["Alice", "Dana"],
        );

        throw new Rollback();
      });
    } catch (err) {
      if (!(err instanceof Rollback)) {
        throw err;
      }
    }
  });

  testIfVersionGTE(6)("check update models 01", async () => {
    // as long as we can update any model, it should be fine for all of them
    // since in Prisma we reflect all things as models
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findFirst({
          where: {
            name: "Alice",
          },
        });
        const user_id = user!.id;
        assert.ok(user_id);
        assert.equal(user?.name, "Alice");

        // name is not unique so deleteMany is used
        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            name: "Xander",
          },
        });

        let res = await tx.user.findMany({
          where: {
            name: "Alice",
          },
        });
        assert.deepEqual(res, []);

        res = await tx.user.findMany({
          where: {
            name: "Xander",
          },
        });
        assert.equal(res.length, 1);
        assert.equal(res[0]?.name, "Xander");
        assert.equal(res[0]?.id, user_id);

        throw new Rollback();
      });
    } catch (err) {
      if (!(err instanceof Rollback)) {
        throw err;
      }
    }
  });
});
