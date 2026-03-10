declare namespace Express {
  interface Request {
    user?: { user_id: string; is_admin: boolean };
  }
}
