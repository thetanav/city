import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";

export const profilesRoutes = new Elysia({ prefix: "/profiles" })
  .get("/", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return { ok: false, message: "Unauthorised!" };
    }

    const [user] = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        image: schema.user.image,
      })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!user) {
      return { ok: false, message: "User not found!" };
    }

    return { ok: true, data: user };
  })
  .put("/", async ({ request, body }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return { ok: false, message: "Unauthorised!" };
    }

    const { name } = body as {
      name?: string;
    };

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;

    const [user] = await db
      .update(schema.user)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.user.id, session.user.id))
      .returning({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        image: schema.user.image,
      });

    return { ok: true, data: user };
  });
