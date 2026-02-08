import { v } from "convex/values";

import { authQuery } from "./auth";

export const get = authQuery({
  args: {},
  returns: v.object({ message: v.string() }),
  handler: async () => {
    return {
      message: "This is private",
    };
  },
});
