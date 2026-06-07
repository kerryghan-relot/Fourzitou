import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    email: z.email("Invalid email address"),
    displayName: z
      .string()
      .min(2, "At least 2 characters")
      .max(30, "At most 30 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _ and -"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const topicSchema = z.object({
  title: z.string().min(1, "Title is required").max(80),
  titleColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
  emoji: z.string().min(1).max(8),
});

export const itemSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().min(1, "Description is required"),
});

export const scoreSchema = z.object({
  itemId: z.string(),
  stars: z.number().int().min(0).max(5),
  crown: z.boolean(),
  poop: z.boolean(),
});

export const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6, "At least 6 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "At least 2 characters")
    .max(30, "At most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _ and -"),
  locale: z.enum(["en", "fr"]),
});

export const suggestionSchema = z.object({
  type: z.enum(["BUG", "IDEA", "OTHER"]),
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().min(1, "Description is required").max(5000),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type TopicInput = z.infer<typeof topicSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type ScoreInput = z.infer<typeof scoreSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SuggestionInput = z.infer<typeof suggestionSchema>;
