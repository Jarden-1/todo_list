import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { DEFAULT_TAG_COLOR } from "../../common/constants";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { createEntityId } from "./ids";
import { toTagDto } from "./todo.dto";
import type { TagCreateInput, TagPatchInput } from "./todos.schemas";

type TagDb = Pick<PrismaClient, "tag">;

function normalizeName(name: string): string {
  return name.trim();
}

export class TagsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listTags(userId: string) {
    const tags = await this.prisma.tag.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return tags.map(toTagDto);
  }

  async createTag(userId: string, input: TagCreateInput) {
    const name = normalizeName(input.name);
    await this.assertNameAvailable(this.prisma, userId, name);

    const now = new Date();
    const tag = await this.prisma.tag.create({
      data: {
        id: createEntityId("tag"),
        userId,
        name,
        color: input.color ?? DEFAULT_TAG_COLOR,
        createdAt: now,
        updatedAt: now
      }
    });

    return toTagDto(tag);
  }

  async updateTag(userId: string, tagId: string, input: TagPatchInput) {
    const existing = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
        deletedAt: null
      }
    });

    if (!existing) {
      throw new ApiError("NOT_FOUND", "标签不存在", 404);
    }

    const data: Prisma.TagUpdateInput = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) {
      const name = normalizeName(input.name);
      await this.assertNameAvailable(this.prisma, userId, name, tagId);
      data.name = name;
    }

    if (input.color !== undefined) {
      data.color = input.color;
    }

    await this.prisma.tag.updateMany({
      where: {
        id: tagId,
        userId,
        deletedAt: null
      },
      data
    });

    const tag = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
        deletedAt: null
      }
    });

    if (!tag) {
      throw new ApiError("NOT_FOUND", "标签不存在", 404);
    }

    return toTagDto(tag);
  }

  async deleteTag(userId: string, tagId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tag.findFirst({
        where: {
          id: tagId,
          userId,
          deletedAt: null
        }
      });

      if (!existing) {
        throw new ApiError("NOT_FOUND", "标签不存在", 404);
      }

      await tx.todoTag.deleteMany({
        where: {
          userId,
          tagId
        }
      });

      const timestamps = getSoftDeleteTimestamps();
      await tx.tag.updateMany({
        where: {
          id: tagId,
          userId,
          deletedAt: null
        },
        data: {
          deletedAt: timestamps.deletedAt,
          purgeAfter: timestamps.purgeAfter,
          updatedAt: timestamps.deletedAt
        }
      });

      const tag = await tx.tag.findFirst({
        where: {
          id: tagId,
          userId
        }
      });

      if (!tag) {
        throw new ApiError("NOT_FOUND", "标签不存在", 404);
      }

      return toTagDto(tag);
    });
  }

  private async assertNameAvailable(
    db: TagDb,
    userId: string,
    name: string,
    ignoreTagId?: string
  ): Promise<void> {
    const tags = await db.tag.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(ignoreTagId
          ? {
              id: {
                not: ignoreTagId
              }
            }
          : {})
      }
    });
    const normalizedName = name.trim().toLowerCase();
    const existing = tags.find(
      (tag) => tag.name.trim().toLowerCase() === normalizedName
    );

    if (existing) {
      throw new ApiError("CONFLICT", "标签名已存在", 409, {
        field: "name"
      });
    }
  }
}
