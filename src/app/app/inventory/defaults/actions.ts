"use server";

import {
  savePostingTemplate,
  type PostingTemplateInput,
} from "@/lib/gunbroker/posting-template";
import { DEFAULTS_PATH } from "@/lib/inventory-paths";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function savePostingTemplateAction(input: PostingTemplateInput) {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to save defaults." };
  }
  try {
    const template = await savePostingTemplate(session.user.id, input);
    revalidatePath(DEFAULTS_PATH);
    return { ok: true as const, template };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save defaults.",
    };
  }
}
