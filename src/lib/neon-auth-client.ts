"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Talks to the /api/auth/[...path] handler on this origin, which proxies to Neon.
export const authClient = createAuthClient();
