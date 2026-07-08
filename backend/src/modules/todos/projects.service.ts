import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { DEFAULT_PROJECT_COLOR } from "../../common/constants";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { createEntityId } from "./ids";
import { toProjectDto } from "./todo.dto";
import type { ProjectCreateInput, ProjectPatchInput } from "./todos.schemas";

type ProjectDb = Pick<PrismaClient, "project" | "todo">;

function normalizeName(name: string): string {
  return name.trim();
}

export class ProjectsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return projects.map(toProjectDto);
  }

  async createProject(userId: string, input: ProjectCreateInput) {
    const name = normalizeName(input.name);
    await this.assertNameAvailable(this.prisma, userId, name);

    const now = new Date();
    const project = await this.prisma.project.create({
      data: {
        id: createEntityId("proj"),
        userId,
        name,
        color: input.color ?? DEFAULT_PROJECT_COLOR,
        createdAt: now,
        updatedAt: now
      }
    });

    return toProjectDto(project);
  }

  async updateProject(userId: string, projectId: string, input: ProjectPatchInput) {
    const existing = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
        deletedAt: null
      }
    });

    if (!existing) {
      throw new ApiError("NOT_FOUND", "项目不存在", 404);
    }

    const data: Prisma.ProjectUpdateInput = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) {
      const name = normalizeName(input.name);
      await this.assertNameAvailable(this.prisma, userId, name, projectId);
      data.name = name;
    }

    if (input.color !== undefined) {
      data.color = input.color;
    }

    await this.prisma.project.updateMany({
      where: {
        id: projectId,
        userId,
        deletedAt: null
      },
      data
    });

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
        deletedAt: null
      }
    });

    if (!project) {
      throw new ApiError("NOT_FOUND", "项目不存在", 404);
    }

    return toProjectDto(project);
  }

  async deleteProject(
    userId: string,
    projectId: string,
    mode: "move" | "delete" = "move"
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({
        where: {
          id: projectId,
          userId,
          deletedAt: null
        }
      });

      if (!existing) {
        throw new ApiError("NOT_FOUND", "项目不存在", 404);
      }

      const timestamps = getSoftDeleteTimestamps();

      if (mode === "delete") {
        // Soft-delete all todos under this project along with the project
        await tx.todo.updateMany({
          where: {
            userId,
            projectId,
            deletedAt: null
          },
          data: {
            deletedAt: timestamps.deletedAt,
            purgeAfter: timestamps.purgeAfter,
            updatedAt: timestamps.deletedAt
          }
        });
      } else {
        // Move todos to "unassigned" (projectId = null)
        await tx.todo.updateMany({
          where: {
            userId,
            projectId,
            deletedAt: null
          },
          data: {
            projectId: null,
            updatedAt: timestamps.deletedAt
          }
        });
      }

      await tx.project.updateMany({
        where: {
          id: projectId,
          userId,
          deletedAt: null
        },
        data: {
          deletedAt: timestamps.deletedAt,
          purgeAfter: timestamps.purgeAfter,
          updatedAt: timestamps.deletedAt
        }
      });

      const project = await tx.project.findFirst({
        where: {
          id: projectId,
          userId
        }
      });

      if (!project) {
        throw new ApiError("NOT_FOUND", "项目不存在", 404);
      }

      return toProjectDto(project);
    });
  }

  private async assertNameAvailable(
    db: ProjectDb,
    userId: string,
    name: string,
    ignoreProjectId?: string
  ): Promise<void> {
    const projects = await db.project.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(ignoreProjectId
          ? {
              id: {
                not: ignoreProjectId
              }
            }
          : {})
      }
    });
    const normalizedName = name.trim().toLowerCase();
    const existing = projects.find(
      (project) => project.name.trim().toLowerCase() === normalizedName
    );

    if (existing) {
      throw new ApiError("CONFLICT", "项目名已存在", 409, {
        field: "name"
      });
    }
  }
}
