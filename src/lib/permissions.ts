import type { Role } from "@/generated/prisma/enums";

type UserCtx = { id: string; role: Role };

export function isAdmin(user: UserCtx): boolean {
  return user.role === "ADMIN";
}

export function canViewTopic(
  user: UserCtx,
  topic: { ownerId: string; memberIds: string[] }
): boolean {
  if (isAdmin(user)) return true;
  return topic.ownerId === user.id || topic.memberIds.includes(user.id);
}

export function canEditTopic(user: UserCtx, topic: { ownerId: string }): boolean {
  if (isAdmin(user)) return true;
  return topic.ownerId === user.id;
}

export function canDeleteTopic(user: UserCtx, topic: { ownerId: string }): boolean {
  return canEditTopic(user, topic);
}

export function canManageTopicMembers(user: UserCtx, topic: { ownerId: string }): boolean {
  return canEditTopic(user, topic);
}

export function canEditItem(user: UserCtx, item: { creatorId: string }): boolean {
  if (isAdmin(user)) return true;
  return item.creatorId === user.id;
}

export function canDeleteItem(user: UserCtx, item: { creatorId: string }): boolean {
  return canEditItem(user, item);
}

export function canEditComment(user: UserCtx, comment: { authorId: string }): boolean {
  return comment.authorId === user.id;
}

export function canManageUsers(user: UserCtx): boolean {
  return isAdmin(user);
}
