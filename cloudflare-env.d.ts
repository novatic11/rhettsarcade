declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SAVE_VAULT_PEPPER?: string;
  }
}
