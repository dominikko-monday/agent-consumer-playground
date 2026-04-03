import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

/** Define the session property on the request object */
declare global {
  namespace Express {
    interface Request {
      session: {
        accountId: string;
        userId: string;
        backToUrl: string | undefined;
        shortLivedToken: string | undefined;
      };
    }
  }
}

export async function authenticationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization ?? req.query?.token;

    console.log("=== AUTH MIDDLEWARE ===");
    console.log("Has authorization:", !!authorization);

    if (typeof authorization !== "string") {
      console.log("AUTH FAILED: no credentials in request");
      res
        .status(401)
        .json({ error: "not authenticated, no credentials in request" });
      return;
    }

    const signingSecret = process.env.MONDAY_SIGNING_SECRET;
    if (typeof signingSecret !== "string") {
      console.log("AUTH FAILED: MONDAY_SIGNING_SECRET not set");
      res.status(500).json({ error: "Missing MONDAY_SIGNING_SECRET (should be in .env file)" });
      return;
    }

    const { accountId, userId, backToUrl, shortLivedToken } = jwt.verify(
      authorization,
      signingSecret
    ) as any;

    console.log("AUTH OK — account:", accountId, "user:", userId, "hasToken:", !!shortLivedToken);

    req.session = { accountId, userId, backToUrl, shortLivedToken };

    next();
  } catch (err) {
    console.log("AUTH FAILED:", (err as Error).message);
    res
      .status(401)
      .json({ error: "authentication error, could not verify credentials" });
  }
}
