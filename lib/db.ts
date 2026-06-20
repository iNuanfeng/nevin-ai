import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SEED_MENTORS, type MentorSeed } from "@/lib/mentor-defaults";

let db: Database.Database | null = null;

export type { MentorSeed };

function migrateDb(database: Database.Database): void {
  const profileCols = database.prepare("PRAGMA table_info(profile)").all() as Array<{ name: string }>;
  if (!profileCols.some((c) => c.name === "collected_info")) {
    database.exec("ALTER TABLE profile ADD COLUMN collected_info TEXT");
  }
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "nevin.db");
  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  migrateDb(db);

  const count = db.prepare("SELECT COUNT(*) AS c FROM mentors").get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(
      `INSERT INTO mentors (name, title, description, system_prompt, category, sort_order, style_config)
       VALUES (@name, @title, @description, @system_prompt, @category, @sort_order, @style_config)`
    );
    const insertMany = db.transaction((mentors: MentorSeed[]) => {
      for (const m of mentors) {
        insert.run(m);
      }
    });
    insertMany(SEED_MENTORS);
  }

  // FTS5 索引重建 — 外部内容表的 COUNT(*) 不反映索引状态，
  // rebuild 是幂等的，多次运行无副作用。
  db.exec("INSERT INTO memories_fts(memories_fts) VALUES('rebuild')");

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
