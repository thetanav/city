import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const profilesRoutes = new Elysia({ prefix: "/profiles" })
  .get("/", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return { ok: false, message: "Unauthorised!" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

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

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return { ok: true, data: user };
  });
