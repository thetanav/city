import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const profilesRoutes = new Elysia({ prefix: "/profiles" })
  .get("/", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new Error("Unauthorized");
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
      throw new Error("User not found");
    }

    return user;
  })
  .put("/", async ({ request, body }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new Error("Unauthorized");
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

    return user;
  });
