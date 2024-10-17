import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod";

const edgedbErrorDataSchema = z.object({
  object: z.literal("error"),
  message: z.string(),
  type: z.string(),
  param: z.string().nullable(),
  code: z.string().nullable(),
});

export type EdgedDBErrorData = z.infer<typeof edgedbErrorDataSchema>;

export const edgedbFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: edgedbErrorDataSchema,
  errorToMessage: (data) => data.message,
});
