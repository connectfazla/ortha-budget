"use server";

import { getAttachments } from "@/lib/data";
import type { Attachment } from "@/lib/types";

export async function listReceipts(transactionId: string): Promise<Attachment[]> {
  return getAttachments(String(transactionId));
}
