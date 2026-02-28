import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";

const db = prisma as unknown as {
  organizer: {
    findMany: (args: { orderBy: { name: "asc" | "desc" } }) => Promise<unknown>;
    findUnique: (args: { where: { id: string } }) => Promise<unknown | null>;
    create: (args: { data: { name: string; email: string | null } }) => Promise<unknown>;
    update: (args: {
      where: { id: string };
      data: { name?: string; email?: string | null };
    }) => Promise<unknown>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
};

const organizerCreateSchema = t.Object({
  name: t.String(),
  email: t.Optional(t.String()),
});

const organizerUpdateSchema = t.Partial(organizerCreateSchema);

export const organizersRoutes = new Elysia({ prefix: "/organizers" })
  .get("/", async () => db.organizer.findMany({ orderBy: { name: "asc" } }))
  .get(
    "/:id",
    async ({ params, set }) => {
      const organizer = await db.organizer.findUnique({
        where: { id: params.id },
      });

      if (!organizer) {
        set.status = 404;
        return { message: "Organizer not found" };
      }

      return organizer;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const organizer = await db.organizer.create({
          data: { name: body.name, email: body.email ?? null },
        });
        return organizer;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          set.status = 409;
          return { message: "Organizer already exists" };
        }
        set.status = 500;
        return { message: "Failed to create organizer" };
      }
    },
    {
      body: organizerCreateSchema,
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const organizer = await db.organizer.update({
          where: { id: params.id },
          data: { ...body },
        });
        return organizer;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2025"
        ) {
          set.status = 404;
          return { message: "Organizer not found" };
        }
        set.status = 500;
        return { message: "Failed to update organizer" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: organizerUpdateSchema,
    }
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        await db.organizer.delete({ where: { id: params.id } });
        return { ok: true };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2025"
        ) {
          set.status = 404;
          return { message: "Organizer not found" };
        }
        set.status = 500;
        return { message: "Failed to delete organizer" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
